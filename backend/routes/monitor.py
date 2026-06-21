"""
System monitoring endpoints.

Provides CPU, RAM, disk metrics and alerts for the dashboard.
"""

from fastapi import APIRouter

from orchestrator.monitor import resource_monitor
from services.llm_client import llm_client

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@router.get("/system")
async def get_system_metrics():
    """Get current system resource metrics (CPU, RAM, disk)."""
    return resource_monitor.get_current()


@router.get("/system/history")
async def get_system_history():
    """Get historical system metrics for charts."""
    return resource_monitor.get_history()


@router.get("/alerts")
async def get_alerts():
    """Get current system alerts."""
    return resource_monitor.get_alerts()


@router.get("/ollama")
async def get_ollama_status():
    """Check Ollama connectivity and model info."""
    available = await llm_client.is_available()
    model_info = await llm_client.get_model_info() if available else None

    return {
        "available": available,
        "base_url": llm_client.base_url,
        "model": llm_client.model,
        "model_info": model_info,
    }
