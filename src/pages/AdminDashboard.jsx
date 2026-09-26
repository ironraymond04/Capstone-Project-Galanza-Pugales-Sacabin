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
  const { session, profile } = useAuth();
  const [active, setActive] = useState(
    () => sessionStorage.getItem("chd-admin-active-tab") || "overview"
  );
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
    if (!error) setNotifications(data || []);
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
          {active === "tickets" && (<ManageTickets tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} onUpdated={loadTickets} />)}
          {active === "users" && <ManageUsers users={users} loading={usersLoading} onUpdated={loadUsers} />}
          {active === "offices" && (
            <ManageOffices offices={offices} loading={officesLoading} users={users} onUpdated={() => { loadOffices(); loadUsers(); }} />
          )}
          {active === "analytics" && <Analytics tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} />}
          {active === "transfer" && (
            <Transfers tickets={tickets} offices={offices} loading={ticketsLoading || officesLoading} onUpdated={loadTickets} />
          )}
          {active === "notifications" && (
            <Notifications tickets={tickets} loading={ticketsLoading} />
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

function ManageTickets({ tickets, offices, loading, onUpdated }) {
  const [filter, setFilter] = useState("All");
  const [reassignId, setReassignId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const filterMap = { Open: "pending", "In Progress": "in_progress", Resolved: "resolved", Transferred: "transferred" };
  const filtered = filter === "All" ? tickets : tickets.filter((t) => t.status === filterMap[filter]);

  const reassignTicket = tickets.find((t) => t.ticket_id === reassignId) || null;

  const handleReassign = async (newOfficeId) => {
    setSubmitting(true);
    const previousOfficeName = reassignTicket?.offices?.office_name || "Unassigned";

    const { error } = await supabase
      .from("tickets")
      .update({
        assigned_office: newOfficeId,
        status: reassignTicket.status === "pending" ? "in_progress" : reassignTicket.status,
      })
      .eq("ticket_id", reassignId);

    if (error) {
      console.error("Reassign failed:", error);
    } else {
      const newOffice = offices.find((o) => o.office_id === newOfficeId);
      await supabase.from("logs").insert({
        ticket_id: reassignId,
        office_id: newOfficeId,
        action: `Admin reassigned ${formatTicketCode(reassignId)} from ${previousOfficeName} to ${newOffice?.office_name || "Unassigned"}`,
        module: "Ticket Transferred",
      });
    }

    setSubmitting(false);
    setReassignId(null);
    onUpdated?.();
  };

  return (
    <>
      <PageHeader title="All tickets" subtitle="Saved to and retrieved from the Ticket data store. Click a ticket to reassign its office." />
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
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No tickets match this filter.</p>
        ) : (
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Concern</th><th>Office</th><th>AI confidence</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.ticket_id} onClick={() => setReassignId(t.ticket_id)} style={{ cursor: "pointer" }}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</td>
                    <td>{t.concern_text.slice(0, 50)}{t.concern_text.length > 50 ? "..." : ""}</td>
                    <td>{t.offices?.office_name || "Unassigned"}</td>
                    <td><ConfidenceMeter pct={t.classification_confidence} /></td>
                    <td><StatusBadge status={toDisplayStatus(t.status)} /></td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReassignId(t.ticket_id); }}
                        style={{ padding: "5px 12px", fontSize: 12.5, borderRadius: 6, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer" }}
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
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
  const transfers = tickets.filter((t) => t.status === "transferred" || t.transfer_reason || t.escalation_level);
  const [reassignId, setReassignId] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
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
              <button
                type="button"
                onClick={() => setSelectedTransfer(t)}
                style={{ width: "100%", padding: 0, border: "none", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
              >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(t.ticket_id)}</strong>
                {t.escalation_level && <span className="badge badge-transferred">{t.escalation_level}</span>}
              </div>
              <p style={{ fontSize: 14, margin: "4px 0 2px" }}>{t.concern_text.slice(0, 60)} - {t.offices?.office_name || "Unassigned"}</p>
              {t.transfer_reason && <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>Reason: {t.transfer_reason}</p>}
              </button>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => setReassignId(t.ticket_id)}>Reassign</button>
                {(t.status !== "resolved" && t.status !== "closed") && (
                  <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => handleResolve(t.ticket_id)}>Mark resolved</button>
                )}
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
      {selectedTransfer && (
        <TicketStatusModal ticket={selectedTransfer} onClose={() => setSelectedTransfer(null)} />
      )}
    </>
  );
}

function Notifications({ tickets, loading }) {
  const [selectedTicket, setSelectedTicket] = useState(null);

  return (
    <>
      <PageHeader title="Notifications" subtitle="All submitted tickets, including resolved tickets." />
      <div className="card">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>
        ) : tickets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No submitted tickets yet.</p>
        ) : (
          tickets.map((ticket, i) => (
            <button
              key={ticket.ticket_id}
              type="button"
              onClick={() => setSelectedTicket(ticket)}
              style={{ width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "12px 0", border: "none", borderBottom: i < tickets.length - 1 ? "1px solid var(--line)" : "none", background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
            >
              <span style={{ minWidth: 0, fontSize: 14 }}>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{formatTicketCode(ticket.ticket_id)}</strong>
                <span> - {ticket.concern_text}</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <StatusBadge status={toDisplayStatus(ticket.status)} />
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{timeAgo(ticket.created_at)}</span>
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
  const status = ticket?.status || "unknown";
  const isResolved = status === "resolved" || status === "closed";
  const statusLabel = ticket ? toDisplayStatus(status) : "Ticket details unavailable";

  return ticket ? (
    <Modal title="Ticket details" onClose={onClose} width={560}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Ticket ID</span>
          <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{formatTicketCode(ticket.ticket_id)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>Submitted by</span>
          <span style={{ fontSize: 14, textAlign: "right" }}>{ticket.profiles?.name || "Unknown user"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
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
      </div>
    </Modal>
  ) : null;
}