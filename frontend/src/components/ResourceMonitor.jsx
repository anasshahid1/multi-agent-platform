function Gauge({ label, percent, detail, alertThreshold = 90 }) {
  const level =
    percent > alertThreshold ? "danger" : percent > 70 ? "warning" : "normal";

  return (
    <div className="card">
      <div className="gauge-container">
        <div className="card-title">{label}</div>
        <div className="gauge-value">{percent.toFixed(1)}%</div>
        <div className="gauge-bar">
          <div
            className={`gauge-fill ${level}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="gauge-detail">{detail}</div>
      </div>
    </div>
  );
}

export default function ResourceMonitor({ metrics }) {
  if (!metrics) return null;

  const { cpu, ram, disk } = metrics;

  return (
    <div className="dashboard-grid">
      <Gauge
        label="CPU"
        percent={cpu.percent}
        detail={`${cpu.cores} cores`}
      />
      <Gauge
        label="RAM"
        percent={ram.percent}
        detail={`${ram.used_gb} / ${ram.total_gb} GB`}
      />
      <Gauge
        label="Disk"
        percent={disk.percent}
        detail={`${disk.used_gb} / ${disk.total_gb} GB`}
      />
    </div>
  );
}
