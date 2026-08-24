import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

const ROLE_ROUTES = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

const ROLES = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Faculty & Staff" },
  { value: "admin", label: "Admin" },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Enter both your email and password to continue.");
      return;
    }
    setError("");
    navigate(ROLE_ROUTES[role]);
  };

  return (
    <div className="login-shell">
      <Navbar />

      <div className="login-stage">
        {/* Brand panel — hidden on mobile */}
        <section className="brand-panel" aria-hidden="true">
          <span className="brand-eyebrow page-description page-description--from-left">SPC Helpdesk</span>
          <h1 className="brand-headline page-description page-description--from-left">
            Every issue, tracked<br />from report to resolution.
          </h1>
          <p className="brand-sub page-description page-description--from-left">
            One system for students, faculty, and staff to submit, follow, and
            close support tickets - no more chasing emails.
          </p>

          <div className="flow-diagram">
            <div className="flow-node">
              <span className="flow-dot" />
              <span className="flow-label">Submitted</span>
            </div>
            <div className="flow-node">
              <span className="flow-dot" />
              <span className="flow-label">In review</span>
            </div>
            <div className="flow-node active">
              <span className="flow-dot" />
              <span className="flow-label">Resolved</span>
            </div>
          </div>
        </section>

        {/* Form panel */}
        <section className="form-panel">
          <div className="form-card">
            <span className="eyebrow">Login</span>
            <h2>Welcome back</h2>
            <p className="form-lede">
              Sign in to submit, track, or manage helpdesk tickets.
            </p>

            <div
              className="role-toggle"
              role="radiogroup"
              aria-label="I am signing in as"
            >
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  role="radio"
                  aria-checked={role === r.value}
                  className={`role-btn${role === r.value ? " active" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="email">Email address</label>
                <div className="input-wrap">
                  <MailIcon />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@school.edu"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && (
                <p className="form-error">
                  <AlertIcon />
                  {error}
                </p>
              )}

              <button type="submit" className="submit-btn">
                Log in
              </button>
            </form>

            <p className="form-footer">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </section>
      </div>

      <style>{`
        .login-shell {
          --lg-maroon-700: var(--maroon-700, #6d1226);
          --lg-maroon-900: var(--maroon-900, #3a0a14);
          --lg-gold: var(--gold-500, #c9a227);
          --lg-ink: var(--ink, #241014);
          --lg-muted: var(--muted, #6b5b5e);
          --lg-border: var(--border, #e5dede);
          background: var(--paper, #faf7f2);
          min-height: 100vh;
        }

        .login-stage {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          min-height: calc(100vh - 72px);
        }

        @media (max-width: 880px) {
          .login-stage { grid-template-columns: 1fr; }
          .brand-panel { display: none; }
        }

        .brand-panel {
          background: linear-gradient(160deg, var(--lg-maroon-700), #7c1826);
          color: #f7ece9;
          padding: 72px 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .brand-eyebrow {
          text-transform: uppercase;
          letter-spacing: .14em;
          font-size: 12px;
          font-weight: 700;
          color: var(--lg-gold);
        }
        .brand-headline {
          font-family: "Libre Baskerville", Sans-serif;
          color: rgb(255, 255, 255);
          font-weight: 600;
          font-size: 38px;
          line-height: 1.18;
          margin: 18px 0 20px;
        }
        .brand-sub {
          max-width: 360px;
          font-size: 15px;
          line-height: 1.6;
          color: rgba(247, 236, 233, 0.82);
          margin-bottom: 52px;
        }

        .flow-diagram { display: flex; flex-direction: column; max-width: 220px; }
        .flow-node { position: relative; display: flex; align-items: center; gap: 12px; padding-bottom: 28px; }
        .flow-node:last-child { padding-bottom: 0; }
        .flow-node:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 4px; top: 14px; bottom: -14px;
          width: 1px;
          background: rgba(247, 236, 233, 0.2);
        }
        .flow-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: rgba(247, 236, 233, 0.35);
          position: relative; z-index: 1; flex-shrink: 0;
        }
        .flow-node.active .flow-dot {
          background: var(--lg-gold);
          box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.2);
        }
        .flow-label { font-size: 13px; color: rgba(247, 236, 233, 0.75); }
        .flow-node.active .flow-label { color: #f7ece9; font-weight: 600; }

        .form-panel { display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .form-card { width: 100%; max-width: 380px; }
        .form-lede { font-size: 14px; color: var(--lg-muted); margin: 6px 0 28px; }

        .role-toggle {
          display: flex; gap: 6px; margin-bottom: 24px;
          padding: 4px; border-radius: 10px;
          background: var(--paper-alt, #f1ece4);
        }
        .role-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 10px 6px; border: none; border-radius: 8px;
          background: transparent; color: var(--lg-muted);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: transform .18s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
        }
        .role-btn.active { background: #fff; color: var(--lg-maroon-700); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .role-btn:hover:not(.active) { color: var(--lg-ink); }

        .input-group { margin-bottom: 18px; }
        .input-group label { display: block; font-size: 13px; font-weight: 600; color: var(--lg-ink); margin-bottom: 6px; }
        .input-wrap {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid var(--lg-border); border-radius: 8px;
          padding: 0 12px; background: #fff;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .input-wrap svg { flex-shrink: 0; color: var(--lg-muted); }
        .input-wrap:focus-within { border-color: var(--maroon-600); box-shadow: 0 0 0 3px rgba(139,25,45,.12); }
        .input-wrap input { flex: 1; border: none; outline: none; background: transparent; padding: 11px 0; font-size: 14px; }

        .form-error { display: flex; align-items: center; gap: 6px; color: var(--danger, #b3261e); font-size: 13px; margin: -6px 0 16px; }

        .submit-btn {
          width: 100%; padding: 13px; border: none; border-radius: 8px;
          background: var(--maroon-600); color: #fff; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: transform .18s ease, background .15s ease;
        }
        .submit-btn:hover { background: var(--lg-maroon-700); }
        .submit-btn:active { transform: translateY(1px); }
        .submit-btn:focus-visible { outline: 3px solid var(--lg-gold); outline-offset: 2px; }

        .form-footer { text-align: center; font-size: 13px; margin-top: 22px; color: var(--lg-muted); }
        .form-footer a { color: var(--maroon-600); font-weight: 600; text-decoration: none; }
        .form-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}