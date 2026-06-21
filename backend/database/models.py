"""
SQLite table schemas for the Multi-Agent Platform.

Tables:
- agents:        Agent registration and current status
- schedules:     Agent scheduling configuration (cron-style)
- agent_logs:    Per-agent run logs and output
- llm_queue:     LLM inference request tracking
- stocks:        Wallstreet Wolf stock watchlist
- news_sources:  News Analyst RSS feed sources
"""

CREATE_TABLES_SQL = [
    # --- Agent registry and status ---
    """
    CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        last_run_at TEXT,
        last_run_duration_seconds REAL,
        last_run_status TEXT,
        items_processed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,

    # --- Agent schedules (configurable from dashboard) ---
    """
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL UNIQUE,
        schedule_type TEXT NOT NULL DEFAULT 'cron',
        cron_hour INTEGER,
        cron_minute INTEGER,
        interval_minutes INTEGER,
        enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
    """,

    # --- Agent run logs ---
    """
    CREATE TABLE IF NOT EXISTS agent_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'INFO',
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
    """,

    # --- LLM inference request queue tracking ---
    """
    CREATE TABLE IF NOT EXISTS llm_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        task_description TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT,
        duration_seconds REAL,
        tokens_generated INTEGER,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
    """,

    # --- Wallstreet Wolf stock watchlist ---
    """
    CREATE TABLE IF NOT EXISTS stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL UNIQUE,
        company_name TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,

    # --- News Analyst RSS feed sources ---
    """
    CREATE TABLE IF NOT EXISTS news_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        category TEXT DEFAULT 'general',
        enabled INTEGER NOT NULL DEFAULT 1,
        added_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,

    # --- Seed default stocks ---
    """
    INSERT OR IGNORE INTO stocks (ticker, company_name) VALUES
        ('AAPL', 'Apple Inc.'),
        ('MSFT', 'Microsoft Corp.'),
        ('GOOGL', 'Alphabet Inc.'),
        ('AMZN', 'Amazon.com Inc.'),
        ('NVDA', 'NVIDIA Corp.'),
        ('TSLA', 'Tesla Inc.'),
        ('META', 'Meta Platforms Inc.'),
        ('NFLX', 'Netflix Inc.'),
        ('AMD', 'Advanced Micro Devices'),
        ('INTC', 'Intel Corp.'),
        ('CRM', 'Salesforce Inc.'),
        ('ORCL', 'Oracle Corp.'),
        ('ADBE', 'Adobe Inc.'),
        ('PYPL', 'PayPal Holdings'),
        ('UBER', 'Uber Technologies'),
        ('SQ', 'Block Inc.'),
        ('SHOP', 'Shopify Inc.'),
        ('COIN', 'Coinbase Global'),
        ('PLTR', 'Palantir Technologies'),
        ('SNOW', 'Snowflake Inc.'),
        ('NET', 'Cloudflare Inc.'),
        ('CRWD', 'CrowdStrike Holdings'),
        ('ZS', 'Zscaler Inc.'),
        ('PANW', 'Palo Alto Networks'),
        ('DDOG', 'Datadog Inc.')
    """,

    # --- Seed default news sources (RSS feeds) ---
    """
    INSERT OR IGNORE INTO news_sources (name, url, category) VALUES
        ('BBC News', 'http://feeds.bbci.co.uk/news/rss.xml', 'general'),
        ('Reuters Top News', 'https://www.rss.reuters.com/news/topNews', 'general'),
        ('TechCrunch', 'https://techcrunch.com/feed/', 'tech'),
        ('Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech'),
        ('Hacker News', 'https://hnrss.org/frontpage', 'tech'),
        ('The Verge', 'https://www.theverge.com/rss/index.xml', 'tech'),
        ('Wired', 'https://www.wired.com/feed/rss', 'tech'),
        ('MIT Tech Review', 'https://www.technologyreview.com/feed/', 'ai')
    """,
]
