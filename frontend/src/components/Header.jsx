export default function Header({ currentView, onNavigate, systemStatus }) {
  const isHealthy = systemStatus?.ollama?.available;

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-title">Multi-Agent Platform</span>
        <span className="header-sep">/</span>
        <span className="header-subtitle">Dashboard</span>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Overview
        </button>
        <button
          className={`nav-tab ${currentView === "llm" ? "active" : ""}`}
          onClick={() => onNavigate("llm")}
        >
          Inference
        </button>
      </nav>

      <div className="header-right">
        <span className="header-model-badge">
          {systemStatus?.ollama?.model || "qwen3:8b"}
        </span>
        <span
          className={`status-dot ${isHealthy ? "healthy" : "error"}`}
          title={isHealthy ? "Ollama connected" : "Ollama disconnected"}
        />
      </div>
    </header>
  );
}
