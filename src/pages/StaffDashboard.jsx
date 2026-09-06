import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import "../styles/theme.css";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "reports", label: "View Submitted Tickets", icon: "•" },
  { id: "logs", label: "View Activity Logs", icon: "•" },
  { id: "status", label: "Update Ticket Status", icon: "•" },
  { id: "routed", label: "Receive Routed Ticket", icon: "•" },
  { id: "assignment", label: "Auto Ticket Assignment", icon: "•" },
  { id: "priority", label: "Ticket Priority View", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•" },
];

const QUEUE = [
  { id: "TCK-2201", subject: "Unable to access enrollment portal", student: "[Your Name]", priority: "High", status: "In Progress", confidence: 94 },
  { id: "TCK-2205", subject: "Wi-Fi not working in dorm 3", student: "[Your Name]", priority: "Medium", status: "Open", confidence: 88 },
  { id: "TCK-2207", subject: "Password reset needed for LMS", student: "[Your Name]", priority: "Low", status: "Open", confidence: 91 },
  { id: "TCK-2199", subject: "Broken projector in Rm 204", student: "[Your Name]", priority: "High", status: "Transferred", confidence: 79 },
];

const ACTIVITY_LOGS = [
  {
    id: 1,
    type: "Ticket Updated",
    ticketId: "TCK-2198",
    subject: "Missing grade in Physics 101",
    action: "Updated status to Resolved",
    previousValue: "In Progress",
    newValue: "Resolved",
    performedBy: "You",
    timestamp: "August 27, 2026 • 4:35 PM",
    timeLabel: "1h ago",
  },
  {
    id: 2,
    type: "AI Routing",
    ticketId: "TCK-2207",
    subject: "Unable to access student portal",
    action: "Automatically routed to IT Services",
    classification: "Technical Issue",
    office: "IT Services",
    confidence: 92,
    performedBy: "System",
    timestamp: "August 27, 2026 • 1:20 PM",
    timeLabel: "3h ago",
  },
  {
    id: 3,
    type: "Ticket Transferred",
    ticketId: "TCK-2199",
    subject: "Broken projector in Rm 204",
    action: "Transferred to Facilities",
    previousValue: "IT Services",
    newValue: "Facilities",
    performedBy: "You",
    timestamp: "August 26, 2026 • 6:42 PM",
    timeLabel: "6h ago",
  },
  {
    id: 4,
    type: "AI Routing",
    ticketId: "TCK-2210",
    subject: "Unable to access LMS",
    action: "AI classified as Technical Issue and routed to IT Services",
    classification: "Technical Issue",
    office: "IT Services",
    confidence: 90,
    performedBy: "System",
    timestamp: "August 25, 2026 • 2:10 PM",
    timeLabel: "8h ago",
  },
  {
    id: 5,
    type: "Staff Response",
    ticketId: "TCK-2212",
    subject: "Library fine discrepancy",
    action: "Responded to student",
    performedBy: "You",
    timestamp: "August 24, 2026 • 9:05 AM",
    timeLabel: "1d ago",
  },
  {
    id: 6,
    type: "Ticket Assigned",
    ticketId: "TCK-2201",
    subject: "Unable to access enrollment portal",
    action: "Assigned to your queue",
    performedBy: "System",
    timestamp: "August 23, 2026 • 11:15 AM",
    timeLabel: "2d ago",
  },
];

const ACTIVITY_TYPES = [
  "All Activities",
  "Ticket Assigned",
  "Ticket Updated",
  "Ticket Transferred",
  "Ticket Resolved",
  "AI Routing",
  "Staff Response",
];

export default function StaffDashboard() {
  const [active, setActive] = useState("overview");
  const [focusTicketId, setFocusTicketId] = useState(null);
  const isMobile = useIsMobile();

  const handleViewTicket = (ticketId) => {
    setFocusTicketId(ticketId);
    setActive("reports");
  };

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Faculty & Staff"
        userName="[Your Name]"
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={2}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && <Overview onSelect={setActive} />}
          {active === "reports" && <Reports focusTicketId={focusTicketId} />}
          {active === "logs" && <ActivityLogs onViewTicket={handleViewTicket} />}
          {active === "status" && <UpdateStatus />}
          {active === "routed" && <RoutedTickets />}
          {active === "assignment" && <AutoAssignment />}
          {active === "priority" && <PriorityView />}
          {active === "notifications" && <Notifications />}
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ marginBottom: isMobile ? 18 : 26 }}>
      <h1 style={{ fontSize: isMobile ? 22 : 28, marginTop: 6 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { Open: "badge-open", "In Progress": "badge-progress", Resolved: "badge-resolved", Transferred: "badge-transferred" };
  return <span className={`badge ${map[status] || "badge-open"}`}>{status}</span>;
}

function PriorityDot({ level }) {
  const color = level === "High" ? "var(--danger)" : level === "Medium" ? "var(--warning)" : "var(--success)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      {level}
    </span>
  );
}

function ConfidenceMeter({ pct }) {
  return (
    <div className="ai-meter">
      <div className="ai-meter-ring" style={{ "--pct": pct }}>{pct}%</div>
    </div>
  );
}

/** Wraps any table so it scrolls horizontally instead of blowing out the layout on narrow screens. */
function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

function Overview({ onSelect }) {
  const isMobile = useIsMobile();
  const stats = [
    { label: "Assigned to you", value: 4 },
    { label: "High priority", value: 2 },
    { label: "Resolved this week", value: 11 },
  ];
  return (
    <>
      <PageHeader title="Good day, [Your Name]" subtitle="Here's your current ticket queue at the moment." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 20 : 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div style={{ fontSize: 28, fontFamily: "var(--font-display)" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Your queue</h3>
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {QUEUE.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td><PriorityDot level={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </>
  );
}

function Reports({ focusTicketId }) {
  const isMobile = useIsMobile();
  const [modalTicket, setModalTicket] = useState(null);

  useEffect(() => {
    if (!focusTicketId) return;
    const match = QUEUE.find((ticket) => ticket.id === focusTicketId);
    if (match) setModalTicket(match);
  }, [focusTicketId]);

  return (
    <>
      <PageHeader title="Submitted Tickets" subtitle="This section provides an overview of the submitted tickets." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[{ l: "Total handled", v: 132 }, { l: "Avg. resolution time", v: "6.1h" }, { l: "Satisfaction score", v: "4.6/5" }].map((c) => (
          <div key={c.l} className="card"><div style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>{c.v}</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{c.l}</div></div>
        ))}
      </div>
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Ticket</th><th>Student</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {QUEUE.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setModalTicket(t)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.student}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalTicket(t);
                      }}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12.5,
                        borderRadius: 6,
                        border: "1.5px solid var(--line)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>

      {modalTicket && (
        <TicketDetailModal ticket={modalTicket} onClose={() => setModalTicket(null)} />
      )}
    </>
  );
}

function TicketDetailModal({ ticket, onClose }) {
  const rows = [
    { label: "Ticket ID", value: ticket.id },
    { label: "Submitted by", value: ticket.student },
    { label: "Priority", value: <PriorityDot level={ticket.priority} /> },
    { label: "Status", value: <StatusBadge status={ticket.status} /> },
    { label: "AI confidence", value: `${ticket.confidence}%` },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>{ticket.id}</div>
            <h3 style={{ margin: "2px 0 0" }}>{ticket.subject}</h3>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {rows.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{r.label}</span>
              <span style={{ fontSize: 14 }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 6,
              border: "none",
              background: "var(--primary, #6b1d2c)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityLogs({ onViewTicket }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityFilter, setActivityFilter] = useState("All Activities");
  const [ticketFilter, setTicketFilter] = useState("All Tickets");
  const [dateFilter, setDateFilter] = useState("Newest");

  const tickets = ["All Tickets", ...new Set(ACTIVITY_LOGS.map((entry) => entry.ticketId))];

  const filteredActivities = ACTIVITY_LOGS.filter((entry) => {
    const matchesType = activityFilter === "All Activities" || entry.type === activityFilter;
    const matchesTicket = ticketFilter === "All Tickets" || entry.ticketId === ticketFilter;
    return matchesType && matchesTicket;
  }).sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return dateFilter === "Oldest" ? aTime - bTime : bTime - aTime;
  });

  return (
    <>
      <PageHeader title="Activity log" subtitle="This section displays your recent ticket and system activities." />

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            style={{ minWidth: 180, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}
          >
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={ticketFilter}
            onChange={(e) => setTicketFilter(e.target.value)}
            style={{ minWidth: 150, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}
          >
            {tickets.map((ticketId) => (
              <option key={ticketId} value={ticketId}>{ticketId === "All Tickets" ? "All Tickets" : ticketId}</option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ minWidth: 140, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}
          >
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="card">
        {filteredActivities.length === 0 ? (
          <p style={{ fontSize: 14, margin: 0, color: "var(--ink-soft)" }}>No activity matches the selected filters.</p>
        ) : (
          filteredActivities.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedActivity(entry)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                padding: "12px 0",
                cursor: "pointer",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 6,
                color: "inherit",
              }}
            >
              <span style={{ fontSize: 14 }}>
                <strong>{entry.performedBy}</strong> - {entry.action}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{entry.timeLabel}</span>
            </button>
          ))
        )}
      </div>

      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onViewTicket={() => {
            onViewTicket?.(selectedActivity.ticketId);
            setSelectedActivity(null);
          }}
        />
      )}
    </>
  );
}

function ActivityDetailModal({ activity, onClose, onViewTicket }) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const rows = [
    { label: "Activity type", value: activity.type },
    { label: "Ticket ID", value: activity.ticketId },
    { label: "Subject", value: activity.subject },
    { label: "Action", value: activity.action },
    ...(activity.previousValue ? [{ label: "Previous value", value: activity.previousValue }] : []),
    ...(activity.newValue ? [{ label: "New value", value: activity.newValue }] : []),
    ...(activity.classification ? [{ label: "AI Classification", value: activity.classification }] : []),
    ...(activity.office ? [{ label: "Assigned Office", value: activity.office }] : []),
    ...(typeof activity.confidence === "number" ? [{ label: "AI Confidence", value: `${activity.confidence}%` }] : []),
    { label: "Performed by", value: activity.performedBy },
    { label: "Date & Time", value: activity.timestamp },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 15, 20, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          boxShadow: "0 18px 44px rgba(54, 20, 28, 0.14)",
          border: "1px solid var(--line)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Activity Details
            </div>
            <h3 style={{ margin: "6px 0 0", fontSize: 18 }}>{activity.type}</h3>
          </div>
          <button
            type="button"
            aria-label="Close activity details"
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: row.label === rows[rows.length - 1].label ? "none" : "1px solid var(--line)" }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>{row.label}:</span>
              <span style={{ fontSize: 13.5, textAlign: "right", maxWidth: 260 }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onViewTicket}
            className="btn btn-primary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            View Ticket
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function UpdateStatus() {
  const [statuses, setStatuses] = useState(Object.fromEntries(QUEUE.map((t) => [t.id, t.status])));
  return (
    <>
      <PageHeader title="Update ticket status" subtitle="This is where the ticket that you can update the status." />
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Ticket</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {QUEUE.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td>
                    <select
                      value={statuses[t.id]}
                      onChange={(e) => setStatuses((s) => ({ ...s, [t.id]: e.target.value }))}
                      style={{ width: 160, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 6 }}
                    >
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                      <option>Transferred</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </>
  );
}

function RoutedTickets() {
  const [feedbackMap, setFeedbackMap] = useState({});
  const [modalTicket, setModalTicket] = useState(null);
  const [draft, setDraft] = useState("");

  const openModal = (ticket) => {
    setModalTicket(ticket);
    setDraft(feedbackMap[ticket.id]?.text || "");
  };

  const closeModal = () => {
    setModalTicket(null);
    setDraft("");
  };

  const submitFeedback = () => {
    if (!draft.trim() || !modalTicket) return;
    setFeedbackMap((prev) => ({
      ...prev,
      [modalTicket.id]: {
        text: draft.trim(),
        time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      },
    }));
    closeModal();
  };

  return (
    <>
      <PageHeader title="Newly routed tickets" subtitle="This section displays all routed ticket." />
      <div className="card">
        {QUEUE.slice(0, 2).map((t) => {
          const sent = feedbackMap[t.id];
          return (
            <div key={t.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{t.id}</strong>
                <PriorityDot level={t.priority} />
              </div>
              <p style={{ fontSize: 14, margin: "4px 0 8px" }}>{t.subject} - from {t.student}</p>

              {sent && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    background: "var(--surface, #f6f4f1)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ color: "var(--success)" }}>Feedback sent</strong> · {sent.time}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => openModal(t)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1.5px solid var(--line)",
                    background: sent ? "transparent" : "var(--primary, #6b1d2c)",
                    color: sent ? "var(--ink)" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  {sent ? "Edit feedback" : "Respond"}
                </button>
                {sent && (
                  <button
                    onClick={() => openModal(t)}
                    style={{
                      padding: "6px 14px",
                      fontSize: 13,
                      borderRadius: 6,
                      border: "1.5px solid var(--line)",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalTicket && (
        <FeedbackModal
          ticket={modalTicket}
          draft={draft}
          setDraft={setDraft}
          onCancel={closeModal}
          onSubmit={submitFeedback}
          alreadySent={feedbackMap[modalTicket.id]}
        />
      )}
    </>
  );
}

function FeedbackModal({ ticket, draft, setDraft, onCancel, onSubmit, alreadySent }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>{ticket.id}</div>
            <h3 style={{ margin: "2px 0 4px" }}>{ticket.subject}</h3>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>From: {ticket.student}</div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Your feedback
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Let the student know the status, resolution steps, or next actions..."
            rows={5}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid var(--line)",
              borderRadius: 6,
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {alreadySent && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
              Last sent {alreadySent.time}. Submitting will update it.
            </p>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 6,
              border: "1.5px solid var(--line)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!draft.trim()}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              borderRadius: 6,
              border: "none",
              background: "var(--primary, #6b1d2c)",
              color: "#fff",
              cursor: draft.trim() ? "pointer" : "not-allowed",
              opacity: draft.trim() ? 1 : 0.6,
            }}
          >
            Send to student
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoAssignment() {
  return (
    <>
      <PageHeader title="Assignment confidence" subtitle="This section shows the confidence level of each ticket assigned to offices." />
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Ticket</th><th>Subject</th><th>AI confidence</th></tr></thead>
            <tbody>
              {QUEUE.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td><ConfidenceMeter pct={t.confidence} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </>
  );
}

function PriorityView() {
  const isMobile = useIsMobile();
  const grouped = ["High", "Medium", "Low"].map((level) => ({
    level,
    tickets: QUEUE.filter((t) => t.priority === level),
  }));
  return (
    <>
      <PageHeader title="Tickets by priority" subtitle="This section displays the priority level of each submitted ticket." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
        {grouped.map((g) => (
          <div key={g.level} className="card">
            <PriorityDot level={g.level} />
            <div style={{ marginTop: 10 }}>
              {g.tickets.length === 0 && <p style={{ fontSize: 13 }}>None right now.</p>}
              {g.tickets.map((t) => (
                <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{t.id}</span> - {t.subject}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Notifications() {
  const items = [
    { text: "New ticket routed to your queue: TCK-2201.", time: "3h ago" },
    { text: "TCK-2199 was transferred to Facilities.", time: "6h ago" },
  ];
  return (
    <>
      <PageHeader title="Notifications" subtitle="This section displays all the notifications you have received." />
      <div className="card">
        {items.map((n, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, padding: "12px 0", borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ fontSize: 14 }}>{n.text}</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{n.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}