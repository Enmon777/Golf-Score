import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import languagePath from "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url";
import type { OcrProvider } from "./scanningTypes";
export const browserOcr: OcrProvider = {
  async recognize(image, onProgress) {
    const { createWorker, PSM } = await import("tesseract.js");
    let rejectWorker: (reason: Error) => void = () => {};
    const workerError = new Promise<never>((_, reject) => {
      rejectWorker = reject;
    });
    const start = createWorker("eng", 1, {
      workerPath,
      corePath,
      langPath: languagePath.slice(0, languagePath.lastIndexOf("/")),
      workerBlobURL: false,
      errorHandler: (error) => rejectWorker(new Error(String(error))),
      logger: (event) => {
        if (event.status === "recognizing text") onProgress(event.progress);
      },
    });
    const timeout = window.setTimeout(
      () => rejectWorker(new Error("The OCR engine timed out.")),
      45000,
    );
    let worker: Awaited<typeof start> | undefined;
    try {
      worker = await Promise.race([start, workerError]);
      await Promise.race([
        worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          user_defined_dpi: "300",
        }),
        workerError,
      ]);
      const { data } = await Promise.race([
        worker.recognize(
          image,
          { rotateAuto: true },
          { blocks: true, text: true },
        ),
        workerError,
      ]);
      const words = (data.blocks ?? [])
        .flatMap((block) =>
          block.paragraphs.flatMap((paragraph) =>
            paragraph.lines.flatMap((line) => line.words),
          ),
        )
        .map((word) => ({
          text: word.text,
          confidence: word.confidence,
          left: word.bbox.x0,
          right: word.bbox.x1,
          top: word.bbox.y0,
          bottom: word.bbox.y1,
        }));
      return { text: data.text, words };
    } finally {
      window.clearTimeout(timeout);
      if (worker) await worker.terminate();
      else
        void start.then((lateWorker) => lateWorker.terminate()).catch(() => {});
    }
  },
};
