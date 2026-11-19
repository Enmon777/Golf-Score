import { expect, test } from "vitest";
import { parseScorecard } from "./scorecardParser";
import { matchPlayer } from "./playerMatcher";
import { summarize } from "./scoreValidator";
import type { OcrWord } from "./scanningTypes";
function line(y: number, values: string[]) {
  return values.map((text, index): OcrWord => ({
    text,
    left: 10 + index * 30,
    right: 24 + index * 30,
    top: y,
    bottom: y + 10,
    confidence: text === "7" ? 64 : 98,
  }));
}
test("aligns front nine using printed hole anchors, skips tee rows and flags missing cells", () => {
  const words = [
    ...line(10, ["Hole", "1", "2", "3", "4", "5", "6", "7", "8", "9", "Out"]),
    ...line(29, [
      "Tournament",
      "310",
      "441",
      "270",
      "390",
      "410",
      "170",
      "401",
      "380",
      "390",
    ]),
    ...line(45, ["Par", "4", "4", "4", "4", "4", "3", "4", "4", "4"]),
    ...line(61, ["Woods A", "4", "5", "4", "4", "7", "?", "4", "4", "4", "40"]),
    ...line(77, [
      "Taylor Green",
      "4",
      "4",
      "4",
      "4",
      "4",
      "4",
      "4",
      "4",
      "4",
      "36",
    ]),
  ];
  const result = parseScorecard(
    { text: "test OCR transcription", words },
    "event",
    "round",
    9,
    [
      { id: "woods", full_name: "Alex Woods" },
      { id: "green", full_name: "Taylor Green" },
    ],
  );
  expect(result.players.map((player) => player.matchedPlayerId)).toEqual([
    "woods",
    "green",
  ]);
  expect(result.players[0].scores[4]).toMatchObject({
    strokes: 7,
    requiresReview: true,
  });
  expect(result.players[0].scores[5].strokes).toBeNull();
  expect(result.players[1].calculatedTotal).toBe(36);
  expect(result.printedPars).toHaveLength(9);
  expect(result.requiresReview).toBe(true);
});
test("empty OCR yields manual fallback instead of invented results", () => {
  const result = parseScorecard(
    { text: "", words: [] },
    "event",
    "round",
    18,
    [],
  );
  expect(result.players).toEqual([]);
  expect(result.warnings[0]).toContain("Enter the scores");
});
test("uncertain identities and unknown pars remain unset", () => {
  expect(
    matchPlayer("Smith J", [
      { id: "one", full_name: "Jamie Smith" },
      { id: "two", full_name: "Jesse Smith" },
    ]),
  ).toBeNull();
  expect(summarize(Array(9).fill(4), Array(9).fill(null))).toEqual({
    front: 36,
    back: null,
    total: 36,
    relative: null,
  });
});
test("preserves both nines around subtotal columns and warns on conflicting totals", () => {
  const front = Array.from({ length: 9 }, (_, i) => String(i + 1));
  const back = Array.from({ length: 9 }, (_, i) => String(i + 10));
  const digits = Array<string>(9).fill("4");
  const words = [
    ...line(8, ["Hole", ...front, "Out", "Initial", ...back, "In", "Tot"]),
    ...line(31, ["Alex Woods", ...digits, "40", "AW", ...digits, "36", "76"]),
  ];
  const result = parseScorecard({ text: "", words }, "event", "round", 18, [
    { id: "woods", full_name: "Alex Woods" },
  ]);
  expect(result.players[0].scores.map((score) => score.strokes)).toEqual(
    Array(18).fill(4),
  );
  expect(result.players[0].printedTotals).toEqual({
    front: 40,
    back: 36,
    total: 76,
  });
  expect(result.players[0].calculatedTotal).toBe(72);
  expect(result.warnings[0]).toContain("totals");
});

test("combines separate nine-hole grids by player name even when row order changes", () => {
  const front = Array.from({ length: 9 }, (_, index) => String(index + 1));
  const back = Array.from({ length: 9 }, (_, index) => String(index + 10));
  const fours = Array<string>(9).fill("4");
  const fives = Array<string>(9).fill("5");
  const words = [
    ...line(10, ["Hole", ...front, "Out"]),
    ...line(30, ["Alex Woods", ...fours, "36"]),
    ...line(50, ["Taylor Green", ...fives, "45"]),
    ...line(70, ["Hole", ...back, "In", "Total"]),
    ...line(90, ["Taylor Green", ...fours, "36", "81"]),
    ...line(110, ["Alex Woods", ...fives, "45", "81"]),
  ];
  const result = parseScorecard({ text: "", words }, "event", "round", 18, []);
  expect(result.players).toHaveLength(2);
  expect(
    result.players[0].scores.map(({ holeNumber, strokes }) => [
      holeNumber,
      strokes,
    ]),
  ).toEqual(
    [...fours, ...fives].map((value, index) => [index + 1, Number(value)]),
  );
  expect(result.players[0].printedTotals).toEqual({
    front: 36,
    back: 45,
    total: 81,
  });
  expect(result.players[0].calculatedTotal).toBe(81);
});
