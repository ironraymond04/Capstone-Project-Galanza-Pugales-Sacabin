import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

console.log("Gemini key loaded:", import.meta.env.VITE_GEMINI_API_KEY ? "YES" : "NO");
console.log("Key preview:", import.meta.env.VITE_GEMINI_API_KEY?.slice(0, 6) + "...");

// Keep this in sync with the OFFICES array in your dashboards
const OFFICE_LABELS = [
  "Registrar", "Library", "Guidance Office", "Accounting", "DSA/OSAS",
  "CAS", "COE", "CED", "CCS", "COC", "CBA", "BED", "GS", "SECURITY", "PHYSICAL PLANT", "NSTP", "RESEARCH AND CREATIVE WORKS", "PENWOOD", "MIS", "HUMAN RESOURCE",
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
- REGISTRAR: The Registrar's Office handles enrollment, transcripts, and official student records. It also manages subject loads, shifting between programs, and cross-enrollment. It takes on official grade encoding disputes that are not tied to a specific subject, such as a Transcript of Records (TOR) that shows the wrong final GPA.

- LIBRARY: The Library takes care of book borrowing, library fines, and library access. Students go here to borrow materials, settle overdue or lost-item charges, and get access to library services and facilities.

- GUIDANCE OFFICE: The Guidance Office provides counseling and addresses behavioral concerns. It also handles non-financial scholarships, so students go here for support with personal or social issues and for scholarship matters that don't involve payments or fees.

- ACCOUNTING: The Accounting Office manages everything related to money owed to or from the school, including tuition, fees, payments, and refunds. Students go here for billing questions, payment concerns, and refund requests.

- DSA/OSAS: The Department of Student Affairs and Services (also called the Office of Student Affairs and Services) oversees student organizations and discipline. It also handles student ID concerns and clearance, so it is the place for organization matters, disciplinary cases, ID issues, and clearance processing.

- CAS: The College of Arts and Sciences handles department-specific academic concerns for its programs: AB-ENG, AB-FIL, and AB-POLSCI. Students in these programs go here for questions about their subjects, coursework, and academic standing within the college.

- COE: The College of Engineering handles department-specific academic concerns for its programs: BSCE, BSEE, BSME, BSECE, and BSCpE. Engineering students bring their subject-related and program-related academic issues here.

- CED: The College of Education handles department-specific academic concerns for BEED and BSED students. Concerns about subjects, coursework, and academic matters within these education programs belong here.

- CCS: The College of Computer Studies handles department-specific academic concerns for BSIT, BSCS, and related IT and CS programs and subjects. Students go here for questions about their computing courses and academic matters within the college.

- COC: The College of Criminology handles department-specific academic concerns for BSCRIM students. Subject-related and program-related academic issues for Criminology students are directed here.

- CBA: The College of Business Administration handles department-specific academic concerns for its programs: BSBA-FM, BSBA-MM, BSBA-OM, and BSBA-HRM. Business students go here for academic questions about their subjects and program.

- BED: The Basic Education Department handles department-specific academic concerns for both Junior High School and Senior High School. Students at these levels bring their subject and academic matters here.

- GRADUATE STUDIES: Graduate Studies handles department-specific academic concerns for its graduate programs, currently MAED. Master's students go here for questions about their courses and academic requirements.

- SECURITY: Handles campus safety (firearms, deadly weapons, vape/cigarettes, etc.), access control, and order. Route tickets about lost and found items, theft or suspicious persons, ID or gate entry problems, visitor and vehicle passes, parking and traffic concerns, CCTV review requests, incident or accident reports, and emergencies on campus. Do NOT route facility repairs (PHYSICAL PLANT) or network or account problems (MIS) here.

- PHYSICAL PLANT: Handles the maintenance, repair, and upkeep of campus buildings, grounds, and utilities. Route tickets about broken chairs, desks, doors, windows, or locks, faulty lights, electrical outlets, or aircon units, plumbing leaks, clogged or unclean restrooms, water or power interruptions, leaking roofs, grounds and landscaping, and room setup or equipment moving for events. Do NOT route IT equipment faults such as computers or projectors (MIS) or safety incidents (SECURITY) here.

- NSTP: The National Service Training Program office, which handles the CWTS and ROTC components. Route tickets about NSTP enrollment and section assignments, schedules, community service activity requirements, attendance and completion records, NSTP serial numbers and certificates, and requests for NSTP-related clearance or documents. Do NOT route general enrollment or grade concerns here unless they are specifically about NSTP.

- RESEARCH AND CREATIVE WORKS: Handles research, innovation, and creative output at the college. Route tickets about research proposal submission and approval, thesis or capstone research support, ethics review, research grants and funding, publication and journal requests, paper presentations or conferences, intellectual property and copyright concerns, and requests to showcase creative works or projects. Do NOT route routine academic or course issues here.

- PENWOOD: Handles the college's student publication and creative media. Route tickets about article, feature, photo, or graphic submissions, requests to cover an event or announcement, publication membership and tryouts, issue releases and distribution, corrections or editorial concerns, and press or media inquiries. Do NOT route research publication concerns (RESEARCH AND CREATIVE WORKS) here.

- MIS: The Management Information Systems office, which handles all campus technology and information systems. Route tickets about student, faculty, and staff account issues (login problems, password resets, email, portal access), Wi-Fi and network problems, computer laboratory and workstation faults, projector or presentation equipment issues, software installation and licenses, enrollment, grading, or other system errors, website and online services, and data or system access requests. Do NOT route physical room repairs (PHYSICAL PLANT) here.

- HUMAN RESOURCE: Handles employee-related concerns for faculty and staff. Route tickets about employment records and contracts, payroll and salary concerns, leave applications and balances, attendance and DTR corrections, benefits and government contributions (SSS, PhilHealth, Pag-IBIG), recruitment and applications, certificates of employment, faculty and staff performance or conduct concerns, and onboarding or separation processing. Do NOT route student concerns here.

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