"""
Abstract base class for all platform agents.

Every agent (AI-Times, Mailman, Wallstreet Wolf, News Analyst)
must inherit from BaseAgent and implement the `execute()` method.

The base class handles:
- Status tracking (idle, running, error)
- Run duration measurement
- Logging to the database
- Integration with the orchestrator's lifecycle management
"""

import time
import traceback
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from database.db import get_db


class AgentStatus:
    """Agent status constants."""
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"
    DISABLED = "disabled"


class BaseAgent(ABC):
    """
    Abstract base class for all agents.

    Subclasses must implement:
        - execute(): The core agent logic (fetch data, call LLM, send output)

    The base class provides:
        - run(): Wraps execute() with status tracking, timing, and error handling
        - log(): Writes log entries to the database
        - status updates to the agents table
    """

    def __init__(self, agent_id: str, name: str, description: str = ""):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.status = AgentStatus.IDLE
        self._last_run_at: Optional[str] = None
        self._last_run_duration: Optional[float] = None
        self._last_run_status: Optional[str] = None
        self._items_processed: int = 0

    @abstractmethod
    async def execute(self) -> int:
        """
        Core agent logic. Must be implemented by each agent.

        Returns:
            int: Number of items processed during this run.
        """
        pass

    async def run(self) -> dict:
        """
        Execute the agent with status tracking, timing, and error handling.

        Returns:
            dict: Run result with status, duration, and items processed.
        """
        self.status = AgentStatus.RUNNING
        await self._update_status(AgentStatus.RUNNING)
        await self.log("INFO", f"Agent '{self.name}' starting execution")

        start_time = time.time()

        try:
            items_processed = await self.execute()
            duration = round(time.time() - start_time, 2)

            self.status = AgentStatus.IDLE
            self._last_run_at = datetime.utcnow().isoformat()
            self._last_run_duration = duration
            self._last_run_status = "success"
            self._items_processed = items_processed

            await self._save_run_result("success", duration, items_processed)
            await self.log(
                "INFO",
                f"Agent '{self.name}' completed: {items_processed} items in {duration}s"
            )

            return {
                "status": "success",
                "duration_seconds": duration,
                "items_processed": items_processed,
            }

        except Exception as e:
            duration = round(time.time() - start_time, 2)

            self.status = AgentStatus.ERROR
            self._last_run_at = datetime.utcnow().isoformat()
            self._last_run_duration = duration
            self._last_run_status = "error"

            error_msg = f"{type(e).__name__}: {str(e)}"
            await self._save_run_result("error", duration, 0)
            await self.log("ERROR", f"Agent '{self.name}' failed: {error_msg}")
            await self.log("ERROR", traceback.format_exc())

            return {
                "status": "error",
                "duration_seconds": duration,
                "error": error_msg,
            }

    async def log(self, level: str, message: str) -> None:
        """Write a log entry to the database."""
        try:
            db = await get_db()
            await db.execute(
                "INSERT INTO agent_logs (agent_id, level, message) VALUES (?, ?, ?)",
                (self.agent_id, level, message),
            )
            await db.commit()
        except Exception:
            # Don't let logging failures crash the agent
            print(f"[{level}] [{self.agent_id}] {message}")

    async def _update_status(self, status: str) -> None:
        """Update agent status in the database."""
        db = await get_db()
        await db.execute(
            "UPDATE agents SET status = ?, updated_at = datetime('now') WHERE id = ?",
            (status, self.agent_id),
        )
        await db.commit()

    async def _save_run_result(
        self, status: str, duration: float, items_processed: int
    ) -> None:
        """Save run result to the agents table."""
        db = await get_db()
        await db.execute(
            """
            UPDATE agents
            SET status = ?,
                last_run_at = datetime('now'),
                last_run_duration_seconds = ?,
                last_run_status = ?,
                items_processed = ?,
                updated_at = datetime('now')
            WHERE id = ?
            """,
            (
                AgentStatus.IDLE if status == "success" else AgentStatus.ERROR,
                duration,
                status,
                items_processed,
                self.agent_id,
            ),
        )
        await db.commit()

    def get_info(self) -> dict:
        """Return agent information for the dashboard."""
        return {
            "id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "last_run_at": self._last_run_at,
            "last_run_duration_seconds": self._last_run_duration,
            "last_run_status": self._last_run_status,
            "items_processed": self._items_processed,
        }
