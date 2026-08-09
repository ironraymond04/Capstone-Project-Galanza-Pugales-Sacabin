import { useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

// The end-to-end flow, in order — this genuinely is a sequence,
// so numbering it communicates real information.
const FLOW = [
  {
    n: "01",
    title: "Log in",
    text: "Students, faculty & staff, and admins each sign in with credentials that are validated against the User data store.",
  },
  {
    n: "02",
    title: "Describe the concern",
    text: "A student picks an office or simply describes the issue in plain language on the dashboard.",
  },
  {
    n: "03",
    title: "Classify & route",
    text: "The multi-label classification module reads the ticket, tags its category and urgency, and assigns it to the office best equipped to resolve it - no manual sorting required.",
  },
  {
    n: "04",
    title: "Staff receives it",
    text: "The routed ticket lands directly in the right office's queue, prioritized automatically alongside everything else they're handling.",
  },
  {
    n: "05",
    title: "Work gets done",
    text: "Staff update the ticket's status as they work - Open, In Progress, Resolved, or Escalated if it needs to go further.",
  },
  {
    n: "06",
    title: "Everyone stays in the loop",
    text: "Notifications alert the student the moment there's a reply, and admins can see escalations the moment they happen.",
  },
  {
    n: "07",
    title: "Close the loop",
    text: "Once resolved, the student rates the experience - feedback that rolls up into the analytics admins use to spot patterns.",
  },
];

const ROLE_DETAIL = [
  {
    role: "Students",
    color: "var(--maroon-500)",
    points: [
      "Submit a ticket and get an AI-suggested office in seconds",
      "Track status and full history any time",
      "Use the campus map to find an office in person",
      "Rate the resolution once it's closed",
    ],
  },
  {
    role: "Faculty & Staff",
    color: "var(--maroon-600)",
    points: [
      "Receive tickets already sorted by category and urgency",
      "Update ticket status as work progresses",
      "View priority tickets first, always",
      "Check activity logs and ticket reports for their office",
    ],
  },
  {
    role: "Admin",
    color: "var(--maroon-700)",
    points: [
      "Oversee every ticket, user, and office from one place",
      "Manage escalations before they become a pattern",
      "Generate analytics across offices and time periods",
      "Review system logs for a full audit trail",
    ],
  },
];

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Navbar />

      {/* Intro */}
      <section
        style={{
          background: "linear-gradient(180deg, var(--maroon-900) 0%, var(--maroon-700) 100%)",
          color: "var(--white)",
          padding: "72px 32px 88px",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "var(--white)", fontSize: 38, maxWidth: 680, margin: "0 auto 16px" }}>
          From submitting your concern to resolving your ticket, every step is automatically routed to the appropriate office.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
          One system, three portals, and an AI classification module doing the routing
          work that used to mean guessing which window to line up at.
        </p>
      </section>

      {/* Flow timeline */}
      <section style={{ maxWidth: 860, margin: "-48px auto 0", padding: "0 32px 90px" }}>
        <div className="card" style={{ padding: "36px 40px" }}>
          {FLOW.map((step, i) => (
            <div
              key={step.n}
              style={{
                display: "flex",
                gap: 24,
                paddingBottom: i < FLOW.length - 1 ? 28 : 0,
                position: "relative",
              }}
            >
              {/* connector line */}
              {i < FLOW.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 23,
                    top: 48,
                    bottom: 0,
                    width: 2,
                    background: "var(--maroon-100)",
                  }}
                />
              )}
              <div
                style={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--white)",
                  border: "1.5px solid var(--maroon-300)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--maroon-700)",
                  zIndex: 1,
                }}
              >
                {step.n}
              </div>
              <div style={{ paddingTop: 4 }}>
                <span className="eyebrow">{step.code}</span>
                <h3 style={{ fontSize: 18, marginTop: 4 }}>{step.title}</h3>
                <p style={{ fontSize: 14, marginBottom: 0 }}>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-role breakdown */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, marginTop: 8 }}>What each portal gives you</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {ROLE_DETAIL.map((r) => (
            <div key={r.role} className="card">
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: r.color,
                  marginBottom: 12,
                }}
              />
              <h3 style={{ fontSize: 18 }}>{r.role}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {r.points.map((p) => (
                  <li key={p} style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 8 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--line)", padding: "24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          © {new Date().getFullYear()} Developed by: Galanza, Pugales, Sacabin. All rights reserved.
        </p>
      </footer>
    </div>
  );
}