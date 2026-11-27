import { normName } from "./util";

export type ScannedSide = {
  average: number;
  count180: number;
  count140: number;
  count100: number;
  checkoutHits: number;
  checkoutAttempts: number;
  checkoutOver100: number;
  highestCheckout: number;
};

export type ScannedSheet = {
  leftName: string;
  rightName: string;
  leftScore: number | null;
  rightScore: number | null;
  left: ScannedSide;
  right: ScannedSide;
};

export type AlignedSheet = {
  a: ScannedSide;
  b: ScannedSide;
  winnerPlayer: "a" | "b" | null;
  swapped: boolean;
  weak: boolean;
  summary: string;
};

export function alignSheet(playerA: string, playerB: string, sheet: ScannedSheet): AlignedSheet {
  const direct = nameScore(playerA, sheet.leftName) + nameScore(playerB, sheet.rightName);
  const swapped = nameScore(playerA, sheet.rightName) + nameScore(playerB, sheet.leftName);
  const flip = swapped > direct;
  const leftScore = sheet.leftScore;
  const rightScore = sheet.rightScore;
  let winnerOnLeft: boolean | null = null;
  if (leftScore != null && rightScore != null && leftScore !== rightScore) winnerOnLeft = leftScore > rightScore;
  const winnerPlayer = winnerOnLeft == null ? null : winnerOnLeft === !flip ? "a" : "b";
  const score = leftScore != null && rightScore != null ? `${leftScore}-${rightScore}` : "";
  return {
    a: flip ? sheet.right : sheet.left,
    b: flip ? sheet.left : sheet.right,
    winnerPlayer,
    swapped: flip,
    weak: Math.max(direct, swapped) < 60,
    summary: [sheet.leftName, score, sheet.rightName].filter(Boolean).join(" "),
  };
}

function nameScore(stored: string, read: string): number {
  const left = normName(stored);
  const right = normName(read);
  if (!left || !right) return 0;
  if (left === right) return 100;
  const surname = surnameOf(stored);
  const tokens = right.split(" ").filter((token) => token.length > 1);
  if (tokens.includes(surname)) return 80;
  if (tokens.some((token) => surname.startsWith(token) || token.startsWith(surname))) return 60;
  return 0;
}

function surnameOf(name: string): string {
  const tokens = normName(name).split(" ").filter((token) => token.length > 1);
  return tokens.at(-1) || "";
}
