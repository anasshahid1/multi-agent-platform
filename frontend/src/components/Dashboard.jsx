import ResourceMonitor from "./ResourceMonitor";
import AgentCard from "./AgentCard";

export default function Dashboard({ agents, metrics, onSelectAgent, onRefresh }) {
  const running = agents.filter((a) => a.status === "running").length;
  const idle = agents.filter((a) => a.status === "idle").length;

  return (
    <div>
      <ResourceMonitor metrics={metrics} />

      <div className="section-header">
        <div className="section-title">Agents</div>
        <div className="section-meta">
          {running > 0 && (
            <span style={{ color: "var(--accent-blue)", marginRight: 12 }}>
              {running} running
            </span>
          )}
          <span>{idle} idle</span>
        </div>
      </div>

      <div className="dashboard-agents">
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onSelect={onSelectAgent}
            onRefresh={onRefresh}
            animClass={`animate-in animate-in-${i + 3}`}
          />
        ))}
      </div>
    </div>
  );
}
