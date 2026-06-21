"""
System Resource Monitor.

Tracks CPU, RAM, and disk usage in real-time.
Provides current metrics and historical data for the dashboard.
Alerts when thresholds are exceeded.
"""

import time
import psutil
from dataclasses import dataclass
from typing import Optional

from config import settings


@dataclass
class SystemMetrics:
    """Snapshot of system resource usage."""
    cpu_percent: float
    ram_percent: float
    ram_used_gb: float
    ram_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    timestamp: float


class ResourceMonitor:
    """
    Monitors system resources (CPU, RAM, disk).

    Provides:
    - Current snapshot of system metrics
    - Historical data (last 60 samples for 1-hour chart at 1/min)
    - Alert flags when thresholds are exceeded
    """

    def __init__(self):
        self._history: list[dict] = []
        self._max_history = 60  # 1 hour at 1 sample/minute
        self._last_sample_time: float = 0
        self._sample_interval = 60  # seconds between history samples

    def get_current(self) -> dict:
        """Get current system metrics."""
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        metrics = {
            "cpu": {
                "percent": cpu,
                "cores": psutil.cpu_count(),
                "alert": cpu > settings.cpu_alert_threshold,
            },
            "ram": {
                "percent": memory.percent,
                "used_gb": round(memory.used / (1024 ** 3), 2),
                "total_gb": round(memory.total / (1024 ** 3), 2),
                "available_gb": round(memory.available / (1024 ** 3), 2),
                "alert": memory.percent > settings.ram_alert_threshold,
            },
            "disk": {
                "percent": disk.percent,
                "used_gb": round(disk.used / (1024 ** 3), 2),
                "total_gb": round(disk.total / (1024 ** 3), 2),
                "free_gb": round(disk.free / (1024 ** 3), 2),
                "alert": disk.percent > settings.disk_alert_threshold,
            },
            "timestamp": time.time(),
        }

        # Record to history if enough time has passed
        now = time.time()
        if now - self._last_sample_time >= self._sample_interval:
            self._record_sample(metrics)
            self._last_sample_time = now

        return metrics

    def _record_sample(self, metrics: dict):
        """Record a metrics sample to history."""
        sample = {
            "cpu_percent": metrics["cpu"]["percent"],
            "ram_percent": metrics["ram"]["percent"],
            "disk_percent": metrics["disk"]["percent"],
            "timestamp": metrics["timestamp"],
        }
        self._history.append(sample)
        if len(self._history) > self._max_history:
            self._history.pop(0)

    def get_history(self) -> list[dict]:
        """Get metrics history for charts."""
        return self._history

    def get_alerts(self) -> list[dict]:
        """Get current alerts based on thresholds."""
        current = self.get_current()
        alerts = []

        if current["cpu"]["alert"]:
            alerts.append({
                "type": "cpu",
                "level": "warning",
                "message": f"CPU usage at {current['cpu']['percent']}% "
                           f"(threshold: {settings.cpu_alert_threshold}%)",
            })

        if current["ram"]["alert"]:
            alerts.append({
                "type": "ram",
                "level": "warning",
                "message": f"RAM usage at {current['ram']['percent']}% "
                           f"(threshold: {settings.ram_alert_threshold}%)",
            })

        if current["disk"]["alert"]:
            alerts.append({
                "type": "disk",
                "level": "warning",
                "message": f"Disk usage at {current['disk']['percent']}% "
                           f"(threshold: {settings.disk_alert_threshold}%)",
            })

        return alerts


# Singleton instance
resource_monitor = ResourceMonitor()
