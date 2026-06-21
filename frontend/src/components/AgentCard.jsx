import { triggerAgent } from "../api/client";
import { useState } from "react";

export default function AgentCard({ agent, onSelect, onRefresh }) {
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

  return (
    <div className="agent-card" onClick={() => onSelect(agent.id)}>
      <div className="agent-card-header">
        <div className="agent-name">{agent.name}</div>
        <div className={`agent-status ${agent.status}`}>
          <span className={`status-dot ${agent.status === "idle" ? "healthy" : agent.status === "running" ? "warning" : "error"}`} />
          {agent.status}
        </div>
      </div>

      <div className="agent-description">{agent.description}</div>

      <div className="agent-meta">
        <div className="agent-meta-row">
          <span>Last run</span>
          <span>{agent.last_run_at ? formatTime(agent.last_run_at) : "Never"}</span>
        </div>
        {agent.last_run_duration_seconds && (
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
        className="btn btn-trigger"
        onClick={handleTrigger}
        disabled={triggering || agent.status === "running"}
      >
        {triggering ? "Triggered..." : agent.status === "running" ? "Running..." : "Run Now"}
      </button>
    </div>
  );
}
