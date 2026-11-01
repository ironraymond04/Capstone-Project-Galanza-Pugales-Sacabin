import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import {
  CLASSIFICATION_SCHEMA,
  CONCERN_WRITER_PROMPT,
  REPORT_PROMPT,
  REPORT_SCHEMA,
  SYSTEM_PROMPT,
} from "../prompts.js";

const REPORT_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash"]; // tried in order
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let client = null;
function getClient() {
  if (!config.geminiApiKey) {
    const err = new Error("GEMINI_API_KEY is not configured on the server");
    err.status = 503;
    throw err;
  }
  client ??= new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

function parseJsonSafe(text) {
  return JSON.parse((text || "").replace(/```json|```/g, "").trim());
}

export async function generateTicketReport({ stats, tickets }) {
  const ai = getClient();
  const contents = JSON.stringify({ generatedAt: new Date().toISOString(), stats, tickets });
  let lastError = null;

  for (const model of REPORT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: REPORT_PROMPT,
            responseMimeType: "application/json",
            responseSchema: REPORT_SCHEMA,
            maxOutputTokens: 8192,
          },
        });
        if (!response.text) throw new Error("Empty response from model");
        return parseJsonSafe(response.text);
      } catch (err) {
        lastError = err;
        console.error(`Report failed (model=${model}, attempt=${attempt + 1}):`, err.message);
        const retryable = /429|503|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(String(err?.message || err));
        if (retryable && attempt === 0) {
          await sleep(2000);
          continue;
        }
        break;
      }
    }
  }
  throw lastError || new Error("Report generation failed");
}

export async function suggestTransferOffice({ concernText, transferReason, currentOffice }) {
  const ai = getClient();
  try {
    const contents = [
      `Ticket concern: ${concernText}`,
      `Currently assigned office: ${currentOffice || "Unassigned"}`,
      `Admin's reason for transferring: ${transferReason?.trim() || "(not provided)"}`,
      "",
      "This ticket is being TRANSFERRED because it is in the wrong office.",
      "Choose the best office to receive it. Do NOT pick the currently assigned office.",
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: CLASSIFICATION_SCHEMA,
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text);
    const current = (currentOffice || "").toLowerCase();
    const office =
      [result.primary_office, ...(result.labels || [])].find(
        (label) => label && label.toLowerCase() !== current
      ) || null;
    if (!office) return null;

    return { office, confidence: Math.round(result.confidence), reasoning: result.reasoning };
  } catch (err) {
    console.error("AI transfer suggestion failed:", err.message);
    return null;
  }
}

export async function generateConcernText(roughText) {
  const ai = getClient();
  const input = (roughText || "").trim();
  if (!input) return null;

  for (const model of REPORT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: input,
        config: { systemInstruction: CONCERN_WRITER_PROMPT, temperature: 0.4, maxOutputTokens: 512 },
      });
      const text = (response.text || "").trim();
      if (text) return text;
    } catch (err) {
      console.error(`Concern generation failed (model=${model}):`, err.message);
    }
  }
  return null;
}