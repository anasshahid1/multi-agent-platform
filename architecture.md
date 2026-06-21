# Architecture Diagram

## System Architecture

```mermaid
graph TB
    subgraph "Browser"
        UI[React Dashboard<br/>localhost:3000]
    end

    subgraph "Docker Container: Frontend"
        NGINX[nginx<br/>Reverse Proxy]
    end

    subgraph "Docker Container: Backend"
        API[FastAPI Server<br/>localhost:8000]

        subgraph "Orchestrator"
            SCHED[LLM Scheduler<br/>Priority Queue<br/>Deadlock Prevention]
            MON[Resource Monitor<br/>CPU / RAM / Disk]
            AM[Agent Manager<br/>APScheduler<br/>Lifecycle Control]
        end

        subgraph "Agents"
            A1[AI-Times<br/>YouTube Digest]
            A2[Mailman<br/>Email Classifier]
            A3[Wallstreet Wolf<br/>Stock Tracker]
            A4[News Analyst<br/>RSS Sentiment]
        end

        subgraph "Services"
            LLM_CLIENT[LLM Client<br/>Ollama API]
            EMAIL[Email Service<br/>SMTP]
            YT[YouTube Service<br/>scrapetube]
        end

        DB[(SQLite<br/>Database)]
    end

    subgraph "Host Machine"
        OLLAMA[Ollama Server<br/>localhost:11434]
        QWEN[Qwen3 Model<br/>8B or 14B]
    end

    subgraph "External APIs (Free)"
        YAHOO[Yahoo Finance]
        RSS[RSS Feeds<br/>BBC, Reuters, etc.]
        GMAIL[Gmail<br/>IMAP / SMTP]
        YOUTUBE[YouTube]
    end

    UI -->|HTTP / WebSocket| NGINX
    NGINX -->|/api/*| API
    NGINX -->|/ws/*| API

    API --> AM
    API --> SCHED
    API --> MON

    AM --> A1
    AM --> A2
    AM --> A3
    AM --> A4

    A1 --> SCHED
    A2 --> SCHED
    A3 --> SCHED
    A4 --> SCHED

    A1 --> YT
    A1 --> EMAIL
    A2 --> EMAIL
    A3 --> EMAIL
    A4 --> EMAIL

    SCHED --> LLM_CLIENT
    LLM_CLIENT -->|host.docker.internal| OLLAMA
    OLLAMA --> QWEN

    A1 --> DB
    A2 --> DB
    A3 --> DB
    A4 --> DB
    AM --> DB
    SCHED --> DB

    YT --> YOUTUBE
    A3 --> YAHOO
    A4 --> RSS
    A2 --> GMAIL
    EMAIL --> GMAIL
```

## Deadlock Prevention Architecture

```mermaid
graph TD
    subgraph "Agent Request"
        REQ[Agent submits LLM request]
    end

    subgraph "Layer 1: Queue Guard"
        QC{Queue full?<br/>max 10 items}
        REJECT[REJECT request<br/>deadlocks_prevented++]
    end

    subgraph "Layer 2: Priority Queue"
        PQ[Priority Queue<br/>CRITICAL > HIGH > NORMAL > LOW]
    end

    subgraph "Layer 3: Timeout Guard"
        WAIT{Waiting > 120s?}
        TIMEOUT[TIMEOUT request<br/>total_timeouts++<br/>deadlocks_prevented++]
    end

    subgraph "Layer 4: Worker Loop"
        SKIP{Request still<br/>valid?}
        SKIPACT[SKIP dead request]
    end

    subgraph "Layer 5: Single Lock"
        LOCK[asyncio.Lock<br/>ONE request at a time]
        LLM[Ollama Qwen3<br/>Generate response]
    end

    RESULT[Return result to agent]

    REQ --> QC
    QC -->|Yes| REJECT
    QC -->|No| PQ
    PQ --> WAIT
    WAIT -->|Yes| TIMEOUT
    WAIT -->|No| SKIP
    SKIP -->|Cancelled/Timed out| SKIPACT
    SKIP -->|Valid| LOCK
    LOCK --> LLM
    LLM --> RESULT
```

### Deadlock Prevention Mechanisms

| Layer | Mechanism | What It Prevents | Config |
|-------|-----------|-----------------|--------|
| 1 | **Max Queue Size** | Memory exhaustion from unbounded queue | `LLM_MAX_QUEUE_SIZE=10` |
| 2 | **Priority Ordering** | Starvation of critical tasks | `RequestPriority.HIGH` for Mailman |
| 3 | **Request Timeout** | Infinite blocking when LLM hangs | `LLM_REQUEST_TIMEOUT=120` seconds |
| 4 | **Skip Dead Requests** | Stale entries clogging the queue | Automatic in worker loop |
| 5 | **Single-Lock Processing** | Race conditions on LLM access | `asyncio.Lock` in scheduler |

All metrics are tracked and exposed via `/api/llm/status`:
- `deadlocks_prevented` — Total times Layer 1 or Layer 3 fired
- `total_timeouts` — Total timed-out requests
- `total_processed` — Successfully completed requests
- `total_failed` — Requests that errored during LLM inference
- `avg_latency_seconds` — Average time per LLM request

---

## LLM Request Flow

```mermaid
sequenceDiagram
    participant Agent
    participant Scheduler as LLM Scheduler
    participant Queue as Priority Queue
    participant Client as LLM Client
    participant Ollama

    Agent->>Scheduler: submit(prompt, priority)
    Scheduler->>Scheduler: Check queue size (deadlock prevention)
    Scheduler->>Queue: Add request (priority-ordered)
    Scheduler->>Scheduler: Wait for result (with timeout)

    loop Process Queue
        Queue->>Scheduler: Next highest priority request
        Scheduler->>Client: generate(prompt)
        Client->>Ollama: POST /api/generate
        Ollama-->>Client: Response + tokens
        Client-->>Scheduler: Result
        Scheduler-->>Agent: Return response
    end

    Note over Scheduler: Only ONE request processes at a time
    Note over Scheduler: Timeout prevents deadlocks
    Note over Scheduler: Max queue size prevents memory exhaustion
```

## Agent Scheduling Flow

```mermaid
sequenceDiagram
    participant Dashboard
    participant API as FastAPI
    participant AM as Agent Manager
    participant APS as APScheduler
    participant Agent
    participant DB as SQLite

    Note over Dashboard: Manual Trigger
    Dashboard->>API: POST /api/agents/{id}/trigger
    API->>AM: trigger_agent(id)
    AM->>Agent: run()
    Agent->>Agent: execute()
    Agent->>DB: Log results

    Note over APS: Scheduled Trigger
    APS->>AM: Cron/Interval fires
    AM->>Agent: run()
    Agent->>Agent: execute()
    Agent->>DB: Log results

    Note over Dashboard: Schedule Update
    Dashboard->>API: PUT /api/schedules/{id}
    API->>AM: update_schedule()
    AM->>DB: Save new schedule
    AM->>APS: Remove old job
    AM->>APS: Add new job
    APS-->>Dashboard: Schedule active immediately
```
