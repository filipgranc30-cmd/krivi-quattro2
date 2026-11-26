export function uid(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sameClub(a: string, b: string): boolean {
  return normName(a) === normName(b);
}

export function isOurClub(name: string): boolean {
  return normName(name) === "KRIVI QUATTRO";
}

export function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || name;
}

export function clampText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}
