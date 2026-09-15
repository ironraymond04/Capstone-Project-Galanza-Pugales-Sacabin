import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

const ROLE_ROUTES = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

export default function Unauthorized() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const homeRoute = profile?.role ? ROLE_ROUTES[profile.role] : "/login";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="unauth-shell">
      <Navbar />

      <div className="unauth-stage">
        <div className="unauth-card">
          <span className="unauth-code">403</span>
          <h1>Access restricted</h1>
          <p>
            {profile?.role
              ? `Your account is registered as "${profile.role}", which doesn't have access to this page.`
              : "You don't have permission to view this page."}
          </p>

          <div className="unauth-actions">
            <Link to={homeRoute} className="btn-primary-link">
              Go to my dashboard
            </Link>
            <button onClick={handleLogout} className="unauth-logout">
              Log out
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .unauth-shell {
          background: var(--paper, #faf7f2);
          min-height: 100vh;
        }

        .unauth-stage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 72px);
          padding: 24px;
        }

        .unauth-card {
          width: 100%;
          max-width: 420px;
          text-align: center;
          background: #fff;
          border: 1px solid var(--border, #e5dede);
          border-radius: 14px;
          padding: 48px 36px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.06);
        }

        .unauth-code {
          display: inline-block;
          font-family: "Libre Baskerville", serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--gold-500, #c9a227);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .unauth-card h1 {
          font-family: "Libre Baskerville", serif;
          font-size: 26px;
          color: var(--ink, #241014);
          margin: 4px 0 14px;
        }

        .unauth-card p {
          font-size: 14px;
          line-height: 1.6;
          color: var(--muted, #6b5b5e);
          margin: 0 0 32px;
        }

        .unauth-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-primary-link {
          display: block;
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          background: var(--maroon-600);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          box-sizing: border-box;
          transition: background 0.15s ease;
        }
        .btn-primary-link:hover {
          background: var(--maroon-700, #660809);
        }

        .unauth-logout {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid var(--border, #e5dede);
          background: transparent;
          color: var(--ink, #241014);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .unauth-logout:hover {
          background: var(--paper-alt, #f1ece4);
        }

        @media (max-width: 480px) {
          .unauth-card { padding: 36px 24px; }
        }
      `}</style>
    </div>
  );
}