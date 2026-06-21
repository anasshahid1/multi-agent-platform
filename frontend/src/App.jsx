import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  getAgents,
  getSystemMetrics,
  getLLMStatus,
  getOllamaStatus,
  connectWebSocket,
} from "./api/client";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AgentDetail from "./components/AgentDetail";
import LLMMonitor from "./components/LLMMonitor";

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [llmStatus, setLlmStatus] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    try {
      const [agentsData, metricsData, llmData, ollamaData] = await Promise.all([
        getAgents(),
        getSystemMetrics(),
        getLLMStatus(),
        getOllamaStatus(),
      ]);
      setAgents(agentsData);
      setMetrics(metricsData);
      setLlmStatus(llmData);
      setOllamaStatus(ollamaData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    // WebSocket for real-time updates
    const cleanup = connectWebSocket((data) => {
      if (data.type === "dashboard_update") {
        if (data.system) setMetrics(data.system);
        if (data.agents) setAgents(data.agents);
        if (data.llm) setLlmStatus(data.llm);
      }
    });

    // Fallback polling every 10s
    const pollInterval = setInterval(fetchAll, 10000);

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, [fetchAll]);

  const handleSelectAgent = (agentId) => {
    setSelectedAgent(agentId);
    setCurrentView("detail");
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    setSelectedAgent(null);
  };

  const renderContent = () => {
    if (currentView === "detail" && selectedAgent) {
      return (
        <AgentDetail
          agentId={selectedAgent}
          onBack={() => handleNavigate("dashboard")}
        />
      );
    }

    if (currentView === "llm") {
      return <LLMMonitor llmStatus={llmStatus} />;
    }

    return (
      <Dashboard
        agents={agents}
        metrics={metrics}
        onSelectAgent={handleSelectAgent}
        onRefresh={fetchAll}
      />
    );
  };

  return (
    <div className="app">
      {/* Animated floating background orbs */}
      <div className="orb-container">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        systemStatus={{ ollama: ollamaStatus }}
      />
      <main className="main-content" style={{ position: "relative", zIndex: 1 }}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
