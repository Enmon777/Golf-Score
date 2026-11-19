import { Link, useSearchParams } from "react-router-dom";
import { ScoreEditor, blankRow } from "../components/scorecards/ScoreEditor";
import { useTournament } from "./TournamentDashboard";
export function ManualScorePage() {
  const { rounds, courses, cards } = useTournament();
  const [params, setParams] = useSearchParams();
  const activeRounds = rounds.filter((r) => r.status !== "cancelled");
  const round = activeRounds.find((r) => r.id === params.get("round"));
  const course = courses.find((c) => c.id === round?.course_id);
  const playerId = params.get("player") ?? "";
  const card = cards.find(
    (c) => c.round_id === round?.id && c.player_id === playerId,
  );
  return (
    <>
      <h1>Manual score entry</h1>
      {activeRounds.length === 0 ? (
        <p>
          <Link to="../calendar">Schedule a round first</Link>
        </p>
      ) : (
        <label>
          Round
          <select
            value={round?.id ?? ""}
            onChange={(event) =>
              setParams(event.target.value ? { round: event.target.value } : {})
            }
          >
            <option value="">Select round</option>
            {activeRounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {round && course && (
        <ManualEditor
          key={round.id + playerId}
          roundId={round.id}
          course={course}
          playerId={playerId}
          card={card}
        />
      )}
    </>
  );
}
function ManualEditor({
  roundId,
  course,
  playerId,
  card,
}: {
  roundId: string;
  course: Parameters<typeof ScoreEditor>[0]["course"];
  playerId: string;
  card: ReturnType<typeof useTournament>["cards"][number] | undefined;
}) {
  return (
    <ScoreEditor
      roundId={roundId}
      course={course}
      initialRows={[
        {
          ...blankRow(course.number_of_holes),
          playerId,
          revision: card?.revision ?? 0,
          values: Array.from(
            { length: course.number_of_holes },
            (_, i) =>
              card?.hole_scores.find((h) => h.hole_number === i + 1)?.strokes ??
              null,
          ),
        },
      ]}
    />
  );
}
