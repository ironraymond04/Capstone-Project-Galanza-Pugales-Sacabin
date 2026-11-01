import { config } from "../config.js";

/** Calls the FastAPI service (TF-IDF + One-vs-Rest Logistic Regression). Returns null on failure. */
export async function classifyWithML(text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.mlTimeoutMs);
  try {
    const res = await fetch(`${config.mlServiceUrl}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ML service responded ${res.status}`);
    const ml = await res.json();
    return {
      office: ml.office,
      officeId: ml.office_id,
      labels: ml.top3.filter((r) => r.score >= 0.15).map((r) => r.office),
      predictedOfficeIds: ml.labels ?? [ml.office_id],
      priority: "medium", // the model only predicts the office
      confidence: ml.confidence,
      reasoning: "Routed by the TF-IDF + Logistic Regression model.",
      source: "ml",
    };
  } catch (err) {
    console.error("ML classification failed:", err.message);
    return null; // ticket is saved unassigned so an admin can route it
  } finally {
    clearTimeout(timer);
  }
}

export async function mlHealth() {
  try {
    const res = await fetch(`${config.mlServiceUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}