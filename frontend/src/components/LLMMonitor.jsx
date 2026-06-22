import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  BarChart3,
} from "lucide-react";

const AGENT_SHADES = {
  ai_times: "#3b82f6",
  mailman: "#60a5fa",
  wallstreet_wolf: "#93c5fd",
  news_analyst: "#bfdbfe",
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c1c1f",
      border: "1px solid #2e2e32",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
    }}>
      <div style={{ color: "#ededef", fontWeight: 500 }}>{payload[0].name}</div>
      <div style={{ color: "#8e8e93", marginTop: 2 }}>
        {payload[0].value.toLocaleString()} tokens
      </div>
    </div>
  );
};

function Stat({ value, label, icon }) {
  const Icon = icon;
  return (
    <div className="llm-stat">
      <div className="llm-stat-icon">
        <Icon size={14} strokeWidth={1.5} />
      </div>
      <div className="llm-stat-value">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="llm-stat-label">{label}</div>
    </div>
  );
}

export default function LLMMonitor({ llmStatus }) {
  if (!llmStatus) return null;

  const { status, queue_depth, max_queue_size, active_request, stats, history, agent_token_usage } = llmStatus;

  const pieData = Object.entries(agent_token_usage || {}).map(([id, u]) => ({
    name: id.replace(/_/g, " "),
    value: u.total_tokens,
    fill: AGENT_SHADES[id] || "#636366",
  }));

  return (
    <div>
      <div className="card animate-in" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div className="card-title">
            <BarChart3 size={13} strokeWidth={1.5} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Inference Scheduler
          </div>
          <div className="llm-status-bar">
            <span className={`llm-status-indicator ${status}`}>{status}</span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {queue_depth}/{max_queue_size} queued
            </span>
          </div>
        </div>

        <div className="llm-stats-expanded">
          <Stat value={stats.total_processed} label="Processed" icon={CheckCircle2} />
          <Stat value={stats.total_failed} label="Failed" icon={XCircle} />
          <Stat value={`${stats.avg_latency_seconds}s`} label="Avg Latency" icon={Clock} />
          <Stat value={stats.deadlocks_prevented} label="Deadlocks" icon={Shield} />
        </div>

        <div className="llm-stats-expanded">
          <Stat value={stats.total_tokens || 0} label="Total Tokens" icon={BarChart3} />
          <Stat value={stats.total_input_tokens || 0} label="Input" icon={BarChart3} />
          <Stat value={stats.total_output_tokens || 0} label="Output" icon={BarChart3} />
          <Stat value={`${stats.avg_tokens_per_second || 0}`} label="Avg tok/s" icon={Clock} />
        </div>

        {active_request && (
          <div className="active-request">
            <div className="active-request-label">
              <Clock size={11} strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle" }} />
              Processing
            </div>
            <div className="active-request-task">{active_request.task}</div>
            <div className="active-request-meta">
              {active_request.agent_id} &middot; {active_request.elapsed_seconds}s &middot; p{active_request.priority}
            </div>
          </div>
        )}
      </div>

      {pieData.length > 0 ? (
        <div className="card animate-in animate-in-1" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Token Distribution</div>
          <div className="token-breakdown">
            <div className="token-chart-container">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="token-legend">
              {pieData.map((e, i) => (
                <div className="token-legend-item" key={i}>
                  <div className="token-legend-dot" style={{ background: e.fill }} />
                  <span>{e.name}</span>
                  <span className="token-legend-value">{e.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card animate-in animate-in-2">
        <div className="card-header">
          <div className="card-title">Request Log</div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
            {history?.length || 0} entries
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
                  <th>In</th>
                  <th>Out</th>
                  <th>tok/s</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((item, i) => (
                  <tr key={i}>
                    <td>{item.completed_at ? new Date(item.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "\u2014"}</td>
                    <td style={{ color: "var(--text-primary)" }}>{item.agent_id}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.task}>{item.task}</td>
                    <td>{item.duration_seconds}s</td>
                    <td>{item.input_tokens || "\u2014"}</td>
                    <td>{item.output_tokens || item.tokens || "\u2014"}</td>
                    <td>{item.tokens_per_second || "\u2014"}</td>
                    <td><span className={`status-badge ${item.status}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <BarChart3 size={24} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>No inference requests yet</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Trigger an agent to see activity here</p>
          </div>
        )}
      </div>
    </div>
  );
}
