import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "../styles/theme.css";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "logs", label: "View System Logs", icon: "•" },
  { id: "tickets", label: "Manage Tickets", icon: "•" },
  { id: "users", label: "Manage Users", icon: "•" },
  { id: "offices", label: "Manage Offices", icon: "•" },
  { id: "analytics", label: "Generate Analytics Reports", icon: "•" },
  { id: "transfer", label: "Ticket Transfer Management", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•" },
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

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [active, setActive] = useState("overview");
  const isMobile = useIsMobile();

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
    if (!error) setTickets(data || []);
    setTicketsLoading(false);
  }

async function loadUsers() {
  setUsersLoading(true);
  const { data, error } = await supabase
    .from("profiles")
    .select("*, offices!profiles_office_id_fkey(office_name)")
    .order("name");
  if (!error) setUsers(data || []);
  setUsersLoading(false);
}

  async function loadOffices() {
    setOfficesLoading(true);
    const { data, error } = await supabase
      .from("offices")
      .select("*, head:profiles!offices_head_user_id_fkey(name, email)")
      .order("office_name");
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
    if (!error) setLogs(data || []);
    setLogsLoading(false);
  }

  async function loadNotifications() {
    setNotifLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setNotifications(data || []);
    setNotifLoading(false);
  }

  useEffect(() => {
    loadTickets();
    loadUsers();
    loadOffices();
    loadLogs();
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
          {active === "overview" && (
            <Overview tickets={tickets} users={users} offices={offices} loading={ticketsLoading || usersLoading || officesLoading} onSelect={setActive} />
          )}
          {active === "logs" && <SystemLogs logs={logs} loading={logsLoading} />}
          {active === "tickets" && <ManageTickets tickets={tickets} loading={ticketsLoading} />}
          {active === "users" && <ManageUsers users={users} loading={usersLoading} onUpdated={loadUsers} />}
          {active === "offices" && (
            <ManageOffices offices={offices} loading={officesLoading} users={users} onUpdated={loadOffices} />
          )}
          {active === "analytics" && <Analytics tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} />}
          {active === "transfer" && (
            <Transfers tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} onUpdated={loadTickets} />
          )}
          {active === "notifications" && (
            <Notifications notifications={notifications} loading={notifLoading} onRead={loadNotifications} />
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

function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20, 10, 10, 0.45)", display: "grid", placeItems: "center", zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width, background: "var(--paper, #fff)" }}>
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
            <div key={l.log_id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontSize: 14 }}><strong>{l.profiles?.name || "System"}</strong> - {l.action}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{timeAgo(l.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ManageTickets({ tickets, loading }) {
  const [filter, setFilter] = useState("All");
  const filterMap = { Open: "pending", "In Progress": "in_progress", Resolved: "resolved", Transferred: "transferred" };
  const filtered = filter === "All" ? tickets : tickets.filter((t) => t.status === filterMap[filter]);

  return (
    <>
      <PageHeader title="All tickets" subtitle="Saved to and retrieved from the Ticket data store." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["All", "Open", "In Progress", "Resolved", "Transferred"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? "btn btn-primary" : "btn btn-ghost"} style={{ padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>
            {f}
          </button>
        ))}
      </div>
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Concern</th><th>Office</th><th>AI confidence</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.ticket_id}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><ConfidenceMeter pct={t.classification_confidence} /></td>
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

function ManageUsers({ users, loading, onUpdated }) {
  const toggleStatus = async (userId, current) => {
    await supabase.from("profiles").update({ is_active: !current }).eq("user_id", userId);
    onUpdated?.();
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Saved to and retrieved from the User data store." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
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

function AddOfficeForm({ staff, onCancel, onSubmit, submitting }) {
  const [name, setName] = useState("");
  const [headId, setHeadId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Office name is required."); return; }
    if (!headId) { setError("Please select a head for this office."); return; }
    onSubmit({ office_name: name.trim(), head_user_id: headId });
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

      {error && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={staff.length === 0 || submitting}>
          {submitting ? "Adding..." : "Add office"}
        </button>
      </div>
    </form>
  );
}

function ManageOffices({ offices, loading, users, onUpdated }) {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const staffOptions = users.filter((u) => u.role === "staff" && u.is_active);

  const handleAddOffice = async (payload) => {
    setSubmitting(true);
    const { error } = await supabase.from("offices").insert(payload);
    setSubmitting(false);
    if (!error) {
      onUpdated?.();
      setModalOpen(false);
    }
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
            </div>
          ))}
          <div className="card" style={{ display: "grid", placeItems: "center", border: "1.5px dashed var(--line)" }}>
            <button className="btn btn-ghost" onClick={() => setModalOpen(true)}>+ Add office</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal title="Add office" onClose={() => setModalOpen(false)}>
          <AddOfficeForm staff={staffOptions} onCancel={() => setModalOpen(false)} onSubmit={handleAddOffice} submitting={submitting} />
        </Modal>
      )}
    </>
  );
}

function Analytics({ tickets, offices, loading }) {
  const isMobile = useIsMobile();

  const byOffice = offices.map((o) => ({
    name: o.office_name,
    count: tickets.filter((t) => t.assigned_office === o.office_id && t.status !== "resolved" && t.status !== "closed").length,
  }));
  const max = Math.max(...byOffice.map((o) => o.count), 1);

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 864e5);
  const last30 = tickets.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);

  const resolvedWithTimes = tickets.filter((t) => t.resolved_at);
  const avgResolutionHrs =
    resolvedWithTimes.length > 0
      ? (resolvedWithTimes.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)) / 36e5, 0) / resolvedWithTimes.length).toFixed(1)
      : "—";

  return (
    <>
      <PageHeader title="Analytics" subtitle="Compiled from the Ticket and Survey Response data stores." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total tickets (30d)" value={last30.length} />
        <StatCard label="Avg. resolution time" value={avgResolutionHrs === "—" ? "—" : `${avgResolutionHrs}h`} />
        <StatCard label="Avg. satisfaction" value="—" />
      </div>
      <div className="card">
        <h3>Open tickets by office</h3>
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 8 : 18, height: 160, marginTop: 20, overflowX: "auto" }}>
            {byOffice.map((o) => (
              <div key={o.name} style={{ flex: isMobile ? "0 0 64px" : 1, textAlign: "center" }}>
                <div style={{ height: `${(o.count / max) * 120 + 8}px`, background: "var(--maroon-500)", borderRadius: "6px 6px 0 0", marginBottom: 8 }} />
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.name}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{o.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const transfers = tickets.filter((t) => t.status === "transferred");
  const [reassignId, setReassignId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const reassignTicket = transfers.find((t) => t.ticket_id === reassignId) || null;

  const handleReassign = async (newOfficeId) => {
    setSubmitting(true);
    await supabase.from("tickets").update({ assigned_office: newOfficeId, status: "in_progress" }).eq("ticket_id", reassignId);
    setSubmitting(false);
    setReassignId(null);
    onUpdated?.();
  };

  const handleResolve = async (ticketId) => {
    await supabase.from("tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("ticket_id", ticketId);
    onUpdated?.();
  };

  return (
    <>
      <PageHeader title="Transferred tickets" subtitle="Saved to the Logs data store, retrieved from the Ticket data store." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : transfers.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0" }}>No transferred tickets right now.</p>
        ) : (
          transfers.map((t, i) => (
            <div key={t.ticket_id} style={{ padding: "14px 0", borderBottom: i < transfers.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</strong>
                {t.escalation_level && <span className="badge badge-transferred">{t.escalation_level}</span>}
              </div>
              <p style={{ fontSize: 14, margin: "4px 0 2px" }}>{t.concern_text.slice(0, 60)} - {t.offices?.office_name || "Unassigned"}</p>
              {t.transfer_reason && <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>Reason: {t.transfer_reason}</p>}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => setReassignId(t.ticket_id)}>Reassign</button>
                <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => handleResolve(t.ticket_id)}>Mark resolved</button>
              </div>
            </div>
          ))
        )}
      </div>

      {reassignTicket && (
        <Modal title="Reassign ticket" onClose={() => setReassignId(null)}>
          <ReassignForm ticket={reassignTicket} offices={offices} onCancel={() => setReassignId(null)} onSubmit={handleReassign} submitting={submitting} />
        </Modal>
      )}
    </>
  );
}

function Notifications({ notifications, loading, onRead }) {
  const markRead = async (n) => {
    if (n.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("notif_id", n.notif_id);
    onRead?.();
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Retrieved from the Notification data store." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No notifications yet.</p>
        ) : (
          notifications.map((n, i) => (
            <div
              key={n.notif_id}
              onClick={() => markRead(n)}
              style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, padding: "12px 0", borderBottom: i < notifications.length - 1 ? "1px solid var(--line)" : "none", cursor: "pointer", fontWeight: n.is_read ? 400 : 700 }}
            >
              <span style={{ fontSize: 14 }}>{n.message}</span>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{timeAgo(n.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}