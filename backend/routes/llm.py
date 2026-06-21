"""
LLM scheduler status endpoint.

Provides the dashboard with:
- Current queue status (depth, active request, etc.)
- Processing statistics
- Request history
"""

from fastapi import APIRouter

from orchestrator.scheduler import llm_scheduler

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.get("/status")
async def get_llm_status():
    """Get LLM scheduler status for the dashboard."""
    return llm_scheduler.get_status()


@router.post("/cancel/{agent_id}")
async def cancel_agent_requests(agent_id: str):
    """Cancel all pending LLM requests from a specific agent."""
    cancelled = await llm_scheduler.cancel_pending(agent_id)
    return {
        "agent_id": agent_id,
        "cancelled": cancelled,
    }
