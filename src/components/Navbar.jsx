import { Link, useNavigate } from "react-router";
import "../styles/theme.css";
import spcLogo from "../assets/spc.jpg";

/**
 * Navbar
 * Public top navigation shown on Home, Login, and Sign-up.
 * Maroon field, white type, thin gold-free rule — matches the
 * institutional palette used across the helpdesk system.
 */
export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header
      style={{
        background: "var(--maroon-700)",
        color: "var(--white)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 700,
            color: "var(--white)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 50,
              height: 50,
              borderRadius: 10,
              background: "rgba(255,255,255,0.14)",
              border: "1.5px solid rgba(255,255,255,0.4)",
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
          SPC Helpdesk
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link className="nav-link" to="/" style={navLinkStyle}>Home</Link>
          <Link className="nav-link" to="/how-it-works" style={navLinkStyle}>How it works</Link>
          <button
            className="btn btn-outline-white"
            onClick={() => navigate("/login")}
          >
            Log in
          </button>
          <button
            className="btn btn-primary"
            style={{ background: "var(--white)", color: "var(--maroon-700)" }}
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
        </nav>
      </div>
    </header>
  );
}

const navLinkStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: "rgba(255,255,255,0.88)",
};