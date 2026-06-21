import { triggerAgent } from "../api/client";
import { useState } from "react";

const AGENT_ICONS = {
  ai_times: { icon: "\u25B6", cls: "ai-times" },       // play triangle
  mailman: { icon: "\u2709", cls: "mailman" },          // envelope
  wallstreet_wolf: { icon: "\u2191", cls: "wallstreet_wolf" }, // up arrow
  news_analyst: { icon: "\u2261", cls: "news_analyst" }, // hamburger/lines
};

export default function AgentCard({ agent, onSelect, onRefresh, animClass }) {
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async (e) => {
    e.stopPropagation();
    setTriggering(true);
    try {
      await triggerAgent(agent.id);
      setTimeout(() => {
        setTriggering(false);
        if (onRefresh) onRefresh();
      }, 2000);
    } catch (err) {
      alert(err.message);
      setTriggering(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso) => {
    if (!iso) return "Not scheduled";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday ? `Today ${time}` : `${d.toLocaleDateString()} ${time}`;
  };

  const isRunning = agent.status === "running" || triggering;
  const iconData = AGENT_ICONS[agent.id] || { icon: "\u2022", cls: "" };

  return (
    <div
      className={`agent-card ${animClass || ""} ${isRunning ? "is-running" : ""}`}
      data-agent={agent.id}
      onClick={() => onSelect(agent.id)}
    >
      {/* Shimmer overlay when running */}
      {isRunning && <div className="shimmer-overlay" />}

      <div className="agent-card-body">
        <div className="agent-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={`agent-icon ${iconData.cls}`}>
              {iconData.icon}
            </div>
            <div className="agent-name">{agent.name}</div>
          </div>
          <div className={`agent-status ${agent.status}`}>
            <span
              className={`status-dot ${
                agent.status === "idle"
                  ? "healthy"
                  : agent.status === "running"
                  ? "warning"
                  : "error"
              }`}
            />
            {agent.status}
          </div>
        </div>

        <div className="agent-description">{agent.description}</div>

        <div className="agent-meta">
          <div className="agent-meta-row">
            <span>Last run</span>
            <span>
              {agent.last_run_at ? formatTime(agent.last_run_at) : "Never"}
            </span>
          </div>
          {agent.last_run_duration_seconds != null && (
            <div className="agent-meta-row">
              <span>Duration</span>
              <span>{agent.last_run_duration_seconds.toFixed(1)}s</span>
            </div>
          )}
          <div className="agent-meta-row">
            <span>Items processed</span>
            <span>{agent.items_processed || 0}</span>
          </div>
          <div className="agent-meta-row">
            <span>Next run</span>
            <span>{formatDate(agent.next_run_at)}</span>
          </div>
        </div>

        <button
          className={`btn btn-trigger ${isRunning ? "running" : ""}`}
          onClick={handleTrigger}
          disabled={isRunning}
        >
          {isRunning && <span className="spinner" />}
          {triggering
            ? "Triggered..."
            : agent.status === "running"
            ? "Running..."
            : "Run Now"}
        </button>
      </div>
    </div>
  );
}
