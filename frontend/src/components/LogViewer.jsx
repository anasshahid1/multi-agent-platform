import { ScrollText } from "lucide-react";

export default function LogViewer({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="log-container">
        <div className="empty-state">
          <ScrollText size={24} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No logs yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Run the agent to generate logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="log-container">
      {logs.map((log, i) => (
        <div className="log-entry" key={i}>
          <span className="log-time">{new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`log-level ${log.level}`}>{log.level}</span>
          <span className="log-message">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
