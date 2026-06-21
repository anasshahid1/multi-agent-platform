import { useState } from "react";
import {
  LayoutDashboard,
  BrainCircuit,
  Video,
  Mail,
  TrendingUp,
  Newspaper,
  Play,
} from "lucide-react";
import { triggerAgent } from "../api/client";

const agentIconMap = {
  ai_times: Video,
  mailman: Mail,
  wallstreet_wolf: TrendingUp,
  news_analyst: Newspaper,
};

export default function Sidebar({ currentView, onNavigate, agents, onRefresh }) {
  const [triggering, setTriggering] = useState(null);

  const handleTrigger = async (agentId) => {
    setTriggering(agentId);
    try {
      await triggerAgent(agentId);
      setTimeout(() => {
        setTriggering(null);
        if (onRefresh) onRefresh();
      }, 2000);
    } catch {
      setTriggering(null);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <BrainCircuit size={20} strokeWidth={1.5} />
          <span className="sidebar-logo-text">Agent Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Navigation</div>
        <button
          className={`sidebar-nav-item ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          <LayoutDashboard size={16} strokeWidth={1.5} />
          <span>Overview</span>
        </button>
        <button
          className={`sidebar-nav-item ${currentView === "llm" ? "active" : ""}`}
          onClick={() => onNavigate("llm")}
        >
          <BrainCircuit size={16} strokeWidth={1.5} />
          <span>Inference</span>
        </button>
      </nav>

      {agents.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-nav-label">Agents</div>
          {agents.map((agent) => {
            const Icon = agentIconMap[agent.id] || BrainCircuit;
            const isRunning = agent.status === "running" || triggering === agent.id;
            return (
              <div key={agent.id} className="sidebar-agent-row">
                <button
                  className="sidebar-agent-btn"
                  onClick={() => onNavigate("detail", agent.id)}
                >
                  <span className={`sidebar-agent-dot ${agent.status === "idle" ? "healthy" : agent.status === "running" ? "running" : "error"}`} />
                  <Icon size={14} strokeWidth={1.5} />
                  <span className="sidebar-agent-name">{agent.name}</span>
                </button>
                <button
                  className="sidebar-agent-trigger"
                  onClick={(e) => { e.stopPropagation(); handleTrigger(agent.id); }}
                  disabled={isRunning}
                  title="Run Now"
                >
                  {isRunning ? (
                    <span className="spinner-mini" />
                  ) : (
                    <Play size={10} strokeWidth={2} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
