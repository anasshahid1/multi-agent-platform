"""
Agent API endpoints.

Provides REST API for:
- Listing all agents and their status
- Getting individual agent details
- Manually triggering agent runs
- Getting agent logs
"""

from fastapi import APIRouter, HTTPException

from orchestrator.agent_manager import agent_manager

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("/")
async def list_agents():
    """Get all agents with their current status."""
    return agent_manager.get_all_agents_info()


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """Get detailed info for a specific agent."""
    info = agent_manager.get_agent_info(agent_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return info


@router.post("/{agent_id}/trigger")
async def trigger_agent(agent_id: str):
    """Manually trigger an agent run."""
    try:
        result = await agent_manager.trigger_agent(agent_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{agent_id}/logs")
async def get_agent_logs(agent_id: str, limit: int = 50):
    """Get recent logs for a specific agent."""
    info = agent_manager.get_agent_info(agent_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    logs = await agent_manager.get_agent_logs(agent_id, limit)
    return {"agent_id": agent_id, "logs": logs}
