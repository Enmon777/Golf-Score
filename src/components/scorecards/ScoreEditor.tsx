import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Editor, text } from "../ui/Editor";
import { useTournament } from "../../pages/TournamentDashboard";
import { approveScores } from "../../services/scorecardService";
import {
  relativeLabel,
  summarize,
  validStroke,
} from "../../scanner/scoreValidator";
import type { Course } from "../../types/golf";
export type DraftRow = {
  id: string;
  playerId: string;
  name: string;
  values: (number | null)[];
  uncertain?: boolean[];
  revision?: number;
};
export function blankRow(holes: number): DraftRow {
  return {
    id: crypto.randomUUID(),
    playerId: "",
    name: "",
    values: Array<number | null>(holes).fill(null),
  };
}
export function ScoreEditor({
  roundId,
  course,
  uploadId = null,
  initialRows,
  multiple = false,
  cancel,
}: {
  roundId: string;
  course: Course;
  uploadId?: string | null;
  initialRows: DraftRow[];
  multiple?: boolean;
  cancel?: () => Promise<void>;
}) {
  const { tournament, players, cards, reload } = useTournament();
  const navigate = useNavigate();
  const [rows, setRows] = useState(initialRows);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const request = useRef<{ id: string; payload: string } | null>(null);
  const pars = Array.from(
    { length: course.number_of_holes },
    (_, index) =>
      course.course_holes.find((h) => h.hole_number === index + 1)?.par ?? null,
  );
  const scores = new Map(
    cards
      .filter((card) => card.round_id === roundId)
      .map((card) => [card.player_id, card]),
  );
  function edit(id: string, change: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...change } : row)),
    );
  }
  return (
    <Editor
      submitLabel={confirmCancel ? "Confirm cancellation" : "Confirm and save"}
      save={async (form) => {
        if (confirmCancel) {
          if (!cancel) return;
          await cancel();
          reload();
          navigate("../scorecards");
          return;
        }
        const ids = rows.map((row) => row.playerId);
        if (ids.some((id) => !id) || ids.length !== new Set(ids).size)
          throw new Error("Confirm a different player for each row.");
        const payload = rows.map((row) => {
          if (
            row.values.length !== course.number_of_holes ||
            !row.values.every(validStroke)
          )
            throw new Error(
              "Enter whole strokes from 1 through 30 for each hole.",
            );
          const revision = row.revision ?? 0;
          const reason = text(form, "reason-" + row.id);
          if (revision && (!form.get("replace-" + row.id) || !reason))
            throw new Error("Confirm each revision and enter a reason.");
          return {
            player_id: row.playerId,
            strokes: row.values.map(Number),
            expected_revision: revision,
            reason: reason || null,
          };
        });
        if (!form.get("verified"))
          throw new Error(
            "Confirm that you reviewed all player identities and strokes.",
          );
        const key = JSON.stringify(payload);
        if (request.current?.payload !== key)
          request.current = { id: crypto.randomUUID(), payload: key };
        await approveScores(
          tournament.id,
          roundId,
          request.current.id,
          uploadId,
          payload,
        );
        reload();
        navigate("../scorecards");
      }}
    >
      {rows.map((row, index) => {
        const totals = summarize(row.values, pars);
        return (
          <section className="tile" key={row.id}>
            <h2>
              Player {index + 1}
              {row.name ? " · " + row.name : ""}
            </h2>
            <label>
              Player
              <select
                required={!confirmCancel}
                value={row.playerId}
                onChange={(event) => {
                  const selected = event.target.value;
                  const card = scores.get(selected);
                  edit(row.id, {
                    playerId: selected,
                    revision: card?.revision ?? 0,
                    ...(!multiple
                      ? {
                          values: pars.map(
                            (_, i) =>
                              card?.hole_scores.find(
                                (h) => h.hole_number === i + 1,
                              )?.strokes ?? null,
                          ),
                        }
                      : {}),
                  });
                }}
              >
                <option value="">Select player</option>
                {players
                  .filter(
                    (player) =>
                      player.status === "active" || scores.has(player.id),
                  )
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.full_name}
                      {player.status === "inactive" ? " (inactive)" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <div className="hole-grid">
              {row.values.map((value, i) => (
                <label
                  key={i}
                  className={row.uncertain?.[i] ? "uncertain" : undefined}
                >
                  Hole {i + 1}
                  {pars[i] !== null && <small>Par {pars[i]}</small>}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    required={!confirmCancel}
                    value={value ?? ""}
                    onChange={(event) =>
                      edit(row.id, {
                        values: row.values.map((stroke, j) =>
                          j === i
                            ? event.target.value === ""
                              ? null
                              : Number(event.target.value)
                            : stroke,
                        ),
                        uncertain: row.uncertain?.map((flag, j) =>
                          j === i ? false : flag,
                        ),
                      })
                    }
                  />
                  {row.uncertain?.[i] && <small>Review</small>}
                </label>
              ))}
            </div>
            <p>
              Front {totals.front ?? "—"}
              {course.number_of_holes === 18 && (
                <> · Back {totals.back ?? "—"}</>
              )}{" "}
              ? Total {totals.total ?? "—"} ? To par{" "}
              {relativeLabel(totals.relative)}
            </p>
            {!!row.revision && (
              <div className="revision" key={row.playerId}>
                <p>
                  Approved revision {row.revision} already exists for this
                  round.
                </p>
                <label>
                  Reason for revision
                  <input
                    name={"reason-" + row.id}
                    maxLength={500}
                    required={!confirmCancel}
                  />
                </label>
                <label className="checkbox">
                  <input
                    name={"replace-" + row.id}
                    type="checkbox"
                    required={!confirmCancel}
                  />{" "}
                  Replace these approved scores
                </label>
              </div>
            )}
            {multiple && rows.length > 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setRows((current) => current.filter((r) => r.id !== row.id))
                }
              >
                Remove row
              </button>
            )}
          </section>
        );
      })}
      {multiple && rows.length < 30 && (
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setRows((current) => [...current, blankRow(course.number_of_holes)])
          }
        >
          Add player row
        </button>
      )}
      <label className="checkbox">
        <input name="verified" type="checkbox" required={!confirmCancel} /> I
        verified every player and hole score for this round.
      </label>
      {cancel ? (
        <button
          type="button"
          className="secondary"
          onClick={() => setConfirmCancel((value) => !value)}
        >
          {confirmCancel ? "Continue reviewing" : "Cancel verification"}
        </button>
      ) : (
        <Link to="../scorecards">Cancel</Link>
      )}
      {confirmCancel && (
        <p role="status">
          Confirm cancellation to close the review. The original will remain in
          the scorecard history.
        </p>
      )}
    </Editor>
  );
}
