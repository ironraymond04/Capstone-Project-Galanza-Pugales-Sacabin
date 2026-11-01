import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { mlHealth } from "./services/ml.js";
import ticketRoutes from "./routes/tickets.js";
import aiRoutes from "./routes/ai.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "1mb" }));

// Public
app.get("/api/health", async (_req, res) => {
  const ml = await mlHealth();
  res.json({ ok: true, ml: ml ? { ok: true, ...ml } : { ok: false } });
});

// Authenticated
app.use("/api/tickets", requireAuth, ticketRoutes);
app.use("/api/ai", requireAuth, aiRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler (Express recognizes it by its 4 arguments)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? "Internal server error" : err.message });
});

// Vercel runs the exported app as a serverless function; locally we start a listener.
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
}

export default app;