import { BrainCircuit } from "lucide-react";

export default function Header({ systemStatus }) {
  const isHealthy = systemStatus?.ollama?.available;

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-breadcrumb">Overview</span>
      </div>
      <div className="header-right">
        <span className="header-model-badge">
          <BrainCircuit size={11} strokeWidth={1.5} />
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
