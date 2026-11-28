/** High score is always 15 visits of 3 darts. 15 × 180 is the highest total. */
export const HIGH_SCORE_ROUNDS = 15;
export const HIGH_SCORE_MAX = HIGH_SCORE_ROUNDS * 180;

export function highScoreAverage(total: number): number {
  return Math.round((total / HIGH_SCORE_ROUNDS) * 100) / 100;
}
