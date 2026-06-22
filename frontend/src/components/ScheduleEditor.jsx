import { useState } from "react";
import { updateSchedule } from "../api/client";
import { useToast } from "./Toast";
import { Save } from "lucide-react";

export default function ScheduleEditor({ agentId, schedule, onSaved }) {
  const [type, setType] = useState(schedule?.schedule_type || "cron");
  const [hour, setHour] = useState(schedule?.cron_hour ?? 8);
  const [minute, setMinute] = useState(schedule?.cron_minute ?? 0);
  const [interval, setInterval_] = useState(schedule?.interval_minutes ?? 30);
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const addToast = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSchedule(agentId, {
        schedule_type: type,
        cron_hour: type === "cron" ? hour : null,
        cron_minute: type === "cron" ? minute : null,
        interval_minutes: type === "interval" ? interval : null,
        enabled: enabled,
      });
      addToast("Schedule saved", "success");
      if (onSaved) onSaved();
    } catch (err) {
      addToast("Error: " + err.message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="schedule-form">
      <div className="form-group">
        <label className="form-label">Schedule Type</label>
        <select
          className="form-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="cron">Fixed Time (Cron)</option>
          <option value="interval">Interval</option>
        </select>
      </div>

      {type === "cron" ? (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Hour (0-23)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Minute (0-59)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value))}
            />
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Interval (minutes)</label>
          <input
            className="form-input"
            type="number"
            min="1"
            max="1440"
            value={interval}
            onChange={(e) => setInterval_(parseInt(e.target.value))}
          />
        </div>
      )}

      <div className="form-group">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          <span className="form-label" style={{ margin: 0 }}>
            Enabled
          </span>
        </label>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ width: "100%" }}
      >
        {saving ? (
          <span className="spinner" />
        ) : (
          <Save size={12} strokeWidth={2} style={{ marginRight: 4 }} />
        )}
        {saving ? "Saving..." : "Save Schedule"}
      </button>
    </div>
  );
}
