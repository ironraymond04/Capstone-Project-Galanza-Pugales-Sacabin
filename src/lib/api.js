import { supabase } from "./supabaseClient";

// Dev: "" (Vite proxies /api to Express). Production: set VITE_API_URL to the deployed server.
const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch(path, { method = "GET", body, timeoutMs = 30000 } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}