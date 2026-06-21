import { triggerAgent } from "../api/client";
import { useState } from "react";

const AGENT_ICONS = {
  ai_times: (
    <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
  ),
  mailman: (
    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22 4 12 13 2 4" /></svg>
  ),
  wallstreet_wolf: (
    <svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  ),
  news_analyst: (
    <svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><line x1="10" y1="6" x2="18" y2="6" /><line x1="10" y1="10" x2="18" y2="10" /><line x1="10" y1="14" x2="14" y2="14" /></svg>
  ),
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
    if (!iso) return "\u2014";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso) => {
    if (!iso) return "Not scheduled";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday ? `Today ${time}` : d.toLocaleDateString();
  };

  const isRunning = agent.status === "running" || triggering;
  const statusClass = agent.status === "error" ? "is-error" : isRunning ? "is-running" : "";

  return (
    <div
      className={`agent-card ${statusClass} ${animClass || ""}`}
      onClick={() => onSelect(agent.id)}
    >
      <div className="agent-card-body">
        <div className="agent-card-header">
          <div className="agent-name-group">
            <div className="agent-icon">
              {AGENT_ICONS[agent.id] || null}
            </div>
            <div className="agent-name">{agent.name}</div>
          </div>
          <div className="agent-status">
            <span className={`status-dot ${agent.status === "idle" ? "healthy" : agent.status === "running" ? "warning" : "error"}`} />
            {agent.status}
          </div>
        </div>

        <div className="agent-description">{agent.description}</div>

        <div className="agent-meta">
          <div className="agent-meta-row">
            <span>Last run</span>
            <span>{agent.last_run_at ? formatTime(agent.last_run_at) : "\u2014"}</span>
          </div>
          {agent.last_run_duration_seconds != null && (
            <div className="agent-meta-row">
              <span>Duration</span>
              <span>{agent.last_run_duration_seconds.toFixed(1)}s</span>
            </div>
          )}
          <div className="agent-meta-row">
            <span>Processed</span>
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
          {triggering ? "Triggered..." : isRunning ? "Running..." : "Run Now"}
        </button>
      </div>
    </div>
  );
}
