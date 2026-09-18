import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Keep this in sync with the OFFICES array in your dashboards
const OFFICE_LABELS = [
  "Registrar", "Library", "Guidance Office", "Accounting", "DSA",
  "CAS", "COE", "CED", "CCS", "COC", "CBA", "BED", "GS",
];

const CLASSIFICATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    primary_office: {
      type: Type.STRING,
      enum: OFFICE_LABELS,
      description: "The single best-fit office to route this ticket to.",
    },
    labels: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: OFFICE_LABELS },
      description: "All offices this concern plausibly touches, most relevant first (multi-label).",
    },
    priority: {
      type: Type.STRING,
      enum: ["low", "medium", "high"],
    },
    confidence: {
      type: Type.NUMBER,
      description: "0-100 confidence score in primary_office.",
    },
    reasoning: {
      type: Type.STRING,
      description: "One short sentence explaining the routing decision.",
    },
  },
  required: ["primary_office", "labels", "priority", "confidence", "reasoning"],
};

const SYSTEM_PROMPT = `You are the ticket classification engine for St. Peter's College's campus helpdesk.

Read the student's concern and decide which office should handle it. Offices and typical scope:
- Registrar: enrollment, grades, transcripts, student records, subject load
- Library: book borrowing, library fines, library access
- Guidance Office: counseling, behavioral concerns, scholarships (non-financial)
- Accounting: tuition, fees, payments, refunds
- DSA (Student Affairs): organizations, discipline, student ID, clearance
- CAS/COE/CED/CCS/COC/CBA/BED/GS: department-specific academic concerns (advising, faculty, curriculum) for that college
- GS: graduate school specific concerns

Rules:
- Pick exactly one primary_office.
- List every office in "labels" that is plausibly relevant, primary_office first.
- Set priority "high" for anything blocking enrollment/exams/payment deadlines or urgent safety/wellbeing issues, "medium" for standard service requests, "low" for general inquiries.
- confidence reflects how certain you are about primary_office, not the whole ticket.
- Keep reasoning to one sentence.`;

export async function classifyTicket(concernText) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: concernText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: CLASSIFICATION_SCHEMA,
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text);

    return {
      office: result.primary_office,
      labels: result.labels,
      priority: result.priority,
      confidence: Math.round(result.confidence),
      reasoning: result.reasoning,
    };
  } catch (err) {
    console.error("AI classification failed:", err);
    return null; // caller should fall back gracefully
  }
}