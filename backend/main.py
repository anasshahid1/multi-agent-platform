"""
Multi-Agent Auto-Scheduling Platform — FastAPI Entry Point

Provides:
- REST API for agent management, scheduling, and monitoring
- WebSocket endpoint for real-time dashboard updates
- Health check endpoint for Docker container orchestration
- Orchestrator startup (scheduler, monitor, agent manager)
"""

import ssl
import os

# Handle SSL interception (corporate proxies like Zscaler)
# This only affects outbound requests from agents, not security of the platform
if os.environ.get("PYTHONHTTPSVERIFY") == "0":
    ssl._create_default_https_context = ssl._create_unverified_context

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.db import init_db, close_db
from orchestrator.scheduler import llm_scheduler
from orchestrator.agent_manager import agent_manager
from agents.ai_times import AITimesAgent
from agents.mailman import MailmanAgent
from agents.wallstreet_wolf import WallstreetWolfAgent
from agents.news_analyst import NewsAnalystAgent
from routes import agents, scheduler, monitor, llm, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle for the application."""
    # --- Startup ---
    await init_db()
    print(f"[STARTUP] Database initialized at {settings.database_path}")
    print(f"[STARTUP] Ollama endpoint: {settings.ollama_base_url}")
    print(f"[STARTUP] LLM model: {settings.ollama_model}")

    # Register all agents
    agent_manager.register(AITimesAgent())
    agent_manager.register(MailmanAgent())
    agent_manager.register(WallstreetWolfAgent())
    agent_manager.register(NewsAnalystAgent())
    print("[STARTUP] All agents registered")

    # Seed default schedules if first run
    await agent_manager.seed_default_schedules()

    # Start the LLM scheduler
    await llm_scheduler.start()
    print("[STARTUP] LLM scheduler started")

    # Start the agent manager (registers agents + loads schedules)
    await agent_manager.start()
    print("[STARTUP] Agent manager started")

    yield

    # --- Shutdown ---
    await llm_scheduler.stop()
    await agent_manager.stop()
    await close_db()
    print("[SHUTDOWN] All services stopped")


app = FastAPI(
    title="Multi-Agent Auto-Scheduling Platform",
    description="A local-first multi-agent system with LLM scheduling and monitoring",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(agents.router)
app.include_router(scheduler.router)
app.include_router(monitor.router)
app.include_router(llm.router)
app.include_router(websocket.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint for Docker and monitoring."""
    return {
        "status": "healthy",
        "service": "multi-agent-platform",
        "ollama_url": settings.ollama_base_url,
        "model": settings.ollama_model,
    }
