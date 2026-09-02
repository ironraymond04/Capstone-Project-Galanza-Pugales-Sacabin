import { useState } from "react";
import Sidebar from "../components/Sidebar";
import useIsMobile from "../hooks/useIsMobile";
import "../styles/theme.css";

const NAV_ITEMS = [
  { id: "overview", label: "Dashboard", icon: "•" },
  { id: "logs", label: "View System Logs", icon: "•" },
  { id: "tickets", label: "Manage Tickets", icon: "•" },
  { id: "users", label: "Manage Users", icon: "•" },
  { id: "offices", label: "Manage Offices", icon: "•" },
  { id: "analytics", label: "Generate Analytics Reports", icon: "•" },
  { id: "escalation", label: "Ticket Escalation Management", icon: "•" },
  { id: "notifications", label: "Notifications", icon: "•" },
];

const ALL_TICKETS = [
  { id: "TCK-2201", subject: "Unable to access enrollment portal", office: "IT Services", status: "In Progress", confidence: 94 },
  { id: "TCK-2205", subject: "Wi-Fi not working in dorm 3", office: "IT Services", status: "Open", confidence: 88 },
  { id: "TCK-2199", subject: "Broken projector in Rm 204", office: "Facilities", status: "Escalated", confidence: 79 },
  { id: "TCK-2170", subject: "Lost student ID replacement", office: "Registrar", status: "Resolved", confidence: 95 },
  { id: "TCK-2140", subject: "Library book fine dispute", office: "Library", status: "Resolved", confidence: 81 },
];

const USERS = [
  { id: "u1", name: "[Your Name]", email: "name@example.com", role: "Student", status: "Active" },
  { id: "u2", name: "[Your Name]", email: "name@example.com", role: "Faculty & Staff", status: "Active" },
  { id: "u3", name: "[Your Name]", email: "name@example.com", role: "Student", status: "Active" },
  { id: "u4", name: "[Your Name]", email: "name@example.com", role: "Faculty & Staff", status: "Active" },
];

const OFFICES = [
  { name: "Registrar", head: "[Your Name]", openTickets: 3 },
  { name: "IT Services", head: "[Your Name]", openTickets: 5 },
  { name: "Library", head: "[Your Name]", openTickets: 1 },
  { name: "Guidance Office", head: "[Your Name]", openTickets: 0 },
  { name: "Accounting", head: "[Your Name]", openTickets: 2 },
  { name: "Facilities", head: "[Your Name]", openTickets: 4 },
];

const SYSTEM_LOGS = [
  { actor: "[Your Name]", action: "Updated TCK-2198 status to Resolved", time: "1h ago" },
  { actor: "System (AI MLC)", action: "Classified and routed TCK-2207 to IT Services", time: "3h ago" },
  { actor: "Admin", action: "Suspended user Mark Santos", time: "5h ago" },
  { actor: "System", action: "Escalated TCK-2199 to Facilities after SLA breach", time: "6h ago" },
];

const ESCALATIONS = [
  { id: "TCK-2199", subject: "Broken projector in Rm 204", office: "Facilities", reason: "SLA breached (48h)", level: "Level 2" },
  { id: "TCK-2183", subject: "Repeated login failures", office: "IT Services", reason: "Student reported unresolved twice", level: "Level 1" },
];

export default function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const isMobile = useIsMobile();

  return (
    <div className="chd-app-shell" style={{ flexDirection: isMobile ? "column" : "row" }}>
      <Sidebar
        role="Admin"
        userName="System Admin"
        items={NAV_ITEMS}
        activeId={active}
        onSelect={setActive}
        notifCount={4}
      />
      <div className="chd-main" style={isMobile ? { marginLeft: 0, width: "100%" } : undefined}>
        <div className="chd-content" style={isMobile ? { padding: "16px 14px" } : undefined}>
          {active === "overview" && <Overview onSelect={setActive} />}
          {active === "logs" && <SystemLogs />}
          {active === "tickets" && <ManageTickets />}
          {active === "users" && <ManageUsers />}
          {active === "offices" && <ManageOffices />}
          {active === "analytics" && <Analytics />}
          {active === "escalation" && <Escalation />}
          {active === "notifications" && <Notifications />}
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
  const map = { Open: "badge-open", "In Progress": "badge-progress", Resolved: "badge-resolved", Escalated: "badge-escalated" };
  return <span className={`badge ${map[status] || "badge-open"}`}>{status}</span>;
}

function ConfidenceMeter({ pct }) {
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

/** Wraps any table so it scrolls horizontally instead of blowing out the layout on narrow screens. */
function TableScroll({ children }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

/* ---------------- sections ---------------- */

function Overview({ onSelect }) {
  const isMobile = useIsMobile();
  return (
    <>
      <PageHeader title="System overview" subtitle="Real-time snapshot of the helpdesk across all offices." />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 16,
          marginBottom: isMobile ? 20 : 28,
        }}
      >
        <StatCard label="Total tickets" value={ALL_TICKETS.length} />
        <StatCard label="Escalated" value={ESCALATIONS.length} />
        <StatCard label="Active users" value={USERS.filter((u) => u.status === "Active").length} />
        <StatCard label="Offices" value={OFFICES.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 20 }}>
        <div className="card">
          <h3>Latest tickets</h3>
          <TableScroll>
            <table className="chd-table">
              <thead><tr><th>Ticket</th><th>Office</th><th>Status</th></tr></thead>
              <tbody>
                {ALL_TICKETS.slice(0, 4).map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                    <td>{t.office}</td>
                    <td><StatusBadge status={t.status} /></td>
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
          {OFFICES.map((o) => (
            <div key={o.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{o.name}</span>
              <strong style={{ color: o.openTickets > 3 ? "var(--danger)" : "var(--ink)" }}>{o.openTickets} open</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SystemLogs() {
  return (
    <>
      <PageHeader title="System logs" subtitle="Retrieved from the Logs data store." />
      <div className="card">
        {SYSTEM_LOGS.map((l, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 6,
              padding: "12px 0",
              borderBottom: i < SYSTEM_LOGS.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span style={{ fontSize: 14 }}><strong>{l.actor}</strong> - {l.action}</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{l.time}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ManageTickets() {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? ALL_TICKETS : ALL_TICKETS.filter((t) => t.status === filter);
  return (
    <>
      <PageHeader title="All tickets" subtitle="Saved to and retrieved from the Ticket data store." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["All", "Open", "In Progress", "Resolved", "Escalated"].map((f) => (
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
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Ticket</th><th>Subject</th><th>Office</th><th>AI confidence</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td>
                  <td>{t.subject}</td>
                  <td>{t.office}</td>
                  <td><ConfidenceMeter pct={t.confidence} /></td>
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

function ManageUsers() {
  const [users, setUsers] = useState(USERS);
  const toggleStatus = (id) =>
    setUsers((list) =>
      list.map((u) => (u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u))
    );
  return (
    <>
      <PageHeader title="Users" subtitle="Saved to and retrieved from the User data store." />
      <div className="card">
        <TableScroll>
          <table className="chd-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={u.status === "Active" ? "badge badge-resolved" : "badge badge-escalated"}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }} onClick={() => toggleStatus(u.id)}>
                      {u.status === "Active" ? "Suspend" : "Reactivate"}
                    </button>
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

function ManageOffices() {
  const isMobile = useIsMobile();
  return (
    <>
      <PageHeader title="Offices" subtitle="Saved to and retrieved from the Offices data store." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
        {OFFICES.map((o) => (
          <div key={o.name} className="card">
            <h3 style={{ fontSize: 16 }}>{o.name}</h3>
            <p style={{ fontSize: 13, margin: "4px 0" }}>Head: {o.head}</p>
            <span className="badge badge-open">{o.openTickets} open tickets</span>
          </div>
        ))}
        <div className="card" style={{ display: "grid", placeItems: "center", border: "1.5px dashed var(--line)" }}>
          <button className="btn btn-ghost">+ Add office</button>
        </div>
      </div>
    </>
  );
}

function Analytics() {
  const isMobile = useIsMobile();
  const byOffice = OFFICES.map((o) => ({ name: o.name, count: o.openTickets }));
  const max = Math.max(...byOffice.map((o) => o.count), 1);
  return (
    <>
      <PageHeader title="Analytics" subtitle="Compiled from the Ticket and Survey Response data stores." />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total tickets (30d)" value="248" />
        <StatCard label="Avg. resolution time" value="5.4h" />
        <StatCard label="Avg. satisfaction" value="4.5 / 5" />
      </div>
      <div className="card">
        <h3>Open tickets by office</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 8 : 18, height: 160, marginTop: 20, overflowX: "auto" }}>
          {byOffice.map((o) => (
            <div key={o.name} style={{ flex: isMobile ? "0 0 64px" : 1, textAlign: "center" }}>
              <div
                style={{
                  height: `${(o.count / max) * 120 + 8}px`,
                  background: "var(--maroon-500)",
                  borderRadius: "6px 6px 0 0",
                  marginBottom: 8,
                }}
              />
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{o.count}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Escalation() {
  return (
    <>
      <PageHeader title="Escalated tickets" subtitle="Saved to the Logs data store, retrieved from the Ticket data store." />
      <div className="card">
        {ESCALATIONS.map((e) => (
          <div key={e.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
              <strong style={{ fontFamily: "var(--font-mono)" }}>{e.id}</strong>
              <span className="badge badge-escalated">{e.level}</span>
            </div>
            <p style={{ fontSize: 14, margin: "4px 0 2px" }}>{e.subject} - {e.office}</p>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>Reason: {e.reason}</p>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>Reassign</button>
              <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }}>Mark resolved</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Notifications() {
  const items = [
    { text: "TCK-2199 breached SLA and was escalated.", time: "6h ago" },
    { text: "New user Mark Santos registered.", time: "9h ago" },
    { text: "Weekly analytics report generated.", time: "1d ago" },
  ];
  return (
    <>
      <PageHeader title="Notifications" subtitle="Retrieved from the Notification data store." />
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