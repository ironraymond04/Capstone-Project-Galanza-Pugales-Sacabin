import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { applyStoredReadNotifications, clearStoredReadNotification, storeReadNotification } from "../lib/notificationReadState";
import { generateTicketReport } from "../lib/ai"; 
import "../styles/theme.css";
import TicketThread from "../components/TicketThread";
import TicketResponses from "../components/TicketResponses";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "logs", label: "View System Logs", icon: "•" },
  { id: "tickets", label: "Manage Tickets", icon: "•" },
  { id: "users", label: "Manage Users", icon: "•" },
  { id: "offices", label: "Manage Offices", icon: "•" },
  { id: "analytics", label: "Generate Analytics Reports", icon: "•" },
  { id: "transfer", label: "Ticket Transfer Management", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•", code: "notif" },
];

/* ---------------- helpers ---------------- */

function formatTicketCode(ticketId) {
  return `TCK-${String(ticketId).padStart(4, "0")}`;
}

function toDisplayStatus(status) {
  const map = { pending: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed", transferred: "Transferred" };
  return map[status] || status;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getStoredTicketReadIds(storageKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
  } catch (error) {
    console.error("load saved admin notification state error:", error);
    return new Set();
  }
}

export default function AdminDashboard() {
  const { session, profile } = useAuth();
  const [active, setActive] = useState(
    () => sessionStorage.getItem("chd-admin-active-tab") || "overview"
  );
  const isMobile = useIsMobile();
  const readTicketStorageKey = `chd-admin-read-tickets-${session?.user?.id || "guest"}`;
  const [readTicketIds, setReadTicketIds] = useState(() => getStoredTicketReadIds(readTicketStorageKey));

  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [offices, setOffices] = useState([]);
  const [officesLoading, setOfficesLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  async function loadTickets() {
    setTicketsLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*, offices:offices!tickets_assigned_office_fkey(office_id, office_name), profiles:profiles!tickets_user_id_fkey(name)")
      .order("created_at", { ascending: false });
    if (error) console.error("loadTickets error:", error);
    if (!error) setTickets(data || []);
    setTicketsLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, offices!profiles_office_id_fkey(office_name)")
      .order("name");
    if (error) console.error("loadUsers error:", error);
    if (!error) setUsers(data || []);
    setUsersLoading(false);
  }

  async function loadOffices() {
    setOfficesLoading(true);
    const { data, error } = await supabase
      .from("offices")
      .select("*, head:profiles!offices_head_user_id_fkey(name, email)")
      .order("office_name");
    if (error) console.error("loadOffices error:", error);
    if (!error) setOffices(data || []);
    setOfficesLoading(false);
  }

  async function loadLogs() {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(50);
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

  useEffect(() => {
    loadTickets();
    loadUsers();
    loadOffices();
    loadLogs();
    loadNotifications();
    sessionStorage.setItem("chd-admin-active-tab", active);
  }, [active]);

  const unreadCount =
    notifications.filter((n) => !n.is_read).length +
    tickets.filter((ticket) => !readTicketIds.has(`ticket-${ticket.ticket_id}`)).length;

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Admin"
        userName={profile?.name || "System Admin"}
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={unreadCount}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && (<Overview tickets={tickets} users={users} offices={offices} loading={ticketsLoading || usersLoading || officesLoading} onSelect={setActive} />)}
          {active === "logs" && <SystemLogs logs={logs} loading={logsLoading} />}
          {active === "tickets" && (<ManageTickets tickets={tickets} loading={ticketsLoading} />)}
          {active === "users" && <ManageUsers users={users} loading={usersLoading} onUpdated={loadUsers} />}
          {active === "offices" && (<ManageOffices offices={offices} loading={officesLoading} users={users} onUpdated={() => { loadOffices(); loadUsers(); }} />)}
          {active === "analytics" && <Analytics tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} />}
          {active === "transfer" && (<Transfers tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} onUpdated={loadTickets} />)}
          {active === "notifications" && (
            <Notifications
              userId={session?.user?.id}
              tickets={tickets}
              ticketsLoading={ticketsLoading}
              notifications={notifications}
              notificationsLoading={notifLoading}
              onRead={loadNotifications}
              readTicketStorageKey={readTicketStorageKey}
              readTicketIds={readTicketIds}
              setReadTicketIds={setReadTicketIds}
            />
          )}
        </div>
      </div>
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

function ConfidenceMeter({ pct }) {
  if (pct == null) return <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>—</span>;
  return (
    <div className="ai-meter">
      <div className="ai-meter-ring" style={{ "--pct": pct }}>{pct}%</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <div style={{ fontSize: 28, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
}

function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

function Modal({ title, onClose, children, width = 420, className = "" }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20, 10, 10, 0.45)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className={`card ${className}`} style={{ width: "100%", maxWidth: width, background: "var(--paper, #fff)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };

/* ---------------- sections ---------------- */

function Overview({ tickets, users, offices, loading, onSelect }) {
  const isMobile = useIsMobile();
  const transferredCount = tickets.filter((t) => t.status === "transferred").length;
  const activeUsers = users.filter((u) => u.is_active).length;

  const officeCounts = offices.map((o) => ({
    name: o.office_name,
    openTickets: tickets.filter((t) => t.assigned_office === o.office_id && t.status !== "resolved" && t.status !== "closed").length,
  }));

  return (
    <>
      <PageHeader title="System overview" subtitle="Real-time snapshot of the helpdesk across all offices." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 20 : 28 }}>
        <StatCard label="Total tickets" value={tickets.length} />
        <StatCard label="Transferred" value={transferredCount} />
        <StatCard label="Active users" value={activeUsers} />
        <StatCard label="Offices" value={offices.length} />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 20 }}>
          <div className="card">
            <h3>Latest tickets</h3>
            <TableScroll>
              <table className="chd-table">
                <thead><tr><th>Ticket</th><th>Office</th><th>Status</th></tr></thead>
                <tbody>
                  {tickets.slice(0, 4).map((t) => (
                    <tr key={t.ticket_id}>
                      <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                      <td>{t.offices?.office_name || "Unassigned"}</td>
                      <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => onSelect("tickets")}>
              Manage all tickets →
            </button>
          </div>

          <div className="card">
            <h3>Offices at a glance</h3>
            {officeCounts.map((o) => (
              <div key={o.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span>{o.name}</span>
                <strong style={{ color: o.openTickets > 3 ? "var(--danger)" : "var(--ink)" }}>{o.openTickets} open</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SystemLogs({ logs, loading }) {
  const [selectedLog, setSelectedLog] = useState(null);

  return (
    <>
      <PageHeader title="System logs" subtitle="Retrieved from the Logs data store." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : logs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No log entries yet.</p>
        ) : (
          logs.map((l) => (
            <button
              key={l.log_id}
              type="button"
              onClick={() => setSelectedLog(l)}
              style={{ width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, padding: "12px 0", border: "none", borderBottom: "1px solid var(--line)", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
            >
              <span style={{ fontSize: 14 }}><strong>{l.profiles?.name || "System"}</strong> - {l.action}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{timeAgo(l.created_at)}</span>
            </button>
          ))
        )}
      </div>

      {selectedLog && (
        <Modal title="System log details" onClose={() => setSelectedLog(null)} width={520}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Performed by</span>
              <strong style={{ fontSize: 14, textAlign: "right" }}>{selectedLog.profiles?.name || "System"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Module</span>
              <span style={{ fontSize: 14, textAlign: "right" }}>{selectedLog.module || "—"}</span>
            </div>
            {selectedLog.ticket_id && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Ticket ID</span>
                <span style={{ fontSize: 14, fontFamily: "var(--font-mono)", textAlign: "right" }}>{formatTicketCode(selectedLog.ticket_id)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Action</span>
              <span style={{ fontSize: 14, textAlign: "right", maxWidth: 340 }}>{selectedLog.action}</span>
            </div>
            {selectedLog.description && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Description</span>
                <span style={{ fontSize: 14, textAlign: "right", maxWidth: 340 }}>{selectedLog.description}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Date & time</span>
              <span style={{ fontSize: 14, textAlign: "right" }}>{new Date(selectedLog.created_at).toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ManageTickets({ tickets, loading }) {
  const [filter, setFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const filterMap = {
    Open: ["pending"],
    "In Progress": ["in_progress"],
    Resolved: ["resolved", "closed"],
    Transferred: ["transferred"],
  };

  const filtered =
    filter === "All"
      ? tickets
      : tickets.filter((t) => filterMap[filter].includes(t.status));

  return (
    <>
      <PageHeader
        title="All tickets"
        subtitle="View-only list of all submitted tickets and their offices. To assign or reassign a ticket, use Ticket Transfer Management."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["All", "Open", "In Progress", "Resolved", "Transferred"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={filter === f ? "btn btn-primary" : "btn btn-ghost"}
            style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets match this filter.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Submitted by</th>
                  <th>Concern</th>
                  <th>Office</th>
                  <th>AI confidence</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => setSelectedTicket(t)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.profiles?.name || "Unknown user"}</td>
                    <td>
                      {t.concern_text.slice(0, 50)}
                      {t.concern_text.length > 50 ? "..." : ""}
                    </td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><ConfidenceMeter pct={t.classification_confidence} /></td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--ink-soft)" }}>
                      {timeAgo(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </div>

      {selectedTicket && (
        <TicketStatusModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </>
  );
}

const FILTERS = [
  { key: "all", label: "All", match: () => true },
  { key: "student", label: "Students", match: (r) => r === "student" },
  { key: "staff", label: "Faculty & Staff", match: (r) => r === "staff" || r === "faculty" },
  { key: "admin", label: "Admin", match: (r) => r === "admin" },
];

function ManageUsers({ users, loading, onUpdated }) {
const [roleFilter, setRoleFilter] = useState("all");

  const toggleStatus = async (userId, current) => {
    await supabase.from("profiles").update({ is_active: !current }).eq("user_id", userId);
    onUpdated?.();
  };

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.key] = users.filter((u) => f.match(u.role)).length;
    });
    return result;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const active = FILTERS.find((f) => f.key === roleFilter) || FILTERS[0];
    return users.filter((u) => active.match(u.role));
  }, [users, roleFilter]);

  return (
    <>
      <PageHeader title="Users" subtitle="Saved to and retrieved from the User data store." />
      <div className="card">
        {/* Filter buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={roleFilter === f.key ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "6px 14px", fontSize: 12, whiteSpace: "nowrap" }}
              onClick={() => setRoleFilter(f.key)}
              aria-pressed={roleFilter === f.key}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : filteredUsers.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No users found for this filter.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.user_id}>
                    <td>{u.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.email}</td>
                    <td style={{ textTransform: "capitalize" }}>{u.role === "staff" ? "Faculty & Staff" : u.role}</td>
                    <td>
                      <span className={u.is_active ? "badge badge-resolved" : "badge badge-transferred"}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }} onClick={() => toggleStatus(u.user_id, u.is_active)}>
                        {u.is_active ? "Suspend" : "Reactivate"}
                      </button>
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

function OfficeForm({ staff, office, onCancel, onSubmit, submitting, submitError }) {
  const [name, setName] = useState(office?.office_name || "");
  const [headId, setHeadId] = useState(office?.head_user_id || "");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Office name is required."); return; }
    if (!headId) { setError("Please select a head for this office."); return; }
    await onSubmit({ office_name: name.trim(), head_user_id: headId });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="office-name">Office name</label>
        <input id="office-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Student Affairs" autoFocus />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="office-head">Office head</label>
        {staff.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No Faculty & Staff accounts available. Add one under Manage Users first.</p>
        ) : (
          <select id="office-head" style={inputStyle} value={headId} onChange={(e) => setHeadId(e.target.value)}>
            <option value="">Select a staff member…</option>
            {staff.map((u) => (
              <option key={u.user_id} value={u.user_id}>{u.name} — {u.email}</option>
            ))}
          </select>
        )}
      </div>

      {(error || submitError) && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error || submitError}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={staff.length === 0 || submitting}>
          {submitting ? "Saving..." : office ? "Save changes" : "Add office"}
        </button>
      </div>
    </form>
  );
}

function ManageOffices({ offices, loading, users, onUpdated }) {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const staffOptions = users.filter((u) => u.role === "staff" && (u.is_active || u.user_id === editingOffice?.head_user_id));

  const handleAddOffice = async (payload) => {
    setSubmitting(true);
    setSubmitError("");

    const { data: newOffice, error: officeError } = await supabase
      .from("offices")
      .insert(payload)
      .select()
      .single();

    if (officeError) {
      console.error("Add office failed:", officeError);
      setSubmitError(officeError.message || "Could not add this office.");
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ office_id: newOffice.office_id })
      .eq("user_id", payload.head_user_id);

    if (profileError) {
      console.error("Linking head to office failed:", profileError);
    }

    setSubmitting(false);
    onUpdated?.();
    setModalOpen(false);
  };

  const handleEditOffice = async (payload) => {
    setSubmitting(true);
    setSubmitError("");
    const { error: officeError } = await supabase
      .from("offices")
      .update(payload)
      .eq("office_id", editingOffice.office_id);

    if (officeError) {
      console.error("Update office failed:", officeError);
      setSubmitError(officeError.message || "Could not update this office.");
      setSubmitting(false);
      return;
    }

    if (payload.head_user_id !== editingOffice.head_user_id) {
      if (editingOffice.head_user_id) {
        const { error: previousHeadError } = await supabase
          .from("profiles")
          .update({ office_id: null })
          .eq("user_id", editingOffice.head_user_id)
          .eq("office_id", editingOffice.office_id);
        if (previousHeadError) console.error("Unlinking previous office head failed:", previousHeadError);
      }

      const { error: newHeadError } = await supabase
        .from("profiles")
        .update({ office_id: editingOffice.office_id })
        .eq("user_id", payload.head_user_id);
      if (newHeadError) {
        console.error("Linking new office head failed:", newHeadError);
        setSubmitError(newHeadError.message || "Office saved, but the new head could not be linked.");
        setSubmitting(false);
        onUpdated?.();
        return;
      }
    }

    setSubmitting(false);
    onUpdated?.();
    setModalOpen(false);
  };

  return (
    <>
      <PageHeader title="Offices" subtitle="Saved to and retrieved from the Offices data store." />
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {offices.map((o) => (
            <div key={o.office_id} className="card">
              <h3 style={{ fontSize: 16 }}>{o.office_name}</h3>
              <p style={{ fontSize: 13, margin: "4px 0" }}>Head: {o.head?.name || "Unassigned"}</p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "6px 12px", fontSize: 12, marginTop: 10 }}
                onClick={() => { setEditingOffice(o); setSubmitError(""); setModalOpen(true); }}
              >
                Edit office
              </button>
            </div>
          ))}
          <div className="card" style={{ display: "grid", placeItems: "center", border: "1.5px dashed var(--line)" }}>
            <button className="btn btn-primary" onClick={() => { setEditingOffice(null); setSubmitError(""); setModalOpen(true); }}>+ Add office</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingOffice ? "Edit office" : "Add office"} onClose={() => setModalOpen(false)}>
          <OfficeForm
            key={editingOffice?.office_id || "new-office"}
            staff={staffOptions}
            office={editingOffice}
            onCancel={() => setModalOpen(false)}
            onSubmit={editingOffice ? handleEditOffice : handleAddOffice}
            submitting={submitting}
            submitError={submitError}
          />
        </Modal>
      )}
    </>
  );
}

const STATUS_META = [
  { key: "open", label: "Open", color: "#e0a030", match: ["pending"] },
  { key: "progress", label: "In Progress", color: "#3b82f6", match: ["in_progress"] },
  { key: "resolved", label: "Resolved", color: "#2e9e6b", match: ["resolved", "closed"] },
  { key: "transferred", label: "Transferred", color: "#8b5cf6", match: ["transferred"] },
];

const SEVERITY_COLOR = {
  high: "var(--danger, #c0392b)",
  medium: "#b7791f",
  low: "var(--success, #2e9e6b)",
};

function SeverityPill({ level }) {
  const color = SEVERITY_COLOR[level] || SEVERITY_COLOR.low;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {level}
    </span>
  );
}

function SectionTitle({ children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{children}</h3>
      {hint && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>{hint}</p>}
    </div>
  );
}

const REPORT_KEY = "chd-analytics-report";

function loadSavedReport() {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) return { report: null, generatedAt: null };
    const parsed = JSON.parse(raw);
    return {
      report: parsed.report || null,
      generatedAt: parsed.generatedAt ? new Date(parsed.generatedAt) : null,
    };
  } catch {
    return { report: null, generatedAt: null };
  }
}

function saveReport(report, generatedAt) {
  try {
    localStorage.setItem(
      REPORT_KEY,
      JSON.stringify({ report, generatedAt: generatedAt.toISOString() })
    );
  } catch (e) {
    console.error("Could not save report:", e);
  }
}

function Analytics({ tickets, offices, loading }) {
  const isMobile = useIsMobile();
  const [saved] = useState(loadSavedReport);
  const [report, setReport] = useState(saved.report);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState("");
  const [generatedAt, setGeneratedAt] = useState(saved.generatedAt);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const now = Date.now();
    const isActive = (t) => t.status !== "resolved" && t.status !== "closed";
    const last30 = tickets.filter((t) => now - new Date(t.created_at).getTime() <= 30 * 864e5);

    const statusCounts = STATUS_META.map((s) => ({
      ...s,
      count: tickets.filter((t) => s.match.includes(t.status)).length,
    }));

    const resolvedWithTimes = tickets.filter((t) => t.resolved_at);
    const avgResolutionHrs = resolvedWithTimes.length
      ? Number(
          (
            resolvedWithTimes.reduce(
              (sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)) / 36e5,
              0
            ) / resolvedWithTimes.length
          ).toFixed(1)
        )
      : null;

    const resolvedCount = statusCounts.find((s) => s.key === "resolved").count;
    const resolutionRate = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;

    const byOffice = offices.map((o) => {
      const mine = tickets.filter((t) => t.assigned_office === o.office_id);
      return { name: o.office_name, active: mine.filter(isActive).length, total: mine.length };
    });

    const unassigned = tickets.filter((t) => t.assigned_office == null && isActive(t)).length;

    const daily = Array.from({ length: 7 }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (6 - i));
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return {
        label: start.toLocaleDateString(undefined, { weekday: "short" }),
        count: tickets.filter((t) => {
          const c = new Date(t.created_at);
          return c >= start && c < end;
        }).length,
      };
    });

    return { last30: last30.length, statusCounts, avgResolutionHrs, resolutionRate, byOffice, unassigned, daily };
  }, [tickets, offices]);

  const maxOffice = Math.max(...stats.byOffice.map((o) => o.active), 1);
  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);

  async function handleGenerate() {
    setGenerating(true);
    setReportError("");
    setCopied(false);

    const payload = {
      stats: {
        totalTickets: tickets.length,
        ticketsLast30Days: stats.last30,
        avgResolutionHours: stats.avgResolutionHrs,
        resolutionRatePercent: stats.resolutionRate,
        unassignedActive: stats.unassigned,
        byStatus: Object.fromEntries(stats.statusCounts.map((s) => [s.label, s.count])),
        byOffice: stats.byOffice,
      },
      // No names/emails are sent; concerns are truncated and capped to keep the request small
      tickets: tickets.slice(0, 120).map((t) => ({
        code: formatTicketCode(t.ticket_id),
        status: toDisplayStatus(t.status),
        office: t.offices?.office_name || "Unassigned",
        concern: (t.concern_text || "").slice(0, 200),
        aiConfidence: t.classification_confidence,
        escalation: t.escalation_level,
        transferReason: t.transfer_reason,
        createdAt: t.created_at,
        resolvedAt: t.resolved_at,
      })),
    };

    try {
      const result = await generateTicketReport(payload);
      const now = new Date();
      saveReport(result, now);
      setReport(result);
      setGeneratedAt(now);
    } catch (err) {
      const msg = String(err?.message || err);
      if (/429|RESOURCE_EXHAUSTED/i.test(msg)) {
        setReportError("AI quota reached. Please wait a minute and try again.");
      } else if (/404|not found/i.test(msg)) {
        setReportError("AI model not found. Check the model name in ai.js.");
      } else if (/JSON/i.test(msg)) {
        setReportError("The AI response was incomplete. Please try again.");
      } else {
        setReportError(`The AI couldn't generate a report: ${msg.slice(0, 120)}`);
      }
    }
    setGenerating(false);
  }

  function reportToText() {
    if (!report) return "";
    const lines = [
      "HELPDESK ANALYTICS REPORT",
      `Generated: ${generatedAt?.toLocaleString() || ""}`,
      "",
      "SUMMARY",
      report.summary,
      "",
      "STATUS INSIGHTS",
      `Open: ${report.status_insights.open}`,
      `In Progress: ${report.status_insights.in_progress}`,
      `Resolved: ${report.status_insights.resolved}`,
      "",
      "OFFICE INSIGHTS",
      ...report.office_insights.map((o) => `- [${o.severity.toUpperCase()}] ${o.office}: ${o.observation}`),
      "",
      "RECURRING THEMES",
      ...report.recurring_themes.map((t) => `- ${t.theme} (~${t.approx_count})`),
      "",
      "RECOMMENDATIONS",
      ...report.recommendations.map((r) => `- [${r.priority.toUpperCase()}] ${r.action}`),
      "",
      "NEEDS ATTENTION",
      ...report.attention_tickets.map((t) => `- ${t.code}: ${t.reason}`),
    ];
    return lines.join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportToText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  }

  const kpis = [
    { label: "Tickets (30 days)", value: stats.last30 },
    { label: "Avg. resolution time", value: stats.avgResolutionHrs == null ? "—" : `${stats.avgResolutionHrs}h` },
    { label: "Resolution rate", value: `${stats.resolutionRate}%` },
    { label: "Unassigned (active)", value: stats.unassigned },
  ];

  return (
    <>
      <style>{`
        @keyframes chd-spin { to { transform: rotate(360deg); } }
        @keyframes chd-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .chd-report-section { animation: chd-fade-up .35s ease both; }
        .chd-bar { transition: height .5s ease, width .5s ease; }
      `}</style>

      {/* Header + action */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: isMobile ? 18 : 26 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, marginTop: 6 }}>Analytics</h1>
          <p style={{ fontSize: 14 }}>Live ticket metrics, plus an AI-written report across Open, In Progress and Resolved tickets.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || loading || tickets.length === 0}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", width: isMobile ? "100%" : "auto", justifyContent: "center" }}
        >
          {generating ? (
            <>
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "chd-spin .7s linear infinite" }} />
              Generating report...
            </>
          ) : (
            <>✦ {report ? "Regenerate report" : "Generate report"}</>
          )}
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: 20 }}>
            {kpis.map((k) => (
              <StatCard key={k.label} label={k.label} value={k.value} />
            ))}
          </div>

          {/* Status breakdown */}
          <div className="card" style={{ marginBottom: 20 }}>
            <SectionTitle hint="Share of all tickets by current status">Status breakdown</SectionTitle>
            {tickets.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets yet.</p>
            ) : (
              <>
                <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "var(--line)" }}>
                  {stats.statusCounts.map((s) => (
                    <div
                      key={s.key}
                      className="chd-bar"
                      title={`${s.label}: ${s.count}`}
                      style={{ width: `${(s.count / tickets.length) * 100}%`, background: s.color }}
                    />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
                  {stats.statusCounts.map((s) => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 18, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{s.count}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
            <div className="card">
              <SectionTitle hint="Active tickets (not resolved/closed) per office">Open tickets by office</SectionTitle>
              {stats.byOffice.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No offices yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {stats.byOffice.map((o) => (
                    <div key={o.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                        <span>{o.name}</span>
                        <strong>{o.active}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                        <div className="chd-bar" style={{ height: "100%", width: `${(o.active / maxOffice) * 100}%`, background: "linear-gradient(90deg, var(--maroon-500), #c0504d)", borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <SectionTitle hint="New tickets over the last 7 days">Recent volume</SectionTitle>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                {stats.daily.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{d.count}</div>
                    <div className="chd-bar" style={{ height: `${(d.count / maxDaily) * 90 + 4}px`, background: "var(--maroon-500)", opacity: 0.85, borderRadius: "6px 6px 0 0" }} />
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI report */}
          <div className="card" style={{ borderTop: "3px solid var(--maroon-500)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <SectionTitle hint={generatedAt ? `Generated ${generatedAt.toLocaleString()}` : "Summarizes Open, In Progress and Resolved tickets"}>
                ✦ AI report
              </SectionTitle>
              {report && (
                <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleCopy}>
                  {copied ? "Copied ✓" : "Copy report"}
                </button>
              )}
            </div>

            {reportError && <p style={{ fontSize: 13, color: "var(--danger)" }}>{reportError}</p>}

            {generating && (
              <div style={{ display: "grid", gap: 10 }}>
                {[100, 92, 76].map((w, i) => (
                  <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 6, background: "var(--line)", opacity: 0.7 }} />
                ))}
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "6px 0 0" }}>Reading {Math.min(tickets.length, 120)} tickets...</p>
              </div>
            )}

            {!generating && !report && !reportError && (
              <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "4px 0" }}>
                Click <strong>Generate report</strong> to get an AI summary with trends, office bottlenecks, and recommended actions.
              </p>
            )}

            {!generating && report && (
              <div style={{ display: "grid", gap: 22 }}>
                <div className="chd-report-section" style={{ padding: 14, borderRadius: 10, background: "rgba(128, 0, 32, 0.05)", borderLeft: "3px solid var(--maroon-500)" }}>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{report.summary}</p>
                </div>

                <div className="chd-report-section">
                  <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>By status</h4>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
                    {[
                      { label: "Open", color: "#e0a030", text: report.status_insights.open },
                      { label: "In Progress", color: "#3b82f6", text: report.status_insights.in_progress },
                      { label: "Resolved", color: "#2e9e6b", text: report.status_insights.resolved },
                    ].map((s) => (
                      <div key={s.label} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--line)", borderTop: `3px solid ${s.color}` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.label}</div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {report.office_insights.length > 0 && (
                  <div className="chd-report-section">
                    <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Office insights</h4>
                    {report.office_insights.map((o, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < report.office_insights.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                          <strong>{o.office}</strong> — {o.observation}
                        </div>
                        <SeverityPill level={o.severity} />
                      </div>
                    ))}
                  </div>
                )}

                {report.recurring_themes.length > 0 && (
                  <div className="chd-report-section">
                    <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Recurring themes</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {report.recurring_themes.map((t, i) => (
                        <span key={i} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 999, border: "1px solid var(--line)" }}>
                          {t.theme} <strong style={{ marginLeft: 4 }}>~{t.approx_count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                  <div className="chd-report-section">
                    <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Recommendations</h4>
                    <div style={{ display: "grid", gap: 10 }}>
                      {report.recommendations.map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5 }}>
                          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--maroon-500)", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1 }}>{r.action}</span>
                          <SeverityPill level={r.priority} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chd-report-section">
                    <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Needs attention</h4>
                    {report.attention_tickets.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>Nothing flagged.</p>
                    ) : (
                      report.attention_tickets.map((t, i) => (
                        <div key={i} style={{ padding: "8px 0", borderBottom: i < report.attention_tickets.length - 1 ? "1px solid var(--line)" : "none", fontSize: 13, lineHeight: 1.5 }}>
                          <strong style={{ fontFamily: "var(--font-mono)" }}>{t.code}</strong>
                          <span style={{ color: "var(--ink-soft)" }}> — {t.reason}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ReassignForm({ ticket, offices, onCancel, onSubmit, submitting }) {
  const [officeId, setOfficeId] = useState(ticket.assigned_office || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!officeId) { setError("Please select an office."); return; }
    onSubmit(Number(officeId));
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0, marginBottom: 14 }}>
        <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(ticket.ticket_id)}</strong> — {ticket.concern_text.slice(0, 60)}
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="reassign-office">Assign to office</label>
        <select id="reassign-office" style={inputStyle} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
          <option value="">Select an office…</option>
          {offices.map((o) => (
            <option key={o.office_id} value={o.office_id}>{o.office_name}</option>
          ))}
        </select>
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Reassigning..." : "Reassign"}</button>
      </div>
    </form>
  );
}

function Transfers({ tickets, offices, loading, onUpdated }) {
  // Only tickets that have NO office assigned (and are still active)
  const transfers = tickets.filter(
    (t) => t.assigned_office == null && t.status !== "resolved" && t.status !== "closed"
  );

  const [reassignId, setReassignId] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const reassignTicket = transfers.find((t) => t.ticket_id === reassignId) || null;

  const handleReassign = async (newOfficeId) => {
    if (!reassignTicket) return;
    setSubmitting(true);
    setActionError("");

    const { error } = await supabase
      .from("tickets")
      .update({ assigned_office: newOfficeId, status: "in_progress" })
      .eq("ticket_id", reassignId);

    if (error) {
      console.error("Reassign failed:", error);
      setActionError(error.message || "Could not reassign this ticket.");
      setSubmitting(false);
      return;
    }

    const newOffice = offices.find((o) => o.office_id === newOfficeId);
    const { error: logError } = await supabase.from("logs").insert({
      ticket_id: reassignId,
      office_id: newOfficeId,
      action: `Admin assigned ${formatTicketCode(reassignId)} from Unassigned to ${newOffice?.office_name || "Unknown office"}`,
      module: "Ticket Transferred",
    });
    if (logError) console.error("Log insert failed:", logError);

    setSubmitting(false);
    setReassignId(null);
    onUpdated?.();
  };

  const handleResolve = async (ticketId) => {
    setActionError("");

    const { error } = await supabase
      .from("tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("ticket_id", ticketId);

    if (error) {
      console.error("Resolve failed:", error);
      setActionError(error.message || "Could not resolve this ticket.");
      return;
    }

    const { error: logError } = await supabase.from("logs").insert({
      ticket_id: ticketId,
      action: `Admin marked ${formatTicketCode(ticketId)} as resolved`,
      module: "Ticket Resolved",
    });
    if (logError) console.error("Log insert failed:", logError);

    onUpdated?.();
  };

  return (
    <>
      <PageHeader
        title="Ticket transfer management"
        subtitle="Tickets with no assigned office. Assign them to an office or resolve them."
      />

      {actionError && (
        <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{actionError}</p>
      )}

      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : transfers.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0" }}>
            No unassigned tickets right now.
          </p>
        ) : (
          transfers.map((t, i) => (
            <div
              key={t.ticket_id}
              style={{ padding: "14px 0", borderBottom: i < transfers.length - 1 ? "1px solid var(--line)" : "none" }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTransfer(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTransfer(t);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</strong>
                  <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                    {t.escalation_level && <span className="badge badge-transferred">{t.escalation_level}</span>}
                    <StatusBadge status={toDisplayStatus(t.status)} />
                  </span>
                </div>
                <p style={{ fontSize: 14, margin: "4px 0 2px" }}>
                  {t.concern_text.slice(0, 60)}{t.concern_text.length > 60 ? "..." : ""} - Unassigned
                </p>
                {t.transfer_reason && (
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>Reason: {t.transfer_reason}</p>
                )}
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "7px 14px", fontSize: 12 }}
                  onClick={() => { setActionError(""); setReassignId(t.ticket_id); }}
                >
                  Assign office
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: "7px 14px", fontSize: 12 }}
                  onClick={() => handleResolve(t.ticket_id)}
                >
                  Mark resolved
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {reassignTicket && (
        <Modal title="Assign ticket" onClose={() => setReassignId(null)}>
          <ReassignForm
            ticket={reassignTicket}
            offices={offices}
            onCancel={() => setReassignId(null)}
            onSubmit={handleReassign}
            submitting={submitting}
          />
        </Modal>
      )}
      {selectedTransfer && (
        <TicketStatusModal ticket={selectedTransfer} onClose={() => setSelectedTransfer(null)} />
      )}
    </>
  );
}

function Notifications({ userId, tickets, ticketsLoading, notifications, notificationsLoading, onRead, readTicketStorageKey, readTicketIds, setReadTicketIds }) {
  const [selectedTicket, setSelectedTicket] = useState(null);

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
      isUnread: !readTicketIds.has(`ticket-${ticket.ticket_id}`),
      item: ticket,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const openFeedItem = async (feedItem) => {
    if (feedItem.type === "ticket") {
      const nextReadIds = new Set(readTicketIds);
      nextReadIds.add(feedItem.id);
      setReadTicketIds(nextReadIds);
      try {
        localStorage.setItem(readTicketStorageKey, JSON.stringify([...nextReadIds]));
      } catch (error) {
        console.error("save read ticket state error:", error);
      }
      setSelectedTicket(feedItem.item);
      return;
    }

    if (!feedItem.item.is_read) {
      storeReadNotification(userId, feedItem.item.notif_id);
      const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notif_id", feedItem.item.notif_id)
        .eq("user_id", userId)
        .select("notif_id")
        .maybeSingle();
      if (error || !data) {
        console.error("mark admin notification read error:", error || "No notification row was updated.");
      } else {
        clearStoredReadNotification(userId, feedItem.item.notif_id);
      }
      onRead?.();
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Ticket updates and notifications for your account." />
      <div className="card">
        {notificationsLoading || ticketsLoading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : feedItems.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No notifications yet.</p>
        ) : (
          feedItems.map((feedItem, i) => (
            <button
              key={feedItem.id}
              type="button"
              onClick={() => void openFeedItem(feedItem)}
              style={{ width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 8px", border: "none", borderBottom: i < feedItems.length - 1 ? "1px solid var(--line)" : "none", borderRadius: 4, background: feedItem.isUnread ? "var(--maroon-050)" : "transparent", color: "inherit", textAlign: "left", cursor: "pointer", fontWeight: feedItem.isUnread ? 700 : 400 }}
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
      {selectedTicket && (
        <TicketStatusModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </>
  );
}

function TicketStatusModal({ ticket, onClose }) {
  const { session, profile } = useAuth();
  const status = ticket?.status || "unknown";
  const isResolved = status === "resolved" || status === "closed";
  const statusLabel = ticket ? toDisplayStatus(status) : "Ticket details unavailable";

  return ticket ? (
    <Modal title="Ticket details" onClose={onClose} width={960} className="ticket-conversation-modal admin-ticket-conversation-modal">
      <div className="ticket-conversation-layout">
        <div className="ticket-modal-details" style={{ display: "grid", alignContent: "start", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Ticket ID</span>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{formatTicketCode(ticket.ticket_id)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Submitted by</span>
            <span style={{ fontSize: 14, textAlign: "right" }}>{ticket.profiles?.name || "Unknown user"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Status</span>
            <StatusBadge status={statusLabel} />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: isResolved ? "var(--success)" : "var(--ink-soft)" }}>
            {isResolved ? "This ticket is resolved." : "This ticket is not resolved yet."}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Office</span>
            <span style={{ fontSize: 14, textAlign: "right" }}>{ticket.offices?.office_name || "Unassigned"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Concern</span>
            <span style={{ fontSize: 14, textAlign: "right", maxWidth: 360 }}>{ticket.concern_text}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Submitted</span>
            <span style={{ fontSize: 14, textAlign: "right" }}>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
          {ticket.resolved_at && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Resolved</span>
              <span style={{ fontSize: 14, textAlign: "right" }}>{new Date(ticket.resolved_at).toLocaleString()}</span>
            </div>
          )}
          {ticket.classification_confidence != null && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>AI confidence</span>
              <span style={{ fontSize: 14, textAlign: "right" }}>{ticket.classification_confidence}%</span>
            </div>
          )}
          {ticket.transfer_reason && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Transfer reason</span>
              <span style={{ fontSize: 14, textAlign: "right", maxWidth: 360 }}>{ticket.transfer_reason}</span>
            </div>
          )}
          <TicketResponses ticket={ticket} />
        </div>

        <TicketThread
          ticket={ticket}
          currentUserId={session?.user?.id}
          role="admin"
          allowReply={false}
          profileName={profile?.name || "Admin"}
        />
      </div>
    </Modal>
  ) : null;
}