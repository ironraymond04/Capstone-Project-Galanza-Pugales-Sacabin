import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { applyStoredReadNotifications, clearStoredReadNotification, storeReadNotification } from "../lib/notificationReadState";
import "../styles/theme.css";
import TicketThread from "../components/TicketThread";
import TicketResponses from "../components/TicketResponses";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "reports", label: "View Submitted Tickets", icon: "•" },
  { id: "logs", label: "View Activity Logs", icon: "•" },
  { id: "status", label: "Update Ticket Status", icon: "•" },
  { id: "routed", label: "Receive Routed Ticket", icon: "•" },
  { id: "assignment", label: "Auto Ticket Assignment", icon: "•" },
  { id: "priority", label: "Ticket Priority View", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•", code: "notif" },
];

const ACTIVITY_TYPES = ["All Activities", "Ticket Assigned", "Ticket Updated", "Ticket Transferred", "Ticket Resolved", "AI Routing", "Staff Response"];

/* ---------------- helpers ---------------- */

function formatTicketCode(ticketId) {
  return `TCK-${String(ticketId).padStart(4, "0")}`;
}

function toDisplayStatus(status) {
  const map = { pending: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
  return map[status] || status;
}

function toDisplayPriority(priority) {
  const map = { low: "Low", medium: "Medium", high: "High" };
  return map[priority] || "Medium";
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getStoredFeedItemIds(storageKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  } catch (error) {
    console.error("load saved staff notification state error:", error);
    return new Set();
  }
}

export default function StaffDashboard() {
  const { session, profile } = useAuth();
  const [active, setActive] = useState(
  () => sessionStorage.getItem("chd-staff-active-tab") || "overview"
  );
  const [focusTicketId, setFocusTicketId] = useState(null);
  const isMobile = useIsMobile();
  const readFeedStorageKey = `chd-staff-read-feed-${session?.user?.id || "guest"}`;
  const [readFeedItemIds, setReadFeedItemIds] = useState(() => getStoredFeedItemIds(readFeedStorageKey));

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [surveysLoading, setSurveysLoading] = useState(true);

  // Active office (overrides profile.office_id once the staff member switches)
  const [activeOfficeId, setActiveOfficeId] = useState(profile?.office_id ?? null);
  const [assignedOffices, setAssignedOffices] = useState([]);
  const [switchingOffice, setSwitchingOffice] = useState(false);

  const officeId = activeOfficeId;

  // Keep the selected office in sync when the auth profile loads or changes.
  useEffect(() => {
    setActiveOfficeId(profile?.office_id ?? null);
  }, [profile?.office_id]);

  useEffect(() => {
    sessionStorage.setItem("chd-staff-active-tab", active);
  }, [active]);

  async function loadQueue() {
    if (!officeId) return;
    setQueueLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, profiles:profiles!tickets_user_id_fkey(name), offices:offices!tickets_assigned_office_fkey(office_name)")
      .eq("assigned_office", officeId)
      .order("created_at", { ascending: false });
    if (error) console.error("loadQueue error:", error);
    if (!error) setQueue(data || []);
    setQueueLoading(false);
  }

  async function loadLogs() {
    if (!officeId) return;
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("*, tickets(ticket_id, concern_text)")
      .eq("office_id", officeId)
      .order("created_at", { ascending: false });
    if (error) console.error("loadLogs error:", error);
    if (!error) setLogs(data || []);
    setLogsLoading(false);
  }

  async function loadNotifications() {
    if (!session?.user?.id) return;
    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("loadNotifications error:", error);
    if (!error) setNotifications(applyStoredReadNotifications(data, session.user.id));
    setNotifLoading(false);
  }

  async function loadSurveys() {
    if (!officeId) return;
    setSurveysLoading(true);
    const { data, error } = await supabase
      .from("survey_responses")
      .select("*, tickets!inner(ticket_id, concern_text, assigned_office), profiles:profiles!survey_responses_user_id_fkey(name)")
      .eq("tickets.assigned_office", officeId)
      .order("submitted_at", { ascending: false });
    if (error) console.error("loadSurveys error:", error);
    if (!error) setSurveys(data || []);
    setSurveysLoading(false);
  }

async function loadAssignedOffices() {
  if (!session?.user?.id) return;
  const { data, error } = await supabase
    .from("offices")
    .select("office_id, office_name")
    .eq("head_user_id", session.user.id);
  if (error) console.error("loadAssignedOffices error:", error);
  if (!error) setAssignedOffices(data || []);
}

async function handleSwitchOffice(newOfficeId) {
  if (!session?.user?.id || newOfficeId === activeOfficeId) return;
  setSwitchingOffice(true);
  const { error } = await supabase
    .from("profiles")
    .update({ office_id: newOfficeId })
    .eq("user_id", session.user.id);
  if (error) {
    console.error("handleSwitchOffice error:", error);
  } else {
    setActiveOfficeId(newOfficeId);
  }
  setSwitchingOffice(false);
}

  useEffect(() => {
    loadQueue();
    loadLogs();
    loadNotifications();
    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId, session?.user?.id]);

  useEffect(() => {
    loadAssignedOffices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleViewTicket = (ticketId) => {
    setFocusTicketId(ticketId);
    setActive("reports");
  };

  const handlePageSelect = (page) => {
    if (page !== "reports") setFocusTicketId(null);
    if (page === "notifications") {
      loadLogs();
      loadNotifications();
    }
    setActive(page);
  };

  const unreadCount =
    notifications.filter((n) => !n.is_read).length +
    queue.filter((ticket) => !readFeedItemIds.has(`ticket-${ticket.ticket_id}`)).length +
    logs.filter((entry) => !readFeedItemIds.has(`activity-${entry.log_id}`)).length;

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Faculty & Staff"
        userName={profile?.name || "Guest User"}
        items={NAV_ITEMS}
        activeId={active}
        onSelect={handlePageSelect}
        notifCount={unreadCount}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: isMobile ? "14px 14px 0" : "20px 26px 0" }}>
          <OfficeSwitcher
            offices={assignedOffices}
            activeOfficeId={activeOfficeId}
            onSwitch={handleSwitchOffice}
            switching={switchingOffice}
          />
        </div>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && <Overview queue={queue} loading={queueLoading} profile={profile} officeId={officeId} />}
          {active === "reports" && (
            <Reports
              queue={queue}
              loading={queueLoading}
              focusTicket={queue.find((ticket) => ticket.ticket_id === focusTicketId)}
              onClearFocus={() => setFocusTicketId(null)}
            />
          )}
          {active === "logs" && <ActivityLogs logs={logs} loading={logsLoading} onViewTicket={handleViewTicket} />}
          {active === "status" && <UpdateStatus queue={queue} loading={queueLoading} onUpdated={loadQueue} />}
          {active === "routed" && (<RoutedTickets queue={queue} logs={logs} loading={queueLoading} staffUserId={session?.user?.id} officeId={officeId} onLogged={loadLogs}/>)}
          {active === "assignment" && <AutoAssignment queue={queue} loading={queueLoading} />}
          {active === "priority" && <PriorityView queue={queue} loading={queueLoading} />}
          {active === "notifications" && (
            <Notifications
              userId={session?.user?.id}
              notifications={notifications}
              loading={notifLoading}
              onRead={loadNotifications}
              tickets={queue}
              ticketsLoading={queueLoading}
              logs={logs}
              logsLoading={logsLoading}
              hasOffice={Boolean(officeId)}
              surveys={surveys}
              surveysLoading={surveysLoading}
              readFeedStorageKey={readFeedStorageKey}
              readFeedItemIds={readFeedItemIds}
              setReadFeedItemIds={setReadFeedItemIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- office switcher ---------------- */

function OfficeSwitcher({ offices, activeOfficeId, onSwitch, switching }) {
  const [open, setOpen] = useState(false);
  const activeOffice = offices.find((o) => o.office_id === activeOfficeId);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          border: "1.5px solid var(--line)",
          background: "#fff",
          cursor: switching ? "not-allowed" : "pointer",
          opacity: switching ? 0.7 : 1,
        }}
      >
        Your Office: {activeOffice?.code || activeOffice?.office_name || "—"}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 1000,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 200,
              overflow: "hidden",
            }}
          >
            {offices.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                No offices assigned yet.
              </div>
            ) : (
              offices.map((o) => (
                <button
                  key={o.office_id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (o.office_id !== activeOfficeId) onSwitch(o.office_id);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    fontSize: 13,
                    border: "none",
                    background: o.office_id === activeOfficeId ? "var(--surface, #f5f0ec)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {o.code ? `[${o.code}] ` : ""}{o.office_name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

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
  const map = { Open: "badge-open", "In Progress": "badge-progress", Resolved: "badge-resolved", Closed: "badge-resolved", Transferred: "badge-transferred" };
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
  if (pct == null) return <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Not yet classified</span>;
  return (
    <div className="ai-meter">
      <div className="ai-meter-ring" style={{ "--pct": pct }}>{pct}%</div>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <span style={{ color: "var(--warning, #b8860b)", fontSize: 14, letterSpacing: 1 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

/* ---------------- sections ---------------- */

function Overview({ queue, loading, profile, officeId }) {
  const isMobile = useIsMobile();

  if (!officeId) {
    return (
      <>
        <PageHeader title={`Good day, ${profile?.name || "there"}`} subtitle="Your account isn't linked to an office yet." />
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            No office is assigned to your profile, so no tickets can be routed to you. Ask an admin to set your office in Manage Users.
          </p>
        </div>
      </>
    );
  }

  const now = new Date();
  const weekAgo = new Date(now - 7 * 864e5);

  const stats = [
    { label: "Assigned to you", value: queue.filter((t) => t.status !== "resolved" && t.status !== "closed").length },
    { label: "High priority", value: queue.filter((t) => t.priority === "high").length },
    { label: "Resolved this week", value: queue.filter((t) => t.status === "resolved" && t.resolved_at && new Date(t.resolved_at) >= weekAgo).length },
  ];

  return (
    <>
      <PageHeader title={`Good day, ${profile?.name || "there"}`} subtitle="Here's your current ticket queue at the moment." />
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
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : queue.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets assigned to your office yet.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Concern</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {queue.map((t) => (
                  <tr key={t.ticket_id}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td><PriorityDot level={toDisplayPriority(t.priority)} /></td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
    </>
  );
}

function Reports({ queue, loading, focusTicket, onClearFocus }) {
  const isMobile = useIsMobile();
  const [modalTicket, setModalTicket] = useState(null);
  const visibleModalTicket = modalTicket || focusTicket;

  const totalHandled = queue.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const resolvedWithTimes = queue.filter((t) => t.resolved_at);
  const avgResolutionHrs =
    resolvedWithTimes.length > 0
      ? (resolvedWithTimes.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)) / 36e5, 0) / resolvedWithTimes.length).toFixed(1)
      : "—";

  return (
    <>
      <PageHeader title="Submitted Tickets" subtitle="This section provides an overview of the submitted tickets." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card"><div style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>{totalHandled}</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Total handled</div></div>
        <div className="card"><div style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>{avgResolutionHrs === "—" ? "—" : `${avgResolutionHrs}h`}</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Avg. resolution time</div></div>
        <div className="card"><div style={{ fontSize: 24, fontFamily: "var(--font-display)" }}>—</div><div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Satisfaction score</div></div>
      </div>
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : queue.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Student</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {queue.map((t) => (
                  <tr key={t.ticket_id} onClick={() => setModalTicket(t)} style={{ cursor: "pointer" }}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.profiles?.name || "Unknown"}</td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setModalTicket(t); }}
                        style={{ padding: "5px 12px", fontSize: 12.5, borderRadius: 6, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer" }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>

      {visibleModalTicket && (
        <TicketDetailModal
          ticket={visibleModalTicket}
          onClose={() => {
            setModalTicket(null);
            onClearFocus();
          }}
        />
      )}
    </>
  );
}

function TicketDetailModal({ ticket, onClose }) {
  const { session, profile } = useAuth();
  const rows = [
    { label: "Ticket ID", value: formatTicketCode(ticket.ticket_id) },
    { label: "Submitted by", value: ticket.profiles?.name || "Unknown" },
    ...(ticket.assigned_office ? [{ label: "Assigned office", value: ticket.offices?.office_name || "Unknown" }] : []),
    { label: "Priority", value: <PriorityDot level={toDisplayPriority(ticket.priority)} /> },
    { label: "Status", value: <StatusBadge status={toDisplayStatus(ticket.status)} /> },
    { label: "AI confidence", value: ticket.classification_confidence != null ? `${ticket.classification_confidence}%` : "Not yet classified" },
    { label: "Concern", value: ticket.concern_text },
    ...(ticket.created_at ? [{ label: "Submitted", value: new Date(ticket.created_at).toLocaleString() }] : []),
    ...(ticket.resolved_at ? [{ label: "Resolved", value: new Date(ticket.resolved_at).toLocaleString() }] : []),
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="card ticket-conversation-modal" style={{ background: "#fff" }}>
        <div className="ticket-detail-header">{formatTicketCode(ticket.ticket_id)}</div>
        <div className="ticket-conversation-layout">
          <div className="ticket-modal-details">
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--ink-soft)", flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 14, textAlign: "right" }}>{r.value}</span>
              </div>
            ))}
            <TicketResponses ticket={ticket} />
          </div>

          <TicketThread
            ticket={ticket}
            currentUserId={session?.user?.id}
            role="staff"
            officeId={ticket.assigned_office || null}
            allowReply={true}
            profileName={profile?.name || "You"}
          />
        </div>

        <div className="ticket-detail-actions">
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 6, border: "none", background: "var(--primary, #6b1d2c)", color: "#fff", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ActivityLogs({ logs, loading, onViewTicket }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityFilter, setActivityFilter] = useState("All Activities");
  const [ticketFilter, setTicketFilter] = useState("All Tickets");
  const [dateFilter, setDateFilter] = useState("Newest");

  const ticketOptions = ["All Tickets", ...new Set(logs.filter((l) => l.ticket_id).map((l) => formatTicketCode(l.ticket_id)))];

  const filtered = logs
    .filter((entry) => activityFilter === "All Activities" || entry.module === activityFilter)
    .filter((entry) => ticketFilter === "All Tickets" || (entry.ticket_id && formatTicketCode(entry.ticket_id) === ticketFilter))
    .sort((a, b) => {
      const diff = new Date(a.created_at) - new Date(b.created_at);
      return dateFilter === "Oldest" ? diff : -diff;
    });

  return (
    <>
      <PageHeader title="Activity log" subtitle="This section displays your recent ticket and system activities." />
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={{ minWidth: 180, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}>
            {ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)} style={{ minWidth: 150, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}>
            {ticketOptions.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ minWidth: 140, padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 6, background: "#fff" }}>
            <option value="Newest">Newest</option>
            <option value="Oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ fontSize: 14, margin: 0, color: "var(--ink-soft)" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 14, margin: 0, color: "var(--ink-soft)" }}>No activity matches the selected filters.</p>
        ) : (
          filtered.map((entry) => (
            <button
              key={entry.log_id}
              type="button"
              onClick={() => setSelectedActivity(entry)}
              style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid var(--line)", padding: "12px 0", cursor: "pointer", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, color: "inherit" }}
            >
              <span style={{ fontSize: 14 }}>{entry.action}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{timeAgo(entry.created_at)}</span>
            </button>
          ))
        )}
      </div>

      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onViewTicket={selectedActivity.ticket_id ? () => { onViewTicket?.(selectedActivity.ticket_id); setSelectedActivity(null); } : null}
        />
      )}
    </>
  );
}

function ActivityDetailModal({ activity, onClose, onViewTicket }) {
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const rows = [
    { label: "Module", value: activity.module || "—" },
    ...(activity.ticket_id ? [{ label: "Ticket ID", value: formatTicketCode(activity.ticket_id) }] : []),
    { label: "Action", value: activity.action },
    ...(activity.description ? [{ label: "Description", value: activity.description }] : []),
    { label: "Date & Time", value: new Date(activity.created_at).toLocaleString() },
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,15,20,0.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Activity Details</h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          {rows.map((row, i) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>{row.label}:</span>
              <span style={{ fontSize: 13.5, textAlign: "right", maxWidth: 260 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          {onViewTicket && <button type="button" onClick={onViewTicket} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>View Ticket</button>}
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function UpdateStatus({ queue, loading, onUpdated }) {
  const [updatingId, setUpdatingId] = useState(null);

  const handleChange = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    const payload = { status: newStatus };
    if (newStatus === "resolved") payload.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("tickets").update(payload).eq("ticket_id", ticketId);
    if (error) console.error("UpdateStatus error:", error);
    setUpdatingId(null);
    onUpdated?.();
  };

  return (
    <>
      <PageHeader title="Update ticket status" subtitle="This is where the ticket that you can update the status." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Concern</th><th>Status</th></tr></thead>
              <tbody>
                {queue.map((t) => (
                  <tr key={t.ticket_id}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td>
                      <select
                        value={t.status}
                        disabled={updatingId === t.ticket_id}
                        onChange={(e) => handleChange(t.ticket_id, e.target.value)}
                        style={{ width: 160, padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 6 }}
                      >
                        <option value="pending">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
    </>
  );
}

function RoutedTickets({ queue, logs, loading, staffUserId, officeId, onLogged }) {
  const respondedTicketIds = new Set(
    logs.filter((l) => l.module === "Staff Response" && l.ticket_id).map((l) => l.ticket_id)
  );
  const recentlyRouted = queue
    .filter((t) => !respondedTicketIds.has(t.ticket_id))
    .slice(0, 5);

  const [modalTicket, setModalTicket] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const openModal = (ticket) => { setModalTicket(ticket); setDraft(""); };
  const closeModal = () => { setModalTicket(null); setDraft(""); };

  const submitFeedback = async () => {
    if (!draft.trim() || !modalTicket) return;
    setSending(true);

    const { error: notifError } = await supabase.from("notifications").insert({
      ticket_id: modalTicket.ticket_id,
      user_id: modalTicket.user_id,
      message: draft.trim(),
    });
    if (notifError) console.error("submitFeedback notification error:", notifError);

    const { error: logError } = await supabase.from("logs").insert({
      user_id: staffUserId,
      office_id: officeId,
      ticket_id: modalTicket.ticket_id,
      action: `Responded to student on ${formatTicketCode(modalTicket.ticket_id)}`,
      module: "Staff Response",
    });
    if (logError) console.error("submitFeedback log error:", logError);

    setSending(false);
    onLogged?.(); // this reloads logs, which now removes the ticket from view
    closeModal();
  };

  return (
    <>
      <PageHeader title="Newly routed tickets" subtitle="This section displays all routed ticket." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : recentlyRouted.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets routed to your office yet.</p>
        ) : (
          recentlyRouted.map((t) => (
            <div key={t.ticket_id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</strong>
                <PriorityDot level={toDisplayPriority(t.priority)} />
              </div>
              <p style={{ fontSize: 14, margin: "4px 0 8px" }}>{t.concern_text.slice(0, 60)} - from {t.profiles?.name || "Unknown"}</p>
              <button
                onClick={() => openModal(t)}
                style={{ padding: "6px 14px", fontSize: 13, borderRadius: 6, border: "1.5px solid var(--line)", background: "var(--primary, #6b1d2c)", color: "#fff", cursor: "pointer" }}
              >
                Respond
              </button>
            </div>
          ))
        )}
      </div>

      {modalTicket && (
        <FeedbackModal ticket={modalTicket} draft={draft} setDraft={setDraft} onCancel={closeModal} onSubmit={submitFeedback} sending={sending} />
      )}
    </>
  );
}

function FeedbackModal({ ticket, draft, setDraft, onCancel, onSubmit, sending }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460, background: "#fff" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-soft)" }}>{formatTicketCode(ticket.ticket_id)}</div>
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Your feedback</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Let the student know the status, resolution steps, or next actions..."
            rows={5}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 6, fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", fontSize: 13, borderRadius: 6, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer" }}>Cancel</button>
          <button
            onClick={onSubmit}
            disabled={!draft.trim() || sending}
            style={{ padding: "8px 16px", fontSize: 13, borderRadius: 6, border: "none", background: "var(--primary, #6b1d2c)", color: "#fff", cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.6 }}
          >
            {sending ? "Sending..." : "Send to student"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AutoAssignment({ queue, loading }) {
  const [modalTicket, setModalTicket] = useState(null);

  return (
    <>
      <PageHeader title="Assignment confidence" subtitle="This section shows the confidence level of each ticket assigned to offices." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Concern</th><th>AI confidence</th></tr></thead>
              <tbody>
                {queue.map((t) => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => setModalTicket(t)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setModalTicket(t);
                      }
                    }}
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    aria-label={`View details for ${formatTicketCode(t.ticket_id)}`}
                  >
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td><ConfidenceMeter pct={t.classification_confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>
      {modalTicket && <TicketDetailModal ticket={modalTicket} onClose={() => setModalTicket(null)} />}
    </>
  );
}

function PriorityView({ queue, loading }) {
  const isMobile = useIsMobile();
  const grouped = ["high", "medium", "low"].map((level) => ({
    level: toDisplayPriority(level),
    tickets: queue.filter((t) => t.priority === level),
  }));

  return (
    <>
      <PageHeader title="Tickets by priority" subtitle="This section displays the priority level of each submitted ticket." />
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {grouped.map((g) => (
            <div key={g.level} className="card">
              <PriorityDot level={g.level} />
              <div style={{ marginTop: 10 }}>
                {g.tickets.length === 0 && <p style={{ fontSize: 13 }}>None right now.</p>}
                {g.tickets.map((t) => (
                  <div key={t.ticket_id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</span> - {t.concern_text.slice(0, 40)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Notifications({ userId, notifications, loading, onRead, tickets, ticketsLoading, logs, logsLoading, hasOffice, surveys, surveysLoading, readFeedStorageKey, readFeedItemIds, setReadFeedItemIds }) {
  const isMobile = useIsMobile();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const markRead = async (n) => {
    if (n.is_read) return;
    storeReadNotification(userId, n.notif_id);
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notif_id", n.notif_id)
      .eq("user_id", userId)
      .select("notif_id")
      .maybeSingle();
    if (error || !data) {
      console.error("mark staff notification read error:", error || "No notification row was updated.");
    } else {
      clearStoredReadNotification(userId, n.notif_id);
    }
    setSelectedNotification((current) => current?.notif_id === n.notif_id ? { ...current, is_read: true } : current);
    onRead?.();
  };

  const feedItems = [
    ...notifications.map((notification) => ({
      id: `notification-${notification.notif_id}`,
      type: "notification",
      createdAt: notification.created_at,
      message: notification.message,
      isUnread: !notification.is_read,
      item: notification,
    })),
    ...tickets.map((ticket) => ({
      id: `ticket-${ticket.ticket_id}`,
      type: "ticket",
      createdAt: ticket.created_at,
      message: `${formatTicketCode(ticket.ticket_id)} - ${ticket.concern_text}`,
      isUnread: !readFeedItemIds.has(`ticket-${ticket.ticket_id}`),
      item: ticket,
    })),
    ...logs.map((entry) => ({
      id: `activity-${entry.log_id}`,
      type: "activity",
      createdAt: entry.created_at,
      message: entry.module === "Ticket Reply" && entry.ticket_id
        ? `${entry.action} on ${formatTicketCode(entry.ticket_id)}: ${entry.description || ""}`
        : entry.action,
      isUnread: !readFeedItemIds.has(`activity-${entry.log_id}`),
      item: entry,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const feedLoading = loading || (hasOffice && (ticketsLoading || logsLoading));

  const openFeedItem = (feedItem) => {
    if (feedItem.type === "notification") {
      setSelectedNotification(feedItem.item);
      void markRead(feedItem.item);
    } else {
      const nextReadIds = new Set(readFeedItemIds);
      nextReadIds.add(feedItem.id);
      setReadFeedItemIds(nextReadIds);
      try {
        localStorage.setItem(readFeedStorageKey, JSON.stringify([...nextReadIds]));
      } catch (error) {
        console.error("save read notification state error:", error);
      }
    }

    if (feedItem.type === "ticket") {
      setSelectedTicket(feedItem.item);
    } else if (feedItem.type === "activity") {
      setSelectedActivity(feedItem.item);
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="This section displays all the notifications you have received." />
      <div style={{ display: "flex", flexDirection: isMobile ? "column-reverse" : "row-reverse", alignItems: "flex-start", gap: 16 }}>
        <section style={{ flex: "0.9 1 0", minWidth: 0, width: isMobile ? "100%" : undefined }}>
          <h3 style={{ margin: "0 0 10px" }}>Student feedback</h3>
          <div className="card">
            {surveysLoading ? (
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading feedback...</p>
            ) : surveys.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No survey responses yet.</p>
            ) : (
              surveys.map((survey, i) => (
                <button
                  type="button"
                  key={survey.response_id}
                  onClick={() => setSelectedFeedback(survey)}
                  style={{ display: "block", width: "100%", padding: "12px 0", border: "none", borderBottom: i < surveys.length - 1 ? "1px solid var(--line)" : "none", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
                >
                  <span style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatTicketCode(survey.ticket_id)}</span>
                    {survey.rating != null ? <StarRating rating={survey.rating} /> : <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>No rating</span>}
                  </span>
                  <span style={{ display: "block", fontSize: 13, margin: "4px 0 0", color: "var(--ink-soft)" }}>
                    {survey.profiles?.name || "Unknown student"} · {timeAgo(survey.submitted_at)}
                  </span>
                  {survey.feedback && <span style={{ display: "block", fontSize: 14, margin: "6px 0 0" }}>{survey.feedback}</span>}
                </button>
              ))
            )}
          </div>
        </section>

        <section style={{ flex: "1.3 1 0", minWidth: 0, width: isMobile ? "100%" : undefined }}>
          <h3 style={{ margin: "0 0 10px" }}>Notifications</h3>
          <div className="card">
            {feedLoading ? (
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
            ) : feedItems.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No notifications yet.</p>
            ) : (
              feedItems.map((feedItem, i) => (
                <button
                  type="button"
                  key={feedItem.id}
                  onClick={() => openFeedItem(feedItem)}
                  style={{ display: "flex", width: "100%", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 8px", border: "none", borderBottom: i < feedItems.length - 1 ? "1px solid var(--line)" : "none", borderRadius: 4, background: feedItem.isUnread ? "var(--maroon-050)" : "transparent", color: "inherit", textAlign: "left", cursor: "pointer", fontWeight: feedItem.isUnread ? 700 : 400 }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {feedItem.isUnread && (
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
                    <span style={{ minWidth: 0, fontSize: 14 }}>{feedItem.message}</span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {feedItem.type === "ticket" && <StatusBadge status={toDisplayStatus(feedItem.item.status)} />}
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{timeAgo(feedItem.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
      {selectedActivity && <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
      {selectedNotification && (
        <NotificationDetailModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      )}

      {selectedFeedback && (
        <FeedbackDetailModal feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      )}
    </>
  );
}

function FeedbackDetailModal({ feedback, onClose }) {
  const rows = [
    { label: "Response ID", value: feedback.response_id },
    { label: "Ticket ID", value: formatTicketCode(feedback.ticket_id) },
    { label: "Submitted by", value: feedback.profiles?.name || "Unknown student" },
    { label: "Rating", value: feedback.rating != null ? <StarRating rating={feedback.rating} /> : "No rating" },
    { label: "Concern", value: feedback.tickets?.concern_text || "Not available" },
    { label: "Feedback", value: feedback.feedback || "No written feedback" },
    { label: "Submitted", value: feedback.submitted_at ? new Date(feedback.submitted_at).toLocaleString() : "Not available" },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(event) => event.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3 id="feedback-detail-title" style={{ margin: 0, fontSize: 18 }}>Feedback details</h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)" }}>
          {rows.map((row, index) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: index < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 13, color: "var(--ink-soft)", flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 14, textAlign: "right", overflowWrap: "anywhere" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationDetailModal({ notification, onClose }) {
  const rows = [
    { label: "Notification ID", value: notification.notif_id },
    ...(notification.ticket_id ? [{ label: "Ticket ID", value: formatTicketCode(notification.ticket_id) }] : []),
    { label: "Message", value: notification.message },
    { label: "Read status", value: notification.is_read ? "Read" : "Unread" },
    { label: "Received", value: new Date(notification.created_at).toLocaleString() },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="notification-detail-title" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(event) => event.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3 id="notification-detail-title" style={{ margin: 0, fontSize: 18 }}>Notification details</h3>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)" }}>
          {rows.map((row, index) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: index < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 13, color: "var(--ink-soft)", flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 14, textAlign: "right", overflowWrap: "anywhere" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}