import { database } from "../lib/supabase";
import { validateImage } from "./scorecardService";
import { unwrap } from "./tournamentService";

export async function uploadLogo(file: File, tournamentId: string) {
  if (file.size > 2 * 1024 * 1024)
    throw new Error("Choose a logo image of up to 2 MB.");
  await validateImage(file);
  const path =
    tournamentId +
    "/" +
    crypto.randomUUID() +
    "." +
    (file.type === "image/jpeg" ? "jpg" : file.type.slice(6));
  unwrap(
    await database()
      .storage.from("golf-logos")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return path;
}
export async function logoUrl(path: string) {
  const url = unwrap(
    await database().storage.from("golf-logos").createSignedUrl(path, 900),
  );
  if (!url) throw new Error("Logo unavailable.");
  return url.signedUrl;
}
