"""
Application configuration — loads from environment variables / .env file.
All settings are centralized here and can be imported throughout the app.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Platform configuration loaded from environment variables."""

    # --- LLM ---
    ollama_base_url: str = Field(default="http://host.docker.internal:11434")
    ollama_model: str = Field(default="qwen3:14b")

    # --- SMTP (sending emails) ---
    smtp_host: str = Field(default="smtp.gmail.com")
    smtp_port: int = Field(default=587)
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    email_from: str = Field(default="")
    email_to: str = Field(default="")

    # --- IMAP (reading emails — Mailman) ---
    imap_host: str = Field(default="imap.gmail.com")
    imap_port: int = Field(default=993)
    imap_user: str = Field(default="")
    imap_password: str = Field(default="")

    # --- Agent Schedules (defaults — overridable from dashboard) ---
    aitimes_schedule_hour: int = Field(default=8)
    aitimes_schedule_minute: int = Field(default=0)
    mailman_schedule_interval_minutes: int = Field(default=30)
    wallstreet_schedule_hour: int = Field(default=16)
    wallstreet_schedule_minute: int = Field(default=30)
    news_schedule_hour: int = Field(default=7)
    news_schedule_minute: int = Field(default=0)

    # --- Database ---
    database_path: str = Field(default="/app/data/platform.db")

    # --- System Thresholds ---
    cpu_alert_threshold: int = Field(default=90)
    ram_alert_threshold: int = Field(default=90)
    disk_alert_threshold: int = Field(default=90)

    # --- LLM Scheduling ---
    llm_request_timeout: int = Field(default=120)
    llm_max_queue_size: int = Field(default=10)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance — import this throughout the app
settings = Settings()
