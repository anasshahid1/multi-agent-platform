# Multi-Agent Auto-Scheduling Platform

A fully operational multi-agent platform running entirely on your local machine using a locally hosted LLM (Ollama + Qwen3). A central orchestrator manages four specialized agents, handles resource scheduling with deadlock prevention, and serves a real-time web dashboard.

**All AI inference is 100% local — no hosted LLM APIs, no data leaves your machine.**

---

## Architecture

```
                         +---------------------------+
                         |     React Dashboard       |
                         |     (localhost:3000)       |
                         +---------------------------+
                                    |
                              nginx reverse proxy
                              /api/* -> backend
                              /ws/*  -> backend
                                    |
                         +---------------------------+
                         |   FastAPI Backend          |
                         |   (localhost:8000)          |
                         |                           |
                         |  +---------------------+  |
                         |  |   Orchestrator       |  |
                         |  |  - LLM Scheduler     |  |
                         |  |  - Resource Monitor  |  |
                         |  |  - Agent Manager     |  |
                         |  +---------------------+  |
                         |                           |
                         |  +-----+  +----------+   |
                         |  | AI- |  | Mailman  |   |
                         |  |Times|  |          |   |
                         |  +-----+  +----------+   |
                         |  +----------+ +--------+  |
                         |  |Wallstreet| | News   |  |
                         |  |  Wolf    | |Analyst |  |
                         |  +----------+ +--------+  |
                         +---------------------------+
                                    |
                         +---------------------------+
                         |   Ollama (localhost:11434) |
                         |   Qwen3 model (local)     |
                         +---------------------------+
                                    |
                         +---------------------------+
                         |   SQLite Database          |
                         +---------------------------+
```

---

## Agents

| Agent | Function | Schedule | Data Source |
|-------|----------|----------|------------|
| **AI-Times** | Fetches latest AI YouTube videos, LLM summarizes, sends HTML email digest | Daily at 8:00 AM | YouTube (scrapetube) |
| **Mailman** | Monitors Gmail inbox, classifies emails with LLM (URGENT/IMPORTANT/NEWSLETTER/NOTIFICATION/SPAM) | Every 30 minutes | Gmail IMAP |
| **Wallstreet Wolf** | Tracks 25 stocks, LLM generates market commentary, sends daily report | Daily at 4:30 PM ET | Yahoo Finance (yfinance) |
| **News Analyst** | Fetches articles from RSS feeds, LLM analyzes sentiment + importance, sends digest | Daily at 7:00 AM | RSS feeds (feedparser) |

All schedules are configurable from the dashboard at runtime — no restart needed.

---

## 100% Local AI Inference

All AI inference runs entirely on your local machine. No data is sent to any cloud service.

| Component | Where It Runs | Cloud Required? |
|-----------|--------------|-----------------|
| **Ollama Server** | Local process at `localhost:11434` | No |
| **Qwen3 Model** | Model weights in `~/.ollama/`, loaded into local RAM | No |
| **LLM API Calls** | Backend calls `http://host.docker.internal:11434` (localhost) | No |

**What we do NOT use:** No OpenAI, no Google Gemini, no Anthropic Claude, no AWS Bedrock, no Azure OpenAI, no Hugging Face Inference API — no hosted LLM service of any kind.

The one-time setup downloads (Ollama install, model weights, Python packages) require internet, but after setup you can disconnect from the internet entirely and all LLM inference still works. The agents that fetch external data (RSS feeds, Yahoo Finance, YouTube) need internet for data collection, but the AI analysis (summarizing, classifying, sentiment analysis) is 100% local.

---

## Orchestrator & LLM Scheduling

The orchestrator is the central brain of the platform. It consists of three components:

### 1. LLM Scheduler (`orchestrator/scheduler.py`)

Since all 4 agents share a single local LLM (Qwen3), requests must be queued and processed one at a time. The scheduler implements:

- **Priority Queue** — Requests are ordered by priority. Mailman gets `HIGH` priority (email classification is time-sensitive), other agents get `NORMAL` priority. This prevents low-priority tasks from starving urgent ones.
- **Sequential Processing** — Only ONE LLM request runs at a time. The worker loop pulls the highest-priority request from the queue, sends it to Ollama, waits for the response, then processes the next.
- **Request Tracking** — Every request is logged to the database with: agent ID, task description, priority, status, start time, completion time, duration, and tokens generated.

### 2. Deadlock Prevention (`orchestrator/scheduler.py`)

Five mechanisms prevent the system from getting stuck:

| Mechanism | What It Prevents | How It Works |
|-----------|-----------------|--------------|
| **Max Queue Size (10)** | Memory exhaustion from unbounded queue | New requests are immediately rejected with an error when the queue reaches 10 pending items. Counter incremented in `deadlocks_prevented`. |
| **Request Timeout (120s)** | Infinite blocking when LLM hangs or queue is overloaded | Every request has a 120-second maximum wait time. If exceeded, the request is cancelled and a `TimeoutError` is raised. Counter incremented in `deadlocks_prevented` and `total_timeouts`. |
| **Skip Dead Requests** | Stale entries clogging the queue | The worker loop checks each request's status before processing. Cancelled or timed-out requests are skipped immediately. |
| **Priority Ordering** | Starvation of critical tasks | High-priority requests (e.g., Mailman email classification) always process before low-priority ones, even if they were submitted later. |
| **Single-Lock Processing** | Race conditions on LLM access | An `asyncio.Lock` ensures only one request accesses the LLM at a time. No concurrent inference calls. |

All deadlock prevention metrics are exposed to the dashboard via the `/api/llm/status` endpoint and displayed in the LLM Queue Monitor view.

### 3. Resource Monitor (`orchestrator/monitor.py`)

Tracks system resources in real-time using `psutil`:

- **CPU Usage** — Current percentage across all cores
- **RAM Usage** — Used vs total, percentage, available memory
- **Disk Usage** — Used vs total, percentage, free space
- **Alert Thresholds** — Configurable via `.env` (default: 90%). Alerts appear on the dashboard when any metric exceeds its threshold.
- **History** — Stores the last 60 samples (1 per minute) for the dashboard charts.

### 4. Agent Manager (`orchestrator/agent_manager.py`)

Manages the lifecycle of all agents:

- **Registration** — Each agent is registered in the database on startup with its ID, name, and description.
- **Scheduling** — Uses APScheduler to run agents at configured times. Supports cron (fixed time) and interval triggers.
- **Manual Triggers** — Agents can be triggered on-demand from the dashboard via the "Run Now" button.
- **Runtime Schedule Changes** — Schedules can be modified from the dashboard UI. Changes are persisted to SQLite and take effect immediately — no restart needed.
- **Concurrency Guard** — An agent cannot be triggered if it's already running, preventing duplicate runs.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11, FastAPI, APScheduler, aiosqlite |
| Frontend | React 18, Vite 5, served via nginx |
| Database | SQLite |
| LLM | Ollama + Qwen3 (runs locally) |
| Deployment | Docker Compose (2 containers: backend + frontend) |
| Email | Gmail SMTP/IMAP (App Password) |
| Stock Data | yfinance (free, no API key) |
| YouTube | scrapetube (free, no API key) |
| News | RSS feeds via feedparser (free, no API key) |

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **Docker Desktop** — [Download](https://www.docker.com/products/docker-desktop/)
2. **Ollama** — Install via Homebrew:
   ```bash
   brew install ollama
   ```
3. **Git** — [Download](https://git-scm.com/downloads)

### Gmail Setup (for Mailman + email digests)

1. Enable 2-Factor Authentication on your Google account
2. Create an App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Save the 16-character app password — you'll need it for `.env`

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/anasshahid1/multi-agent-platform.git
cd multi-agent-platform
```

### 2. Start Ollama and pull the model

```bash
# Start Ollama service
brew services start ollama

# Pull the Qwen3 model (one-time download)
# Use 8B for faster inference, 14B for better quality
ollama pull qwen3:8b
# OR for the other laptop with 32GB RAM:
# ollama pull qwen3:14b
```

Wait for the model download to complete. This is a one-time ~5-9GB download.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Gmail credentials:

```env
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-16-char-app-password
```

If using Qwen3:14B instead of 8B, also update:
```env
OLLAMA_MODEL=qwen3:14b
```

### 4. Build and start the platform

```bash
docker compose up --build -d
```

First build takes a few minutes (downloads Python packages). Subsequent starts are instant.

### 5. Open the dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the dashboard with:
- CPU / RAM / Disk gauges
- 4 agent cards (AI-Times, Mailman, Wallstreet Wolf, News Analyst)
- All agents in "idle" status with their next scheduled run times

### 6. Test an agent

Click **"Run Now"** on any agent card, or use the API:

```bash
# Trigger the News Analyst
curl -X POST http://localhost:3000/api/agents/news_analyst/trigger

# Check its status
curl http://localhost:3000/api/agents/news_analyst

# View LLM queue activity
curl http://localhost:3000/api/llm/status
```

---

## Dashboard Features

| Feature | Description |
|---------|-------------|
| **Resource Monitor** | Real-time CPU, RAM, Disk gauges with alert thresholds |
| **Agent Cards** | Status, last run, next run, items processed, "Run Now" button |
| **Agent Detail View** | Click any agent for logs, schedule editor, run history |
| **Schedule Editor** | Change agent schedules from the UI — takes effect immediately |
| **LLM Queue Monitor** | Active request, queue depth, processed count, avg latency, deadlock stats |
| **Request History** | Table of all LLM requests with agent, task, duration, tokens |
| **Real-time Updates** | WebSocket connection pushes updates every 5 seconds |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/agents/` | List all agents |
| GET | `/api/agents/{id}` | Get agent details |
| POST | `/api/agents/{id}/trigger` | Manually trigger agent |
| GET | `/api/agents/{id}/logs` | Get agent logs |
| GET | `/api/schedules/` | List all schedules |
| PUT | `/api/schedules/{id}` | Update agent schedule |
| GET | `/api/monitor/system` | System metrics (CPU/RAM/Disk) |
| GET | `/api/monitor/ollama` | Ollama connection status |
| GET | `/api/llm/status` | LLM scheduler status + history |
| WS | `/ws/dashboard` | Real-time WebSocket updates |

---

## Project Structure

```
.
├── docker-compose.yml          # 2 services: backend + frontend
├── .env.example                # Environment variable template
├── .gitignore
├── README.md
├── architecture.md             # Architecture diagram (Mermaid)
├── backend/
│   ├── Dockerfile              # Python 3.11-slim
│   ├── requirements.txt        # Pinned Python dependencies
│   ├── main.py                 # FastAPI entry point + lifecycle
│   ├── config.py               # Pydantic settings from .env
│   ├── orchestrator/
│   │   ├── scheduler.py        # LLM priority queue + deadlock prevention
│   │   ├── monitor.py          # CPU/RAM/Disk monitoring + alerts
│   │   └── agent_manager.py    # Agent lifecycle + APScheduler
│   ├── agents/
│   │   ├── base_agent.py       # Abstract base class
│   │   ├── ai_times.py         # YouTube AI digest agent
│   │   ├── mailman.py          # Gmail classifier agent
│   │   ├── wallstreet_wolf.py  # Stock tracker agent
│   │   └── news_analyst.py     # RSS news analyst agent
│   ├── services/
│   │   ├── llm_client.py       # Ollama API client
│   │   ├── email_service.py    # SMTP email sender
│   │   └── youtube_service.py  # YouTube scraper
│   ├── database/
│   │   ├── db.py               # SQLite async connection
│   │   └── models.py           # Table schemas + seed data
│   └── routes/
│       ├── agents.py           # Agent CRUD + trigger endpoints
│       ├── scheduler.py        # Schedule CRUD endpoints
│       ├── monitor.py          # System metrics endpoints
│       ├── llm.py              # LLM queue status endpoints
│       └── websocket.py        # Real-time WebSocket
├── frontend/
│   ├── Dockerfile              # Node build + nginx serve
│   ├── nginx.conf              # Reverse proxy config
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Main app + view routing
│       ├── App.css             # Dark theme dashboard styles
│       ├── api/
│       │   └── client.js       # REST + WebSocket client
│       └── components/
│           ├── Header.jsx
│           ├── Dashboard.jsx
│           ├── AgentCard.jsx
│           ├── AgentDetail.jsx
│           ├── ResourceMonitor.jsx
│           ├── LLMMonitor.jsx
│           ├── ScheduleEditor.jsx
│           └── LogViewer.jsx
```

---

## Stopping the Platform

```bash
# Stop all containers
docker compose down

# Stop Ollama
brew services stop ollama
```

---

## Switching to Qwen3:14B (for 32GB RAM machines)

```bash
# Pull the larger model
ollama pull qwen3:14b

# Update .env
# Change: OLLAMA_MODEL=qwen3:14b

# Restart backend
docker compose restart backend
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ollama not connecting | Ensure `brew services start ollama` is running |
| Model not found | Run `ollama pull qwen3:8b` (or 14b) |
| Slow LLM responses | Expected on CPU-only (~10-15s per request for 8B) |
| Stock data empty | Yahoo Finance may be rate-limited; wait and retry |
| Email not sending | Check `.env` Gmail credentials + App Password |
| SSL errors in Docker | Already handled — platform disables SSL verification for external API calls inside Docker |
| Dashboard blank | Check `docker compose ps` — both containers should be running |
