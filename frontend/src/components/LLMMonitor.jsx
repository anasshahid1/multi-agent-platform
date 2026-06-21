export default function LLMMonitor({ llmStatus }) {
  if (!llmStatus) return null;

  const { status, queue_depth, max_queue_size, active_request, stats, history } =
    llmStatus;

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">LLM Scheduler</div>
          <div className="llm-status-bar">
            <span className={`llm-status-indicator ${status}`}>{status}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Queue: {queue_depth}/{max_queue_size}
            </span>
          </div>
        </div>

        <div className="llm-stats">
          <div className="llm-stat">
            <div className="llm-stat-value">{stats.total_processed}</div>
            <div className="llm-stat-label">Processed</div>
          </div>
          <div className="llm-stat">
            <div className="llm-stat-value">{stats.total_failed}</div>
            <div className="llm-stat-label">Failed</div>
          </div>
          <div className="llm-stat">
            <div className="llm-stat-value">{stats.avg_latency_seconds}s</div>
            <div className="llm-stat-label">Avg Latency</div>
          </div>
          <div className="llm-stat">
            <div className="llm-stat-value">{stats.deadlocks_prevented}</div>
            <div className="llm-stat-label">Deadlocks Prevented</div>
          </div>
        </div>

        {active_request && (
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--accent-blue)", fontWeight: 600, marginBottom: 4 }}>
              Active Request
            </div>
            <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
              {active_request.task}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              Agent: {active_request.agent_id} | Elapsed: {active_request.elapsed_seconds}s | Priority: {active_request.priority}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Request History</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Last {history?.length || 0} requests
          </span>
        </div>

        {history && history.length > 0 ? (
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Agent</th>
                  <th>Task</th>
                  <th>Duration</th>
                  <th>Tokens</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((item, i) => (
                  <tr key={i}>
                    <td>
                      {item.completed_at
                        ? new Date(item.completed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>{item.agent_id}</td>
                    <td style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.task}
                    </td>
                    <td>{item.duration_seconds}s</td>
                    <td>{item.tokens}</td>
                    <td>
                      <span
                        style={{
                          color: item.status === "completed" ? "var(--accent-green)" : "var(--accent-red)",
                          fontWeight: 600,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No LLM requests yet. Trigger an agent to see activity here.
          </div>
        )}
      </div>
    </div>
  );
}
