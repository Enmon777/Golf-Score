import { useState } from "react";
import { Link } from "react-router-dom";
import { database, errorMessage } from "../lib/supabase";
import { unwrap } from "../services/tournamentService";
import { useAuth } from "../components/auth/Session";
import { useResource } from "../hooks/useResource";
import { Editor, Field, labelState, text } from "../components/ui/Editor";
async function list(id: string) {
  const db = database();
  const results = await Promise.all([
    db
      .from("tournaments")
      .select("*,teams(count),players(count)")
      .eq("owner_id", id)
      .order("start_date"),
    db
      .from("tournament_rounds")
      .select("id,tournament_id,name,start_time")
      .eq("status", "scheduled")
      .gte("start_time", new Date().toISOString())
      .order("start_time")
      .limit(8),
    db
      .from("scorecard_uploads")
      .select("id,tournament_id,created_at,scan_status")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("scorecards")
      .select("id,tournament_id,total_strokes,approved_at")
      .order("approved_at", { ascending: false })
      .limit(8),
    db.from("profiles").select("full_name").eq("id", id).maybeSingle(),
  ]);
  return {
    tournaments: unwrap(results[0]) ?? [],
    rounds: unwrap(results[1]) ?? [],
    uploads: unwrap(results[2]) ?? [],
    cards: unwrap(results[3]) ?? [],
    profile: unwrap(results[4]),
  };
}
export function AdminDashboard() {
  const { session } = useAuth();
  const { data, error, reload } = useResource(session?.user.id ?? "", list);
  const [signOutError, setSignOutError] = useState("");
  return (
    <main className="panel">
      <div className="toolbar">
        <h1>My tournaments</h1>
        <div className="actions">
          <Link className="button" to="/dashboard/tournaments/new">
            Create tournament
          </Link>
          <button
            className="secondary"
            onClick={async () => {
              try {
                unwrap(
                  (await database().auth.signOut()) as {
                    data: undefined;
                    error: unknown;
                  },
                );
              } catch (error) {
                setSignOutError(errorMessage(error));
              }
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {signOutError && <p role="alert">{signOutError}</p>}
      {error && (
        <p role="alert">
          {error} <button onClick={reload}>Retry</button>
        </p>
      )}
      {!data && !error && <p role="status">Loading tournaments…</p>}
      {data && (
        <>
          <div className="cards">
            {data.tournaments.map((t) => (
              <Link
                className="tile"
                key={t.id}
                to={"/dashboard/tournaments/" + t.id}
              >
                <h2>{t.name}</h2>
                <p>
                  {t.tournament_code} · {labelState(t.status)}
                </p>
                <p>
                  {t.start_date} to {t.end_date}
                </p>
                <p>
                  {t.teams[0]?.count ?? 0} teams ? {t.players[0]?.count ?? 0}{" "}
                  players
                </p>
              </Link>
            ))}
          </div>
          {data.tournaments.length === 0 && (
            <p>
              Create a tournament to start scheduling rounds and recording
              scores.
            </p>
          )}
          <div className="cards">
            <section className="tile">
              <h2>Upcoming rounds</h2>
              {data.rounds.length === 0 && <p>No upcoming rounds.</p>}
              {data.rounds.map((r) => (
                <p key={r.id}>
                  <Link
                    to={
                      "/dashboard/tournaments/" + r.tournament_id + "/calendar"
                    }
                  >
                    {r.name} · {new Date(r.start_time).toLocaleDateString()}
                  </Link>
                </p>
              ))}
            </section>
            <section className="tile">
              <h2>Recent scorecards</h2>
              {data.cards.length === 0 && <p>No approved scores.</p>}
              {data.cards.map((c) => (
                <p key={c.id}>
                  <Link
                    to={
                      "/dashboard/tournaments/" +
                      c.tournament_id +
                      "/scorecards"
                    }
                  >
                    {c.total_strokes} strokes ?{" "}
                    {new Date(c.approved_at).toLocaleDateString()}
                  </Link>
                </p>
              ))}
            </section>
            <section className="tile">
              <h2>Pending scorecard verification</h2>
              {!data.uploads.some((u) => u.scan_status === "pending") && (
                <p>No recent scans awaiting review.</p>
              )}
              {data.uploads
                .filter((u) => u.scan_status === "pending")
                .map((u) => (
                  <p key={u.id}>
                    <Link
                      to={
                        "/dashboard/tournaments/" +
                        u.tournament_id +
                        "/verify/" +
                        u.id
                      }
                    >
                      Review scan from{" "}
                      {new Date(u.created_at).toLocaleDateString()}
                    </Link>
                  </p>
                ))}
            </section>
            <section className="tile">
              <h2>Tournament performance</h2>
              {data.tournaments.map((t) => (
                <p key={t.id}>
                  <Link to={"/dashboard/tournaments/" + t.id + "/analytics"}>
                    {t.name}
                  </Link>
                </p>
              ))}
            </section>
          </div>
          <section className="tile">
            <h2>Account settings</h2>
            <p>{session?.user.email}</p>
            <Editor
              save={async (form) => {
                unwrap(
                  await database()
                    .from("profiles")
                    .update({ full_name: text(form, "name") })
                    .eq("id", session!.user.id)
                    .select("id")
                    .single(),
                );
                reload();
              }}
            >
              <Field
                label="Full name"
                name="name"
                required
                value={data.profile?.full_name}
              />
            </Editor>
          </section>
        </>
      )}
    </main>
  );
}
