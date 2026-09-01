import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import "../styles/theme.css";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "submit", label: "Concern", icon: "•" },
  { id: "status", label: "Check Ticket Status", icon: "•" },
  { id: "map", label: "Use Campus Map", icon: "•" },
  { id: "feedback", label: "Submit Feedback & Ratings", icon: "•" },
  { id: "history", label: "View Ticket History", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•" },
];

const OFFICES = ["Registrar", "Library", "Guidance Office", "Accounting", "DSA", "CAS", "COE", "CED", "CCS", "COC", "CBA", "BED", "GS"];

const OFFICE_LOCATIONS = {
  Registrar: "Admin Bldg., Ground Flr.",
  Library: "Admin Bldg., 3rd Flr.",
  "Guidance Office": "Engineering Bldg., Ground Flr.",
  Accounting: "Admin Bldg., Ground Flr.",
  DSA: "High School Bldg., Ground Flr.",
  CAS: "Admin Bldg., Ground Flr.",
  COE: "Elementary Bldg., Ground Flr.",
  CED: "High School Bldg., Ground Flr.",
  CCS: "Admin Bldg., Ground Flr.",
  COC: "Criminology Bldg., 2nd Flr.",
  CBA: "Technology Bldg., 2nd Flr.",
  BED: "High School Bldg., Ground Flr.",
  GS: "High School Bldg., Ground Flr.",
};

const MY_TICKETS = [
  { id: "TCK-2201", subject: "Unable to access enrollment portal", office: "IT Services", status: "In Progress", confidence: 92, updated: "2h ago" },
  { id: "TCK-2198", subject: "Missing grade in Physics 101", office: "Registrar", status: "Open", confidence: 87, updated: "1d ago" },
  { id: "TCK-2170", subject: "Lost student ID replacement", office: "Registrar", status: "Resolved", confidence: 95, updated: "5d ago" },
  { id: "TCK-2140", subject: "Library book fine dispute", office: "Library", status: "Resolved", confidence: 81, updated: "2w ago" },
];

const TICKET_DETAILS = {
  "TCK-2201": {
    concern: "Unable to log in to the enrollment portal. An error appears when I try to access it.",
    priority: "Medium",
    aiClassification: "Technical Issue",
    staffResponse: "Your concern is currently being processed.",
    submitted: "August 27, 2026",
  },
  "TCK-2198": {
    concern: "I was marked absent in Physics 101 but I already submitted my requirement. I need a correction.",
    priority: "High",
    aiClassification: "Academic Records",
    staffResponse: "The registrar is validating your records and will update the status once reviewed.",
    submitted: "August 24, 2026",
  },
  "TCK-2170": {
    concern: "I lost my student ID and need a replacement request to continue entering the campus facilities.",
    priority: "Low",
    aiClassification: "Student Services",
    staffResponse: "Your replacement request has been completed and is ready for pickup.",
    submitted: "August 15, 2026",
  },
  "TCK-2140": {
    concern: "I believe the library fine was charged incorrectly for a returned book. I am requesting a review.",
    priority: "Medium",
    aiClassification: "Billing Concern",
    staffResponse: "The library has reviewed your account and resolved the discrepancy.",
    submitted: "August 01, 2026",
  },
};

const NOTIFICATIONS = [
  {
    id: "TCK-2201",
    text: "Your ticket TCK-2201 was routed to IT Services.",
    time: "2h ago",
    subject: "Unable to access enrollment portal",
    update: "Your ticket has been successfully routed to IT Services.",
    assignedOffice: "IT Services",
    status: "In Progress",
    aiClassification: "Technical Issue",
    date: "August 27, 2026 • 9:15 AM",
    type: "routing",
  },
  {
    id: "TCK-2198",
    text: "Staff replied to TCK-2198.",
    time: "1d ago",
    subject: "Missing grade in Physics 101",
    update: "Staff from the Registrar's Office responded to your ticket.",
    assignedOffice: "Registrar",
    status: "In Progress",
    aiClassification: "Technical Issue",
    date: "August 24, 2026 • 10:30 AM",
    staffResponse: "Your concern has been received. We are currently checking your grade record.",
    type: "staff-response",
  },
  {
    id: "TCK-2170",
    text: "TCK-2170 has been marked Resolved.",
    time: "5d ago",
    subject: "Lost student ID replacement",
    update: "Your ticket has been resolved.",
    assignedOffice: "Registrar",
    status: "Resolved",
    aiClassification: "Technical Issue",
    date: "August 15, 2026 • 3:40 PM",
    resolution: "Your request has been processed successfully.",
    type: "resolution",
  },
];

export default function StudentDashboard() {
  const [active, setActive] = useState("overview");
  const [ticketText, setTicketText] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedFeedbackTicketId, setSelectedFeedbackTicketId] = useState(null);
  const isMobile = useIsMobile();

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Student"
        userName="[Your Name]"
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={3}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && <Overview onSelect={setActive} />}
          {active === "status" && <CheckStatus selectedTicketId={selectedTicketId} onTicketSelected={setSelectedTicketId} />}
          {active === "submit" && (
            <SubmitTicket
              ticketText={ticketText}
              setTicketText={setTicketText}
              selectedOffice={selectedOffice}
              setSelectedOffice={setSelectedOffice}
            />
          )}
          {active === "map" && <CampusMap />}
          {active === "feedback" && <Feedback selectedTicketId={selectedFeedbackTicketId} onTicketSelected={setSelectedFeedbackTicketId} />}
          {active === "history" && <History />}
          {active === "notifications" && (
            <Notifications
              onViewFullTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setActive("status");
              }}
              onSubmitFeedback={(ticketId) => {
                setSelectedFeedbackTicketId(ticketId);
                setActive("feedback");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- sections ---------------- */

function PageHeader({ title, subtitle }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ marginBottom: isMobile ? 18 : 26 }}>
      <h1 style={{ fontSize: isMobile ? 22 : 28, marginTop: 6 }}>{title}</h1>
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

/** Wraps any table so it scrolls horizontally instead of blowing out the layout on narrow screens. */
function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

function Overview({ onSelect }) {
  const isMobile = useIsMobile();
  const stats = [
    { label: "Open tickets", value: 2 },
    { label: "Resolved this month", value: 6 },
    { label: "Avg. response time", value: "4.2h" },
  ];
  return (
    <>
      <PageHeader title="Welcome back, [Your Name]" subtitle="Here's where things stand across your helpdesk tickets." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 20 : 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "var(--maroon-800, var(--maroon-700))" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Recent tickets</h3>
        <TableScroll>
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
        </TableScroll>
      </div>
      <button className="btn btn-primary" onClick={() => onSelect("submit")}>+ Submit a new ticket</button>
    </>
  );
}

function CheckStatus({ selectedTicketId, onTicketSelected }) {
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    const nextTicket = MY_TICKETS.find((ticket) => ticket.id === selectedTicketId) || null;
    setSelectedTicket(nextTicket);
  }, [selectedTicketId]);

  return (
    <>
      <PageHeader title="Your tickets" subtitle="This section displays the status of your ticket submitted." />
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead>
              <tr><th>Ticket</th><th>Subject</th><th>Office</th><th>Status</th></tr>
            </thead>
            <tbody>
              {MY_TICKETS.map((t) => (
                <tr key={t.id} onClick={() => { setSelectedTicket(t); onTicketSelected?.(t.id); }} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td>{t.office}</td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => { setSelectedTicket(null); onTicketSelected?.(null); }} />
      )}
    </>
  );
}

function TicketDetailModal({ ticket, onClose }) {
  const details = TICKET_DETAILS[ticket.id] || {
    concern: "No additional details provided.",
    priority: "Medium",
    aiClassification: "General Inquiry",
    staffResponse: "We are currently reviewing your concern.",
    submitted: "N/A",
  };

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-detail-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ticket details">
        <div className="ticket-detail-header">
          <span>TICKET DETAILS</span>
          <button type="button" className="ticket-detail-close" onClick={onClose} aria-label="Close ticket details">×</button>
        </div>

        <div className="ticket-detail-body">
          <div className="ticket-line"><strong>Ticket ID</strong><span>{ticket.id}</span></div>
          <div className="ticket-line"><strong>Subject</strong><span>{ticket.subject}</span></div>
          <div className="ticket-line"><strong>Status</strong><span>{ticket.status}</span></div>
          <div className="ticket-line"><strong>Office</strong><span>{ticket.office}</span></div>
          <div className="ticket-line"><strong>Priority</strong><span>{details.priority}</span></div>

          <div className="ticket-line ticket-line-block">
            <strong>AI Classification</strong>
            <span>{details.aiClassification}</span>
          </div>

          <div className="ticket-line ticket-line-block">
            <strong>Concern</strong>
            <span>{details.concern}</span>
          </div>

          <div className="ticket-line ticket-line-block">
            <strong>Staff Response</strong>
            <span>{details.staffResponse}</span>
          </div>

          <div className="ticket-line"><strong>Submitted</strong><span>{details.submitted}</span></div>
        </div>

        <div className="ticket-detail-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SubmitTicket({ ticketText, setTicketText, selectedOffice, setSelectedOffice }) {
  const isMobile = useIsMobile();
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
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
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

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Submit ticket
          </button>

          {submitted && (
            <p style={{ color: "var(--success)", fontSize: 13, marginTop: 12 }}>
              Your ticket has been submitted, please wait for the response.
            </p>
          )}
        </form>
      </div>
    </>
  );
}

function CampusMap() {
  const isMobile = useIsMobile();
  const CAMPUS_LAT = 8.2318034;
  const CAMPUS_LNG = 124.2364283;
  const mapSrc = `https://www.google.com/maps?q=${CAMPUS_LAT},${CAMPUS_LNG}&z=17&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${CAMPUS_LAT},${CAMPUS_LNG}`;

  return (
    <>
      <PageHeader title="Find your office" subtitle="This map helps you for your destination." />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: isMobile ? 220 : 320, position: "relative" }}>
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

        <div
          style={{
            padding: isMobile ? "12px 14px" : "14px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--line)",
          }}
        >
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

        <div style={{ padding: isMobile ? 14 : 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
{OFFICES.map((o) => (
  <div key={o} className="card" style={{ padding: 12 }}>
    <strong style={{ fontSize: 13 }}>{o}</strong>
    <p style={{ fontSize: 12, marginTop: 4 }}>{OFFICE_LOCATIONS[o]}</p>
  </div>
))}
          </div>
        </div>
      </div>
    </>
  );
}

function Feedback({ selectedTicketId, onTicketSelected }) {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState(selectedTicketId || "TCK-2170");

  useEffect(() => {
    if (selectedTicketId) {
      setTicketId(selectedTicketId);
    }
  }, [selectedTicketId]);

  const options = MY_TICKETS.map((ticket) => ({
    value: ticket.id,
    label: `${ticket.id} - ${ticket.subject}`,
  }));

  return (
    <>
      <PageHeader title="Rate your resolution" subtitle="Let us know your feedback and help us improve." />
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="field">
          <label>Ticket</label>
          <select
            value={ticketId}
            onChange={(event) => {
              const nextTicketId = event.target.value;
              setTicketId(nextTicketId);
              onTicketSelected?.(nextTicketId);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <>
      <PageHeader title="Full ticket history" subtitle="This section displays all the tickets you have submitted." />
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead>
              <tr><th>Ticket</th><th>Subject</th><th>Office</th><th>Status</th><th>AI confidence</th></tr>
            </thead>
            <tbody>
              {MY_TICKETS.map((t) => (
                <tr key={t.id} onClick={() => setSelectedTicket(t)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td>{t.office}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>{t.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </>
  );
}

function Notifications({ onViewFullTicket, onSubmitFeedback }) {
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && selectedNotification) {
        setSelectedNotification(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNotification]);

  return (
    <>
      <PageHeader title="Notifications" subtitle="This section displays all the notifications you have received." />
      <div className="card">
        {NOTIFICATIONS.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setSelectedNotification(n)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              padding: "12px 0",
              borderBottom: i < NOTIFICATIONS.length - 1 ? "1px solid var(--line)" : "none",
              color: "var(--ink)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14 }}>{n.text}</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{n.time}</span>
          </button>
        ))}
      </div>

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onViewFullTicket={() => {
            setSelectedNotification(null);
            onViewFullTicket?.(selectedNotification.id);
          }}
          onSubmitFeedback={() => {
            setSelectedNotification(null);
            onSubmitFeedback?.(selectedNotification.id);
          }}
        />
      )}
    </>
  );
}

function NotificationDetailModal({ notification, onClose, onViewFullTicket, onSubmitFeedback }) {
  const isResolved = notification.status === "Resolved";

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-detail-box notification-modal-box" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ticket notification details">
        <div className="ticket-detail-header">
          <span>TICKET NOTIFICATION</span>
        </div>

        <div className="ticket-detail-body notification-modal-body">
          <div className="ticket-line notification-row"><strong>Ticket ID</strong><span>{notification.id}</span></div>
          <div className="ticket-line notification-row"><strong>Subject</strong><span>{notification.subject}</span></div>
          <div className="ticket-line notification-row"><strong>Update</strong><span>{notification.update}</span></div>
          <div className="ticket-line notification-row"><strong>Assigned Office</strong><span>{notification.assignedOffice}</span></div>
          <div className="ticket-line notification-row"><strong>Status</strong><span><StatusBadge status={notification.status} /></span></div>
          {notification.staffResponse && (
            <div className="ticket-line ticket-line-block notification-row"><strong>Staff Response</strong><span>&ldquo;{notification.staffResponse}&rdquo;</span></div>
          )}
          {notification.resolution && (
            <div className="ticket-line ticket-line-block notification-row"><strong>Resolution</strong><span>{notification.resolution}</span></div>
          )}
          <div className="ticket-line notification-row"><strong>AI Classification</strong><span>{notification.aiClassification}</span></div>
          <div className="ticket-line notification-row"><strong>Date</strong><span>{notification.date}</span></div>
        </div>

        <div className="ticket-detail-actions notification-modal-actions">
          {isResolved && (
            <button type="button" className="btn btn-primary" onClick={onSubmitFeedback}>Submit Feedback</button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onViewFullTicket}>View Full Ticket</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}