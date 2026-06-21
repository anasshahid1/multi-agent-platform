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
  const level =
    percent > 90 ? "danger" : percent > 70 ? "warning" : "normal";

  return (
    <div className="card glass animate-in">
      <div className="gauge-container">
        <div className="gauge-label">{label}</div>
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(10, 14, 23, 0.9)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
      }}
    >
      <div style={{ color: "#4f8ff7", marginBottom: 4 }}>
        CPU: {payload[0]?.value?.toFixed(1)}%
      </div>
      <div style={{ color: "#a78bfa", marginBottom: 4 }}>
        RAM: {payload[1]?.value?.toFixed(1)}%
      </div>
      <div style={{ color: "#34d399" }}>
        Disk: {payload[2]?.value?.toFixed(1)}%
      </div>
    </div>
  );
};

export default function ResourceMonitor({ metrics }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getSystemHistory();
        setHistory(
          data.map((d, i) => ({
            ...d,
            time: i,
          }))
        );
      } catch (e) {
        /* ignore */
      }
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
        <div className="section-title">System Resources</div>
        <div className="section-meta">Real-time monitoring</div>
      </div>

      <div className="dashboard-grid">
        <Gauge
          label="CPU"
          percent={cpu.percent}
          detail={`${cpu.cores} cores`}
        />
        <Gauge
          label="Memory"
          percent={ram.percent}
          detail={`${ram.used_gb} / ${ram.total_gb} GB`}
        />
        <Gauge
          label="Disk"
          percent={disk.percent}
          detail={`${disk.free_gb} GB free`}
        />
      </div>

      {history.length > 2 && (
        <div className="card glass animate-in" style={{ marginBottom: 28 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Resource History
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f8ff7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4f8ff7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cpu_percent"
                  stroke="#4f8ff7"
                  fill="url(#cpuGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="ram_percent"
                  stroke="#a78bfa"
                  fill="url(#ramGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="disk_percent"
                  stroke="#34d399"
                  fill="url(#diskGrad)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
