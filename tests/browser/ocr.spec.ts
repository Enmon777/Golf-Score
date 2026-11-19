import { expect, test } from "@playwright/test";

test("browser OCR reads a generated printed scorecard image", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Runs the browser OCR engine once.",
  );
  test.setTimeout(90000);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const enginePath = "/src/scanner/ocrService.ts";
    const parserPath = "/src/scanner/scorecardParser.ts";
    const [{ browserOcr }, { parseScorecard }] = await Promise.all([
      import(enginePath),
      import(parserPath),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 1400, 400);
    context.fillStyle = "#000";
    context.font = "bold 34px Arial";
    context.textAlign = "center";
    const lines = [
      ["HOLE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "OUT"],
      ["PAR", "4", "4", "3", "4", "4", "4", "3", "5", "4", "35"],
      ["Alex Woods", "5", "6", "3", "5", "6", "5", "3", "7", "5", "45"],
      ["Taylor Green", "4", "5", "3", "4", "5", "4", "4", "6", "4", "39"],
    ];
    lines.forEach((line, row) =>
      line.forEach((cell, column) =>
        context.fillText(
          cell,
          column === 0 ? 145 : 205 + column * 105,
          75 + row * 80,
        ),
      ),
    );
    const image = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) =>
        blob ? resolve(blob) : reject(new Error("Fixture image unavailable")),
      ),
    );
    const recognized = await browserOcr.recognize(image, () => {});
    const parsed = parseScorecard(recognized, "test-event", "test-round", 9, [
      { id: "alex", full_name: "Alex Woods" },
      { id: "taylor", full_name: "Taylor Green" },
    ]);
    return { text: recognized.text, words: recognized.words, parsed };
  });
  expect(result.text).toContain("Woods");
  expect(
    result.parsed.players.find(
      (row: { matchedPlayerId: string }) => row.matchedPlayerId === "alex",
    )?.scores[0].strokes,
    JSON.stringify(result),
  ).toBe(5);
});
