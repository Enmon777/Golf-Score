import { Flag } from "lucide-react";
import { Link, NavLink, useParams } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import {
  publicTournament,
  type PublicData,
} from "../services/leaderboardService";
import { Schedule } from "./CalendarPage";
import { Standings } from "../components/leaderboard/Standings";
import { relativeLabel } from "../scanner/scoreValidator";
import { Analytics, useResultsUpdates } from "./Reports";
async function load(code: string) {
  const data = await publicTournament(code);
  if (!data) throw new Error("Tournament code is invalid or has expired.");
  return data;
}
const pages = [
  ["", "Overview"],
  ["teams", "Teams and players"],
  ["calendar", "Calendar"],
  ["leaderboard", "Leaderboard"],
  ["results", "Round scores"],
  ["analytics", "Analytics"],
];
export function PublicTournamentPage() {
  const { code = "", section = "" } = useParams();
  const normalized = code.toUpperCase();
  const { data, error, reload } = useResource(normalized, load);
  useResultsUpdates(normalized, Boolean(data), reload);
  if (!pages.some(([path]) => path === section))
    return (
      <main className="panel">
        <h1>Page unavailable</h1>
        <Link to={"/t/" + normalized}>Tournament overview</Link>
      </main>
    );
  if (error || !data)
    return (
      <main className="panel narrow">
        <h1>{error ? "Unable to load tournament" : "Tournament access"}</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Checking tournament code…"}
        </p>
        {error && <button onClick={reload}>Retry</button>}
        <p>
          <Link to="/tournament-access">Enter another code</Link>
        </p>
      </main>
    );
  const { tournament: t } = data;
  const base = "/t/" + normalized;
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <Flag size={21} />
          Fairway
        </Link>
        <Link to="/tournament-access">Enter another code</Link>
      </header>
      <main className="panel">
        <h1>{t.name}</h1>
        <p>
          {t.start_date} to {t.end_date}
          {t.location ? " · " + t.location : ""}
        </p>
        <nav className="public-nav" aria-label="Spectator navigation">
          {pages.map(([path, name]) => (
            <NavLink
              end={!path}
              key={path}
              to={base + (path ? "/" + path : "")}
            >
              {name}
            </NavLink>
          ))}
        </nav>
        {section === "calendar" ? (
          <>
            <h2>Tournament schedule</h2>
            <Schedule
              tournament={t}
              rounds={data.rounds}
              courses={data.courses}
            />
          </>
        ) : section === "teams" ? (
          <PublicRoster data={data} />
        ) : section === "leaderboard" ? (
          <Standings report={data.report} />
        ) : section === "results" ? (
          <PublicResults data={data} />
        ) : section === "analytics" ? (
          <Analytics report={data.report} />
        ) : (
          <>
            <h2>Overview</h2>
            {t.description && <p>{t.description}</p>}
            <p>
              {data.teams.length} teams ? {data.players.length} players ?{" "}
              {data.rounds.length} rounds
            </p>
            <div className="actions">
              <Link className="button" to={base + "/leaderboard"}>
                View standings
              </Link>
              <Link className="button secondary" to={base + "/calendar"}>
                View schedule
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
function PublicRoster({ data }: { data: PublicData }) {
  return (
    <>
      <h2>Teams and players</h2>
      {!data.players.length && <p>No players registered.</p>}
      {[
        ...data.teams,
        { id: null, name: "Independent players", description: null },
      ].map((team) => (
        <section className="tile" key={team.id ?? "independent"}>
          <h3>{team.name}</h3>
          {team.description && <p>{team.description}</p>}
          {data.players
            .filter((p) => p.team_id === team.id)
            .map((p) => (
              <p key={p.id}>
                {p.full_name}
                {p.status === "inactive" ? " · Inactive" : ""}
              </p>
            ))}
        </section>
      ))}
    </>
  );
}
function PublicResults({ data }: { data: PublicData }) {
  return (
    <>
      <h2>Approved round scores</h2>
      {!data.cards.length && <p>No approved scores yet.</p>}
      {data.rounds
        .filter((r) => r.status !== "cancelled")
        .map((round) => (
          <section className="tile" key={round.id}>
            <h3>{round.name}</h3>
            {data.cards
              .filter((c) => c.round_id === round.id)
              .map((card) => (
                <details key={card.id}>
                  <summary>
                    {
                      data.players.find((p) => p.id === card.player_id)
                        ?.full_name
                    }{" "}
                    · {card.total_strokes} strokes ?{" "}
                    {relativeLabel(card.relative_to_par)}
                  </summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Hole</th>
                          {card.hole_scores.map((h) => (
                            <th key={h.hole_number}>{h.hole_number}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th>Strokes</th>
                          {card.hole_scores.map((h) => (
                            <td key={h.hole_number}>{h.strokes}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
          </section>
        ))}
    </>
  );
}
