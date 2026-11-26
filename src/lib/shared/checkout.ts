const IMPOSSIBLE = new Set([159, 162, 163, 165, 166, 168, 169]);

type Finish = { label: string; rank: number };

function finishRank(label: string): number {
  if (label === "D16" || label.endsWith(" D16")) return 0;
  if (label.includes("D20")) return 1;
  if (label.endsWith("Bull") || label === "Bull") return 2;
  if (label.includes("D8")) return 3;
  if (label.includes("D10")) return 4;
  return 6;
}

function twoDart(score: number): string | null {
  if (score < 2 || score > 110) return null;
  if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
  if (score === 50) return "Bull";
  const options: Finish[] = [];
  const consider = (first: string, value: number) => {
    const rest = score - value;
    if (rest >= 2 && rest <= 40 && rest % 2 === 0) {
      const label = `${first} D${rest / 2}`;
      options.push({ label, rank: finishRank(label) });
    } else if (rest === 50) {
      const label = `${first} Bull`;
      options.push({ label, rank: finishRank(label) });
    }
  };
  for (let n = 20; n >= 1; n -= 1) consider(`T${n}`, n * 3);
  consider("Bull", 50);
  for (let n = 20; n >= 1; n -= 1) consider(`S${n}`, n);
  consider("25", 25);
  options.sort((a, b) => a.rank - b.rank || a.label.length - b.label.length);
  return options[0]?.label ?? null;
}

/** A legal checkout route in at most three darts. */
export function suggestCheckout(score: number): string | null {
  if (score < 2 || score > 170 || IMPOSSIBLE.has(score)) return null;
  const direct = twoDart(score);
  if (direct) return direct;
  const openers: [string, number][] = [
    ["T20", 60],
    ["T19", 57],
    ["T18", 54],
    ["T17", 51],
    ["Bull", 50],
    ["T16", 48],
    ["T15", 45],
  ];
  for (const [label, value] of openers) {
    const tail = twoDart(score - value);
    if (tail) return `${label} ${tail}`;
  }
  return null;
}
