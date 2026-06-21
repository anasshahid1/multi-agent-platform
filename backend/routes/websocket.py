"""
WebSocket endpoint for real-time dashboard updates.

Pushes system metrics, agent status, and LLM queue updates
to connected dashboard clients every 5 seconds.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from orchestrator.monitor import resource_monitor
from orchestrator.scheduler import llm_scheduler
from orchestrator.agent_manager import agent_manager

router = APIRouter()

# Track connected clients
_connected_clients: list[WebSocket] = []


@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """
    WebSocket connection for real-time dashboard updates.

    Sends a JSON payload every 5 seconds with:
    - system: CPU/RAM/disk metrics
    - agents: All agent statuses
    - llm: LLM scheduler status
    - alerts: Active alerts
    """
    await websocket.accept()
    _connected_clients.append(websocket)

    try:
        while True:
            # Build the update payload
            payload = {
                "type": "dashboard_update",
                "system": resource_monitor.get_current(),
                "agents": agent_manager.get_all_agents_info(),
                "llm": llm_scheduler.get_status(),
                "alerts": resource_monitor.get_alerts(),
            }

            await websocket.send_text(json.dumps(payload, default=str))

            # Wait 5 seconds before next update
            # Also listen for any incoming messages (like ping)
            try:
                await asyncio.wait_for(
                    websocket.receive_text(), timeout=5.0
                )
            except asyncio.TimeoutError:
                pass  # No message received, send next update

    except WebSocketDisconnect:
        _connected_clients.remove(websocket)
    except Exception:
        if websocket in _connected_clients:
            _connected_clients.remove(websocket)


async def broadcast_event(event_type: str, data: dict):
    """
    Broadcast an event to all connected dashboard clients.
    Used for immediate notifications (agent started, LLM request complete, etc.)
    """
    if not _connected_clients:
        return

    payload = json.dumps({
        "type": event_type,
        "data": data,
    }, default=str)

    disconnected = []
    for client in _connected_clients:
        try:
            await client.send_text(payload)
        except Exception:
            disconnected.append(client)

    for client in disconnected:
        _connected_clients.remove(client)
