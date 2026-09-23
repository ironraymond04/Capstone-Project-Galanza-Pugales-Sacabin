import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "../styles/theme.css";
import { classifyTicket } from "../lib/ai";

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

/* ---------------- helpers ---------------- */

function formatTicketCode(ticketId) {
  return `TCK-${String(ticketId).padStart(4, "0")}`;
}

function toDisplayStatus(status) {
  const map = {
    pending: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  return map[status] || status;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

export default function StudentDashboard() {
  const { session, profile } = useAuth();
  const [active, setActive] = useState(
  () => sessionStorage.getItem("chd-student-active-tab") || "overview"
  );
  const [ticketText, setTicketText] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedFeedbackTicketId, setSelectedFeedbackTicketId] = useState(null);
  const isMobile = useIsMobile();

  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  async function loadTickets() {
    if (!session?.user?.id) return;
    setTicketsLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, offices:offices!tickets_assigned_office_fkey(office_name)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (!error) setTickets(data || []);
    setTicketsLoading(false);
  }

  async function loadNotifications() {
    if (!session?.user?.id) return;
    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*, tickets(ticket_id, concern_text, status)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (!error) setNotifications(data || []);
    setNotifLoading(false);
  }

  useEffect(() => {
    loadTickets();
    loadNotifications();
    sessionStorage.setItem("chd-student-active-tab", active);
  }, [active]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Student"
        userName={profile?.name || "Guest User"}
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={unreadCount}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && (
            <Overview tickets={tickets} loading={ticketsLoading} profile={profile} onSelect={setActive} />
          )}
          {active === "status" && (
            <CheckStatus
              tickets={tickets}
              loading={ticketsLoading}
              selectedTicketId={selectedTicketId}
              onTicketSelected={setSelectedTicketId}
            />
          )}
          {active === "submit" && (
            <SubmitTicket
              session={session}
              ticketText={ticketText}
              setTicketText={setTicketText}
              selectedOffice={selectedOffice}
              setSelectedOffice={setSelectedOffice}
              onSubmitted={loadTickets}
            />
          )}
          {active === "map" && <CampusMap />}
          {active === "feedback" && (
            <Feedback
              session={session}
              tickets={tickets}
              selectedTicketId={selectedFeedbackTicketId}
              onTicketSelected={setSelectedFeedbackTicketId}
            />
          )}
          {active === "history" && <History tickets={tickets} loading={ticketsLoading} />}
          {active === "notifications" && (
            <Notifications
              notifications={notifications}
              loading={notifLoading}
              onRead={loadNotifications}
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

function StatusBadge({ status }) {
  const map = {
    Open: "badge-open",
    "In Progress": "badge-progress",
    Resolved: "badge-resolved",
    Closed: "badge-resolved",
    Transferred: "badge-transferred",
  };
  return <span className={`badge ${map[status] || "badge-open"}`}>{status}</span>;
}

function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

function Overview({ tickets, loading, profile, onSelect }) {
  const isMobile = useIsMobile();

  const openCount = tickets.filter((t) => t.status === "pending" || t.status === "in_progress").length;

  const now = new Date();
  const resolvedThisMonth = tickets.filter(
    (t) =>
      t.status === "resolved" &&
      t.resolved_at &&
      new Date(t.resolved_at).getMonth() === now.getMonth() &&
      new Date(t.resolved_at).getFullYear() === now.getFullYear()
  ).length;

  const resolvedWithTimes = tickets.filter((t) => t.resolved_at);
  const avgResponseHrs =
    resolvedWithTimes.length > 0
      ? (
          resolvedWithTimes.reduce(
            (sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)) / 36e5,
            0
          ) / resolvedWithTimes.length
        ).toFixed(1)
      : "—";

  const stats = [
    { label: "Open tickets", value: openCount },
    { label: "Resolved this month", value: resolvedThisMonth },
    { label: "Avg. response time", value: avgResponseHrs === "—" ? "—" : `${avgResponseHrs}h` },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${profile?.name || "there"}`}
        subtitle="Here's where things stand across your helpdesk tickets."
      />
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
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr><th>Ticket</th><th>Office</th><th>Status</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {tickets.slice(0, 3).map((t) => (
                  <tr key={t.ticket_id}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    <td>{timeAgo(t.resolved_at || t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
      <button className="btn btn-primary" onClick={() => onSelect("submit")}>+ Submit a new ticket</button>
    </>
  );
}

function CheckStatus({ tickets, loading, selectedTicketId, onTicketSelected }) {
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }
    setSelectedTicket(tickets.find((t) => t.ticket_id === selectedTicketId) || null);
  }, [selectedTicketId, tickets]);

  return (
    <>
      <PageHeader title="Your tickets" subtitle="This section displays the status of your ticket submitted." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr><th>Ticket</th><th>Concern</th><th>Office</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.ticket_id} onClick={() => { setSelectedTicket(t); onTicketSelected?.(t.ticket_id); }} style={{ cursor: "pointer" }}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 60)}{t.concern_text.length > 60 ? "..." : ""}</td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => { setSelectedTicket(null); onTicketSelected?.(null); }} />
      )}
    </>
  );
}

function TicketDetailModal({ ticket, onClose }) {
  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-detail-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ticket details">
        <div className="ticket-detail-header">
          <span>TICKET DETAILS</span>
          <button type="button" className="ticket-detail-close" onClick={onClose} aria-label="Close ticket details">×</button>
        </div>

        <div className="ticket-detail-body">
          <div className="ticket-line"><strong>Ticket ID</strong><span>{formatTicketCode(ticket.ticket_id)}</span></div>
          <div className="ticket-line"><strong>Status</strong><span>{toDisplayStatus(ticket.status)}</span></div>
          <div className="ticket-line"><strong>Office</strong><span>{ticket.offices?.office_name || "Unassigned"}</span></div>

          <div className="ticket-line ticket-line-block">
            <strong>Concern</strong>
            <span>{ticket.concern_text}</span>
          </div>

          <div className="ticket-line"><strong>Submitted</strong><span>{formatDate(ticket.created_at)}</span></div>
          {ticket.resolved_at && (
            <div className="ticket-line"><strong>Resolved</strong><span>{formatDate(ticket.resolved_at)}</span></div>
          )}
        </div>

        <div className="ticket-detail-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function SubmitTicket({ session, ticketText, setTicketText, selectedOffice, setSelectedOffice, onSubmitted }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketText.trim()) return;
    setSubmitting(true);
    setErrorMsg("");

    // 1. Ask the AI model to classify + route the concern
    const classification = await classifyTicket(ticketText);

    // 2. Resolve the office name the AI returned into an office_id
    let assignedOfficeId = null;
    if (classification?.office) {
      const { data: officeRow } = await supabase
        .from("offices")
        .select("office_id")
        .eq("office_name", classification.office)
        .maybeSingle();
      assignedOfficeId = officeRow?.office_id ?? null;
    }

    // 3. Insert the ticket with the AI-assigned fields (falls back safely if AI failed)
    const { data: inserted, error } = await supabase
      .from("tickets")
      .insert({
        user_id: session.user.id,
        concern_text: ticketText,
        assigned_office: assignedOfficeId,
        priority: classification?.priority || "medium",
        classification_confidence: classification?.confidence ?? null,
      })
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      setErrorMsg("Something went wrong submitting your ticket. Please try again.");
      return;
    }

    // 4. Log the AI routing decision for the office's activity log
    if (assignedOfficeId) {
      await supabase.from("logs").insert({
        ticket_id: inserted.ticket_id,
        office_id: assignedOfficeId,
        action: `AI routed ${formatTicketCode(inserted.ticket_id)} to ${classification.office} (${classification.confidence}% confidence)`,
        module: "AI Routing",
      });
    }

    setSubmitting(false);
    setSubmitted(true);
    setTicketText("");
    setSelectedOffice("");
    onSubmitted?.();
};

  return (
    <>
      <PageHeader
        title="Submit a new concern"
        subtitle="Describe the issue and the classification module will route it to the right office."
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
          
          {errorMsg && <p style={{ color: "var(--danger, #b3261e)", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit ticket"}
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

function Feedback({ session, tickets, selectedTicketId, onTicketSelected }) {
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState(selectedTicketId || resolvedTickets[0]?.ticket_id || "");

  useEffect(() => {
    if (selectedTicketId) setTicketId(selectedTicketId);
  }, [selectedTicketId]);

  const handleSubmit = async () => {
    if (!ticketId || rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("survey_responses").insert({
      user_id: session.user.id,
      ticket_id: ticketId,
      rating,
      feedback: comment || null,
    });

    setSubmitting(false);
    if (!error) setSent(true);
  };

  return (
    <>
      <PageHeader title="Rate your resolution" subtitle="Let us know your feedback and help us improve." />
      <div className="card" style={{ maxWidth: 480 }}>
        {resolvedTickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>You have no resolved tickets to review yet.</p>
        ) : (
          <>
            <div className="field">
              <label>Ticket</label>
              <select
                value={ticketId}
                onChange={(event) => {
                  const nextTicketId = Number(event.target.value);
                  setTicketId(nextTicketId);
                  onTicketSelected?.(nextTicketId);
                }}
              >
                {resolvedTickets.map((t) => (
                  <option key={t.ticket_id} value={t.ticket_id}>
                    {formatTicketCode(t.ticket_id)} - {t.concern_text.slice(0, 40)}
                  </option>
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
              <textarea rows={3} placeholder="Tell us about your experience..." value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending..." : "Submit feedback"}
            </button>
            {sent && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 12 }}>Thanks — your feedback was recorded.</p>}
          </>
        )}
      </div>
    </>
  );
}

function History({ tickets, loading }) {
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <>
      <PageHeader title="Full ticket history" subtitle="This section displays all the tickets you have submitted." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr><th>Ticket</th><th>Concern</th><th>Office</th><th>Status</th><th>Submitted</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.ticket_id} onClick={() => setSelectedTicket(t)} style={{ cursor: "pointer" }}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    <td>{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </>
  );
}

function Notifications({ notifications, loading, onRead, onViewFullTicket, onSubmitFeedback }) {
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && selectedNotification) setSelectedNotification(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNotification]);

  const openNotification = async (n) => {
    setSelectedNotification(n);
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("notif_id", n.notif_id);
      onRead?.();
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="This section displays all the notifications you have received." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No notifications yet.</p>
        ) : (
          notifications.map((n, i) => (
            <button
              key={n.notif_id}
              type="button"
              onClick={() => openNotification(n)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                padding: "12px 0",
                borderBottom: i < notifications.length - 1 ? "1px solid var(--line)" : "none",
                color: "var(--ink)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 6,
                fontWeight: n.is_read ? 400 : 700,
              }}
            >
              <span style={{ fontSize: 14 }}>{n.message}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{timeAgo(n.created_at)}</span>
            </button>
          ))
        )}
      </div>

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onViewFullTicket={() => {
            setSelectedNotification(null);
            onViewFullTicket?.(selectedNotification.ticket_id);
          }}
          onSubmitFeedback={() => {
            setSelectedNotification(null);
            onSubmitFeedback?.(selectedNotification.ticket_id);
          }}
        />
      )}
    </>
  );
}

function NotificationDetailModal({ notification, onClose, onViewFullTicket, onSubmitFeedback }) {
  const ticket = notification.tickets;
  const isResolved = ticket?.status === "resolved";

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-detail-box notification-modal-box" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ticket notification details">
        <div className="ticket-detail-header">
          <span>TICKET NOTIFICATION</span>
        </div>

        <div className="ticket-detail-body notification-modal-body">
          {ticket && (
            <>
              <div className="ticket-line notification-row"><strong>Ticket ID</strong><span>{formatTicketCode(ticket.ticket_id)}</span></div>
              <div className="ticket-line notification-row"><strong>Status</strong><span><StatusBadge status={toDisplayStatus(ticket.status)} /></span></div>
            </>
          )}
          <div className="ticket-line ticket-line-block notification-row"><strong>Message</strong><span>{notification.message}</span></div>
          <div className="ticket-line notification-row"><strong>Date</strong><span>{formatDate(notification.created_at)}</span></div>
        </div>

        <div className="ticket-detail-actions notification-modal-actions">
          {isResolved && (
            <button type="button" className="btn btn-primary" onClick={onSubmitFeedback}>Submit Feedback</button>
          )}
          {ticket && (
            <button type="button" className="btn btn-ghost" onClick={onViewFullTicket}>View Full Ticket</button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}