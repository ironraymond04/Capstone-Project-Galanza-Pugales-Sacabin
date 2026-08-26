import { useState } from "react";
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
  { id: "TCK-2199", subject: "Broken projector in Rm 204", student: "[Your Name]", priority: "High", status: "Escalated", confidence: 79 },
];

const ACTIVITY_LOGS = [
  { actor: "You", action: "Updated status of TCK-2198 to Resolved", time: "1h ago" },
  { actor: "System", action: "Auto-assigned TCK-2207 to your queue", time: "3h ago" },
  { actor: "You", action: "Escalated TCK-2199 to Facilities", time: "6h ago" },
];

export default function StaffDashboard() {
  const [active, setActive] = useState("overview");
  const isMobile = useIsMobile();

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
          {active === "reports" && <Reports />}
          {active === "logs" && <ActivityLogs />}
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
  const map = { Open: "badge-open", "In Progress": "badge-progress", Resolved: "badge-resolved", Escalated: "badge-escalated" };
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

function Reports() {
  const isMobile = useIsMobile();
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
            <thead><tr><th>Ticket</th><th>Student</th><th>Status</th></tr></thead>
            <tbody>
              {QUEUE.map((t) => (
                <tr key={t.id}><td style={{ fontFamily: "var(--font-mono)" }}>{t.id}</td><td>{t.student}</td><td><StatusBadge status={t.status} /></td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </div>
    </>
  );
}

function ActivityLogs() {
  return (
    <>
      <PageHeader title="Activity log" subtitle="This section displays all system logs." />
      <div className="card">
        {ACTIVITY_LOGS.map((l, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6, padding: "12px 0", borderBottom: i < ACTIVITY_LOGS.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ fontSize: 14 }}><strong>{l.actor}</strong> - {l.action}</span>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{l.time}</span>
          </div>
        ))}
      </div>
    </>
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
                      <option>Escalated</option>
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
  return (
    <>
      <PageHeader title="Newly routed tickets" subtitle="This section displays all routed ticket." />
      <div className="card">
        {QUEUE.slice(0, 2).map((t) => (
          <div key={t.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 6 }}>
              <strong style={{ fontFamily: "var(--font-mono)" }}>{t.id}</strong>
              <PriorityDot level={t.priority} />
            </div>
            <p style={{ fontSize: 14, margin: "4px 0 0" }}>{t.subject} - from {t.student}</p>
          </div>
        ))}
      </div>
    </>
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
    { text: "New ticket routed to your queue: TCK-2207.", time: "3h ago" },
    { text: "TCK-2199 was escalated to Facilities.", time: "6h ago" },
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