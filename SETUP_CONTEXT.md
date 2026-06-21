# Multi-Agent Platform — Setup Context

> Use this file to quickly understand the project when continuing development on another machine with opencode. All configurations, decisions, and architecture notes are documented below.

---

## Quick Deploy (Other MacBook — i9, 32GB RAM)

```bash
# 1. Prerequisites
brew install ollama git
# Install Docker Desktop: https://www.docker.com/products/docker-desktop/

# 2. Clone + checkout pro-ui branch
git clone https://github.com/anasshahid1/multi-agent-platform.git
cd multi-agent-platform
git checkout pro-ui

# 3. Start Ollama + pull model
brew services start ollama
ollama pull qwen3:14b    # ~9GB, 20-30 min on typical connection

# 4. Configure .env
cp .env.example .env
# Edit .env — fill in Gmail credentials (App Password from Google Account)
# For 14B model, .env.example already has OLLAMA_MODEL=qwen3:14b

# 5. Build + start
docker compose up --build -d

# 6. Open dashboard
open http://localhost:3000
```

---

## Branch Strategy

| Branch | UI Style | Status |
|--------|----------|--------|
| **main** | Glassmorphism (old) — orbs, gradients, rainbow colors | Stable, not actively developed |
| **pro-ui** | Professional (new) — sidebar, Lucide icons, toasts, solid flat surfaces | **Active branch — use this** |
| ui-upgrade | Abandoned experiment | Can be deleted |

**Always work on `pro-ui`.** Never merge to `main` unless explicitly asked.

---

## Port Map

| Service | Port | Notes |
|---------|------|-------|
| Frontend (nginx) | `3000` | Proxies `/api/*` and `/ws/*` to backend |
| Backend (FastAPI) | `8000` | Container-internal only |
| Ollama (host) | `11434` | **Runs natively on Mac**, not in Docker |
| Backend → Ollama | `http://host.docker.internal:11434` | Via Docker DNS |

---

## Architecture

```
Browser :3000
  │
  ▼
nginx (frontend container)
  │  /api/*  ──►  backend container :8000
  │  /ws/*   ──►  backend container :8000
  │  /*      ──►  static React files
  ▼
FastAPI Backend
  ├── Orchestrator
  │   ├── scheduler.py     (LLM priority queue + 5-layer deadlock prevention)
  │   ├── monitor.py        (psutil CPU/RAM/Disk + alerts)
  │   └── agent_manager.py  (APScheduler lifecycle + schedule CRUD)
  ├── Agents
  │   ├── ai_times.py       (YouTube scrape → LLM summary → email)
  │   ├── mailman.py        (Gmail IMAP → LLM 5-category classification)
  │   ├── wallstreet_wolf.py (yfinance 25 stocks → LLM commentary → email)
  │   └── news_analyst.py   (RSS feedparser → LLM sentiment → email)
  ├── Services
  │   ├── llm_client.py     (Ollama HTTP client + token tracking)
  │   ├── email_service.py  (SMTP via aiosmtplib)
  │   └── youtube_service.py (scrapetube, no API key)
  └── Database
      ├── db.py             (SQLite via aiosqlite)
      └── models.py         (6 tables + seed data: 25 stocks, 8 RSS feeds)
   │
   ▼
Ollama (host) :11434
   └── qwen3:14b (or 8b)
```

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI entry, lifespan (DB init, agent register, schedule seed, shutdown) |
| `backend/config.py` | Pydantic Settings from .env |
| `backend/orchestrator/scheduler.py` | **LLM priority queue** — 5 deadlock mechanisms (max queue 10, timeout 120s, skip dead, priority ordering, single-lock), token tracking |
| `backend/orchestrator/monitor.py` | psutil CPU/RAM/Disk, 60-sample history, alert thresholds |
| `backend/orchestrator/agent_manager.py` | Agent lifecycle via APScheduler, schedule CRUD, manual triggers, concurrency guard |
| `backend/services/llm_client.py` | Ollama API, returns `LLMResponse` with full tokenization (input/output/total/tok/s) |
| `backend/agents/base_agent.py` | Abstract base class with `execute()` template |
| `backend/agents/ai_times.py` | YouTube search → LLM summary → HTML email |
| `backend/agents/mailman.py` | Gmail IMAP fetch → 5-category LLM classification |
| `backend/agents/wallstreet_wolf.py` | 25 stocks via yfinance (curl_cffi verify=False for SSL proxy) |
| `backend/agents/news_analyst.py` | 8 RSS feeds → LLM sentiment/importance |
| `backend/database/models.py` | 6 tables: agents, schedules, agent_logs, llm_queue, stocks, news_sources |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Main app with sidebar + main content layout |
| `frontend/src/App.css` | ~780 lines — professional dark theme, sidebar, toast, tab, skeleton styles |
| `frontend/src/components/Sidebar.jsx` | Left sidebar: logo, nav links, agent list with status + inline Run Now |
| `frontend/src/components/Toast.jsx` | Toast notification context + provider + component (slide-in, auto-dismiss) |
| `frontend/src/components/Header.jsx` | Top bar: breadcrumb, model badge, Ollama status dot |
| `frontend/src/components/Dashboard.jsx` | ResourceMonitor + AgentCard grid |
| `frontend/src/components/AgentCard.jsx` | Agent card with Lucide icon, left-border accent, Run Now button |
| `frontend/src/components/AgentDetail.jsx` | Tabbed detail view (Stats/Schedule/Logs) |
| `frontend/src/components/ResourceMonitor.jsx` | 3 gauges (CPU/RAM/Disk) + recharts AreaChart |
| `frontend/src/components/LLMMonitor.jsx` | LLM queue status, 8 stat cards, token pie chart, request history table |
| `frontend/src/components/ScheduleEditor.jsx` | Cron/interval toggle, save via toast |
| `frontend/src/components/LogViewer.jsx` | Color-coded log entries with icon empty state |
| `frontend/src/api/client.js` | REST functions + WebSocket connectivity |

---

## Env Variables (from `.env.example`)

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3:14b

# Gmail SMTP for sending email digests
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password      # 16-char Google App Password
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com

# Gmail IMAP for Mailman agent
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password

# Schedule defaults (overridable from dashboard)
AITIMES_SCHEDULE_HOUR=8
MAILMAN_SCHEDULE_INTERVAL_MINUTES=30
WALLSTREET_SCHEDULE_HOUR=16
NEWS_SCHEDULE_HOUR=7

# Thresholds
CPU_ALERT_THRESHOLD=90
RAM_ALERT_THRESHOLD=90
DISK_ALERT_THRESHOLD=90
LLM_REQUEST_TIMEOUT=120
LLM_MAX_QUEUE_SIZE=10
```

---

## Important Decisions

| Decision | Rationale |
|----------|-----------|
| **Python 3.11** (not 3.12) | Stability — package compatibility with psutil, curl_cffi, etc. |
| **Ollama native on Mac** (not Docker) | Docker Ollama image is 2.6GB and failed to pull on slow connection |
| **Qwen3:8B on this laptop, 14B on other** | 8B (5.2GB) fits 16GB RAM machine; 14B (9.3GB) needs 32GB |
| **SSL verification disabled** | Corporate proxy (Zscaler) breaks curl_cffi/yfinance; `PYTHONHTTPSVERIFY=0`, `curl_cffi Session(verify=False)` |
| **In-memory token tracking** (not DB) | Runtime stats only — no schema migration needed |
| **pro-ui branch kept separate** | User wants both UI versions (glassmorphism + professional) available |
| **No hosted LLM APIs** | All inference is local via Ollama — core requirement |
| **Lucide React icons** | Professional icon library used by Linear, Vercel — replaces hand-crafted inline SVGs |

---

## What's Been Tested (June 21, 2026)

Full flow verified via API:
1. Health check: `healthy`
2. Ollama: connected, qwen3:8b loaded (5.2 GB)
3. Agents: 4 registered, idle, correct schedules
4. Trigger AI-Times: YouTube scrape found 10 videos → LLM processed 333 input → 300 output tokens in 38.6s at 14.51 tok/s → agent completed with `success`, 10 items processed
5. LLM history: 1 completed request with full tokenization
6. Deadlock prevention: queue at 0/10, 0 deadlocks
7. Schedules: all 4 saved and active

---

## Docker Compose Details

`docker-compose.yml` defines 2 services:
- **backend**: Python 3.11-slim, pip with 300s timeout and 10 retries, DNS 8.8.8.8, `PYTHONHTTPSVERIFY=0`, `OLLAMA_BASE_URL=http://host.docker.internal:11434`
- **frontend**: Node 18 build → nginx alpine, proxy `/api/` and `/ws/` to backend

Ollama runs on the host. Docker container reaches it via `host.docker.internal` (special DNS on Mac/Windows).

---

## Demo Recording

See `demo-script.docx` — 10-minute walkthrough with word-for-word talking points covering:
1. Overview + architecture diagram (2 min)
2. Resource monitor + agent cards (2 min)
3. Agent detail + schedule editor (2 min)
4. LLM queue monitor + token tracking (2 min)
5. Deadlock prevention explanation (1 min)
6. Closing + links (1 min)

---

## GitHub

- Repo: `https://github.com/anasshahid1/multi-agent-platform`
- pro-ui branch: `https://github.com/anasshahid1/multi-agent-platform/tree/pro-ui`
