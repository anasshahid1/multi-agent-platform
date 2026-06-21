import { useState, useEffect } from "react";
import { getAgent, getAgentLogs, getSchedule, triggerAgent, getLLMStatus } from "../api/client";
import LogViewer from "./LogViewer";
import ScheduleEditor from "./ScheduleEditor";

export default function AgentDetail({ agentId, onBack }) {
  const [agent, setAgent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);

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
      setTimeout(() => {
        setTriggering(false);
        fetchData();
      }, 2000);
    } catch (err) {
      alert(err.message);
      setTriggering(false);
    }
  };

  if (!agent) {
    return (
      <div className="empty-state">Loading agent details...</div>
    );
  }

  const isRunning = agent.status === "running" || triggering;

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <button
            className={`btn btn-primary ${isRunning ? "running" : ""}`}
            onClick={handleTrigger}
            disabled={isRunning}
          >
            {triggering
              ? "Triggered..."
              : agent.status === "running"
              ? "Running..."
              : "Run Now"}
          </button>
        </div>
      </div>

      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 6,
          letterSpacing: "-0.5px",
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        {agent.name}
      </h2>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: 14,
          marginBottom: 28,
          animation: "fadeIn 0.5s ease-out",
        }}
      >
        {agent.description}
      </p>

      <div className="detail-grid">
        <div className="card glass animate-in animate-in-1">
          <div className="card-title" style={{ marginBottom: 18 }}>
            Run Statistics
          </div>
          <div className="agent-meta">
            <div className="agent-meta-row">
              <span>Last Run</span>
              <span>
                {agent.last_run_at
                  ? new Date(agent.last_run_at).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="agent-meta-row">
              <span>Duration</span>
              <span>
                {agent.last_run_duration_seconds
                  ? `${agent.last_run_duration_seconds.toFixed(1)}s`
                  : "-"}
              </span>
            </div>
            <div className="agent-meta-row">
              <span>Status</span>
              <span>
                {agent.last_run_status ? (
                  <span
                    className={`status-badge ${agent.last_run_status === "success" ? "completed" : "failed"}`}
                  >
                    {agent.last_run_status}
                  </span>
                ) : (
                  "-"
                )}
              </span>
            </div>
            <div className="agent-meta-row">
              <span>Items Processed</span>
              <span>{agent.items_processed || 0}</span>
            </div>
            <div className="agent-meta-row">
              <span>Next Run</span>
              <span>
                {agent.next_run_at
                  ? new Date(agent.next_run_at).toLocaleString()
                  : "Not scheduled"}
              </span>
            </div>
            {tokenUsage && (
              <>
                <div style={{ borderTop: "1px solid var(--bg-glass-border)", margin: "10px 0" }} />
                <div className="agent-meta-row">
                  <span>Total Tokens</span>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>
                    {tokenUsage.total_tokens.toLocaleString()}
                  </span>
                </div>
                <div className="agent-meta-row">
                  <span>Input / Output</span>
                  <span>
                    {tokenUsage.input_tokens.toLocaleString()} / {tokenUsage.output_tokens.toLocaleString()}
                  </span>
                </div>
                <div className="agent-meta-row">
                  <span>LLM Requests</span>
                  <span>{tokenUsage.request_count}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card glass animate-in animate-in-2">
          <div className="card-title" style={{ marginBottom: 18 }}>
            Schedule
          </div>
          <ScheduleEditor
            agentId={agentId}
            schedule={schedule}
            onSaved={fetchData}
          />
        </div>
      </div>

      <div className="card glass animate-in animate-in-3">
        <div className="card-header">
          <div className="card-title">Agent Logs</div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {logs.length} entries
          </span>
        </div>
        <LogViewer logs={logs} />
      </div>
    </div>
  );
}
