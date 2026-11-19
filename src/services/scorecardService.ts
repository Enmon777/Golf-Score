import { database } from "../lib/supabase";
import type { Json } from "../types/database";
import { unwrap } from "./tournamentService";

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export async function validateImage(file: File) {
  if (
    !(file.type in imageTypes) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG, or WebP image of up to 10 MB.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, index) => header[index] === byte,
  );
  const webp =
    String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if (
    !(file.type === "image/jpeg"
      ? jpeg
      : file.type === "image/png"
        ? png
        : webp)
  )
    throw new Error("The image content does not match its file type.");
}
const images = () => database().storage.from("scorecard-images");
export async function storeScan(
  file: File,
  tournamentId: string,
  roundId: string,
  extracted: Json,
) {
  await validateImage(file);
  const path =
    tournamentId +
    "/" +
    crypto.randomUUID() +
    "." +
    imageTypes[file.type as keyof typeof imageTypes];
  unwrap(
    await images().upload(path, file, {
      contentType: file.type,
      upsert: false,
    }),
  );
  try {
    return unwrap(
      await database().rpc("register_golf_scan", {
        p_tournament: tournamentId,
        p_round: roundId,
        p_path: path,
        p_extracted: extracted,
      }),
    ) as string;
  } catch (error) {
    await images().remove([path]);
    throw error;
  }
}
export async function originalImage(path: string) {
  const result = unwrap(await images().createSignedUrl(path, 900));
  if (!result) throw new Error("Original scorecard unavailable.");
  return result.signedUrl;
}
export type ApprovalRow = {
  player_id: string;
  strokes: number[];
  expected_revision: number;
  reason: string | null;
};
export async function approveScores(
  tournamentId: string,
  roundId: string,
  requestId: string,
  uploadId: string | null,
  rows: ApprovalRow[],
) {
  unwrap(
    await database().rpc("approve_golf_scores", {
      p_tournament: tournamentId,
      p_round: roundId,
      p_request: requestId,
      p_upload: uploadId,
      p_rows: rows,
    }),
  );
}
