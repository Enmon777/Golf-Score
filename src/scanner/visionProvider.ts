import { database } from "../lib/supabase";
import type { OcrDocument, OcrProvider } from "./scanningTypes";
export const visionEnabled =
  import.meta.env.VITE_ADVANCED_VISION_ENABLED === "true";
export function advancedVision(tournamentId: string): OcrProvider {
  return {
    async recognize(image, onProgress) {
      const form = new FormData();
      form.set("tournament", tournamentId);
      form.set("image", image, "scorecard.png");
      const { data, error } = await database().functions.invoke<OcrDocument>(
        "scorecard-vision",
        { body: form },
      );
      if (error || !data || !Array.isArray(data.words))
        throw new Error("Advanced vision is unavailable.");
      onProgress(1);
      return data;
    },
  };
}
