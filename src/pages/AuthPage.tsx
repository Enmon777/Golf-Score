import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { database, errorMessage } from "../lib/supabase";
import { useAuth } from "../components/auth/Session";

const titles = {
  signup: "Create an account",
  signin: "Sign in",
  forgot: "Reset your password",
  reset: "Set a new password",
};
export function AuthPage({ mode }: { mode: keyof typeof titles }) {
  const { session, loading, recovery, finishRecovery } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (recovery && mode !== "reset")
    return <Navigate replace to="/reset-password" />;
  if (session && (mode === "signup" || mode === "signin"))
    return <Navigate replace to="/dashboard" />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("name") ?? "").trim();
    setError("");
    setNotice("");
    if (mode === "signup" && !fullName) {
      setError("Enter your full name.");
      return;
    }
    if (
      (mode === "signup" || mode === "reset") &&
      password !== form.get("confirm")
    ) {
      setError("Passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const auth = database().auth;
      if (mode === "signup") {
        const result = await auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: location.origin + "/signin",
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) navigate("/dashboard");
        else setNotice("Check your email for a confirmation link.");
      } else if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else if (mode === "forgot") {
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + "/reset-password",
        });
        if (error) throw error;
        setNotice(
          "If an account exists for that address, you will receive a reset link.",
        );
      } else {
        if (!session || !recovery)
          throw new Error("Request a new password reset link.");
        const { error } = await auth.updateUser({ password });
        if (error) throw error;
        finishRecovery();
        navigate("/dashboard");
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel narrow">
      <Link to="/">Fairway</Link>
      <h1>{titles[mode]}</h1>
      {mode === "reset" && !loading && !recovery ? (
        <Link to="/forgot-password">Request a new reset link</Link>
      ) : (
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Full name
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Email address
              <input name="email" type="email" required autoComplete="email" />
            </label>
          )}
          {mode !== "forgot" && (
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={mode === "signin" ? undefined : 8}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
              />
            </label>
          )}
          {(mode === "signup" || mode === "reset") && (
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button disabled={busy || loading}>
            {busy ? "Please wait…" : titles[mode]}
          </button>
        </form>
      )}
      {mode === "signin" && (
        <p>
          <Link to="/forgot-password">Forgot your password?</Link> ·{" "}
          <Link to="/signup">Sign up</Link>
        </p>
      )}
      {mode === "signup" && (
        <p>
          <Link to="/signin">Already have an account?</Link>
        </p>
      )}
    </section>
  );
}
