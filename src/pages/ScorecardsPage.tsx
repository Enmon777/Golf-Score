import { useState } from "react";
import { Link } from "react-router-dom";
import { useTournament } from "./TournamentDashboard";
import { relativeLabel, summarize } from "../scanner/scoreValidator";
export function ScorecardsPage() {
  const { cards, uploads, players, rounds } = useTournament();
  const [roundId, setRoundId] = useState("");
  const visibleCards = roundId
    ? cards.filter((card) => card.round_id === roundId)
    : cards;
  return (
    <>
      <h1>Scorecards</h1>
      <div className="actions">
        <Link className="button" to="../scan">
          Scan scorecard
        </Link>
        <Link className="button secondary" to="../manual">
          Manual entry
        </Link>
      </div>
      <section className="tile">
        <h2>Uploaded scorecards</h2>
        {uploads.length === 0 && <p>No scorecard images uploaded.</p>}
        {uploads.map((upload) => (
          <p key={upload.id}>
            {rounds.find((round) => round.id === upload.round_id)?.name} ·{" "}
            {upload.scan_status} ·{" "}
            <Link className="underline" to={"../verify/" + upload.id}>
              {upload.scan_status === "pending"
                ? "Verify scores"
                : "View original"}
            </Link>
          </p>
        ))}
      </section>
      <section className="tile">
        <h2>Approved scores</h2>
        <div className="actions">
          <Link className="button secondary" to="../leaderboard">
            Leaderboard
          </Link>
          <Link className="button secondary" to="../analytics">
            Scoring analytics
          </Link>
        </div>
        <label>
          Scoring round
          <select
            value={roundId}
            onChange={(event) => setRoundId(event.target.value)}
          >
            <option value="">All rounds</option>
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.name}
              </option>
            ))}
          </select>
        </label>
        {visibleCards.length === 0 ? (
          <p>
            {roundId
              ? "No approved scorecards for this round."
              : "No approved scorecards."}
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Round</th>
                  <th>Front nine</th>
                  <th>Back nine</th>
                  <th>Strokes</th>
                  <th>To par</th>
                  <th>Revision</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => {
                  const holes = [...card.hole_scores].sort(
                    (a, b) => a.hole_number - b.hole_number,
                  );
                  const totals = summarize(
                    holes.map((hole) => hole.strokes),
                    holes.map((hole) => hole.par),
                  );
                  return (
                    <tr key={card.id}>
                      <td>
                        {
                          players.find((p) => p.id === card.player_id)
                            ?.full_name
                        }
                      </td>
                      <td>
                        {rounds.find((r) => r.id === card.round_id)?.name}
                      </td>
                      <td>{totals.front ?? "—"}</td>
                      <td>{totals.back ?? "—"}</td>
                      <td>{card.total_strokes}</td>
                      <td>{relativeLabel(card.relative_to_par)}</td>
                      <td>{card.revision}</td>
                      <td>
                        <Link
                          className="button secondary"
                          to={
                            "../manual?round=" +
                            card.round_id +
                            "&player=" +
                            card.player_id
                          }
                        >
                          Revise
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
