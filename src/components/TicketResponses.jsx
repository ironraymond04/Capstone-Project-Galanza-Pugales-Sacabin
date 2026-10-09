import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function TicketResponses({ ticket }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ticket?.ticket_id || !ticket?.user_id) return;
    let cancelled = false;

    async function loadResponses() {
      setLoading(true);
      setError(false);
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("message, created_at")
        .eq("user_id", ticket.user_id)
        .eq("ticket_id", ticket.ticket_id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (queryError) {
        console.error("load ticket responses error:", queryError);
        setError(true);
        setResponses([]);
      } else {
        setResponses((data || []).filter((entry) =>
          entry.message && !entry.message.startsWith("Feedback submitted for ")
        ));
      }
      setLoading(false);
    }

    loadResponses();
    return () => { cancelled = true; };
  }, [ticket?.ticket_id, ticket?.user_id]);

  return (
    <section className="ticket-staff-responses" aria-live="polite">
      <h3>Staff &amp; Faculty Response</h3>
      {loading ? (
        <p className="ticket-staff-response-empty">Loading responses...</p>
      ) : error ? (
        <p className="ticket-staff-response-empty">Responses could not be loaded.</p>
      ) : responses.length === 0 ? (
        <p className="ticket-staff-response-empty">No response yet.</p>
      ) : (
        <div className="ticket-staff-response-list">
          {responses.map((entry, index) => {
            const message = entry.message.replace(/^New staff response on TCK-\d+:\s*/i, "");
            return (
              <div className="ticket-staff-response" key={`${entry.created_at}-${index}`}>
                <p>{message}</p>
                <time>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</time>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}