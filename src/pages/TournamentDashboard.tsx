import {
  Link,
  NavLink,
  Outlet,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { Logo } from "../components/ui/Logo";
import { getTournament } from "../services/tournamentService";
import type { TournamentData } from "../types/golf";
export const useTournament = () =>
  useOutletContext<
    TournamentData & { reload: () => void; loading?: boolean }
  >();
const navigation = [
  ["", "Overview"],
  ["teams", "Teams"],
  ["players", "Players"],
  ["courses", "Courses"],
  ["calendar", "Calendar"],
  ["scorecards", "Scorecards"],
  ["leaderboard", "Leaderboard"],
  ["analytics", "Analytics"],
  ["settings", "Settings"],
];
export function TournamentDashboard() {
  const { id = "" } = useParams();
  const { data, error, reload, loading } = useResource(id, getTournament);
  if (!data)
    return (
      <main className="panel">
        <Link to="/dashboard">My tournaments</Link>
        <p role={error ? "alert" : "status"}>
          {error || "Loading tournament…"}
        </p>
      </main>
    );
  return (
    <div className="workspace">
      <aside aria-label="Tournament navigation">
        <Link className="brand" to="/dashboard">
          Fairway
        </Link>
        <nav>
          {navigation.map(([path, name]) => (
            <NavLink key={path} end={!path} to={path || "."}>
              {name}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="workspace-main">
        <p className="context-name">
          {data.tournament.name} · {data.tournament.tournament_code}
        </p>
        {error && <p role="alert">{error}</p>}
        <Outlet context={{ ...data, reload, loading }} />
      </main>
    </div>
  );
}
export function TournamentOverview() {
  const { tournament, teams, players, rounds, cards } = useTournament();
  return (
    <>
      {tournament.logo_path && (
        <Logo path={tournament.logo_path} label={tournament.name + " logo"} />
      )}
      <h1>{tournament.name}</h1>
      <p>
        {tournament.start_date} to {tournament.end_date} ·{" "}
        {tournament.location || "Location pending"}
      </p>
      {tournament.description && <p>{tournament.description}</p>}
      <div className="cards">
        {[
          ["Teams", teams.length, "teams"],
          ["Players", players.length, "players"],
          ["Rounds", rounds.length, "calendar"],
          ["Approved scorecards", cards.length, "scorecards"],
        ].map(([title, count, to]) => (
          <Link className="tile" key={title} to={String(to)}>
            <h2>{title}</h2>
            <p className="metric">{count}</p>
          </Link>
        ))}
      </div>
      <div className="actions">
        <Link className="button" to="scan">
          Scan scorecard
        </Link>
        <Link className="button secondary" to="manual">
          Enter scores manually
        </Link>
      </div>
    </>
  );
}
