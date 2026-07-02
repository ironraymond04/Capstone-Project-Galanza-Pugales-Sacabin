import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

const ROLE_ROUTES = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Login -> Credentials -> Validate (DB1 User) -> Login Successful
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
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Navbar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "64px 24px",
        }}
      >
        <div className="card" style={{ width: 420 }}>
          <span className="eyebrow">Login</span>
          <h2 style={{ marginTop: 8 }}>Welcome back</h2>
          <p style={{ fontSize: 14, marginBottom: 24 }}>
            Sign in to submit, track, or manage helpdesk tickets.
          </p>

          <div className="field">
            <label>I am signing in as</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="staff">Faculty &amp; Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@university.edu"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
              Log in
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, marginTop: 20 }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "var(--maroon-600)", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}