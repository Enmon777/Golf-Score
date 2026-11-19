export type OcrWord = {
  text: string;
  confidence: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export type OcrDocument = { text: string; words: OcrWord[] };
export type ScannedPlayer = {
  extractedName: string;
  matchedPlayerId: string | null;
  scores: {
    holeNumber: number;
    strokes: number | null;
    confidence: number | null;
    requiresReview: boolean;
  }[];
  calculatedTotal: number | null;
  printedTotals?: {
    front: number | null;
    back: number | null;
    total: number | null;
  };
};
export type ScanResult = {
  tournamentId: string;
  roundId: string;
  players: ScannedPlayer[];
  warnings: string[];
  requiresReview: boolean;
  printedPars: (number | null)[];
  rawText: string;
};
export interface OcrProvider {
  recognize(
    image: Blob,
    onProgress: (progress: number) => void,
  ): Promise<OcrDocument>;
}
