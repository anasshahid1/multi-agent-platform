# Demo Video Script — Multi-Agent Auto-Scheduling Platform
### Max Duration: 10 Minutes | Upload to: YouTube

---

## Minute 0:00 - 0:30 | Introduction

- State your name, project name
- "This is a multi-agent auto-scheduling platform running entirely locally using Ollama and Qwen3 — no cloud LLM APIs"
- Quick mention: Python backend, React dashboard, SQLite, Docker Compose

---

## Minute 0:30 - 1:30 | Architecture Overview

- Show the `architecture-diagram.png` on screen
- Walk through: "The orchestrator manages 4 agents, each has its own schedule, all share a single LLM through a priority queue with deadlock prevention"
- Run in terminal:
  ```bash
  docker compose ps
  ```
  Show 2 containers running (backend + frontend)
- Run in terminal:
  ```bash
  ollama list
  ```
  Show Qwen3 model loaded locally

---

## Minute 1:30 - 3:00 | Dashboard Tour

- Open `http://localhost:3000` in browser
- Show the **main dashboard**:
  - CPU / RAM / Disk gauges updating in real-time
- Show the **4 agent cards**:
  - All idle, showing next scheduled run times
- Click **"LLM Queue"** tab:
  - Show the queue is idle
  - Show stats from previous runs (processed count, avg latency, 0 deadlocks)
  - Show request history table with previous LLM calls

---

## Minute 3:00 - 4:30 | Trigger News Analyst (Live Demo)

- Click **"Run Now"** on the News Analyst card
- Show status change from "idle" to "running"
- Switch to **LLM Queue** tab:
  - Show active request processing
  - Show queue items appearing one by one
  - Watch the history table populate as each article is analyzed
- Switch back to agent card:
  - Show it completed with items processed count (should be ~15 articles)

---

## Minute 4:30 - 5:30 | News Analyst Detail View

- Click on the News Analyst card to open **detail view**
- Show **Run Statistics**:
  - Last run time
  - Duration (~3-4 minutes)
  - Items processed
- Show **Agent Logs**:
  - Scroll through log entries
  - Point out INFO, WARNING levels
  - Show article titles being analyzed
- Show **Schedule Editor**:
  - Change the schedule time from the UI
  - Click Save
  - "Schedules can be changed from the dashboard without restarting anything"

---

## Minute 5:30 - 6:30 | Trigger AI-Times (Live Demo)

- Go back to dashboard
- Click **"Run Now"** on AI-Times
- Show it fetching YouTube videos and summarizing with LLM
- Click into detail view to show the logs:
  - "Searching YouTube for AI news videos..."
  - "Found X videos"
  - LLM generating summary
- Point out: "No YouTube API key needed — uses scrapetube for free scraping"

---

## Minute 6:30 - 7:30 | Wallstreet Wolf Demo

- Click **"Run Now"** on Wallstreet Wolf
- Show it loading 25 stocks from the database
- Show it fetching data from Yahoo Finance
- Show the LLM generating market commentary
- Show logs with stock tracking activity
- Point out: "25 stocks tracked including AAPL, NVDA, TSLA, MSFT, META, ZS, CRWD, and more"
- Point out: "yfinance is free — no API key needed"

---

## Minute 7:30 - 8:00 | Mailman Explanation

- Click on Mailman detail view
- Show the schedule (every 30 minutes)
- Explain:
  > "Mailman connects to Gmail via IMAP, fetches unread emails, and classifies each one with the LLM into five categories: URGENT, IMPORTANT, NEWSLETTER, NOTIFICATION, or SPAM"
- If Gmail is configured, trigger a quick run and show the classification logs
- If not configured, show the code and explain the flow

---

## Minute 8:00 - 9:00 | Orchestrator Features (Key for 15 marks)

**This section is critical — it's worth 15 marks. Explain each mechanism clearly.**

- Switch to **LLM Queue** tab
- Point out the stats:
  - Total processed
  - 0 failures
  - 0 deadlocks prevented
  - Average latency per request

- Explain the **LLM Scheduling** system:
  > "All 4 agents share a single local LLM — Qwen3. Since only one inference can run at a time, we use a priority queue. Mailman gets HIGH priority because email classification is time-sensitive. Other agents get NORMAL priority. The worker loop processes one request at a time — pulls the highest priority item, sends it to Ollama, waits for the response, then moves to the next."

- Explain **Deadlock Prevention** (5 mechanisms):
  > "We have 5 layers of deadlock prevention:"
  >
  > "Layer 1 — Max Queue Size: If the queue reaches 10 pending requests, new requests are immediately rejected. This prevents memory exhaustion from an unbounded queue."
  >
  > "Layer 2 — Priority Ordering: High-priority requests always process first, even if submitted later. This prevents starvation where critical tasks get stuck behind long-running low-priority ones."
  >
  > "Layer 3 — Request Timeout: Every request has a 120-second maximum wait time. If the LLM hangs or the queue is overloaded, the request is automatically cancelled. Without this, agents would block forever — classic deadlock."
  >
  > "Layer 4 — Skip Dead Requests: The worker loop checks each request's status before processing it. If a request was already timed out or cancelled, it's skipped immediately so the queue doesn't get clogged."
  >
  > "Layer 5 — Single-Lock Processing: An asyncio Lock ensures only one request accesses the LLM at a time. No race conditions, no concurrent inference calls."

- Point to the dashboard stats:
  > "All these metrics are tracked — deadlocks prevented, timeouts, failures — and displayed here in real-time."

- Show **Resource Monitor**:
  - CPU / RAM / Disk gauges
  - "The orchestrator monitors system resources using psutil. Alerts trigger when any metric exceeds 90%. This data is pushed to the dashboard every 5 seconds via WebSocket."
  - "History is stored for the last 60 samples for charting."

---

## Minute 9:00 - 9:45 | Code Quality + Repository

- Open the GitHub repo in browser:
  ```
  https://github.com/anasshahid1/multi-agent-platform
  ```
- Show the README with setup instructions
- Show the project structure:
  - Clean separation: orchestrator, agents, services, routes
  - Each agent inherits from BaseAgent
  - Shared services (email, LLM client, YouTube scraper)
- Show the architecture diagram in the repo

---

## Minute 9:45 - 10:00 | Closing

- "Everything runs locally — Ollama with Qwen3, no cloud APIs, no data leaves your machine"
- "Deployment is a single `docker compose up` command"
- "Thank you"

---

## Recording Checklist

- [ ] Ollama running with Qwen3 model loaded (`ollama list` shows model)
- [ ] Docker containers running (`docker compose ps` shows backend + frontend)
- [ ] Dashboard open at http://localhost:3000
- [ ] Screen recording software ready (QuickTime / OBS)
- [ ] Microphone working for voiceover
- [ ] Close unnecessary tabs/apps for a clean screen
- [ ] Run News Analyst once before recording so LLM Queue has history to show
- [ ] Upload to YouTube (public or unlisted)
- [ ] Video is under 10 minutes

## Terminal Commands to Have Ready

```bash
# Show containers
docker compose ps

# Show Ollama model
ollama list

# Trigger agents via CLI (backup if dashboard buttons don't work)
curl -X POST http://localhost:3000/api/agents/news_analyst/trigger
curl -X POST http://localhost:3000/api/agents/ai_times/trigger
curl -X POST http://localhost:3000/api/agents/wallstreet_wolf/trigger
curl -X POST http://localhost:3000/api/agents/mailman/trigger

# Check agent status
curl http://localhost:3000/api/agents/ | python3 -m json.tool

# Check LLM activity
curl http://localhost:3000/api/llm/status | python3 -m json.tool
```
