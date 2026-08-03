import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/theme.css";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "status", label: "Check Ticket Status", icon: "•" },
  { id: "submit", label: "Select Office & Submit", icon: "•" },
  { id: "map", label: "Use Campus Map", icon: "•" },
  { id: "responses", label: "Receive Response", icon: "•" },
  { id: "feedback", label: "Submit Feedback & Ratings", icon: "•" },
  { id: "history", label: "View Ticket History", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•" },
];

const OFFICES = ["Registrar", "Library", "Guidance Office", "Accounting", "DSA", "CAS", "COE", "CED", "CCS", "COC", "CBA", "BED", "GS"];

const MY_TICKETS = [
  { id: "TCK-2201", subject: "Unable to access enrollment portal", office: "IT Services", status: "In Progress", confidence: 92, updated: "2h ago" },
  { id: "TCK-2198", subject: "Missing grade in Physics 101", office: "Registrar", status: "Open", confidence: 87, updated: "1d ago" },
  { id: "TCK-2170", subject: "Lost student ID replacement", office: "Registrar", status: "Resolved", confidence: 95, updated: "5d ago" },
  { id: "TCK-2140", subject: "Library book fine dispute", office: "Library", status: "Resolved", confidence: 81, updated: "2w ago" },
];

const NOTIFICATIONS = [
  { text: "Your ticket TCK-2201 was routed to IT Services.", time: "2h ago" },
  { text: "Staff replied to TCK-2198.", time: "1d ago" },
  { text: "TCK-2170 has been marked Resolved.", time: "5d ago" },
];

export default function StudentDashboard() {
  const [active, setActive] = useState("overview");
  const [ticketText, setTicketText] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");

  return (
    <div className="chd-app-shell">
      <Sidebar
        role="Student"
        userName="[Your Name]"
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={3}
      />
      <div className="chd-main">
        <div className="chd-content">
          {active === "overview" && <Overview onSelect={setActive} />}
          {active === "status" && <CheckStatus />}
          {active === "submit" && (
            <SubmitTicket
              ticketText={ticketText}
              setTicketText={setTicketText}
              selectedOffice={selectedOffice}
              setSelectedOffice={setSelectedOffice}
            />
          )}
          {active === "map" && <CampusMap />}
          {active === "responses" && <ReceiveResponse />}
          {active === "feedback" && <Feedback />}
          {active === "history" && <History />}
          {active === "notifications" && <Notifications />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- sections ---------------- */

function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h1 style={{ fontSize: 28, marginTop: 6 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}

function ConfidenceMeter({ pct }) {
  return (
    <div className="ai-meter">
      <div className="ai-meter-ring" style={{ "--pct": pct }}>{pct}%</div>
      <div className="ai-meter-label">
        AI routing <br /> <strong>confidence</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Open: "badge-open",
    "In Progress": "badge-progress",
    Resolved: "badge-resolved",
    Escalated: "badge-escalated",
  };
  return <span className={`badge ${map[status] || "badge-open"}`}>{status}</span>;
}

function Overview({ onSelect }) {
  const stats = [
    { label: "Open tickets", value: 2 },
    { label: "Resolved this month", value: 6 },
    { label: "Avg. response time", value: "4.2h" },
  ];
  return (
    <>
      <PageHeader title="Welcome back, [Your Name]" subtitle="Here's where things stand across your helpdesk tickets." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--maroon-800, var(--maroon-700))" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Recent tickets</h3>
        <table className="chd-table">
          <thead>
            <tr><th>Ticket</th><th>Office</th><th>Status</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {MY_TICKETS.slice(0, 3).map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                <td>{t.office}</td>
                <td><StatusBadge status={t.status} /></td>
                <td>{t.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-primary" onClick={() => onSelect("submit")}>+ Submit a new ticket</button>
    </>
  );
}

function CheckStatus() {
  return (
    <>
      <PageHeader title="Your tickets" subtitle="Retrieved from the Ticket data store." />
      <div className="card">
        <table className="chd-table">
          <thead>
            <tr><th>Ticket</th><th>Subject</th><th>Office</th><th>Status</th></tr>
          </thead>
          <tbody>
            {MY_TICKETS.map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                <td>{t.subject}</td>
                <td>{t.office}</td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SubmitTicket({ ticketText, setTicketText, selectedOffice, setSelectedOffice }) {
  const [submitted, setSubmitted] = useState(false);
  const suggestedOffice = ticketText.length > 0 ? OFFICES[ticketText.length % OFFICES.length] : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageHeader
        title="Submit a new concern"
        subtitle="Describe the issue and the classification module will suggests the right office."
      />
      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Describe your concern</label>
            <textarea
              rows={5}
              placeholder="e.g. I can't log in to the enrollment portal, it keeps rejecting my student number..."
              value={ticketText}
              onChange={(e) => { setTicketText(e.target.value); setSubmitted(false); }}
            />
          </div>

          {suggestedOffice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--maroon-050)",
                border: "1px dashed var(--maroon-300)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Suggested office</div>
                <strong>{suggestedOffice}</strong>
              </div>
              <ConfidenceMeter pct={Math.min(96, 60 + (ticketText.length % 35))} />
            </div>
          )}

          <div className="field">
            <label>Office (edit if needed)</label>
            <select value={selectedOffice || suggestedOffice || ""} onChange={(e) => setSelectedOffice(e.target.value)}>
              <option value="">Select an office…</option>
              {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Submit ticket
          </button>

          {submitted && (
            <p style={{ color: "var(--success)", fontSize: 13, marginTop: 12 }}>
              Ticket submitted — saved to the Ticket data store and routed for review.
            </p>
          )}
        </form>
      </div>
    </>
  );
}

function CampusMap() {
const CAMPUS_LAT = 8.2318034;
const CAMPUS_LNG = 124.2364283;
const mapSrc = `https://www.google.com/maps?q=${CAMPUS_LAT},${CAMPUS_LNG}&z=17&output=embed`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${CAMPUS_LAT},${CAMPUS_LNG}`;

return (
  <>
      <PageHeader title="Find your office" subtitle="Retrieved from the Office data store." />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 320, position: "relative" }}>
          <iframe
            title="Campus Map"
            src={mapSrc}
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            St. Peter's College - Main campus
          </span>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            Get directions ↗
          </a>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {OFFICES.map((o) => (
              <div key={o} className="card" style={{ padding: 12 }}>
                <strong style={{ fontSize: 13 }}>{o}</strong>
                <p style={{ fontSize: 12, marginTop: 4 }}>Bldg. {1 + OFFICES.indexOf(o)}, Ground Flr.</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
);
}

function ReceiveResponse() {
  return (
    <>
      <PageHeader title="Staff responses" subtitle="Retrieved from the Survey Response data store." />
      <div className="card">
        {[
          { office: "IT Services", ticket: "TCK-2201", msg: "We've reset your portal access,R please try logging in again.", time: "2h ago" },
          { office: "Registrar", ticket: "TCK-2198", msg: "Your grade correction is being processed with the professor.", time: "1d ago" },
        ].map((r, i) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: i === 0 ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong style={{ fontSize: 14 }}>{r.office} · <span style={{ fontFamily: "var(--font-mono)", fontWeight: 400 }}>{r.ticket}</span></strong>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{r.time}</span>
            </div>
            <p style={{ fontSize: 14, margin: 0 }}>{r.msg}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Feedback() {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHeader title="Rate your resolution" subtitle="Saved to the Survey Response data store." />
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Ticket</label>
          <select><option>TCK-2170 - Lost student ID replacement</option></select>
        </div>
        <div className="field">
          <label>Rating</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                style={{
                  fontSize: 24,
                  background: "none",
                  color: n <= rating ? "var(--maroon-500)" : "var(--line)",
                }}
              >★</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Comments (optional)</label>
          <textarea rows={3} placeholder="Tell us about your experience..." />
        </div>
        <button className="btn btn-primary" onClick={() => setSent(true)}>Submit feedback</button>
        {sent && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 12 }}>Thanks — your feedback was recorded.</p>}
      </div>
    </>
  );
}

function History() {
  return (
    <>
      <PageHeader title="Full ticket history" subtitle="Retrieved from the Ticket data store." />
      <div className="card">
        <table className="chd-table">
          <thead>
            <tr><th>Ticket</th><th>Subject</th><th>Office</th><th>Status</th><th>AI confidence</th></tr>
          </thead>
          <tbody>
            {MY_TICKETS.map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                <td>{t.subject}</td>
                <td>{t.office}</td>
                <td><StatusBadge status={t.status} /></td>
                <td>{t.confidence}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Notifications() {
  return (
    <>
      <PageHeader title="Notifications" subtitle="Retrieved from the Notification data store." />
      <div className="card">
        {NOTIFICATIONS.map((n, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: i < NOTIFICATIONS.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ fontSize: 14 }}>{n.text}</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{n.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}