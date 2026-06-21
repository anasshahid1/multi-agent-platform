/**
 * API client for communicating with the backend.
 * Handles REST calls and WebSocket connection for real-time updates.
 */

const API_BASE = "/api";

async function fetchJSON(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// --- Health ---
export const getHealth = () => fetchJSON("/health");

// --- Agents ---
export const getAgents = () => fetchJSON("/agents/");
export const getAgent = (id) => fetchJSON(`/agents/${id}`);
export const triggerAgent = (id) =>
  fetchJSON(`/agents/${id}/trigger`, { method: "POST" });
export const getAgentLogs = (id, limit = 50) =>
  fetchJSON(`/agents/${id}/logs?limit=${limit}`);

// --- Schedules ---
export const getSchedules = () => fetchJSON("/schedules/");
export const getSchedule = (id) => fetchJSON(`/schedules/${id}`);
export const updateSchedule = (id, data) =>
  fetchJSON(`/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// --- Monitor ---
export const getSystemMetrics = () => fetchJSON("/monitor/system");
export const getSystemHistory = () => fetchJSON("/monitor/system/history");
export const getAlerts = () => fetchJSON("/monitor/alerts");
export const getOllamaStatus = () => fetchJSON("/monitor/ollama");

// --- LLM ---
export const getLLMStatus = () => fetchJSON("/llm/status");
export const cancelAgentRequests = (id) =>
  fetchJSON(`/llm/cancel/${id}`, { method: "POST" });

// --- WebSocket ---
export function connectWebSocket(onMessage, onError) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;

  let ws = null;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[WS] Connected to dashboard");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error("[WS] Parse error:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
      if (onError) onError(error);
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected, reconnecting in 5s...");
      reconnectTimer = setTimeout(connect, 5000);
    };
  }

  connect();

  // Return cleanup function
  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) ws.close();
  };
}
