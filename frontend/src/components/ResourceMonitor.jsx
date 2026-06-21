import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getSystemHistory } from "../api/client";

function Gauge({ label, percent, detail }) {
  const level = percent > 90 ? "danger" : percent > 70 ? "warning" : "";

  return (
    <div className="card animate-in">
      <div className="gauge-container">
        <div className="gauge-header">
          <span className="gauge-label">{label}</span>
          <span className="gauge-value">{percent.toFixed(1)}%</span>
        </div>
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

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1c1c1f",
      border: "1px solid #2e2e32",
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "#3b82f6" }}>CPU: {payload[0]?.value?.toFixed(1)}%</div>
      <div style={{ color: "#8e8e93" }}>RAM: {payload[1]?.value?.toFixed(1)}%</div>
    </div>
  );
};

export default function ResourceMonitor({ metrics }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getSystemHistory();
        setHistory(data.map((d, i) => ({ ...d, time: i })));
      } catch (e) { /* ignore */ }
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;
  const { cpu, ram, disk } = metrics;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Resources</div>
        <div className="section-meta">{cpu.cores} cores</div>
      </div>

      <div className="dashboard-grid">
        <Gauge label="CPU" percent={cpu.percent} detail={`${cpu.cores} cores`} />
        <Gauge label="Memory" percent={ram.percent} detail={`${ram.used_gb} / ${ram.total_gb} GB`} />
        <Gauge label="Disk" percent={disk.percent} detail={`${disk.free_gb} GB free`} />
      </div>

      {history.length > 2 && (
        <div className="card animate-in" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Usage History</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ramG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#636366" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#636366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cpu_percent" stroke="#3b82f6" fill="url(#cpuG)" strokeWidth={1.5} dot={false} />
                <Area type="monotone" dataKey="ram_percent" stroke="#636366" fill="url(#ramG)" strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
