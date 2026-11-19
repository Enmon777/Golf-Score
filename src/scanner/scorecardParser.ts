import type { OcrDocument, OcrWord, ScanResult } from "./scanningTypes";
import { matchPlayer } from "./playerMatcher";
import { summarize, validStroke } from "./scoreValidator";
const x = (word: OcrWord) => (word.left + word.right) / 2;
const y = (word: OcrWord) => (word.top + word.bottom) / 2;
const number = (word: OcrWord | undefined) =>
  word && /^\d{1,2}$/.test(word.text.trim()) ? Number(word.text) : null;

function lines(words: OcrWord[]) {
  const rows: OcrWord[][] = [];
  for (const word of [...words].sort((a, b) => y(a) - y(b))) {
    const row = rows.at(-1);
    if (
      row &&
      Math.abs(y(word) - y(row[0])) <=
        Math.max(
          4,
          Math.min(word.bottom - word.top, row[0].bottom - row[0].top) * 0.7,
        )
    )
      row.push(word);
    else rows.push([word]);
  }
  return rows.map((row) => row.sort((a, b) => x(a) - x(b)));
}

function findHeaders(rows: OcrWord[][], holes: number, firstHole = 1) {
  return rows
    .map((row, index) => {
      let cursor = 0;
      const positions = Array.from({ length: holes }, (_, hole) => {
        const offset = row.findIndex(
          (word, i) => i >= cursor && number(word) === hole + firstHole,
        );
        if (offset < 0) return null;
        cursor = offset + 1;
        return x(row[offset]);
      });
      return {
        index,
        positions,
        count: positions.filter((value) => value !== null).length,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function parseScorecard(
  document: OcrDocument,
  tournamentId: string,
  roundId: string,
  holes: number,
  players: { id: string; full_name: string }[],
): ScanResult {
  const result: ScanResult = {
    tournamentId,
    roundId,
    players: [],
    warnings: [],
    requiresReview: true,
    printedPars: Array<number | null>(holes).fill(null),
    rawText: document.text.slice(0, 20000),
  };
  const rows = lines(document.words);
  const header = findHeaders(rows, holes)[0];
  if (!header || header.count < Math.ceil(holes * 0.65)) {
    if (holes === 18) {
      const front = findHeaders(rows, 9)[0];
      const back = findHeaders(rows, 9, 10).find(
        (candidate) =>
          front && candidate.index > front.index && candidate.count >= 6,
      );
      if (front && front.count >= 6 && back) {
        const frontNine = readGrid(
          rows.slice(0, back.index),
          front,
          result,
          players,
        );
        const backNine = readGrid(
          rows.slice(back.index),
          { ...back, index: 0 },
          {
            ...result,
            players: [],
            warnings: [],
            printedPars: Array<number | null>(9).fill(null),
          },
          players,
          10,
        );
        return combineNines(frontNine, backNine);
      }
    }
    result.warnings.push(
      "Hole headings could not be aligned. Enter the scores from the original image.",
    );
    return result;
  }
  return readGrid(rows, header, result, players);
}

function combineNines(front: ScanResult, back: ScanResult): ScanResult {
  const nameKey = (name: string) =>
    name.trim().toLowerCase().replace(/\s+/g, " ");
  const sameName = (name: string) => (row: ScanResult["players"][number]) =>
    nameKey(row.extractedName) === nameKey(name);
  const missing = (first: number) =>
    Array.from({ length: 9 }, (_, index) => ({
      holeNumber: first + index,
      strokes: null,
      confidence: null,
      requiresReview: true,
    }));
  const joined = new Set<ScanResult["players"][number]>();
  const players: ScanResult["players"] = front.players.map((row) => {
    const matches = back.players.filter(sameName(row.extractedName));
    const partner =
      matches.length === 1 &&
      front.players.filter(sameName(row.extractedName)).length === 1
        ? matches[0]
        : undefined;
    if (partner) joined.add(partner);
    const scores = [...row.scores, ...(partner?.scores ?? missing(10))];
    return {
      ...row,
      scores,
      calculatedTotal: summarize(
        scores.map((score) => score.strokes),
        [],
      ).total,
      printedTotals: {
        front: row.printedTotals?.front ?? null,
        back: partner?.printedTotals?.back ?? null,
        total: partner?.printedTotals?.total ?? null,
      },
    };
  });
  for (const row of back.players) {
    if (!joined.has(row))
      players.push({
        ...row,
        scores: [...missing(1), ...row.scores],
        calculatedTotal: null,
      });
  }
  const warnings = [...new Set([...front.warnings, ...back.warnings])];
  if (joined.size < front.players.length || joined.size < back.players.length)
    warnings.push(
      "Some front- and back-nine names did not match. Combine those scores in one player row during review.",
    );
  return {
    ...front,
    warnings,
    players: players.slice(0, 30),
    printedPars: [...front.printedPars.slice(0, 9), ...back.printedPars],
  };
}

function readGrid(
  rows: OcrWord[][],
  header: ReturnType<typeof findHeaders>[number],
  result: ScanResult,
  players: Parameters<typeof parseScorecard>[4],
  firstHole = 1,
) {
  if (header.count < header.positions.length)
    result.warnings.push(
      "Some hole headings were unreadable. Check the blank columns.",
    );
  const anchors = header.positions.flatMap((position, index) =>
    position === null ? [] : [{ position, index }],
  );
  const gaps = anchors
    .slice(1)
    .map(
      (anchor, i) =>
        (anchor.position - anchors[i].position) /
        (anchor.index - anchors[i].index),
    )
    .sort((a, b) => a - b);
  const spacing = gaps[Math.floor(gaps.length / 2)] || 15;
  const start = anchors[0].position - anchors[0].index * spacing;
  const headerWords = rows[header.index];
  const totalAnchors = {
    front: headerWords.find((word) => /^(out|front)$/i.test(word.text)),
    back: headerWords.find((word) => /^(in|back)$/i.test(word.text)),
    total: headerWords.find((word) => /^(tot|total)$/i.test(word.text)),
  };
  for (const row of rows.slice(header.index + 1)) {
    const label = row
      .filter((word) => x(word) < start - spacing * 0.45)
      .map((word) => word.text.trim())
      .join(" ")
      .trim();
    if (!/\p{L}/u.test(label)) continue;
    const scores = header.positions.map((center, index) => {
      const matches =
        center === null
          ? []
          : row.filter(
              (word) =>
                Math.abs(x(word) - center) < spacing * 0.46 &&
                validStroke(number(word)),
            );
      const strokes = matches.length === 1 ? number(matches[0]) : null;
      const confidence = matches.length === 1 ? matches[0].confidence : null;
      return {
        holeNumber: firstHole + index,
        strokes,
        confidence,
        requiresReview:
          strokes === null || confidence === null || confidence < 82,
      };
    });
    if (/^par\b/i.test(label)) {
      result.printedPars = scores.map((score) =>
        score.strokes !== null && score.strokes >= 3 && score.strokes <= 6
          ? score.strokes
          : null,
      );
      continue;
    }
    if (
      /^(tee|handicap|hcp|yardage|total|score|tournament|championship|regular|executive|forward|men|women|initial|scorer|attest|date|team\s*#)\b/i.test(
        label,
      )
    )
      continue;
    if (!scores.some((score) => score.strokes !== null)) continue;
    const matchedPlayerId = matchPlayer(label, players);
    const sums = summarize(
      scores.map((score) => score.strokes),
      [],
    );
    const backOnly = firstHole === 10;
    function readTotal(anchor: OcrWord | undefined) {
      if (!anchor) return null;
      const candidates = row.filter(
        (word) =>
          Math.abs(x(word) - x(anchor)) < spacing * 0.46 &&
          /^\d{1,3}$/.test(word.text.trim()),
      );
      return candidates.length === 1 ? Number(candidates[0].text) : null;
    }
    const printedTotals = {
      front: readTotal(totalAnchors.front),
      back: readTotal(totalAnchors.back),
      total: readTotal(totalAnchors.total),
    };
    if (
      (["front", "back", "total"] as const).some((key) => {
        const expected = backOnly
          ? key === "back"
            ? sums.total
            : null
          : key === "total" &&
              header.positions.length !== result.printedPars.length
            ? null
            : sums[key];
        return (
          printedTotals[key] !== null &&
          expected !== null &&
          printedTotals[key] !== expected
        );
      })
    ) {
      result.warnings.push(
        "Printed totals and recognized hole scores differ for " + label + ".",
      );
    }
    if (!matchedPlayerId)
      result.warnings.push("Confirm the identity for " + label + ".");
    result.players.push({
      extractedName: label.slice(0, 150),
      matchedPlayerId,
      scores,
      calculatedTotal: sums.total,
      printedTotals,
    });
    if (result.players.length === 30) break;
  }
  if (!result.players.length)
    result.warnings.push(
      "No player scores were recognized. Enter the scores from the original.",
    );
  return result;
}
