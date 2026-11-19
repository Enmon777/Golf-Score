import { relativeLabel } from "../../scanner/scoreValidator";
import type { Report } from "../../services/leaderboardService";
export function Standings({ report }: { report: Report }) {
  return (
    <>
      <section className="tile">
        <h2>Individual standings</h2>
        {!report.individual.some((row) => row.rounds > 0) && (
          <p>No approved scores yet.</p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Position",
                  "Player",
                  "Team",
                  "Rounds completed",
                  "Strokes",
                  "To par",
                  "Status",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.individual.map((row) => (
                <tr key={row.id}>
                  <td>{row.position ?? "—"}</td>
                  <td>{row.full_name}</td>
                  <td>{row.team ?? "Independent"}</td>
                  <td>
                    {row.rounds} / {report.summary.scheduled_rounds}
                  </td>
                  <td>{row.strokes ?? "—"}</td>
                  <td>{relativeLabel(row.relative)}</td>
                  <td>
                    {row.complete
                      ? "Complete"
                      : row.rounds
                        ? "In progress"
                        : "Awaiting scores"}
                    {row.status === "inactive" ? " · Inactive" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="tile">
        <h2>Team standings</h2>
        {!report.teams.some((row) => row.rounds > 0) && (
          <p>No teams meet the counting-player requirement yet.</p>
        )}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Position",
                  "Team",
                  "Counting rounds",
                  "Counting scores",
                  "Strokes",
                  "To par",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.teams.map((row) => (
                <tr key={row.id}>
                  <td>{row.position ?? "—"}</td>
                  <td>{row.name}</td>
                  <td>{row.rounds}</td>
                  <td>{row.counting_players ?? "—"}</td>
                  <td>{row.strokes ?? "—"}</td>
                  <td>{relativeLabel(row.relative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
