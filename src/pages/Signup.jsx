import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "staff", label: "Faculty & Staff" },
  { value: "admin", label: "Admin" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "student",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const setRole = (role) => setForm((f) => ({ ...f, role }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      setError("Fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    navigate("/login");
  };

  return (
    <div className="auth-shell">
      <Navbar />

      <div className="auth-stage">
        <section className="brand-panel" aria-hidden="true">
          <span className="brand-eyebrow">SPC Helpdesk</span>
          <h1 className="brand-headline">
            Every issue, tracked<br />from report to resolution.
          </h1>
          <p className="brand-sub">
            One system for students, faculty, and staff to submit, follow, and
            close support tickets - no more chasing emails.
          </p>
          <div className="flow-diagram">
            <div className="flow-node">
              <span className="flow-dot" />
              <span>Submitted</span>
            </div>
            <div className="flow-node">
              <span className="flow-dot" />
              <span>In review</span>
            </div>
            <div className="flow-node active">
              <span className="flow-dot" />
              <span>Resolved</span>
            </div>
          </div>
        </section>

        <section className="form-panel">
          <div className="form-card">
            <span className="eyebrow">Create account</span>
            <h2>Join Campus Helpdesk</h2>
            <p className="form-lede">
              Set up your account to start submitting or managing tickets.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@school.edu"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label>I am signing up as</label>
                <div className="role-toggle" role="radiogroup" aria-label="I am signing up as">
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      role="radio"
                      aria-checked={form.role === r.value}
                      className={`role-btn${form.role === r.value ? " active" : ""}`}
                      onClick={() => setRole(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="submit-btn">
                Create account
              </button>
            </form>

            <p className="form-footer">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </section>
      </div>

      <style>{`
        .auth-shell {
          background: var(--paper, #faf7f2);
          min-height: 100vh;
        }

        .auth-stage {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 72px);
        }
        @media (max-width: 860px) {
          .auth-stage { grid-template-columns: 1fr; }
          .brand-panel { display: none; }
        }

        .brand-panel {
          background: var(--maroon-700, #7c1826);
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
          color: var(--gold-500, #c9a227);
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
          margin-bottom: 50px;
        }

        .flow-diagram { display: flex; flex-direction: column; max-width: 200px; }
        .flow-node {
          position: relative;
          display: flex; align-items: center; gap: 12px;
          padding-bottom: 24px;
          font-size: 13px;
          color: rgba(247, 236, 233, 0.7);
        }
        .flow-node:last-child { padding-bottom: 0; }
        .flow-node:not(:last-child)::before {
          content: "";
          position: absolute;
          left: 4px; top: 14px; bottom: -10px;
          width: 1px;
          background: rgba(247, 236, 233, 0.2);
        }
        .flow-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: rgba(247, 236, 233, 0.3);
          flex-shrink: 0;
        }
        .flow-node.active { color: #f7ece9; font-weight: 600; }
        .flow-node.active .flow-dot { background: var(--gold-500, #c9a227); }

        .form-panel { display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .form-card { width: 100%; max-width: 400px; }
        .form-lede { font-size: 14px; margin: 6px 0 24px; }

        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
        .field input {
          width: 100%; padding: 11px 12px; font-size: 14px;
          border: 1px solid var(--border, #e5dede); border-radius: 8px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .field input:focus {
          outline: none;
          border-color: var(--maroon-600);
          box-shadow: 0 0 0 3px rgba(139,25,45,.12);
        }

        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .role-toggle {
          display: flex; gap: 6px;
          padding: 4px; border-radius: 10px;
          background: var(--paper-alt, #f1ece4);
        }
        .role-btn {
          flex: 1; padding: 9px 6px; border: none; border-radius: 8px;
          background: transparent; color: var(--muted, #6b5b5e);
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: background .15s ease, color .15s ease;
        }
        .role-btn.active { background: #fff; color: var(--maroon-700, #6d1226); box-shadow: 0 1px 3px rgba(0,0,0,.08); }

        .form-error { color: var(--danger, #b3261e); font-size: 13px; margin: -6px 0 14px; }

        .submit-btn {
          width: 100%; padding: 12px; border: none; border-radius: 8px;
          background: var(--maroon-600); color: #fff; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: background .15s ease;
        }
        .submit-btn:hover { background: var(--maroon-700, #6d1226); }

        .form-footer { text-align: center; font-size: 13px; margin-top: 20px; }
        .form-footer a { color: var(--maroon-600); font-weight: 600; text-decoration: none; }
        .form-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}