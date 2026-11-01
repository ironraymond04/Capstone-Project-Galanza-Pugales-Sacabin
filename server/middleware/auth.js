import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Verifies the Supabase access token sent by the React app and attaches:
 *   req.user      - the Supabase auth user
 *   req.profile   - the row from public.profiles (role, office_id, is_active)
 *   req.supabase  - a Supabase client acting AS the user, so RLS still applies
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing access token" });

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: "Invalid or expired token" });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, role, office_id, is_active")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) return res.status(403).json({ error: "Profile not found" });
  if (profile.is_active === false) return res.status(403).json({ error: "Account suspended" });

  req.user = data.user;
  req.profile = profile;
  req.supabase = supabase;
  next();
}

export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.profile?.role)
      ? next()
      : res.status(403).json({ error: "You do not have access to this resource" });