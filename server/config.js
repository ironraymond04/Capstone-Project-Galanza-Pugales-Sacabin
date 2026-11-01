// Reuses the VITE_ values from the same .env so nothing has to be duplicated
const required = (name, fallback) => {
  const value = process.env[name] || (fallback && process.env[fallback]);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 3001,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: required("SUPABASE_URL", "VITE_SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
  mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS) || 10000,
};