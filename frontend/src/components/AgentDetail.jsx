import { useState, useEffect } from "react";
import { getAgent, getAgentLogs, getSchedule, triggerAgent, getLLMStatus } from "../api/client";
import { useToast } from "./Toast";
import LogViewer from "./LogViewer";
import ScheduleEditor from "./ScheduleEditor";
import {
  ArrowLeft,
  Play,
  BarChart3,
  Calendar,
  ScrollText,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const TABS = [
  { id: "stats", label: "Statistics", icon: BarChart3 },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "logs", label: "Logs", icon: ScrollText },
];

export default function AgentDetail({ agentId, onBack }) {
  const [agent, setAgent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [activeTab, setActiveTab] = useState("stats");
  const addToast = useToast();

  const fetchData = async () => {
    try {
      const [agentData, logsData, scheduleData, llmData] = await Promise.all([
        getAgent(agentId),
        getAgentLogs(agentId),
        getSchedule(agentId).catch(() => null),
        getLLMStatus().catch(() => null),
      ]);
      setAgent(agentData);
      setLogs(logsData.logs || []);
      setSchedule(scheduleData);
      if (llmData?.agent_token_usage?.[agentId]) {
        setTokenUsage(llmData.agent_token_usage[agentId]);
      }
    } catch (err) {
      console.error("Failed to fetch agent data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [agentId]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerAgent(agentId);
      addToast("Agent triggered successfully", "success");
      setTimeout(() => {
        setTriggering(false);
        fetchData();
      }, 2000);
    } catch (err) {
      addToast(err.message, "error");
      setTriggering(false);
    }
  };

  if (!agent) {
    return (
      <div className="empty-state" style={{ marginTop: 60 }}>
        <div className="skeleton" style={{ width: 240, height: 20, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: 180, height: 14 }} />
      </div>
    );
  }

  const isRunning = agent.status === "running" || triggering;

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.5} style={{ marginRight: 4, verticalAlign: "middle" }} />
          Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="detail-agent-status">
            <span className={`status-dot ${agent.status === "idle" ? "healthy" : agent.status === "running" ? "warning" : "error"}`} />
            {agent.status}
          </div>
          <button
            className={`btn btn-primary ${isRunning ? "running" : ""}`}
            onClick={handleTrigger}
            disabled={isRunning}
          >
            {isRunning ? (
              <span className="spinner" />
            ) : (
              <Play size={12} strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle" }} />
            )}
            {triggering ? "Triggered..." : agent.status === "running" ? "Running..." : "Run Now"}
          </button>
        </div>
      </div>

      <h2 className="detail-title">{agent.name}</h2>
      <p className="detail-desc">{agent.description}</p>

      <div className="detail-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`detail-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "stats" && (
        <div className="detail-grid">
          <div className="card animate-in animate-in-1">
            <div className="card-title" style={{ marginBottom: 18 }}>
              Run Statistics
            </div>
            <div className="agent-meta">
              <div className="agent-meta-row">
                <span>
                  <Clock size={11} strokeWidth={1.5} style={{ marginRight: 4, verticalAlign: "middle", opacity: 0.5 }} />
                  Last Run
                </span>
                <span>{agent.last_run_at ? new Date(agent.last_run_at).toLocaleString() : "Never"}</span>
              </div>
              <div className="agent-meta-row">
                <span>Duration</span>
                <span>{agent.last_run_duration_seconds ? `${agent.last_run_duration_seconds.toFixed(1)}s` : "-"}</span>
              </div>
              <div className="agent-meta-row">
                <span>Status</span>
                <span>
                  {agent.last_run_status ? (
                    <span className={`status-badge ${agent.last_run_status === "success" ? "completed" : "failed"}`}>
                      {agent.last_run_status === "success" ? <CheckCircle2 size={10} style={{ marginRight: 2, verticalAlign: "middle" }} /> : <XCircle size={10} style={{ marginRight: 2, verticalAlign: "middle" }} />}
                      {agent.last_run_status}
                    </span>
                  ) : "-"}
                </span>
              </div>
              <div className="agent-meta-row">
                <span>Items Processed</span>
                <span>{agent.items_processed || 0}</span>
              </div>
              <div className="agent-meta-row">
                <span>Next Run</span>
                <span>{agent.next_run_at ? new Date(agent.next_run_at).toLocaleString() : "Not scheduled"}</span>
              </div>
            </div>
          </div>

          <div className="card animate-in animate-in-2">
            <div className="card-title" style={{ marginBottom: 18 }}>
              Token Usage
            </div>
            {tokenUsage ? (
              <div className="agent-meta">
                <div className="agent-meta-row">
                  <span>Total Tokens</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {tokenUsage.total_tokens.toLocaleString()}
                  </span>
                </div>
                <div className="agent-meta-row">
                  <span>Input / Output</span>
                  <span>{tokenUsage.input_tokens.toLocaleString()} / {tokenUsage.output_tokens.toLocaleString()}</span>
                </div>
                <div className="agent-meta-row">
                  <span>LLM Requests</span>
                  <span>{tokenUsage.request_count}</span>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <BarChart3 size={20} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 6 }} />
                <p style={{ fontSize: 12 }}>No token data yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="card animate-in animate-in-1" style={{ maxWidth: 400 }}>
          <div className="card-title" style={{ marginBottom: 18 }}>
            <Calendar size={13} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Schedule
          </div>
          <ScheduleEditor
            agentId={agentId}
            schedule={schedule}
            onSaved={fetchData}
          />
        </div>
      )}

      {activeTab === "logs" && (
        <div className="card animate-in animate-in-2">
          <div className="card-header">
            <div className="card-title">
              <ScrollText size={13} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Agent Logs
            </div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {logs.length} entries
            </span>
          </div>
          <LogViewer logs={logs} />
        </div>
      )}
    </div>
  );
}
