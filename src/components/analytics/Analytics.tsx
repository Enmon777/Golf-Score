import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Report } from "../../services/leaderboardService";
import { relativeLabel } from "../../scanner/scoreValidator";
export function Analytics({ report }: { report: Report }) {
  const [playerId, setPlayerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const summary = report.summary;
  const player =
    report.individual.find((p) => p.id === playerId) ?? report.individual[0];
  const team = report.teams.find((t) => t.id === teamId) ?? report.teams[0];
  const events = report.events.find((e) => e.player_id === player?.id);
  const holes = report.holes.filter((h) => h.player_id === player?.id);
  const progression = report.progression.filter(
    (p) => p.player_id === player?.id,
  );
  const teamRounds = report.team_rounds.filter((t) => t.team_id === team?.id);
  return (
    <>
      <div className="cards">
        {[
          ["Teams", summary.teams],
          ["Players", summary.players],
          ["Scheduled rounds", summary.scheduled_rounds],
          ["Completed rounds", summary.completed_rounds],
          ["Lowest score", summary.best],
          ["Highest score", summary.worst],
          ["Average score", summary.average],
        ].map(([name, value]) => (
          <div className="tile" key={name}>
            <h2>{name}</h2>
            <p className="metric">{value ?? "—"}</p>
          </div>
        ))}
      </div>
      <section className="tile">
        <h2>Score distribution</h2>
        {report.distribution.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="strokes" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="scorecards" fill="#174d35" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p>No approved scores to chart.</p>
        )}
      </section>
      <section className="tile">
        <h2>Player performance</h2>
        {player ? (
          <>
            <label>
              Player
              <select
                value={player.id}
                onChange={(e) => setPlayerId(e.target.value)}
              >
                {report.individual.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <dl className="stat-list">
              {Object.entries({
                "Completed rounds": player.rounds,
                "Total strokes": player.strokes,
                "To par": relativeLabel(player.relative),
                "Average round": player.average,
                "Best round": player.best,
                "Worst round": player.worst,
                "Eagles or better": events?.known_pars ? events.eagles : null,
                Birdies: events?.known_pars ? events.birdies : null,
                Pars: events?.known_pars ? events.pars : null,
                Bogeys: events?.known_pars ? events.bogeys : null,
                "Double bogeys": events?.known_pars
                  ? events.double_bogeys
                  : null,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <h3>Hole averages</h3>
            {holes.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={holes}>
                  <XAxis dataKey="hole_number" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#174d35" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No hole scores available.</p>
            )}
            <h3>Leaderboard progression by round</h3>
            {progression.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={progression}>
                  <XAxis dataKey="round_number" />
                  <YAxis reversed allowDecimals={false} />
                  <Tooltip />
                  <Line
                    dataKey="position"
                    name="Position"
                    stroke="#174d35"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No approved rounds available.</p>
            )}
          </>
        ) : (
          <p>No players registered.</p>
        )}
      </section>
      <section className="tile">
        <h2>Team performance</h2>
        {team ? (
          <>
            <label>
              Team
              <select
                value={team.id}
                onChange={(e) => setTeamId(e.target.value)}
              >
                {report.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <dl className="stat-list">
              {Object.entries({
                Rank: team.position,
                "Team strokes": team.strokes,
                "Best-performing player": team.best_player,
                "Average player round": team.average,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {teamRounds.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={teamRounds}>
                  <XAxis dataKey="round_number" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="strokes" fill="#174d35" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No counting rounds available.</p>
            )}
          </>
        ) : (
          <p>No teams registered.</p>
        )}
      </section>
    </>
  );
}
