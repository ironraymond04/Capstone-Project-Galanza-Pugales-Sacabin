import { apiFetch } from "./api";

// All AI work now runs on the Express server (server/services/gemini.js),
// so the Gemini API key never reaches the browser.

export async function generateTicketReport({ stats, tickets }) {
  // Throws so the UI can show the real reason
  return apiFetch("/api/ai/report", { method: "POST", body: { stats, tickets }, timeoutMs: 90000 });
}

export async function suggestTransferOffice({ concernText, transferReason, currentOffice }) {
  try {
    const { suggestion } = await apiFetch("/api/ai/transfer-suggestion", {
      method: "POST",
      body: { concernText, transferReason, currentOffice },
      timeoutMs: 60000,
    });
    return suggestion;
  } catch (err) {
    console.error("AI transfer suggestion failed:", err);
    return null;
  }
}

export async function generateConcernText(roughText) {
  const input = (roughText || "").trim();
  if (!input) return null;
  try {
    const { text } = await apiFetch("/api/ai/concern-text", { method: "POST", body: { text: input } });
    return text;
  } catch (err) {
    console.error("Concern generation failed:", err);
    return null; // caller shows an error message
  }
}