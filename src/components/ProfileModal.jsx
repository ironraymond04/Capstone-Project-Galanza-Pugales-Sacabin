import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient"; // <-- adjust to your client path

const COURSES = [
  "BSIT",
  "BSCS",
  "BSCE",
  "BSEE",
  "BSME",
  "BSCpE",
  "BSECE",
  "AB-ENG",
  "AB-FIL",
  "AB-POLSCI",
  "BEED",
  "BSED",
  "BSBA-MM",
  "BSBA-FM",
  "BSBA-OM",
  "BSBA-HRM",
  "BSCRIM",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
];

const labelStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--gray-600, #666)",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid rgba(0,0,0,0.18)",
  fontSize: 14,
  background: "#fff",
  color: "#222",
  boxSizing: "border-box",
};

const readOnlyStyle = {
  ...inputStyle,
  background: "rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.08)",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function Message({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "success";
  return (
    <div
      role="status"
      style={{
        fontSize: 12.5,
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        marginBottom: 10,
        background: ok ? "rgba(34,139,34,0.10)" : "rgba(200,30,30,0.10)",
        color: ok ? "#1c6b1c" : "#a31515",
      }}
    >
      {msg.text}
    </div>
  );
}

export default function ProfileModal({ open, onClose, role, onAvatarChange }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);

  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);

  const [showPw, setShowPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const isStudent = role === "Student";

  // Load profile whenever the modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setInfoMsg(null);
      setAvatarMsg(null);
      setPwMsg(null);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, role, course, year_level, avatar_url, created_at")
        .eq("user_id", user.id)
        .single();
      if (cancelled) return;
      setUserId(user.id);
      if (!error && data) {
        setProfile(data);
        setCourse(data.course || "");
        setYearLevel(data.year_level ? String(data.year_level) : "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Close on Escape + lock body scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setAvatarMsg(null);

    if (!file.type.startsWith("image/")) {
      return setAvatarMsg({ type: "error", text: "Please choose an image file." });
    }
    if (file.size > 2 * 1024 * 1024) {
      return setAvatarMsg({ type: "error", text: "Image must be 2MB or smaller." });
    }

    setUploading(true);
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setUploading(false);
      return setAvatarMsg({ type: "error", text: upErr.message });
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`; // cache-bust

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);

    setUploading(false);
    if (dbErr) return setAvatarMsg({ type: "error", text: dbErr.message });

    setProfile((p) => ({ ...p, avatar_url: url }));
    onAvatarChange?.(url);
    setAvatarMsg({ type: "success", text: "Profile picture updated." });
  };

  const handleSaveInfo = async () => {
    setInfoMsg(null);
    setSavingInfo(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        course: course || null,
        year_level: yearLevel ? Number(yearLevel) : null,
      })
      .eq("user_id", userId);
    setSavingInfo(false);
    setInfoMsg(
      error
        ? { type: "error", text: error.message }
        : { type: "success", text: "Profile saved." }
    );
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      return setPwMsg({ type: "error", text: "Please fill in all password fields." });
    }
    if (newPw.length < 8) {
      return setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
    }
    if (newPw !== confirmPw) {
      return setPwMsg({ type: "error", text: "New passwords do not match." });
    }
    if (newPw === currentPw) {
      return setPwMsg({ type: "error", text: "New password must be different from the current one." });
    }

    setSavingPw(true);
    // Verify the current password first
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPw,
    });
    if (verifyErr) {
      setSavingPw(false);
      return setPwMsg({ type: "error", text: "Current password is incorrect." });
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) return setPwMsg({ type: "error", text: error.message });

    setPwMsg({ type: "success", text: "Password changed successfully." });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setShowPw(false);
  };

  const initial = (profile?.name || "?").charAt(0).toUpperCase();
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My profile"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#fff",
          color: "#222",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "var(--maroon-900)",
            color: "var(--white)",
            borderRadius: "14px 14px 0 0",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>My Profile</div>
          <button
            aria-label="Close profile"
            onClick={onClose}
            style={{ color: "var(--white)", fontSize: 22, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 30, fontSize: 14 }}>Loading profile…</div>
          ) : !profile ? (
            <div style={{ textAlign: "center", padding: 30, fontSize: 14 }}>
              Could not load your profile.
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "var(--maroon-300)",
                    color: "var(--white)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 38,
                    fontWeight: 700,
                    border: "3px solid var(--maroon-600)",
                  }}
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initial
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  style={{ display: "none" }}
                />
                <button
                  className="btn btn-ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ marginTop: 10 }}
                >
                  {uploading ? "Uploading…" : "Upload profile picture"}
                </button>
                <div style={{ marginTop: 8, width: "100%" }}>
                  <Message msg={avatarMsg} />
                </div>
              </div>

              {/* Info */}
              <Field label="Name">
                <input style={readOnlyStyle} value={profile.name} readOnly />
              </Field>
              <Field label="Role">
                <input style={readOnlyStyle} value={role || profile.role} readOnly />
              </Field>

              {isStudent && (
                <>
                  <Field label="Course">
                    <select style={inputStyle} value={course} onChange={(e) => setCourse(e.target.value)}>
                      <option value="">Select course…</option>
                      {COURSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {course && !COURSES.includes(course) && <option value={course}>{course}</option>}
                    </select>
                  </Field>
                  <Field label="Year">
                    <select style={inputStyle} value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                      <option value="">Select year…</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </Field>
                </>
              )}

              <Field label="Date joined">
                <input style={readOnlyStyle} value={joined} readOnly />
              </Field>

              {isStudent && (
                <>
                  <Message msg={infoMsg} />
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveInfo}
                    disabled={savingInfo}
                    style={{ width: "100%", justifyContent: "center", marginBottom: 6 }}
                  >
                    {savingInfo ? "Saving…" : "Save changes"}
                  </button>
                </>
              )}

              {/* Change password */}
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.10)", marginTop: 16, paddingTop: 16 }}>
                {!showPw ? (
                  <>
                    <Message msg={pwMsg} />
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowPw(true)}
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Change password
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ ...labelStyle, marginBottom: 10 }}>Change password</div>
                    <input
                      type="password"
                      placeholder="Current password"
                      autoComplete="current-password"
                      style={{ ...inputStyle, marginBottom: 8 }}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="New password (min. 8 characters)"
                      autoComplete="new-password"
                      style={{ ...inputStyle, marginBottom: 8 }}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      style={{ ...inputStyle, marginBottom: 10 }}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                    />
                    <Message msg={pwMsg} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleChangePassword}
                        disabled={savingPw}
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        {savingPw ? "Updating…" : "Update password"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setShowPw(false);
                          setPwMsg(null);
                          setCurrentPw("");
                          setNewPw("");
                          setConfirmPw("");
                        }}
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}