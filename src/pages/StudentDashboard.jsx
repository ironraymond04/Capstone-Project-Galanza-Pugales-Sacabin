import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { applyStoredReadNotifications, clearStoredReadNotification, storeReadNotification } from "../lib/notificationReadState";
import "../styles/theme.css";
import { classifyTicket, generateConcernText } from "../lib/ai";
import TicketThread from "../components/TicketThread";
import TicketResponses from "../components/TicketResponses";
import CampusMap from "../components/CampusMap";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "submit", label: "Concern", icon: "•" },
  { id: "status", label: "Check Ticket Status", icon: "•" },
  { id: "map", label: "Use Campus Map", icon: "•" },
  { id: "feedback", label: "Submit Feedback & Ratings", icon: "•" },
  { id: "history", label: "View Ticket History", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•", code: "notif" },
];

/* ---------------- helpers ---------------- */

function formatTicketCode(ticketId) {
  return `TCK-${String(ticketId).padStart(4, "0")}`;
}

function toDisplayStatus(status) {
  const map = {
    pending: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    transferred: "Transferred",
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
    if (!error) setNotifications(applyStoredReadNotifications(data, session.user.id));
    setNotifLoading(false);
  }

  useEffect(() => {
    loadTickets();
    loadNotifications();
    sessionStorage.setItem("chd-student-active-tab", active);
  }, [active, session?.user?.id]);

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
          {active === "map" && <CampusMapSection />}
          {active === "feedback" && (
            <Feedback
              session={session}
              tickets={tickets}
              selectedTicketId={selectedFeedbackTicketId}
              onTicketSelected={setSelectedFeedbackTicketId}
              onFeedbackSubmitted={loadNotifications}
            />
          )}
          {active === "history" && <History tickets={tickets} loading={ticketsLoading} />}
          {active === "notifications" && (
            <Notifications
              session={session}
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

const FILTER_OPTIONS = ["All", "Open", "In Progress", "Resolved", "Transferred", "Closed"];

function CheckStatus({ tickets, loading, selectedTicketId, onTicketSelected }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }
    setSelectedTicket(tickets.find((t) => t.ticket_id === selectedTicketId) || null);
  }, [selectedTicketId, tickets]);

  // Close the dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const countFor = (option) =>
    option === "All"
      ? tickets.length
      : tickets.filter((t) => toDisplayStatus(t.status) === option).length;

  const filteredTickets =
    filter === "All"
      ? tickets
      : tickets.filter((t) => toDisplayStatus(t.status) === filter);

  return (
    <>
      <PageHeader title="Your tickets" subtitle="This section displays the status of your ticket submitted." />
      <div className="card">
        {/* Filter by */}
        <div
          ref={filterRef}
          style={{ position: "relative", display: "flex", justifyContent: "flex-end", marginBottom: 12 }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            Filter by: {filter} ▾
          </button>

          {menuOpen && (
            <ul
              role="listbox"
              aria-label="Filter tickets by status"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                minWidth: 190,
                padding: 4,
                listStyle: "none",
                background: "var(--surface, #fff)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                zIndex: 20,
              }}
            >
              {FILTER_OPTIONS.map((option) => (
                <li key={option} role="option" aria-selected={filter === option}>
                  <button
                    type="button"
                    onClick={() => { setFilter(option); setMenuOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      background: filter === option ? "var(--maroon-050)" : "transparent",
                      color: "var(--ink)",
                      fontWeight: filter === option ? 700 : 400,
                      fontSize: 13,
                      borderRadius: 4,
                      textAlign: "left",
                    }}
                  >
                    <span>{option}</span>
                    <span style={{ color: "var(--ink-soft)" }}>{countFor(option)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : filteredTickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            No {filter.toLowerCase()} tickets found.
          </p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr><th>Ticket</th><th>Concern</th><th>Office</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
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
  const { session, profile } = useAuth();

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-detail-box ticket-conversation-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ticket details">
        <div className="ticket-detail-header">
          <span>TICKET DETAILS</span>
          <button type="button" className="ticket-detail-close" onClick={onClose} aria-label="Close ticket details">×</button>
        </div>

        <div className="ticket-conversation-layout">
          <div className="ticket-detail-body ticket-modal-details">
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

            <TicketResponses ticket={ticket} />
          </div>

          <TicketThread
            ticket={ticket}
            currentUserId={session?.user?.id}
            role="student"
            allowReply={true}
            profileName={profile?.name || "You"}
          />
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
  const [generating, setGenerating] = useState(false);

  // AI: rewrite the student's rough note into a clear, complete concern
  const handleGenerate = async () => {
    if (!ticketText.trim() || generating) return;
    setGenerating(true);
    setErrorMsg("");
    const generated = await generateConcernText(ticketText);
    setGenerating(false);
    if (generated) {
      setTicketText(generated);
      setSubmitted(false);
    } else {
      setErrorMsg("AI couldn't generate text right now. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticketText.trim()) return;
    setSubmitting(true);
    setErrorMsg("");

    // 1. Send the concern to the Python ML service (TF-IDF + Logistic Regression)
    //    Returns null if the service is unreachable -> ticket is saved unassigned
    const classification = await classifyTicket(ticketText);

    // 2. Resolve the office the ML model returned into an office_id
    let assignedOfficeId = null;
    let predictedOffices = [];

    const { data: allOffices, error: officesError } = await supabase
      .from("offices")
      .select("office_id, office_name");

    if (officesError) {
      console.error("Failed to load offices table:", officesError);
    } else {
      // ML result carries the office_id, so match by id first
      if (classification?.officeId) {
        const byId = allOffices.find((o) => o.office_id === classification.officeId);
        if (byId) {
          assignedOfficeId = byId.office_id;
          classification.office = byId.office_name;
        }
      }

      // Fallback: match by office name if the id wasn't found in the DB
      if (!assignedOfficeId) {
        const normalize = (s) => s?.trim().toLowerCase();

        const candidateOffices = [
          classification?.office,
          ...(classification?.labels || []),
        ].filter(Boolean);

        for (const officeName of candidateOffices) {
          const match = allOffices.find(
            (row) => normalize(row.office_name) === normalize(officeName)
          );
          if (match) {
            assignedOfficeId = match.office_id;
            break;
          }
        }
      }

      if (!assignedOfficeId) {
        console.warn(
          "Ticket could not be matched to an office row. ML classification:",
          classification,
          "Available offices in DB:",
          allOffices.map((o) => o.office_name)
        );
      }

      // Keep only predicted IDs that really exist in the offices table
      const validIds = new Set(allOffices.map((o) => o.office_id));
      predictedOffices = (classification?.predictedOfficeIds || []).filter((id) =>
        validIds.has(id)
      );
    }

    // 3. Insert the ticket with the ML-assigned fields (saved unassigned if the ML service failed)
    const { data: inserted, error } = await supabase
      .from("tickets")
      .insert({
        user_id: session.user.id,
        concern_text: ticketText,
        assigned_office: assignedOfficeId,
        priority: classification?.priority || "medium",
        classification_confidence: classification?.confidence ?? null,
        predicted_offices: predictedOffices,
      })
      .select()
      .single();

    if (error) {
      setSubmitting(false);
      setErrorMsg("Something went wrong submitting your ticket. Please try again.");
      return;
    }

    // 4. Log the ML routing decision for the office's activity log
    if (assignedOfficeId) {
      await supabase.from("logs").insert({
        ticket_id: inserted.ticket_id,
        office_id: assignedOfficeId,
        action: `ML routed ${formatTicketCode(inserted.ticket_id)} to ${classification.office} (${classification.confidence}% confidence)`,
        module: "ML Routing",
      });
    }

    setSubmitting(false);
    setSubmitted(true);
    setTicketText("");
    setSelectedOffice("");
    onSubmitted?.();
  };

  const DRAFT_KEY = `ticket_draft_${session?.user?.id}`;

  // 1. Restore a saved draft when the page loads (only if the box is empty)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved && !ticketText) setTicketText(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Save the draft as the user types; clear it when the box is emptied/submitted
  useEffect(() => {
    try {
      if (ticketText.trim()) localStorage.setItem(DRAFT_KEY, ticketText);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [ticketText, DRAFT_KEY]);

  // 3. Warn before closing/refreshing the tab while there's unsent text
  useEffect(() => {
    if (!ticketText.trim() || submitting) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // required for Chrome to show the prompt
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [ticketText, submitting]);

  const generateDisabled = generating || submitting || !ticketText.trim();

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

          {/* AI: Generate text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              Type a short note, then let AI polish it.
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateDisabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "#1e8e3e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: generateDisabled ? "not-allowed" : "pointer",
                opacity: generateDisabled ? 0.6 : 1,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 16 }}>✧</span>
              {generating ? "Generating..." : "Generate text"}
            </button>
          </div>

          {errorMsg && <p style={{ color: "var(--danger, #b3261e)", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit ticket"}
          </button>

        </form>
      </div>
      {submitted && (
        <div className="ticket-modal-overlay" onClick={() => setSubmitted(false)}>
          <div
            className="ticket-detail-box"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-submitted-title"
          >
            <div className="ticket-detail-header" id="ticket-submitted-title">
              Concern submitted
            </div>
            <div className="ticket-detail-body">
              Your concern has been submitted successfully. Please wait for a response.
            </div>
            <div className="ticket-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => setSubmitted(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CampusMapSection() {
  const isMobile = useIsMobile();
  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(true);
  const [officesError, setOfficesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOffices() {
      setOfficesLoading(true);
      setOfficesError("");

      const { data, error } = await supabase
        .from("offices")
        .select("office_id, office_name, location, contact_email")
        .order("office_name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("loadOffices error:", error);
        setOfficesError("Unable to load the office directory. Please try again.");
      } else {
        setOffices(data || []);
      }
      setOfficesLoading(false);
    }

    loadOffices();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <PageHeader title="Find your office" subtitle="This map helps you for your destination." />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* The 3D map fills whatever height its parent gives it */}
        <div style={{ height: isMobile ? 480 : 620 }}>
          <CampusMap />
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
        </div>

        <div style={{ padding: isMobile ? 14 : 20 }}>
          {officesLoading ? (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading office directory...</p>
          ) : officesError ? (
            <p role="alert" style={{ fontSize: 13, color: "var(--danger, #b3261e)" }}>{officesError}</p>
          ) : offices.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No offices found in the directory.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
              {offices.map((o) => (
                <div key={o.office_id} className="card" style={{ padding: 12 }}>
                  <strong style={{ fontSize: 13 }}>{o.office_name}</strong>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    {o.location || "Location not set"}
                  </p>
                  {o.contact_email && (
                    <p style={{ fontSize: 12, marginTop: 2, color: "var(--ink-soft)", wordBreak: "break-all" }}>
                      {o.contact_email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Feedback({ session, tickets, selectedTicketId, onTicketSelected, onFeedbackSubmitted }) {
  const [reviewedTicketIds, setReviewedTicketIds] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ticketId, setTicketId] = useState(selectedTicketId || "");

  useEffect(() => {
    let cancelled = false;

    async function loadReviewedTickets() {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from("survey_responses")
        .select("ticket_id")
        .eq("user_id", session.user.id);

      if (cancelled) return;
      if (error) {
        console.error("loadReviewedTickets error:", error);
        setReviewsError("Unable to check your previous feedback. Please refresh and try again.");
      } else {
        setReviewedTicketIds((data || []).map((response) => response.ticket_id));
      }
      setReviewsLoading(false);
    }

    loadReviewedTickets();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (selectedTicketId) setTicketId(selectedTicketId);
  }, [selectedTicketId]);

  const resolvedTickets = tickets.filter(
    (ticket) => ticket.status === "resolved" && !reviewedTicketIds.includes(ticket.ticket_id)
  );
  const activeTicketId = resolvedTickets.some((ticket) => ticket.ticket_id === ticketId)
    ? ticketId
    : resolvedTickets.some((ticket) => ticket.ticket_id === selectedTicketId)
      ? selectedTicketId
      : resolvedTickets[0]?.ticket_id || "";

  const handleSubmit = async () => {
    if (!activeTicketId || rating === 0 || reviewsError) return;
    setSubmitting(true);
    setSubmitError("");

    const { data: existingResponses, error: checkError } = await supabase
      .from("survey_responses")
      .select("response_id")
      .eq("user_id", session.user.id)
      .eq("ticket_id", activeTicketId)
      .limit(1);

    if (checkError) {
      console.error("checkExistingFeedback error:", checkError);
      setSubmitError("Unable to verify this ticket's feedback. Please try again.");
      setSubmitting(false);
      return;
    }

    if (existingResponses?.length) {
      setReviewedTicketIds((current) => [...new Set([...current, activeTicketId])]);
      setSubmitError("Feedback has already been submitted for this ticket.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("survey_responses").insert({
      user_id: session.user.id,
      ticket_id: activeTicketId,
      rating,
      feedback: comment || null,
    });

    if (error) {
      setSubmitting(false);
      console.error("submitFeedback error:", error);
      setSubmitError("Your feedback could not be submitted. Please try again.");
      return;
    }

    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id: session.user.id,
      ticket_id: activeTicketId,
      message: `Feedback submitted for ${formatTicketCode(activeTicketId)}.`,
    });
    if (notificationError) {
      console.error("submitFeedback notification error:", notificationError);
      setSubmitError("Your feedback was saved, but its notification could not be created.");
    }
    onFeedbackSubmitted?.();
    setSubmitting(false);
    setReviewedTicketIds((current) => [...new Set([...current, activeTicketId])]);
    setSent(true);
  };

  return (
    <>
      <PageHeader title="Rate your resolution" subtitle="Let us know your feedback and help us improve." />
      <div className="card" style={{ maxWidth: 480 }}>
        {reviewsLoading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Checking your previous feedback...</p>
        ) : reviewsError ? (
          <p role="alert" style={{ fontSize: 13, color: "var(--danger)" }}>{reviewsError}</p>
        ) : tickets.every((ticket) => ticket.status !== "resolved") ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>You have no resolved tickets to review yet.</p>
        ) : resolvedTickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>You have already submitted feedback for all resolved tickets.</p>
        ) : (
          <>
            <div className="field">
              <label>Ticket</label>
              <select
                value={activeTicketId}
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
            {submitError && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{submitError}</p>}
          </>
        )}
      </div>
      {sent && (
        <div className="ticket-modal-overlay" onClick={() => setSent(false)}>
          <div
            className="ticket-detail-box"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-submitted-title"
          >
            <div className="ticket-detail-header" id="feedback-submitted-title">
              Feedback submitted
            </div>
            <div className="ticket-detail-body">
              Thanks. Your feedback was recorded.
            </div>
            <div className="ticket-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => setSent(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}: {current.label} ▾
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={`Filter by ${label.toLowerCase()}`}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            minWidth: 190,
            maxHeight: 280,
            overflowY: "auto",
            padding: 4,
            listStyle: "none",
            background: "var(--surface, #fff)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            zIndex: 20,
          }}
        >
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={value === o.value}>
              <button
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 10px",
                  background: value === o.value ? "var(--maroon-050)" : "transparent",
                  color: "var(--ink)",
                  fontWeight: value === o.value ? 700 : 400,
                  fontSize: 13,
                  borderRadius: 4,
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span>{o.label}</span>
                <span style={{ color: "var(--ink-soft)" }}>{o.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function History({ tickets, loading }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const matchesYear = (t, year) =>
    year === "all" || new Date(t.created_at).getFullYear() === Number(year);
  const matchesMonth = (t, month) =>
    month === "all" || new Date(t.created_at).getMonth() === Number(month);

  // Years that actually have tickets, newest first
  const years = [...new Set(tickets.map((t) => new Date(t.created_at).getFullYear()))].sort((a, b) => b - a);

  // Each dropdown's counts respect the other dropdown's selection
  const yearOptions = [
    { value: "all", label: "All", count: tickets.filter((t) => matchesMonth(t, monthFilter)).length },
    ...years.map((y) => ({
      value: String(y),
      label: String(y),
      count: tickets.filter((t) => matchesYear(t, y) && matchesMonth(t, monthFilter)).length,
    })),
  ];

  const monthOptions = [
    { value: "all", label: "All", count: tickets.filter((t) => matchesYear(t, yearFilter)).length },
    ...MONTH_NAMES.map((name, i) => ({
      value: String(i),
      label: name,
      count: tickets.filter((t) => matchesYear(t, yearFilter) && matchesMonth(t, i)).length,
    })),
  ];

  const filteredTickets = tickets.filter(
    (t) => matchesYear(t, yearFilter) && matchesMonth(t, monthFilter)
  );
  const filtersActive = yearFilter !== "all" || monthFilter !== "all";

  return (
    <>
      <PageHeader title="Full ticket history" subtitle="This section displays all the tickets you have submitted." />
      <div className="card">
        {/* Filter by month / year */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <FilterDropdown label="Year" value={yearFilter} options={yearOptions} onChange={setYearFilter} />
          <FilterDropdown label="Month" value={monthFilter} options={monthOptions} onChange={setMonthFilter} />
          {filtersActive && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={() => { setYearFilter("all"); setMonthFilter("all"); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : filteredTickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets found for the selected month and year.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr><th>Ticket</th><th>Concern</th><th>Office</th><th>Status</th><th>Submitted</th></tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
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

function Notifications({ session, notifications, loading, onRead, onViewFullTicket, onSubmitFeedback }) {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [reviewedTicketIds, setReviewedTicketIds] = useState([]);
  const [feedbackStatus, setFeedbackStatus] = useState("loading");
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReviewedTicketIds() {
      if (!session?.user?.id) {
        setFeedbackStatus("error");
        return;
      }

      const { data, error } = await supabase
        .from("survey_responses")
        .select("ticket_id")
        .eq("user_id", session.user.id);

      if (cancelled) return;
      if (error) {
        console.error("load notification feedback status error:", error);
        setFeedbackStatus("error");
        return;
      }

      setReviewedTicketIds((data || []).map((response) => response.ticket_id));
      setFeedbackStatus("ready");
    }

    loadReviewedTicketIds();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && selectedNotification) setSelectedNotification(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNotification]);

  const checkedItems = notifications.filter((n) => checkedIds.has(n.notif_id));
  const allChecked = notifications.length > 0 && checkedItems.length === notifications.length;
  // Any unread notification selected -> "Mark as read", otherwise "Mark as unread"
  const bulkAction = checkedItems.some((n) => !n.is_read) ? "read" : "unread";

  const toggleOne = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds(allChecked ? new Set() : new Set(notifications.map((n) => n.notif_id)));
  };

  const handleBulkMark = async () => {
    if (checkedItems.length === 0 || bulkBusy) return;
    const markAsRead = bulkAction === "read";
    const userId = session?.user?.id;
    const notifIds = checkedItems.map((n) => n.notif_id);
    setBulkBusy(true);

    if (markAsRead) notifIds.forEach((id) => storeReadNotification(userId, id));
    else notifIds.forEach((id) => clearStoredReadNotification(userId, id));

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: markAsRead })
      .in("notif_id", notifIds)
      .eq("user_id", userId)
      .select("notif_id");

    if (error) {
      console.error("bulk mark student notifications error:", error);
    } else if (markAsRead && data?.length) {
      data.forEach((row) => clearStoredReadNotification(userId, row.notif_id));
    }

    onRead?.();
    setCheckedIds(new Set());
    setBulkBusy(false);
  };

  const openNotification = async (n) => {
    setSelectedNotification({ ...n, is_read: true });
    if (!n.is_read) {
      storeReadNotification(session?.user?.id, n.notif_id);
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notif_id", n.notif_id)
        .eq("user_id", session?.user?.id)
        .select("notif_id")
        .maybeSingle();
      if (error || !data) {
        console.error("mark student notification read error:", error || "No notification row was updated.");
      } else {
        clearStoredReadNotification(session?.user?.id, n.notif_id);
      }
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
          <>
            {/* Toolbar: select all + mark as read/unread */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 8px 12px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                aria-label="Select all notifications"
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--maroon-500)" }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                onClick={handleBulkMark}
                disabled={checkedItems.length === 0 || bulkBusy}
              >
                {bulkBusy ? "Saving..." : bulkAction === "read" ? "Mark as read" : "Mark as unread"}
              </button>
              {checkedItems.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{checkedItems.length} selected</span>
              )}
            </div>

            {notifications.map((n, i) => (
              <div
                key={n.notif_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: n.is_read ? "transparent" : "var(--maroon-050)",
                  borderRadius: 4,
                  borderBottom: i < notifications.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(n.notif_id)}
                  onChange={() => toggleOne(n.notif_id)}
                  aria-label={`Select ${n.message.slice(0, 40)}`}
                  style={{ width: 16, height: 16, margin: "0 4px 0 8px", flexShrink: 0, cursor: "pointer", accentColor: "var(--maroon-500)" }}
                />
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: "12px 8px",
                    color: "var(--ink)",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 6,
                    fontWeight: n.is_read ? 400 : 700,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {!n.is_read && (
                      <span
                        aria-label="Unread notification"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ff5a5f",
                          boxShadow: "0 0 0 2px rgba(255,90,95,0.18)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ fontSize: 14 }}>{n.message}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{timeAgo(n.created_at)}</span>
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          feedbackStatus={feedbackStatus}
          hasSubmittedFeedback={reviewedTicketIds.includes(selectedNotification.ticket_id)}
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

function NotificationDetailModal({ notification, feedbackStatus, hasSubmittedFeedback, onClose, onViewFullTicket, onSubmitFeedback }) {
  const ticket = notification.tickets;
  const isResolved = ticket?.status === "resolved";
  const isFeedbackNotification = notification.message?.startsWith("Feedback submitted for ");
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [feedbackDetailsLoading, setFeedbackDetailsLoading] = useState(false);
  const [feedbackDetailsError, setFeedbackDetailsError] = useState("");

  useEffect(() => {
    if (!isFeedbackNotification || !ticket?.ticket_id || !notification.user_id) return;
    let cancelled = false;

    async function loadFeedbackDetails() {
      setFeedbackDetailsLoading(true);
      const { data, error } = await supabase
        .from("survey_responses")
        .select("rating, feedback, submitted_at")
        .eq("user_id", notification.user_id)
        .eq("ticket_id", ticket.ticket_id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("load notification feedback details error:", error);
        setFeedbackDetailsError("Feedback details could not be loaded.");
      } else {
        setFeedbackDetails(data);
      }
      setFeedbackDetailsLoading(false);
    }

    loadFeedbackDetails();
    return () => { cancelled = true; };
  }, [isFeedbackNotification, notification.user_id, ticket?.ticket_id]);

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
          {isFeedbackNotification && feedbackDetailsLoading && (
            <div className="ticket-line notification-row"><strong>Feedback</strong><span>Loading details...</span></div>
          )}
          {isFeedbackNotification && feedbackDetailsError && (
            <div className="ticket-line notification-row"><strong>Feedback</strong><span>{feedbackDetailsError}</span></div>
          )}
          {isFeedbackNotification && feedbackDetails && (
            <>
              <div className="ticket-line notification-row"><strong>Rating</strong><span>{feedbackDetails.rating}/5</span></div>
              <div className="ticket-line ticket-line-block notification-row"><strong>Comments</strong><span>{feedbackDetails.feedback || "No comments provided."}</span></div>
              <div className="ticket-line notification-row"><strong>Submitted</strong><span>{formatDate(feedbackDetails.submitted_at)}</span></div>
            </>
          )}
        </div>

        <div className="ticket-detail-actions notification-modal-actions">
          {isResolved && feedbackStatus === "ready" && !hasSubmittedFeedback && (
            <button type="button" className="btn btn-primary" onClick={onSubmitFeedback}>Submit Feedback</button>
          )}
          {isResolved && feedbackStatus === "loading" && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Checking feedback status...</span>}
          {isResolved && feedbackStatus === "ready" && hasSubmittedFeedback && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Feedback already submitted</span>}
          {isResolved && feedbackStatus === "error" && <span role="status" style={{ fontSize: 13, color: "var(--ink-soft)" }}>Unable to verify feedback status.</span>}
          {ticket && (
            <button type="button" className="btn btn-ghost" onClick={onViewFullTicket}>View Full Ticket</button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}