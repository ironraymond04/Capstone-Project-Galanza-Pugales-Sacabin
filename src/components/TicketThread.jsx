import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TicketThread({
  ticket,
  currentUserId,
  role = "student",
  officeId = null,
  allowReply = false,
  profileName = "You",
  onReplySent,
}) {
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadThread() {
    if (!ticket?.ticket_id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("*, profiles:profiles!logs_user_id_fkey(name)")
      .eq("ticket_id", ticket.ticket_id)
      .order("created_at", { ascending: true });

    if (!error) {
      const filtered = (data || []).filter((entry) => {
        const keyword = (entry.action || "") + " " + (entry.description || "");
        if (entry.module === "Ticket Reply" || entry.module === "Staff Response") return true;
        return /reply|follow[- ]?up|replied|responded/i.test(keyword);
      });
      setMessages(filtered);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.ticket_id]);

  async function handleSendReply() {
    const trimmed = replyText.trim();
    if (!trimmed || !ticket?.ticket_id || !currentUserId) return;

    setSending(true);

    const actionText =
      role === "student"
        ? "Student reply"
        : role === "staff"
          ? "Staff follow-up"
          : "Admin follow-up";

    const { error } = await supabase.from("logs").insert({
      user_id: currentUserId,
      office_id: role === "staff" ? officeId : null,
      ticket_id: ticket.ticket_id,
      module: "Ticket Reply",
      action: actionText,
      description: trimmed,
    });

    if (!error) {
      setReplyText("");
      await loadThread();
      onReplySent?.();
    }

    setSending(false);
  }

  return (
    <div
      style={{
        marginTop: 20,
        borderTop: "1px solid var(--line)",
        paddingTop: 16,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Conversation thread</div>

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>Loading conversation...</p>
      ) : messages.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
          No replies yet. Start the conversation below if more details are needed.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {messages.map((entry) => {
            const isMine = entry.user_id === currentUserId;
            const text = entry.description || entry.action || "No details provided.";
            const author = isMine ? profileName : entry.profiles?.name || "Support";

            return (
              <div
                key={entry.log_id || `${entry.ticket_id}-${entry.created_at}-${entry.action}`}
                style={{
                  display: "flex",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    background: isMine ? "var(--maroon-700)" : "#f5f3f4",
                    color: isMine ? "#fff" : "var(--ink)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      marginBottom: 4,
                      opacity: isMine ? 0.9 : 0.7,
                    }}
                  >
                    {author}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{text}</div>
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 6,
                      opacity: isMine ? 0.85 : 0.7,
                    }}
                  >
                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : "Just now"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allowReply && (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Reply</label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Ask for more details, clarify the issue, or update the student..."
            style={{
              width: "100%",
              resize: "vertical",
              boxSizing: "border-box",
              border: "1.5px solid var(--line)",
              borderRadius: 8,
              padding: "10px 12px",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--primary, #6b1d2c)",
                color: "#fff",
                cursor: replyText.trim() && !sending ? "pointer" : "not-allowed",
                opacity: !replyText.trim() || sending ? 0.6 : 1,
              }}
            >
              {sending ? "Sending..." : "Send reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
