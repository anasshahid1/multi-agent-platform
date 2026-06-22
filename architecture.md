# Architecture Diagrams

## System Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#ffffff', 'primaryColor': '#3b82f6', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#2563eb', 'lineColor': '#94a3b8', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#e2e8f0', 'fontSize': '14px'}}}%%
graph TB
    subgraph Browser["Browser"]
    style Browser fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#4338ca
        UI["React Dashboard<br/>localhost:3001"]
    end

    subgraph Frontend["Docker Container: Frontend"]
    style Frontend fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1d4ed8
        NGINX["nginx Reverse Proxy"]
    end

    subgraph Backend["Docker Container: Backend"]
    style Backend fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1d4ed8

        subgraph Orchestrator["Orchestrator"]
        style Orchestrator fill:#f8fafc,stroke:#94a3b8,stroke-dasharray:3 3,color:#475569
            SCHED["LLM Scheduler<br/>Priority Queue + Deadlock Prevention"]
            MON["Resource Monitor<br/>CPU / RAM / Disk"]
            AM["Agent Manager<br/>APScheduler Lifecycle"]
        end

        subgraph Agents["Agents"]
        style Agents fill:#f0fdf4,stroke:#10b981,stroke-dasharray:3 3,color:#047857
            A1["AI-Times<br/>YouTube AI Digest"]
            A2["Mailman<br/>Gmail Classifier"]
            A3["Wallstreet Wolf<br/>Stock Tracker"]
            A4["News Analyst<br/>RSS Sentiment"]
        end

        subgraph Services["Services"]
        style Services fill:#fff7ed,stroke:#f59e0b,stroke-dasharray:3 3,color:#b45309
            LLM_CLIENT["LLM Client<br/>Ollama HTTP API"]
            EMAIL["Email Service<br/>SMTP (aiosmtplib)"]
            YT["YouTube Service<br/>scrapetube"]
        end

        DB["(SQLite Database)"]
        style DB fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#92400e,stroke-dasharray:5 2
    end

    subgraph Host["Host Machine"]
    style Host fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#b91c1c
        OLLAMA["Ollama Server :11434"]
        QWEN["Qwen3 8B (CPU)"]
    end

    subgraph External["External APIs (Free)"]
    style External fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#6d28d9
        YAHOO["Yahoo Finance"]
        RSS["RSS Feeds<br/>BBC / Reuters / TechCrunch"]
        GMAIL["Gmail IMAP + SMTP"]
        YOUTUBE["YouTube (scrapetube)"]
    end

    UI -->|"HTTP / WebSocket"| NGINX
    NGINX -->|"/api/*"| API
    NGINX -->|"/ws/*"| API
    API --> SCHED

    API --> AM
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

    A2 -.->|"IMAP"| GMAIL
    EMAIL -.->|"SMTP"| GMAIL

    SCHED --> LLM_CLIENT
    LLM_CLIENT -->|"host.docker.internal:11434"| OLLAMA
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
```

## Deadlock Prevention Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#ffffff', 'primaryColor': '#3b82f6', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#2563eb', 'lineColor': '#94a3b8', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#e2e8f0'}}}%%
graph TD
    subgraph Layer1["Layer 1: Queue Guard"]
    style Layer1 fill:#f0fdf4,stroke:#10b981,stroke-width:2px,color:#047857
        QC{"Queue full?<br/>(max 10)"}
        REJECT["REJECT request<br/>deadlocks_prevented++"]
    end

    subgraph Layer2["Layer 2: Priority Queue"]
    style Layer2 fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1d4ed8
        PQ["Priority Queue<br/>CRITICAL > HIGH > NORMAL > LOW"]
    end

    subgraph Layer3["Layer 3: Timeout Guard"]
    style Layer3 fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#b91c1c
        WAIT{"Waiting > 120s?"}
        TIMEOUT["TIMEOUT request<br/>total_timeouts++"]
    end

    subgraph Layer4["Layer 4: Skip Check"]
    style Layer4 fill:#fefce8,stroke:#eab308,stroke-width:2px,color:#854d0e
        SKIP{"Request still<br/>valid?"}
        SKIPACT["SKIP dead request"]
    end

    subgraph Layer5["Layer 5: Single Lock"]
    style Layer5 fill:#f5f3ff,stroke:#8b5cf6,stroke-width:2px,color:#6d28d9
        LOCK["asyncio.Lock<br/>ONE request at a time"]
        LLM["Ollama Qwen3<br/>Generate response"]
    end

    RESULT["Return result to agent"]
    style RESULT fill:#f0fdf4,stroke:#10b981,stroke-width:2px,color:#047857

    REQ["Agent submits LLM request"] --> QC
    style REQ fill:#f8fafc,stroke:#64748b,color:#1e293b

    QC -->|"Yes"| REJECT
    QC -->|"No"| PQ
    PQ --> WAIT
    WAIT -->|"Yes"| TIMEOUT
    WAIT -->|"No"| SKIP
    SKIP -->|"Cancelled"| SKIPACT
    SKIP -->|"Valid"| LOCK
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
%%{init: {'theme': 'base', 'themeVariables': {'background': '#ffffff', 'primaryColor': '#3b82f6', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#2563eb', 'lineColor': '#94a3b8', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#e2e8f0'}}}%%
sequenceDiagram
    participant Agent as "🤖 Agent"
    participant Scheduler as "⚙️ LLM Scheduler"
    participant Queue as "📥 Priority Queue"
    participant Client as "🔧 LLM Client"
    participant Ollama as "🖥️ Ollama"

    Agent->>Scheduler: submit(prompt, priority)
    Scheduler->>Scheduler: Check queue size (deadlock prevention)
    Scheduler->>Queue: Add request (priority-ordered)
    Scheduler->>Scheduler: Wait for result (with timeout)

    loop Process Queue
        Queue->>Scheduler: Next highest priority request
        Scheduler->>Client: generate(prompt)
        Client->>Ollama: POST /api/generate
        Ollama-->>Client: Response + token stats
        Client-->>Scheduler: LLMResponse
        Scheduler-->>Agent: Return response
    end

    Note over Scheduler: ONLY ONE request processes at a time
    Note over Scheduler: Timeout prevents deadlocks
    Note over Scheduler: Max queue size prevents memory exhaustion
```

## Agent Scheduling Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#ffffff', 'primaryColor': '#3b82f6', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#2563eb', 'lineColor': '#94a3b8', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#e2e8f0'}}}%%
sequenceDiagram
    participant Dashboard as "🌐 Dashboard"
    participant API as "⚡ FastAPI"
    participant AM as "⚙️ Agent Manager"
    participant APS as "⏰ APScheduler"
    participant Agent as "🤖 Agent"
    participant DB as "💾 SQLite"
    participant Mail as "📧 Email"
    participant Scheduler as "📋 LLM Scheduler"

    Note over Dashboard,Mail: Manual Trigger
    Dashboard->>API: POST /api/agents/{id}/trigger
    API->>AM: trigger_agent(id)
    AM->>Agent: run()
    Agent->>Agent: execute()
    Agent->>Scheduler: Submit LLM request with priority
    Scheduler->>Scheduler: Process with priority + deadlock check
    Scheduler-->>Agent: LLM result
    Agent->>Mail: Send email digest
    Agent->>DB: Log results (logs, tokens)

    Note over APS: Scheduled Trigger
    APS->>AM: Cron/Interval fires
    AM->>Agent: run()
    Agent->>Agent: execute()
    Agent->>Scheduler: Submit LLM request
    Scheduler-->>Agent: LLM result
    Agent->>Mail: Send email digest
    Agent->>DB: Log results

    Note over Dashboard,DB: Schedule Update
    Dashboard->>API: PUT /api/schedules/{id}
    API->>AM: update_schedule()
    AM->>DB: Save new schedule
    AM->>APS: Remove old job
    AM->>APS: Add new job
    APS-->>Dashboard: Schedule active immediately
```
