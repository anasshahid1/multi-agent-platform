"""
LLM Request Scheduler with Queue and Deadlock Prevention.

This is the brain of the orchestrator. It manages:
- A priority queue for LLM inference requests from all agents
- Deadlock prevention via timeouts and max queue size
- Request tracking (submitted, started, completed, duration)
- Statistics for the dashboard (queue depth, avg latency, etc.)

Only ONE LLM request runs at a time (single model, single inference).
Agents submit requests and wait for their turn.
"""

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Callable, Any
from enum import Enum

from config import settings
from database.db import get_db
from services.llm_client import llm_client


class RequestPriority(int, Enum):
    """Priority levels — lower number = higher priority."""
    CRITICAL = 1
    HIGH = 3
    NORMAL = 5
    LOW = 7
    BACKGROUND = 9


class RequestStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass(order=True)
class LLMRequest:
    """A queued LLM inference request."""
    priority: int
    submitted_at: float = field(compare=False)
    agent_id: str = field(compare=False)
    task_description: str = field(compare=False)
    prompt: str = field(compare=False)
    system_prompt: Optional[str] = field(default=None, compare=False)
    temperature: float = field(default=0.7, compare=False)
    max_tokens: int = field(default=1024, compare=False)
    model: Optional[str] = field(default=None, compare=False)
    status: RequestStatus = field(default=RequestStatus.PENDING, compare=False)
    result: Optional[dict] = field(default=None, compare=False)
    error: Optional[str] = field(default=None, compare=False)
    started_at: Optional[float] = field(default=None, compare=False)
    completed_at: Optional[float] = field(default=None, compare=False)
    _event: asyncio.Event = field(default_factory=asyncio.Event, compare=False)


class LLMScheduler:
    """
    Manages the LLM request queue with priority scheduling
    and deadlock prevention.

    Features:
    - Priority queue (CRITICAL > HIGH > NORMAL > LOW > BACKGROUND)
    - Timeout-based deadlock prevention
    - Max queue size enforcement
    - Per-request tracking and statistics
    - Thread-safe async operations
    """

    def __init__(self):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._active_request: Optional[LLMRequest] = None
        self._processing = False
        self._lock = asyncio.Lock()
        self._worker_task: Optional[asyncio.Task] = None

        # Statistics
        self._total_processed = 0
        self._total_failed = 0
        self._total_timeouts = 0
        self._deadlocks_prevented = 0
        self._total_duration = 0.0
        self._history: list[dict] = []  # Last 50 completed requests

        # Token tracking
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._total_tokens = 0
        self._total_tokens_per_second_sum = 0.0
        self._agent_token_usage: dict[str, dict] = {}  # per-agent breakdown

    async def start(self):
        """Start the scheduler worker loop."""
        if self._worker_task is None or self._worker_task.done():
            self._processing = True
            self._worker_task = asyncio.create_task(self._process_loop())
            print("[SCHEDULER] LLM scheduler started")

    async def stop(self):
        """Stop the scheduler worker loop."""
        self._processing = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None
        print("[SCHEDULER] LLM scheduler stopped")

    async def submit(
        self,
        agent_id: str,
        task_description: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        priority: RequestPriority = RequestPriority.NORMAL,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        model: Optional[str] = None,
    ) -> dict:
        """
        Submit an LLM request and wait for the result.

        Args:
            agent_id: ID of the agent making the request
            task_description: Human-readable description for dashboard
            prompt: The prompt to send to the LLM
            system_prompt: Optional system instruction
            priority: Request priority level
            temperature: Sampling temperature
            max_tokens: Max tokens to generate
            model: Override model name (defaults to settings.ollama_model)

        Returns:
            dict with 'response', 'tokens', 'duration_seconds'

        Raises:
            asyncio.TimeoutError: If request exceeds timeout
            RuntimeError: If queue is full
        """
        # Deadlock prevention: reject if queue is full
        if self._queue.qsize() >= settings.llm_max_queue_size:
            self._deadlocks_prevented += 1
            raise RuntimeError(
                f"LLM queue is full ({settings.llm_max_queue_size} pending). "
                "Request rejected to prevent deadlock."
            )

        request = LLMRequest(
            priority=priority.value,
            submitted_at=time.time(),
            agent_id=agent_id,
            task_description=task_description,
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            model=model,
        )

        # Log to database
        await self._log_request(request, "pending")

        # Add to priority queue
        await self._queue.put(request)

        # Wait for result with timeout (deadlock prevention)
        try:
            await asyncio.wait_for(
                request._event.wait(),
                timeout=settings.llm_request_timeout,
            )
        except asyncio.TimeoutError:
            request.status = RequestStatus.TIMEOUT
            self._total_timeouts += 1
            self._deadlocks_prevented += 1
            await self._log_request(request, "timeout")
            raise asyncio.TimeoutError(
                f"LLM request from '{agent_id}' timed out after "
                f"{settings.llm_request_timeout}s"
            )

        if request.status == RequestStatus.FAILED:
            raise RuntimeError(request.error or "LLM request failed")

        return request.result

    async def _process_loop(self):
        """Worker loop that processes requests from the queue."""
        while self._processing:
            try:
                # Wait for next request
                request = await asyncio.wait_for(
                    self._queue.get(), timeout=1.0
                )
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

            # Skip cancelled/timed-out requests
            if request.status in (RequestStatus.TIMEOUT, RequestStatus.CANCELLED):
                self._queue.task_done()
                continue

            # Process the request
            async with self._lock:
                self._active_request = request
                request.status = RequestStatus.RUNNING
                request.started_at = time.time()
                await self._log_request(request, "running")

            try:
                result = await llm_client.generate(
                    prompt=request.prompt,
                    system_prompt=request.system_prompt,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    model=request.model,
                )

                request.result = result
                request.status = RequestStatus.COMPLETED
                request.completed_at = time.time()

                duration = request.completed_at - request.started_at
                self._total_processed += 1
                self._total_duration += duration

                # Track token usage
                input_tok = result.get("input_tokens", 0)
                output_tok = result.get("output_tokens", 0)
                total_tok = result.get("total_tokens", 0)
                tok_per_sec = result.get("tokens_per_second", 0)

                self._total_input_tokens += input_tok
                self._total_output_tokens += output_tok
                self._total_tokens += total_tok
                if tok_per_sec > 0:
                    self._total_tokens_per_second_sum += tok_per_sec

                # Per-agent tracking
                if request.agent_id not in self._agent_token_usage:
                    self._agent_token_usage[request.agent_id] = {
                        "input_tokens": 0,
                        "output_tokens": 0,
                        "total_tokens": 0,
                        "request_count": 0,
                    }
                agent_usage = self._agent_token_usage[request.agent_id]
                agent_usage["input_tokens"] += input_tok
                agent_usage["output_tokens"] += output_tok
                agent_usage["total_tokens"] += total_tok
                agent_usage["request_count"] += 1

                await self._log_request(request, "completed")
                self._add_to_history(request)

            except Exception as e:
                request.status = RequestStatus.FAILED
                request.error = str(e)
                request.completed_at = time.time()
                self._total_failed += 1

                await self._log_request(request, "failed")
                self._add_to_history(request)

            finally:
                async with self._lock:
                    self._active_request = None
                request._event.set()
                self._queue.task_done()

    async def _log_request(self, request: LLMRequest, status: str):
        """Log request state change to the database."""
        try:
            db = await get_db()
            if status == "pending":
                await db.execute(
                    """INSERT INTO llm_queue
                       (agent_id, task_description, priority, status)
                       VALUES (?, ?, ?, ?)""",
                    (request.agent_id, request.task_description,
                     request.priority, status),
                )
            else:
                duration = None
                tokens = None
                if request.completed_at and request.started_at:
                    duration = round(request.completed_at - request.started_at, 2)
                if request.result:
                    tokens = request.result.get("tokens", 0)

                await db.execute(
                    """UPDATE llm_queue
                       SET status = ?, started_at = ?, completed_at = ?,
                           duration_seconds = ?, tokens_generated = ?
                       WHERE agent_id = ? AND status = 'pending'
                       ORDER BY id DESC LIMIT 1""",
                    (status,
                     datetime.fromtimestamp(request.started_at).isoformat()
                     if request.started_at else None,
                     datetime.fromtimestamp(request.completed_at).isoformat()
                     if request.completed_at else None,
                     duration, tokens,
                     request.agent_id),
                )
            await db.commit()
        except Exception:
            pass  # Don't let logging failures affect scheduling

    def _add_to_history(self, request: LLMRequest):
        """Add completed request to history (keep last 50)."""
        result = request.result or {}
        entry = {
            "agent_id": request.agent_id,
            "task": request.task_description,
            "status": request.status.value,
            "priority": request.priority,
            "duration_seconds": round(
                request.completed_at - request.started_at, 2
            ) if request.completed_at and request.started_at else None,
            "tokens": result.get("tokens", 0),
            "input_tokens": result.get("input_tokens", 0),
            "output_tokens": result.get("output_tokens", 0),
            "total_tokens": result.get("total_tokens", 0),
            "tokens_per_second": result.get("tokens_per_second", 0),
            "completed_at": datetime.fromtimestamp(
                request.completed_at
            ).isoformat() if request.completed_at else None,
        }
        self._history.append(entry)
        if len(self._history) > 50:
            self._history.pop(0)

    def get_status(self) -> dict:
        """Get scheduler status for the dashboard."""
        avg_latency = (
            round(self._total_duration / self._total_processed, 2)
            if self._total_processed > 0 else 0
        )

        active = None
        if self._active_request:
            elapsed = time.time() - (self._active_request.started_at or time.time())
            active = {
                "agent_id": self._active_request.agent_id,
                "task": self._active_request.task_description,
                "priority": self._active_request.priority,
                "elapsed_seconds": round(elapsed, 1),
            }

        avg_tokens_per_second = (
            round(self._total_tokens_per_second_sum / self._total_processed, 1)
            if self._total_processed > 0 else 0
        )

        return {
            "model": settings.ollama_model,
            "status": "processing" if self._active_request else "idle",
            "queue_depth": self._queue.qsize(),
            "max_queue_size": settings.llm_max_queue_size,
            "active_request": active,
            "stats": {
                "total_processed": self._total_processed,
                "total_failed": self._total_failed,
                "total_timeouts": self._total_timeouts,
                "deadlocks_prevented": self._deadlocks_prevented,
                "avg_latency_seconds": avg_latency,
                "total_tokens": self._total_tokens,
                "total_input_tokens": self._total_input_tokens,
                "total_output_tokens": self._total_output_tokens,
                "avg_tokens_per_second": avg_tokens_per_second,
            },
            "agent_token_usage": self._agent_token_usage,
            "history": self._history[-20:],  # Last 20 for dashboard
        }

    async def cancel_pending(self, agent_id: str) -> int:
        """Cancel all pending requests from a specific agent."""
        cancelled = 0
        new_queue = asyncio.PriorityQueue()

        while not self._queue.empty():
            try:
                request = self._queue.get_nowait()
                if request.agent_id == agent_id and \
                   request.status == RequestStatus.PENDING:
                    request.status = RequestStatus.CANCELLED
                    request._event.set()
                    cancelled += 1
                else:
                    await new_queue.put(request)
            except asyncio.QueueEmpty:
                break

        self._queue = new_queue
        return cancelled


# Singleton instance
llm_scheduler = LLMScheduler()
