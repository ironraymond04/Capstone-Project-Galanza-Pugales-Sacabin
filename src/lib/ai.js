import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

console.log("Gemini key loaded:", import.meta.env.VITE_GEMINI_API_KEY ? "YES" : "NO");
console.log("Key preview:", import.meta.env.VITE_GEMINI_API_KEY?.slice(0, 6) + "...");

// Keep this in sync with the OFFICES array in your dashboards
const OFFICE_LABELS = [
  "Registrar", "Library", "Guidance Office", "Accounting", "DSA/OSAS",
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
- REGISTRAR: enrollment, transcripts, student records, subject load, shifting/cross-enrollment, official grade encoding disputes that are NOT tied to a specific subject (e.g. "my TOR shows the wrong final GPA")
- LIBRARY: book borrowing, library fines, library access
- GUIDANCE OFFICE: counseling, behavioral concerns, scholarships (non-financial)
- ACCOUNTING: tuition, fees, payments, refunds
- DSA/OSAS: organizations, discipline, student ID, clearance in Department of Student Affairs and Services/Office of Student Affairs and Services
- CAS: department-specific academic concerns for College of Arts and Sciences (AB-ENG, AB-FIL, AB-POLSCI)
- COE: department-specific academic concerns for College of Engineering (BSCE, BSEE, BSME, BSECE, BSCpe)
- CED: department-specific academic concerns for College of Education (BEED, BSED)
- CCS: department-specific academic concerns for College of Computer Studies (BSIT, BSCS, and related IT/CS programs and subjects)
- COC: department-specific academic concerns for College of Criminology (BSCRIM)
- CBA: department-specific academic concerns for College of Business Administration (BSBA-FM, BSBA-MM, BSBA-OM, BSBA-HRM)
- BED: department-specific academic concerns for Basic Education Department (Junior High School and Senior High School)
- GRADUATE STUDIES: department-specific academic concerns for Graduate Studies (MAED)

Critical routing rule for grades:
- If the concern names a SPECIFIC SUBJECT or COURSE (e.g. "missing grade in Information Technology Fundamentals", "incomplete grade in Data Structures", "wrong grade in Thesis Writing"), route it to the COLLEGE that teaches that subject, NOT Registrar. Use the subject name to infer the program/college (e.g. any IT/Computer Science/Programming/Networking/Systems subject → CCS; any Engineering subject → COE; general education, English, Math, Filipino → CAS; Business, Marketing, Accounting-as-a-subject → CBA; Education/Teaching methods subjects → CED; Criminology/Law Enforcement subjects → COC).
- Only route to Registrar when the concern is about the official record/transcript itself (e.g. "my grades are missing from my TOR", "my GPA on my transcript is wrong") and does not name a specific class, or is about enrollment/subject load generally.

General rules:
- Pick exactly one primary_office.
- List every office in "labels" that is plausibly relevant, primary_office first.
- Set priority "high" for anything blocking enrollment/exams/payment deadlines or urgent safety/wellbeing issues, "medium" for standard service requests, "low" for general inquiries.
- confidence reflects how certain you are about primary_office, not the whole ticket.
- Keep reasoning to one sentence.`;

export async function classifyTicket(concernText) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
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

const REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "2-3 sentence executive summary of overall helpdesk health.",
    },
    status_insights: {
      type: Type.OBJECT,
      properties: {
        open: { type: Type.STRING, description: "One or two sentences about Open tickets." },
        in_progress: { type: Type.STRING, description: "One or two sentences about In Progress tickets." },
        resolved: { type: Type.STRING, description: "One or two sentences about Resolved/Closed tickets." },
      },
      required: ["open", "in_progress", "resolved"],
    },
    office_insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          office: { type: Type.STRING },
          observation: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["office", "observation", "severity"],
      },
    },
    recurring_themes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          approx_count: { type: Type.NUMBER },
        },
        required: ["theme", "approx_count"],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["action", "priority"],
      },
    },
    attention_tickets: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "Ticket code, e.g. TCK-0012" },
          reason: { type: Type.STRING },
        },
        required: ["code", "reason"],
      },
    },
  },
  required: [
    "summary", "status_insights", "office_insights",
    "recurring_themes", "recommendations", "attention_tickets",
  ],
};

const REPORT_PROMPT = `You are an analytics assistant for St. Peter's College's campus helpdesk.

You receive aggregate statistics and a list of tickets (Open, In Progress, Resolved, Transferred). Write a concise, factual report for the system administrator.

Rules:
- Base every statement ONLY on the data provided. Never invent numbers or tickets.
- "summary": 2-3 sentences on overall health (volume, resolution rate, bottlenecks).
- "status_insights": explain what the Open, In Progress and Resolved tickets are mostly about and anything notable (e.g. old open tickets, fast resolutions).
- "office_insights": only offices that have notable workload, delays, or unassigned/transferred issues. Severity "high" = heavy backlog or stalled tickets.
- "recurring_themes": group similar concerns (e.g. "Missing grades", "Tuition payment issues") with an approximate count.
- "recommendations": 3-5 specific, actionable steps for the admin.
- "attention_tickets": up to 5 tickets that need admin attention (oldest unresolved, unassigned, escalated, or low AI confidence). Use the ticket code exactly as given.
- Keep the tone professional and brief.`;

export async function generateTicketReport({ stats, tickets }) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: JSON.stringify({ generatedAt: new Date().toISOString(), stats, tickets }),
      config: {
        systemInstruction: REPORT_PROMPT,
        responseMimeType: "application/json",
        responseSchema: REPORT_SCHEMA,
        temperature: 0.2,
      },
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error("AI report generation failed:", err);
    return null;
  }
}