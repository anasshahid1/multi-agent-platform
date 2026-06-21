import { useState, useEffect } from "react";
import { getAgent, getAgentLogs, getSchedule, triggerAgent } from "../api/client";
import LogViewer from "./LogViewer";
import ScheduleEditor from "./ScheduleEditor";

export default function AgentDetail({ agentId, onBack }) {
  const [agent, setAgent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [triggering, setTriggering] = useState(false);

  const fetchData = async () => {
    try {
      const [agentData, logsData, scheduleData] = await Promise.all([
        getAgent(agentId),
        getAgentLogs(agentId),
        getSchedule(agentId).catch(() => null),
      ]);
      setAgent(agentData);
      setLogs(logsData.logs || []);
      setSchedule(scheduleData);
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
      <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
        Loading agent details...
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <div>
          <button className="back-btn" onClick={onBack}>
            Back to Dashboard
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className={`agent-status ${agent.status}`}>
            <span className={`status-dot ${agent.status === "idle" ? "healthy" : agent.status === "running" ? "warning" : "error"}`} />
            {agent.status}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleTrigger}
            disabled={triggering || agent.status === "running"}
          >
            {triggering ? "Triggered..." : agent.status === "running" ? "Running..." : "Run Now"}
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 24, marginBottom: 4 }}>{agent.name}</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
        {agent.description}
      </p>

      <div className="detail-grid">
        {/* Stats */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Run Statistics</div>
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
              <span style={{
                color: agent.last_run_status === "success" ? "var(--accent-green)" : "var(--accent-red)"
              }}>
                {agent.last_run_status || "-"}
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
          </div>
        </div>

        {/* Schedule */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Schedule</div>
          <ScheduleEditor
            agentId={agentId}
            schedule={schedule}
            onSaved={fetchData}
          />
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Agent Logs</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {logs.length} entries
          </span>
        </div>
        <LogViewer logs={logs} />
      </div>
    </div>
  );
}
