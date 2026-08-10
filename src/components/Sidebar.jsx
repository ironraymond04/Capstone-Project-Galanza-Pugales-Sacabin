import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import "../styles/theme.css";
import spcLogo from "../assets/spc.jpg";

/**
 * Sidebar
 * Shared dashboard navigation for Student / Faculty & Staff / Admin pages.
 * Each `items` entry maps directly to a process on that role's DFD
 * (e.g. Admin -> "4.0 Manage Tickets (AI MLC)").
 *
 * Responsive behavior:
 *  - Desktop (>= 900px): fixed, always-visible sidebar (unchanged from before).
 *  - Mobile (< 900px): sidebar collapses into a slide-in drawer, triggered by
 *    a hamburger button in a small top bar. Selecting an item or tapping the
 *    overlay closes the drawer.
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
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) setOpen(false); // reset drawer state when leaving mobile
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (isMobile && open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, open]);

  const handleSelect = (id) => {
    onSelect(id);
    if (isMobile) setOpen(false);
  };

  const closedTransform = isMobile ? "translateX(-100%)" : "translateX(0)";

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "var(--maroon-900)",
            color: "var(--white)",
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ width: 16, height: 2, background: "var(--white)", borderRadius: 2 }} />
              <span style={{ width: 16, height: 2, background: "var(--white)", borderRadius: 2 }} />
              <span style={{ width: 16, height: 2, background: "var(--white)", borderRadius: 2 }} />
            </span>
          </button>

          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img src={spcLogo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </span>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 14.5,
                lineHeight: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              SPC Helpdesk
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--maroon-300)",
                marginTop: 2,
              }}
            >
              {role} Portal
            </div>
          </div>

          {notifCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--maroon-300)",
                color: "var(--white)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                borderRadius: 999,
                padding: "2px 7px",
                flexShrink: 0,
              }}
            >
              {notifCount}
            </span>
          )}
        </div>
      )}

      {/* Backdrop (mobile, drawer open only) */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 45,
          }}
        />
      )}

      <aside
        style={{
          width: isMobile ? 268 : 268,
          maxWidth: isMobile ? "82vw" : undefined,
          flexShrink: 0,
          background: "var(--maroon-900)",
          color: "var(--white)",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: 50,
          transform: isMobile ? (open ? "translateX(0)" : closedTransform) : "none",
          transition: isMobile ? "transform 0.25s ease" : "none",
          boxShadow: isMobile && open ? "2px 0 24px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {/* Brand (hidden on mobile — shown in the top bar instead) */}
        {!isMobile && (
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
        )}

        {/* Close button (mobile drawer only) */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0" }}>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "var(--white)",
                fontSize: 16,
                lineHeight: 1,
                display: "grid",
                placeItems: "center",
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
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
                flexShrink: 0,
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
    </>
  );
}