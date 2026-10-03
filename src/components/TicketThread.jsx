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
  const [sendError, setSendError] = useState("");

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

    setSendError("");
    setSending(true);

    const actionText =
      role === "student"
        ? "Student reply"
        : role === "staff"
          ? "Staff follow-up"
          : "Admin follow-up";

    const { error } = await supabase.from("logs").insert({
      user_id: currentUserId,
      office_id: role === "staff" ? officeId : role === "student" ? ticket.assigned_office || null : null,
      ticket_id: ticket.ticket_id,
      module: "Ticket Reply",
      action: actionText,
      description: trimmed,
    });

    if (error) {
      console.error("send ticket reply error:", error);
      setSendError("Your reply could not be sent. Please try again.");
      setSending(false);
      return;
    }

    if (role !== "student" && ticket.user_id) {
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        ticket_id: ticket.ticket_id,
        message: `New staff response on TCK-${String(ticket.ticket_id).padStart(4, "0")}: ${trimmed}`,
      });
      if (notificationError) {
        console.error("send ticket reply notification error:", notificationError);
        setSendError("Your reply was sent, but the student could not be notified.");
      }
    }

    setReplyText("");
    await loadThread();
    onReplySent?.();
    setSending(false);
  }

  return (
    <div className="ticket-thread">
      <div className="ticket-thread-title">Conversation thread</div>

      {loading ? (
        <p className="ticket-thread-empty">Loading conversation...</p>
      ) : messages.length === 0 ? (
        <p className="ticket-thread-empty">
          No replies yet. Start the conversation below if more details are needed.
        </p>
      ) : (
        <div className="ticket-thread-messages">
          {messages.map((entry) => {
            const isMine = entry.user_id === currentUserId;
            const text = entry.description || entry.action || "No details provided.";
            const author = isMine ? profileName : entry.profiles?.name || "Support";

            return (
              <div
                key={entry.log_id || `${entry.ticket_id}-${entry.created_at}-${entry.action}`}
                className={`ticket-thread-message ${isMine ? "is-mine" : ""}`}
              >
                <div
                  className={`ticket-thread-bubble ${isMine ? "is-mine" : ""}`}
                >
                  <div className="ticket-thread-author">
                    {author}
                  </div>
                  <div className="ticket-thread-text">{text}</div>
                  <div className="ticket-thread-time">
                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : "Just now"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sendError && <p role="alert" className="ticket-thread-empty">{sendError}</p>}

      {allowReply && (
        <div className="ticket-thread-reply">
          <label style={{ fontSize: 13, fontWeight: 600 }}>Reply</label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Ask for more details, clarify the issue, or update the student..."
            className="ticket-thread-reply-input"
          />
          <div className="ticket-thread-reply-actions">
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
              className="ticket-thread-send"
            >
              {sending ? "Sending..." : "Send reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
