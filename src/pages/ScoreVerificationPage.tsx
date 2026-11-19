import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ScoreEditor, blankRow } from "../components/scorecards/ScoreEditor";
import { useResource } from "../hooks/useResource";
import { originalImage } from "../services/scorecardService";
import { useTournament } from "./TournamentDashboard";
import type { ScanResult } from "../scanner/scanningTypes";
import { database } from "../lib/supabase";
import { unwrap } from "../services/tournamentService";
function ImageViewer({ path }: { path: string }) {
  const { data: url, error, reload } = useResource(path, originalImage);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);
  return (
    <section className="tile">
      <h2>Original scorecard</h2>
      {error ? (
        <p role="alert">
          {error} <button onClick={reload}>Retry</button>
        </p>
      ) : url ? (
        <>
          <div className="viewer">
            <img
              src={url}
              alt="Original uploaded scorecard"
              style={{
                width: zoom + "%",
                maxWidth: "none",
                transform: "rotate(" + rotation + "deg)",
              }}
            />
          </div>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              Rotate 90°
            </button>
            <button className="secondary" onClick={reload}>
              Refresh image link
            </button>
          </div>
          <label>
            Zoom ? {zoom}%
            <input
              type="range"
              min={50}
              max={300}
              step={10}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        </>
      ) : (
        <p role="status">Loading original scorecard…</p>
      )}
    </section>
  );
}
export function ScoreVerificationPage() {
  const { uploadId } = useParams();
  const { uploads, rounds, courses, tournament, players, loading } =
    useTournament();
  const upload = uploads.find((u) => u.id === uploadId);
  const round = rounds.find((r) => r.id === upload?.round_id);
  const course = courses.find((c) => c.id === round?.course_id);
  if (!upload && loading) return <p role="status">Loading scorecard review…</p>;
  if (!upload || !round || !course)
    return (
      <>
        <h1>Scorecard unavailable</h1>
        <Link to="../scorecards">Return to scorecards</Link>
      </>
    );
  const result = upload.scorecard_reviews?.extracted_data as
    Partial<ScanResult> | undefined;
  const rows = Array.isArray(result?.players)
    ? result.players.flatMap((player) => {
        if (!player || !Array.isArray(player.scores)) return [];
        const base = blankRow(course.number_of_holes);
        return [
          {
            ...base,
            name:
              typeof player.extractedName === "string"
                ? player.extractedName
                : "",
            playerId: "",
            values: base.values.map((_, i) => {
              const value = player.scores[i]?.strokes;
              return typeof value === "number" ? value : null;
            }),
            uncertain: base.values.map(
              (_, i) => player.scores[i]?.requiresReview !== false,
            ),
          },
        ];
      })
    : [];
  return (
    <>
      <h1>Scorecard verification</h1>
      <p>
        {round.name} · {course.name} · {course.number_of_holes} holes
      </p>
      <div className="management verification">
        <ImageViewer key={upload.id} path={upload.storage_path} />
        <section>
          {upload.scan_status !== "pending" || round.status === "cancelled" ? (
            <p>
              This scorecard is{" "}
              {upload.scan_status === "pending"
                ? "linked to a cancelled round"
                : upload.scan_status}
              .
            </p>
          ) : (
            <>
              {Array.isArray(result?.warnings) &&
                result.warnings
                  .filter((w) => typeof w === "string")
                  .map((warning, index) => (
                    <p key={index} className="warning">
                      {warning}
                    </p>
                  ))}
              {Array.isArray(result?.players) &&
                result.players.map((player, index) => {
                  const suggestion = players.find(
                    (p) => p.id === player?.matchedPlayerId,
                  );
                  return suggestion ? (
                    <p key={index}>
                      {player.extractedName}: suggested player{" "}
                      {suggestion.full_name}. Confirm the selection below.
                    </p>
                  ) : null;
                })}
              <ScoreEditor
                key={upload.id}
                multiple
                uploadId={upload.id}
                roundId={round.id}
                course={course}
                initialRows={
                  rows.length ? rows : [blankRow(course.number_of_holes)]
                }
                cancel={async () => {
                  unwrap(
                    await database().rpc("cancel_golf_scan", {
                      p_tournament: tournament.id,
                      p_upload: upload.id,
                    }),
                  );
                }}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
