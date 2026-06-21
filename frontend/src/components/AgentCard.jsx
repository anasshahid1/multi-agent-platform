import { triggerAgent } from "../api/client";
import { useState } from "react";
import { useToast } from "./Toast";
import {
  Video,
  Mail,
  TrendingUp,
  Newspaper,
  Play,
} from "lucide-react";

const AGENT_ICONS = {
  ai_times: Video,
  mailman: Mail,
  wallstreet_wolf: TrendingUp,
  news_analyst: Newspaper,
};

export default function AgentCard({ agent, onSelect, onRefresh, animClass }) {
  const [triggering, setTriggering] = useState(false);
  const addToast = useToast();

  const handleTrigger = async (e) => {
    e.stopPropagation();
    setTriggering(true);
    try {
      await triggerAgent(agent.id);
      addToast(`${agent.name} triggered`, "success");
      setTimeout(() => {
        setTriggering(false);
        if (onRefresh) onRefresh();
      }, 2000);
    } catch (err) {
      addToast(err.message, "error");
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
  const Icon = AGENT_ICONS[agent.id] || TrendingUp;

  return (
    <div
      className={`agent-card ${statusClass} ${animClass || ""}`}
      onClick={() => onSelect(agent.id)}
    >
      <div className="agent-card-body">
        <div className="agent-card-header">
          <div className="agent-name-group">
            <div className="agent-icon">
              <Icon size={16} strokeWidth={1.5} />
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
          {isRunning ? (
            <span className="spinner" />
          ) : (
            <Play size={12} strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle" }} />
          )}
          {triggering ? "Triggered..." : isRunning ? "Running..." : "Run Now"}
        </button>
      </div>
    </div>
  );
}
