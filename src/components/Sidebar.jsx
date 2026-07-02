import { useNavigate } from "react-router";
import "../styles/theme.css";
import spcLogo from "../assets/spc.jpg";

/**
 * Sidebar
 * Shared dashboard navigation for Student / Faculty & Staff / Admin pages.
 * Each `items` entry maps directly to a process on that role's DFD
 * (e.g. Admin -> "4.0 Manage Tickets (AI MLC)").
 *
 * Props:
 *  role        - "Student" | "Faculty & Staff" | "Admin"
 *  userName    - display name shown in the footer card
 *  items       - [{ id, label, code, icon }]
 *  activeId    - currently selected item id
 *  onSelect    - (id) => void
 *  notifCount  - unread notification badge count
 */
export default function Sidebar({
  role,
  userName = "Guest User",
  items,
  activeId,
  onSelect,
  notifCount = 0,
}) {
  const navigate = useNavigate();

  return (
    <aside
      style={{
        width: 268,
        flexShrink: 0,
        background: "var(--maroon-900)",
        color: "var(--white)",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "24px 22px 18px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={spcLogo}
              alt="Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, lineHeight: 1 }}>
              SPC Helpdesk
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--maroon-300)",
                marginTop: 4,
              }}
            >
              {role} Portal
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                padding: "11px 12px",
                marginBottom: 4,
                borderRadius: "var(--radius-sm)",
                background: active ? "var(--maroon-600)" : "transparent",
                color: active ? "var(--white)" : "rgba(255,255,255,0.75)",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.code === "notif" && notifCount > 0 && (
                <span
                  style={{
                    background: "var(--maroon-300)",
                    color: "var(--white)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    borderRadius: 999,
                    padding: "2px 7px",
                  }}
                >
                  {notifCount}
                </span>
              )}
              {item.code && item.code !== "notif" && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {item.code}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / user + logout */}
      <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 10px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.06)",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--maroon-300)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </span>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
            {userName}
          </div>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="btn btn-outline-white"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Log out
        </button>
      </div>
    </aside>
  );
}