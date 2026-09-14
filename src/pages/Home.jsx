import { useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import useIsMobile from "../hooks/useIsMobile";
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
  const isMobile = useIsMobile();

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(180deg, var(--maroon-900) 0%, var(--maroon-500) 62%, #8c1c2b 100%)",
          color: "var(--white)",
          padding: isMobile ? "56px 20px 88px" : "88px 32px 120px",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <h1
            className="page-description page-description--from-left"
            style={{
              color: "var(--white)",
              fontSize: isMobile ? 28 : 44,
              lineHeight: 1.2,
              marginBottom: isMobile ? 14 : 18,
            }}
          >
            Submit your concern once, and let our AI instantly route it to the right office - faster, smarter, and hassle-free.
          </h1>
          <p
            className="page-description page-description--from-left"
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: isMobile ? 15 : 17,
              maxWidth: 560,
              margin: isMobile ? "0 auto 24px" : "0 auto 32px",
            }}
          >
            The St. Peter's College Helpdesk uses multi-label text classification to read every ticket
            and send it straight to the office that can resolve it - no more guessing which
            window to line up at.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 14,
              justifyContent: "center",
            }}
          >
            <button
              className="btn btn-primary"
              style={{
                background: "var(--white)",
                color: "var(--maroon-700)",
                padding: "13px 26px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                justifyContent: "center",
              }}
              onClick={() => navigate("/signup")}
            >
              Get started
            </button>
            <button
              className="btn btn-outline-white"
              style={{
                padding: "13px 26px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                justifyContent: "center",
              }}
              onClick={() => navigate("/login")}
            >
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        style={{
          maxWidth: 1180,
          margin: isMobile ? "-40px auto 0" : "-64px auto 0",
          padding: isMobile ? "0 20px 56px" : "0 32px 80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 16 : 20,
          }}
        >
          {STEPS.map((s) => (
            <div key={s.title} className="card">
              <h3 style={{ marginTop: 10, fontSize: 19 }}>{s.title}</h3>
              <p style={{ fontSize: 14 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: isMobile ? "0 20px 64px" : "0 32px 100px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 36 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 30, marginTop: 8 }}>A dashboard for how you actually work</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 16 : 20,
          }}
        >
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

      <footer style={{ borderTop: "1px solid var(--line)", padding: isMobile ? "20px" : "24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, margin: 0 }}>
          © {new Date().getFullYear()} Developed by: Galanza, Pugales, Sacabin. All rights reserved.
        </p>
      </footer>
    </div>
  );
}