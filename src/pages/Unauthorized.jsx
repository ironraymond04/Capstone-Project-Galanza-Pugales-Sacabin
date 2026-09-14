import React from "react";
import { useNavigate } from "react-router";

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
    padding: "40px 32px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "18px",
  },
  title: {
    margin: "0 0 12px",
    color: "#0f172a",
    fontSize: "2rem",
  },
  message: {
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "1rem",
    lineHeight: 1.6,
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  button: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.2s ease, opacity 0.2s ease",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
  },
};

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.badge}>Access denied</div>
        <h1 style={styles.title}>Unauthorized</h1>
        <p style={styles.message}>
          You do not have permission to view this page. Please sign in with an
          authorized account or return to the homepage.
        </p>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={() => navigate("/")}
          >
            Go Home
          </button>
          <button
            type="button"
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
