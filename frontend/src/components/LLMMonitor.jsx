import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const AGENT_COLORS = {
  ai_times: "#764ba2",
  mailman: "#4f8ff7",
  wallstreet_wolf: "#38ef7d",
  news_analyst: "#f5576c",
};

function AnimatedNumber({ value, suffix = "" }) {
  return (
    <span className="llm-stat-value">
      {typeof value === "number" ? value.toLocaleString() : value}
      {suffix}
    </span>
  );
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10, 14, 23, 0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
      }}
    >
      <div style={{ color: payload[0].payload.fill, fontWeight: 600 }}>
        {payload[0].name}
      </div>
      <div style={{ color: "#e8eaed", marginTop: 2 }}>
        {payload[0].value.toLocaleString()} tokens
      </div>
    </div>
  );
};

export default function LLMMonitor({ llmStatus }) {
  if (!llmStatus) return null;

  const {
    status,
    queue_depth,
    max_queue_size,
    active_request,
    stats,
    history,
    agent_token_usage,
  } = llmStatus;

  // Build pie chart data from agent token usage
  const pieData = Object.entries(agent_token_usage || {}).map(
    ([agentId, usage]) => ({
      name: agentId.replace(/_/g, " "),
      value: usage.total_tokens,
      fill: AGENT_COLORS[agentId] || "#8b92a5",
    })
  );

  // Max duration for relative bar sizing
  const maxDuration = Math.max(
    ...(history || []).map((h) => h.duration_seconds || 0),
    1
  );

  return (
    <div>
      {/* Stats Cards — Row 1 */}
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

        <div className="llm-stats-expanded">
          <div className="llm-stat">
            <AnimatedNumber value={stats.total_processed} />
            <div className="llm-stat-label">Processed</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber value={stats.total_failed} />
            <div className="llm-stat-label">Failed</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber value={stats.avg_latency_seconds} suffix="s" />
            <div className="llm-stat-label">Avg Latency</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber value={stats.deadlocks_prevented} />
            <div className="llm-stat-label">Deadlocks Prevented</div>
          </div>
        </div>

        {/* Stats Cards — Row 2 (Tokens) */}
        <div className="llm-stats-expanded">
          <div className="llm-stat">
            <AnimatedNumber value={stats.total_tokens || 0} />
            <div className="llm-stat-label">Total Tokens</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber value={stats.total_input_tokens || 0} />
            <div className="llm-stat-label">Input Tokens</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber value={stats.total_output_tokens || 0} />
            <div className="llm-stat-label">Output Tokens</div>
          </div>
          <div className="llm-stat">
            <AnimatedNumber
              value={stats.avg_tokens_per_second || 0}
              suffix=" tok/s"
            />
            <div className="llm-stat-label">Avg Speed</div>
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

      {/* Token Usage by Agent (Pie Chart) */}
      {pieData.length > 0 && (
        <div className="card glass animate-in animate-in-1" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Token Usage by Agent
          </div>
          <div className="token-breakdown">
            <div className="token-chart-container">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="token-legend">
              {pieData.map((entry, i) => (
                <div className="token-legend-item" key={i}>
                  <div
                    className="token-legend-dot"
                    style={{ background: entry.fill }}
                  />
                  <span>{entry.name}</span>
                  <span className="token-legend-value">
                    {entry.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Request History Table */}
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
                  <th>In</th>
                  <th>Out</th>
                  <th>tok/s</th>
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
                    <td style={{ fontWeight: 500 }}>
                      <span className={`agent-color-dot ${item.agent_id}`} />
                      {item.agent_id}
                    </td>
                    <td
                      style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.task}
                    >
                      {item.task}
                    </td>
                    <td>
                      {item.duration_seconds}s
                      <div className="duration-bar-container">
                        <div
                          className="duration-bar-fill"
                          style={{
                            width: `${Math.min(
                              (item.duration_seconds / maxDuration) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 11 }}>
                      {item.input_tokens || "-"}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {item.output_tokens || item.tokens || "-"}
                    </td>
                    <td style={{ color: "var(--accent-cyan)", fontSize: 11 }}>
                      {item.tokens_per_second || "-"}
                    </td>
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
