"""
Schedule CRUD endpoints.

Allows the dashboard to:
- View current schedules for all agents
- Update an agent's schedule (cron time, interval, enable/disable)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from database.db import get_db
from orchestrator.agent_manager import agent_manager

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class ScheduleUpdate(BaseModel):
    """Request body for updating an agent's schedule."""
    schedule_type: str  # "cron" or "interval"
    cron_hour: Optional[int] = None
    cron_minute: Optional[int] = None
    interval_minutes: Optional[int] = None
    enabled: bool = True


@router.get("/")
async def list_schedules():
    """Get all agent schedules."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT s.agent_id, s.schedule_type, s.cron_hour, s.cron_minute,
                  s.interval_minutes, s.enabled, s.updated_at,
                  a.name as agent_name
           FROM schedules s
           LEFT JOIN agents a ON s.agent_id = a.id
           ORDER BY s.agent_id"""
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/{agent_id}")
async def get_schedule(agent_id: str):
    """Get schedule for a specific agent."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT s.*, a.name as agent_name
           FROM schedules s
           LEFT JOIN agents a ON s.agent_id = a.id
           WHERE s.agent_id = ?""",
        (agent_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"No schedule found for agent '{agent_id}'",
        )
    return dict(row)


@router.put("/{agent_id}")
async def update_schedule(agent_id: str, schedule: ScheduleUpdate):
    """Update an agent's schedule. Takes effect immediately."""
    try:
        result = await agent_manager.update_schedule(
            agent_id=agent_id,
            schedule_type=schedule.schedule_type,
            cron_hour=schedule.cron_hour,
            cron_minute=schedule.cron_minute,
            interval_minutes=schedule.interval_minutes,
            enabled=schedule.enabled,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
