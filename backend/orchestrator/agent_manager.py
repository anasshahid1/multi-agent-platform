"""
Agent Lifecycle Manager.

Handles:
- Registering agents in the database
- Starting/stopping agents
- Triggering manual runs
- Managing scheduled runs via APScheduler
- Health checking and status reporting
"""

import asyncio
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from database.db import get_db
from agents.base_agent import BaseAgent, AgentStatus


class AgentManager:
    """
    Manages the lifecycle of all agents.

    Responsibilities:
    - Register agents on startup
    - Schedule agents based on their configuration
    - Handle manual trigger requests from the dashboard
    - Track agent status and provide info to the dashboard
    - Reschedule agents when configuration changes
    """

    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}
        self._scheduler = AsyncIOScheduler()
        self._running_tasks: dict[str, asyncio.Task] = {}

    async def start(self):
        """Start the agent manager and scheduler."""
        self._scheduler.start()
        print("[AGENT_MANAGER] Scheduler started")

        # Register agents in the database
        for agent_id, agent in self._agents.items():
            await self._register_agent(agent)

        # Load and apply schedules from the database
        await self._load_schedules()

    async def stop(self):
        """Stop all agents and the scheduler."""
        # Cancel any running agent tasks
        for task_id, task in self._running_tasks.items():
            task.cancel()
        self._running_tasks.clear()

        self._scheduler.shutdown(wait=False)
        print("[AGENT_MANAGER] Scheduler stopped")

    def register(self, agent: BaseAgent):
        """Register an agent with the manager."""
        self._agents[agent.agent_id] = agent
        print(f"[AGENT_MANAGER] Registered agent: {agent.name} ({agent.agent_id})")

    async def _register_agent(self, agent: BaseAgent):
        """Ensure agent exists in the database."""
        db = await get_db()
        existing = await db.execute(
            "SELECT id FROM agents WHERE id = ?", (agent.agent_id,)
        )
        row = await existing.fetchone()

        if not row:
            await db.execute(
                """INSERT INTO agents (id, name, description, status)
                   VALUES (?, ?, ?, ?)""",
                (agent.agent_id, agent.name, agent.description, AgentStatus.IDLE),
            )
            await db.commit()

    async def _load_schedules(self):
        """Load schedules from DB and set up APScheduler jobs."""
        db = await get_db()
        cursor = await db.execute(
            "SELECT agent_id, schedule_type, cron_hour, cron_minute, "
            "interval_minutes, enabled FROM schedules"
        )
        rows = await cursor.fetchall()

        for row in rows:
            if not row["enabled"]:
                continue

            agent_id = row["agent_id"]
            if agent_id not in self._agents:
                continue

            if row["schedule_type"] == "cron" and row["cron_hour"] is not None:
                trigger = CronTrigger(
                    hour=row["cron_hour"],
                    minute=row["cron_minute"] or 0,
                )
                self._scheduler.add_job(
                    self._run_agent,
                    trigger=trigger,
                    args=[agent_id],
                    id=f"schedule_{agent_id}",
                    replace_existing=True,
                    name=f"Scheduled: {self._agents[agent_id].name}",
                )
                print(f"[AGENT_MANAGER] Scheduled {agent_id} at "
                      f"{row['cron_hour']}:{row['cron_minute']:02d}")

            elif row["schedule_type"] == "interval" and row["interval_minutes"]:
                trigger = IntervalTrigger(minutes=row["interval_minutes"])
                self._scheduler.add_job(
                    self._run_agent,
                    trigger=trigger,
                    args=[agent_id],
                    id=f"schedule_{agent_id}",
                    replace_existing=True,
                    name=f"Scheduled: {self._agents[agent_id].name}",
                )
                print(f"[AGENT_MANAGER] Scheduled {agent_id} every "
                      f"{row['interval_minutes']} minutes")

    async def _run_agent(self, agent_id: str):
        """Execute an agent's run method."""
        agent = self._agents.get(agent_id)
        if not agent:
            return

        # Don't run if already running
        if agent.status == AgentStatus.RUNNING:
            print(f"[AGENT_MANAGER] {agent_id} is already running, skipping")
            return

        result = await agent.run()
        return result

    async def trigger_agent(self, agent_id: str) -> dict:
        """
        Manually trigger an agent run from the dashboard.

        Returns:
            dict: Run result with status, duration, items processed.
        """
        agent = self._agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent '{agent_id}' not found")

        if agent.status == AgentStatus.RUNNING:
            raise RuntimeError(f"Agent '{agent_id}' is already running")

        # Run in a background task so the API can respond immediately
        task = asyncio.create_task(self._run_agent(agent_id))
        self._running_tasks[agent_id] = task

        # Clean up task reference when done
        def _on_complete(t):
            self._running_tasks.pop(agent_id, None)
        task.add_done_callback(_on_complete)

        return {"status": "triggered", "agent_id": agent_id}

    async def update_schedule(
        self,
        agent_id: str,
        schedule_type: str,
        cron_hour: Optional[int] = None,
        cron_minute: Optional[int] = None,
        interval_minutes: Optional[int] = None,
        enabled: bool = True,
    ) -> dict:
        """
        Update an agent's schedule from the dashboard.
        Persists to DB and reschedules the APScheduler job.
        """
        if agent_id not in self._agents:
            raise ValueError(f"Agent '{agent_id}' not found")

        db = await get_db()

        # Upsert the schedule
        await db.execute(
            """INSERT INTO schedules
               (agent_id, schedule_type, cron_hour, cron_minute,
                interval_minutes, enabled, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(agent_id) DO UPDATE SET
                   schedule_type = excluded.schedule_type,
                   cron_hour = excluded.cron_hour,
                   cron_minute = excluded.cron_minute,
                   interval_minutes = excluded.interval_minutes,
                   enabled = excluded.enabled,
                   updated_at = datetime('now')""",
            (agent_id, schedule_type, cron_hour, cron_minute,
             interval_minutes, 1 if enabled else 0),
        )
        await db.commit()

        # Remove existing job
        job_id = f"schedule_{agent_id}"
        if self._scheduler.get_job(job_id):
            self._scheduler.remove_job(job_id)

        # Add new job if enabled
        if enabled:
            if schedule_type == "cron" and cron_hour is not None:
                trigger = CronTrigger(
                    hour=cron_hour,
                    minute=cron_minute or 0,
                )
                self._scheduler.add_job(
                    self._run_agent,
                    trigger=trigger,
                    args=[agent_id],
                    id=job_id,
                    replace_existing=True,
                )
            elif schedule_type == "interval" and interval_minutes:
                trigger = IntervalTrigger(minutes=interval_minutes)
                self._scheduler.add_job(
                    self._run_agent,
                    trigger=trigger,
                    args=[agent_id],
                    id=job_id,
                    replace_existing=True,
                )

        return {
            "agent_id": agent_id,
            "schedule_type": schedule_type,
            "enabled": enabled,
        }

    def get_all_agents_info(self) -> list[dict]:
        """Get info for all registered agents."""
        agents = []
        for agent_id, agent in self._agents.items():
            info = agent.get_info()

            # Add next scheduled run
            job_id = f"schedule_{agent_id}"
            job = self._scheduler.get_job(job_id)
            if job and job.next_run_time:
                info["next_run_at"] = job.next_run_time.isoformat()
            else:
                info["next_run_at"] = None

            agents.append(info)
        return agents

    def get_agent_info(self, agent_id: str) -> Optional[dict]:
        """Get info for a specific agent."""
        agent = self._agents.get(agent_id)
        if not agent:
            return None

        info = agent.get_info()
        job_id = f"schedule_{agent_id}"
        job = self._scheduler.get_job(job_id)
        if job and job.next_run_time:
            info["next_run_at"] = job.next_run_time.isoformat()
        else:
            info["next_run_at"] = None

        return info

    async def get_agent_logs(
        self, agent_id: str, limit: int = 50
    ) -> list[dict]:
        """Get recent logs for a specific agent."""
        db = await get_db()
        cursor = await db.execute(
            """SELECT level, message, created_at FROM agent_logs
               WHERE agent_id = ?
               ORDER BY id DESC LIMIT ?""",
            (agent_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def seed_default_schedules(self):
        """Seed default schedules from config if none exist."""
        db = await get_db()
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM schedules")
        row = await cursor.fetchone()

        if row["cnt"] > 0:
            return  # Already seeded

        defaults = [
            ("ai_times", "cron", settings.aitimes_schedule_hour,
             settings.aitimes_schedule_minute, None),
            ("mailman", "interval", None, None,
             settings.mailman_schedule_interval_minutes),
            ("wallstreet_wolf", "cron", settings.wallstreet_schedule_hour,
             settings.wallstreet_schedule_minute, None),
            ("news_analyst", "cron", settings.news_schedule_hour,
             settings.news_schedule_minute, None),
        ]

        for agent_id, stype, hour, minute, interval in defaults:
            await db.execute(
                """INSERT OR IGNORE INTO schedules
                   (agent_id, schedule_type, cron_hour, cron_minute,
                    interval_minutes, enabled)
                   VALUES (?, ?, ?, ?, ?, 1)""",
                (agent_id, stype, hour, minute, interval),
            )
        await db.commit()
        print("[AGENT_MANAGER] Default schedules seeded")


# Singleton instance
agent_manager = AgentManager()
