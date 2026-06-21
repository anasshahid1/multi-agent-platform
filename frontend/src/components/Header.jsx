export default function Header({ currentView, onNavigate, systemStatus }) {
  const isHealthy = systemStatus?.ollama?.available;

  return (
    <header className="header">
      <div className="header-left">
        <div>
          <div className="header-title">Multi-Agent Platform</div>
          <div className="header-subtitle">
            Local LLM Orchestration Dashboard
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`nav-tab ${currentView === "llm" ? "active" : ""}`}
          onClick={() => onNavigate("llm")}
        >
          LLM Queue
        </button>
      </nav>

      <div className="header-right">
        <span className="header-subtitle">
          {systemStatus?.ollama?.model || "qwen3:8b"}
        </span>
        <span
          className={`status-dot ${isHealthy ? "healthy" : "error"}`}
          title={isHealthy ? "Ollama Connected" : "Ollama Disconnected"}
        />
      </div>
    </header>
  );
}
