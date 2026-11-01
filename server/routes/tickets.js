import { Router } from "express";
import { requireRole } from "../middleware/auth.js";
import { classifyWithML } from "../services/ml.js";

const router = Router();

const formatTicketCode = (id) => `TCK-${String(id).padStart(4, "0")}`;

// POST /api/tickets  { concern_text }
// Ticket routing pipeline: classify -> resolve office -> insert ticket -> write routing log
router.post("/", requireRole("student"), async (req, res, next) => {
  try {
    const concernText = String(req.body?.concern_text ?? "").trim();
    if (!concernText) return res.status(400).json({ error: "concern_text is required" });
    if (concernText.length > 5000) return res.status(400).json({ error: "concern_text is too long" });

    // 1. Classify (null when the ML service is down -> ticket is saved unassigned)
    const classification = await classifyWithML(concernText);

    // 2. Resolve the predicted office against the offices table
    const { data: offices, error: officesError } = await req.supabase
      .from("offices")
      .select("office_id, office_name");
    if (officesError) throw officesError;

    const norm = (s) => s?.trim().toLowerCase();
    let assignedOfficeId = null;
    let assignedOfficeName = classification?.office ?? null;

    const byId = offices.find((o) => o.office_id === classification?.officeId);
    if (byId) {
      assignedOfficeId = byId.office_id;
      assignedOfficeName = byId.office_name;
    } else {
      for (const name of [classification?.office, ...(classification?.labels || [])].filter(Boolean)) {
        const match = offices.find((o) => norm(o.office_name) === norm(name));
        if (match) {
          assignedOfficeId = match.office_id;
          assignedOfficeName = match.office_name;
          break;
        }
      }
    }

    const validIds = new Set(offices.map((o) => o.office_id));
    const predictedOffices = (classification?.predictedOfficeIds || []).filter((id) => validIds.has(id));

    // 3. Insert the ticket (RLS: tickets_insert_own)
    const { data: ticket, error: insertError } = await req.supabase
      .from("tickets")
      .insert({
        user_id: req.user.id,
        concern_text: concernText,
        assigned_office: assignedOfficeId,
        priority: classification?.priority || "medium",
        classification_confidence: classification?.confidence ?? null,
        predicted_offices: predictedOffices,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // 4. Routing log (non-fatal)
    if (assignedOfficeId) {
      const { error: logError } = await req.supabase.from("logs").insert({
        ticket_id: ticket.ticket_id,
        office_id: assignedOfficeId,
        action: `ML routed ${formatTicketCode(ticket.ticket_id)} to ${assignedOfficeName} (${classification.confidence}% confidence)`,
        module: "ML Routing",
      });
      if (logError) console.error("Routing log failed:", logError.message);
    }

    res.status(201).json({
      ticket,
      routing: classification
        ? { office: assignedOfficeName, confidence: classification.confidence, routed: Boolean(assignedOfficeId) }
        : { office: null, confidence: null, routed: false },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/classify  { text }  -> preview classification without saving
router.post("/classify", async (req, res) => {
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "text is required" });
  const result = await classifyWithML(text);
  if (!result) return res.status(502).json({ error: "Classification service unavailable" });
  res.json(result);
});

export default router;