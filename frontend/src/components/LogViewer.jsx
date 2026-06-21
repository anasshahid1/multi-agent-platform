export default function LogViewer({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="log-container">
        <div className="empty-state">
          No logs yet. Run the agent to generate logs.
        </div>
      </div>
    );
  }

  return (
    <div className="log-container">
      {logs.map((log, i) => (
        <div className="log-entry" key={i}>
          <span className="log-time">{log.created_at}</span>
          <span className={`log-level ${log.level}`}>{log.level}</span>
          <span className="log-message">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
