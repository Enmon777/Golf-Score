import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Editor, text } from "../components/ui/Editor";
import { useTournament } from "./TournamentDashboard";
import { validateImage, storeScan } from "../services/scorecardService";
import { fullImage, preprocessImage } from "../scanner/imagePreprocessor";
import { advancedVision, visionEnabled } from "../scanner/visionProvider";
import { parseScorecard } from "../scanner/scorecardParser";
import type { ScanResult } from "../scanner/scanningTypes";
import { errorMessage } from "../lib/supabase";
import { ScorecardCamera } from "../components/scorecards/ScorecardCamera";
const storedTypes = ["image/jpeg", "image/png", "image/webp"];
export function ScorecardScannerPage() {
  const { tournament, rounds, courses, players, reload } = useTournament();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState(fullImage);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const selection = useRef(0);
  const activeRounds = rounds.filter((round) => round.status !== "cancelled");
  useEffect(() => {
    if (!file) return;
    let active = true;
    let url = "";
    preprocessImage(file, rotation, crop, false).then(
      (blob) => {
        if (active) {
          url = URL.createObjectURL(blob);
          setPreview(url);
          setError("");
        }
      },
      (error) => {
        if (active) {
          setPreview("");
          setError(errorMessage(error));
        }
      },
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, rotation, crop]);
  async function choose(selected: File | undefined) {
    if (!selected) return;
    const current = ++selection.current;
    setCameraOpen(false);
    setPreparing(true);
    setFile(null);
    setPreview("");
    setError("");
    try {
      let photo = selected;
      if (!storedTypes.includes(photo.type) || photo.size > 10 * 1024 * 1024) {
        const converted = await preprocessImage(
          photo,
          0,
          fullImage,
          false,
          "image/jpeg",
        );
        photo = new File([converted], "scorecard.jpg", {
          type: converted.type,
        });
      }
      await validateImage(photo);
      if (current !== selection.current) return;
      setRotation(0);
      setCrop(fullImage);
      setFile(photo);
    } catch (error) {
      if (current === selection.current) setError(errorMessage(error));
    } finally {
      if (current === selection.current) setPreparing(false);
    }
  }
  return (
    <>
      <h1>Scan scorecard</h1>
      <p>
        Position the hole headings and player rows inside the crop. Review all
        suggested scores before approval.
      </p>
      <p>
        <Link className="underline" to="../manual">
          Enter scores manually
        </Link>
      </p>
      {!activeRounds.length ? (
        <p>
          <Link to="../calendar">Schedule a round first</Link>
        </p>
      ) : (
        <Editor
          submitLabel="Scan and review"
          save={async (form) => {
            if (preparing)
              throw new Error("Wait for the photo to finish loading.");
            if (cameraOpen)
              throw new Error(
                "Capture a photo or close the camera before scanning.",
              );
            if (!file) throw new Error("Choose a scorecard photo first.");
            const roundId = text(form, "round");
            const course = courses.find(
              (c) =>
                c.id ===
                activeRounds.find((round) => round.id === roundId)?.course_id,
            );
            if (!course) throw new Error("Select a valid round.");
            const useVision = text(form, "engine") === "advanced";
            const image = await preprocessImage(
              file,
              rotation,
              crop,
              !useVision,
            );
            let result: ScanResult;
            try {
              const recognizeOnDevice = async (
                update: (value: number) => void,
              ) => {
                const enhanced = useVision
                  ? await preprocessImage(file, rotation, crop)
                  : image;
                const { browserOcr } = await import("../scanner/ocrService");
                return browserOcr.recognize(enhanced, update);
              };
              setProgress("Loading recognition engine…");
              const update = (value: number) =>
                setProgress(
                  "Recognizing text: " + Math.round(value * 100) + "%",
                );
              let visionFailed = false;
              const document = useVision
                ? await advancedVision(tournament.id)
                    .recognize(image, update)
                    .catch(() => {
                      visionFailed = true;
                      return recognizeOnDevice(update);
                    })
                : await recognizeOnDevice(update);
              result = parseScorecard(
                document,
                tournament.id,
                roundId,
                course.number_of_holes,
                players,
              );
              if (
                course.course_holes.some(
                  (hole) =>
                    hole.par !== null &&
                    result.printedPars[hole.hole_number - 1] != null &&
                    result.printedPars[hole.hole_number - 1] !== hole.par,
                )
              ) {
                result.warnings.push(
                  "Some recognized par values differ from this round’s course settings.",
                );
              }
              if (visionFailed)
                result.warnings.unshift(
                  "Advanced vision was unavailable. The scanner used browser OCR.",
                );
            } catch {
              result = {
                tournamentId: tournament.id,
                roundId,
                players: [],
                requiresReview: true,
                warnings: [
                  "OCR could not read this image. Enter each score from the original.",
                ],
                printedPars: [],
                rawText: "",
              };
            }
            setProgress("Saving original and scan draft...");
            try {
              const id = await storeScan(file, tournament.id, roundId, result);
              reload();
              navigate("../verify/" + id);
            } finally {
              setProgress("");
            }
          }}
        >
          <label>
            Round
            <select name="round" required>
              <option value="">Select round</option>
              {activeRounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Upload photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <label>
              Device photo picker
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  void choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {!cameraOpen && (
            <button
              type="button"
              className="secondary"
              onClick={() => setCameraOpen(true)}
            >
              Open camera
            </button>
          )}
          {cameraOpen && (
            <ScorecardCamera
              onCapture={choose}
              onClose={() => setCameraOpen(false)}
            />
          )}
          {preparing && <p role="status">Preparing photo preview…</p>}
          {error && <p role="alert">{error}</p>}
          {file && (
            <section className="tile">
              {preview && (
                <img
                  className="scan-preview"
                  src={preview}
                  alt="Cropped scorecard preview"
                />
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setRotation((value) => (value + 90) % 360)}
              >
                Rotate 90°
              </button>
              <div className="form-grid">
                {Object.keys(crop).map((key) => {
                  const edge = key as keyof typeof crop;
                  return (
                    <label key={edge}>
                      Crop {edge} · {crop[edge]}%
                      <input
                        type="range"
                        min={0}
                        max={44}
                        value={crop[edge]}
                        onChange={(event) =>
                          setCrop((current) => ({
                            ...current,
                            [edge]: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </section>
          )}
          {progress && <p role="status">{progress}</p>}
          {visionEnabled ? (
            <label>
              Recognition engine
              <select name="engine">
                <option value="browser">Browser OCR</option>
                <option value="advanced">Advanced AI vision</option>
              </select>
            </label>
          ) : null}
        </Editor>
      )}
    </>
  );
}
