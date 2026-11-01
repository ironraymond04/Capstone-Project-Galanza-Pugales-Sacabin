import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../middleware/auth.js";
import { generateConcernText, generateTicketReport, suggestTransferOffice } from "../services/gemini.js";

const router = Router();

// Gemini calls cost money, so cap them per user
router.use(
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
  })
);

router.post("/concern-text", requireRole("student"), async (req, res, next) => {
  try {
    const text = await generateConcernText(req.body?.text);
    if (!text) return res.status(502).json({ error: "AI couldn't generate text right now" });
    res.json({ text });
  } catch (err) {
    next(err);
  }
});

router.post("/report", requireRole("admin"), async (req, res, next) => {
  try {
    const { stats, tickets } = req.body ?? {};
    if (!stats || !Array.isArray(tickets)) return res.status(400).json({ error: "stats and tickets are required" });
    res.json(await generateTicketReport({ stats, tickets }));
  } catch (err) {
    next(err);
  }
});

router.post("/transfer-suggestion", requireRole("admin"), async (req, res, next) => {
  try {
    const { concernText, transferReason, currentOffice } = req.body ?? {};
    if (!concernText) return res.status(400).json({ error: "concernText is required" });
    const suggestion = await suggestTransferOffice({ concernText, transferReason, currentOffice });
    res.json({ suggestion }); // suggestion is null when the AI has no usable answer
  } catch (err) {
    next(err);
  }
});

export default router;