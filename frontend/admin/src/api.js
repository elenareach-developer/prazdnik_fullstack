// Single place for admin API calls. Matches backend/admin/router.py (prefix /api/admin).
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const ADMIN_API = `${API_BASE}/admin`;

async function request(path, options = {}) {
  const response = await fetch(`${ADMIN_API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    throw new Error(detail || `Ошибка запроса (${response.status})`);
  }
  return data;
}

export const adminApi = {
  dashboard: () => request("/dashboard"),
  orders: () => request("/orders"),
  analyzeOrder: (id, context = {}) =>
    request(`/orders/${id}/analyze`, { method: "POST", body: JSON.stringify(context) }),
  orderConcepts: (id, context = {}) =>
    request(`/orders/${id}/concepts`, { method: "POST", body: JSON.stringify(context) }),
  portraitFromForm: (form) =>
    request("/ai/client-portrait", { method: "POST", body: JSON.stringify(form) }),
  conceptsFromForm: (form) =>
    request("/ai/concepts", { method: "POST", body: JSON.stringify(form) }),
};
