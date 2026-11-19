import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const Auth = createContext<{
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
}>({ session: null, loading: true, recovery: false, finishRecovery: () => {} });
export const useAuth = () => useContext(Auth);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event, value) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(value);
      setLoading(false);
    }).data.subscription;
    return () => subscription?.unsubscribe();
  }, []);
  return (
    <Auth.Provider
      value={{
        session,
        loading,
        recovery,
        finishRecovery: () => setRecovery(false),
      }}
    >
      {children}
    </Auth.Provider>
  );
}
export function ProtectedRoute() {
  const { session, loading, recovery } = useAuth();
  if (loading) return <p role="status">Loading session…</p>;
  if (recovery) return <Navigate replace to="/reset-password" />;
  return session ? <Outlet /> : <Navigate replace to="/signin" />;
}
