import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "../components/Navbar";
import "../styles/theme.css";

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
    // New account created -> saved to DB1 User -> redirect to login
    navigate("/login");
  };

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 24px" }}>
        <div className="card" style={{ width: 440 }}>
          <span className="eyebrow">Create account</span>
          <h2 style={{ marginTop: 8 }}>Join Campus Helpdesk</h2>
          <p style={{ fontSize: 14, marginBottom: 24 }}>
            Set up your account to start submitting or managing tickets.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="field">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="staff">Faculty &amp; Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} />
              </div>
              <div className="field">
                <label>Confirm password</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
              </div>
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
              Create account
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, marginTop: 20 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--maroon-600)", fontWeight: 600 }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}