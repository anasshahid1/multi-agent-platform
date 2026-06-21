export default function LLMMonitor({ llmStatus }) {
  if (!llmStatus) return null;

  const { status, queue_depth, max_queue_size, active_request, stats, history } =
    llmStatus;

  return (
    <div>
      <div className="card glass animate-in" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">LLM Scheduler</div>
          <div className="llm-status-bar">
            <span className={`llm-status-indicator ${status}`}>{status}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Queue: {queue_depth} / {max_queue_size}
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
          <div className="active-request">
            <div className="active-request-label">Active Request</div>
            <div className="active-request-task">{active_request.task}</div>
            <div className="active-request-meta">
              Agent: {active_request.agent_id} &nbsp;&bull;&nbsp; Elapsed:{" "}
              {active_request.elapsed_seconds}s &nbsp;&bull;&nbsp; Priority:{" "}
              {active_request.priority}
            </div>
          </div>
        )}
      </div>

      <div className="card glass animate-in animate-in-2">
        <div className="card-header">
          <div className="card-title">Request History</div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Last {history?.length || 0} requests
          </span>
        </div>

        {history && history.length > 0 ? (
          <div style={{ maxHeight: 450, overflowY: "auto" }}>
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
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {item.completed_at
                        ? new Date(item.completed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td style={{ fontWeight: 500 }}>{item.agent_id}</td>
                    <td
                      style={{
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.task}
                    </td>
                    <td>{item.duration_seconds}s</td>
                    <td>{item.tokens}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No LLM requests yet. Trigger an agent to see activity here.
          </div>
        )}
      </div>
    </div>
  );
}
