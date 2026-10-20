import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSessionState = useCallback(() => {
    sessionStorage.removeItem("chd-admin-active-tab");
    sessionStorage.removeItem("chd-staff-active-tab");
    sessionStorage.removeItem("chd-student-active-tab");
    setSession(null);
    setProfile(null);
  }, []);

  const fetchProfile = useCallback(async (userId) => {
    let result = await supabase
      .from("profiles")
      .select("*, offices!profiles_office_id_fkey(office_name)")
      .eq("user_id", userId)
      .single();

    if (result.error) {
      console.error("fetchProfile failed:", result.error.message);
      // Fallback: retry without the office join so role-based routing
      // still works even if that join/RLS is broken for this account.
      result = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (result.error) {
        console.error("fetchProfile fallback also failed:", result.error.message);
        setLoading(false);
        return;
      }
    }

    // Suspended account: kill the session immediately
    if (result.data.is_active === false) {
      await supabase.auth.signOut();
      clearSessionState();
      setLoading(false);
      return;
    }

    setProfile(result.data);
    setLoading(false);
  }, [clearSessionState]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true); // key fix: block ProtectedRoute until profile is ready
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  // Instantly sign out the current user if an admin suspends them while they're logged in.
  // Requires Realtime to be enabled for the `profiles` table in Supabase
  // (Database > Replication, or: alter publication supabase_realtime add table profiles;)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (payload.new?.is_active === false) {
            await supabase.auth.signOut();
            clearSessionState();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, clearSessionState]);

  async function signOut() {
    await supabase.auth.signOut();
    clearSessionState();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);