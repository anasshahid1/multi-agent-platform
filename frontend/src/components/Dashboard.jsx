import ResourceMonitor from "./ResourceMonitor";
import AgentCard from "./AgentCard";

export default function Dashboard({ agents, metrics, onSelectAgent, onRefresh }) {
  return (
    <div>
      <ResourceMonitor metrics={metrics} />

      <div className="card-header" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ fontSize: 15 }}>Agents</div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {agents.filter((a) => a.status === "running").length} running |{" "}
          {agents.filter((a) => a.status === "idle").length} idle
        </span>
      </div>

      <div className="dashboard-agents">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={onSelectAgent}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
