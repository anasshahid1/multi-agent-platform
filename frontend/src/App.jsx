import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  getAgents,
  getSystemMetrics,
  getLLMStatus,
  getOllamaStatus,
  connectWebSocket,
} from "./api/client";
import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
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

    const cleanup = connectWebSocket((data) => {
      if (data.type === "dashboard_update") {
        if (data.system) setMetrics(data.system);
        if (data.agents) setAgents(data.agents);
        if (data.llm) setLlmStatus(data.llm);
      }
    });

    const pollInterval = setInterval(fetchAll, 10000);

    return () => {
      cleanup();
      clearInterval(pollInterval);
    };
  }, [fetchAll]);

  const handleNavigate = (view, agentId) => {
    setSelectedAgent(agentId || null);
    setCurrentView(view);
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
        onSelectAgent={(id) => handleNavigate("detail", id)}
        onRefresh={fetchAll}
      />
    );
  };

  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          agents={agents}
          onRefresh={fetchAll}
        />
        <div className="app-main">
          <Header
            systemStatus={{ ollama: ollamaStatus }}
          />
          <main className="main-content">{renderContent()}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
