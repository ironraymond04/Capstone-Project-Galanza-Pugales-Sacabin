import { useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

const STEPS = [
  {
    title: "Submit a concern",
    text: "Describe your issue. The AI classification module reads it and routes it to the right office automatically.",
  },
  {
    title: "Smart routing",
    text: "Multi-label text classification tags each ticket by category and urgency, then assigns it to the office best equipped to handle it.",
  },
  {
    title: "Track & resolve",
    text: "Staff receive the routed ticket, update its status, and you get notified the moment there's a response.",
  },
];

const ROLES = [
  { name: "Students", detail: "Submit tickets, track status, use the campus map, rate resolutions.", path: "/login" },
  { name: "Faculty & Staff", detail: "Receive routed tickets, manage priority, resolve and report.", path: "/login" },
  { name: "Admin", detail: "Oversee users, offices, escalations, and system-wide analytics.", path: "/login" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          background:
            "linear-gradient(180deg, var(--maroon-900) 0%, var(--maroon-700) 62%, var(--paper) 100%)",
          color: "var(--white)",
          padding: "88px 32px 120px",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "var(--maroon-300)", marginBottom: 14 }}>
            SPC Helpdesk
          </div>
          <h1 style={{ color: "var(--white)", fontSize: 44, lineHeight: 1.1, marginBottom: 18 }}>
            One concern, submitted once — routed to the right office, instantly.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 17, maxWidth: 560, margin: "0 auto 32px" }}>
            The Campus Helpdesk uses multi-label text classification to read every ticket
            and send it straight to the office that can resolve it — no more guessing which
            window to line up at.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button className="btn btn-primary" style={{ background: "var(--white)", color: "var(--maroon-700)", padding: "13px 26px" }} onClick={() => navigate("/signup")}>
              Get started
            </button>
            <button className="btn btn-outline-white" style={{ padding: "13px 26px" }} onClick={() => navigate("/login")}>
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ maxWidth: 1180, margin: "-64px auto 0", padding: "0 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {STEPS.map((s) => (
            <div key={s.code} className="card">
              <span className="eyebrow">{s.code}</span>
              <h3 style={{ marginTop: 10, fontSize: 19 }}>{s.title}</h3>
              <p style={{ fontSize: 14 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="eyebrow">Built for every actor on campus</span>
          <h2 style={{ fontSize: 30, marginTop: 8 }}>A dashboard for how you actually work</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {ROLES.map((r) => (
            <div
              key={r.name}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(r.path)}
            >
              <h3 style={{ fontSize: 18 }}>{r.name}</h3>
              <p style={{ fontSize: 14 }}>{r.detail}</p>
              <span style={{ color: "var(--maroon-600)", fontWeight: 600, fontSize: 13 }}>
                Continue →
              </span>
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