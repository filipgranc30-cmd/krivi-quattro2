export type Tournament = {
  id: string;
  title: string;
  status: string;
  date: string;
  time: string | null;
  city: string;
  address: string;
  venue: string;
  description: string;
  mode: string;
  dartType: "soft" | "steel" | "";
  x01: number | null;
  legsToWin: number | null;
  checkout: string;
  fee: number | null;
  maxPlayers: number | null;
  boards: number | null;
  prize: string;
  repechage: boolean;
  lat: number | null;
  lng: number | null;
  url: string;
  mapsUrl: string | null;
};

const ZAGREB_AREA = new Set(
  [
    "Zagreb",
    "Sesvete",
    "Dubrava",
    "Novi Zagreb",
    "Velika Gorica",
    "Dugo Selo",
    "Sesvetski Kraljevec",
    "Novaki",
    "Veliko Polje",
    "Jastrebarsko",
    "Klinča Sela",
    "Zaprešić",
    "Samobor",
    "Sveta Nedelja",
    "Lučko",
    "Brezovica",
    "Stupnik",
  ].map(fold),
);

export function isZagrebArea(city: string): boolean {
  return ZAGREB_AREA.has(fold(city));
}

export function normalizeTournaments(body: unknown): Tournament[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { data?: unknown }).data)) return null;
  const rows = (body as { data: unknown[] }).data;
  const list: Tournament[] = [];
  for (const row of rows) {
    const item = normalizeOne(row);
    if (item) list.push(item);
  }
  return list;
}

export function upcomingTournaments(items: Tournament[], today: string): Tournament[] {
  return items
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || timeKey(a.time).localeCompare(timeKey(b.time)) || a.title.localeCompare(b.title, "hr"));
}

export function dayHeading(date: string, today: string): string {
  if (date === today) return "Danas";
  const tomorrow = shiftDate(today, 1);
  if (date === tomorrow) return "Sutra";
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const weekday = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"][new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()];
  return `${weekday}, ${day}.${month}.`;
}

export function formatFormat(item: Tournament): string {
  const game = item.x01 ? `${item.x01}${item.checkout === "Double" ? " DO" : item.checkout ? ` ${item.checkout}` : ""}` : "";
  const legs = item.legsToWin ? `best of ${item.legsToWin * 2 - 1}` : "";
  return [game, legs].filter(Boolean).join(" · ");
}

export function formatFee(fee: number | null): string {
  if (fee == null) return "";
  if (fee === 0) return "Besplatno";
  return `${trimNumber(fee)} €`;
}

export function formatMode(mode: string): string {
  if (!mode) return "";
  if (fold(mode) === fold("platformski")) return "Platformski";
  return mode;
}

export function placeLine(item: Tournament): string {
  const where = [item.venue, item.address].filter(Boolean).join(", ");
  return [where, item.city].filter(Boolean).join(" · ");
}

function normalizeOne(row: unknown): Tournament | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Record<string, unknown>;
  if (item.is_test === true) return null;
  const status = text(item.status).toLowerCase();
  if (!status || status === "archived") return null;
  const id = text(item.id);
  const date = text(item.date);
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const lat = number(item.lat);
  const lng = number(item.lng);
  const venue = text(item.lokacija);
  const address = text(item.adresa) || text(item.formatted_address);
  const city = text(item.grad);
  const dart = text(item.dart_type).toLowerCase();
  return {
    id,
    title: text(item.title) || "Turnir",
    status,
    date,
    time: clock(item.time),
    city,
    address,
    venue,
    description: text(item.description),
    mode: text(item.mode),
    dartType: dart.startsWith("soft") ? "soft" : dart.startsWith("steel") ? "steel" : "",
    x01: integer(item.x01),
    legsToWin: integer(item.legs_to_win),
    checkout: text(item.checkout),
    fee: number(item.kotizacija),
    maxPlayers: integer(item.max_players),
    boards: integer(item.broj_aparata),
    prize: text(item.prize_description),
    repechage: item.repasaz === true,
    lat,
    lng,
    url: `https://rundapikada.com/turniri/${encodeURIComponent(id)}`,
    mapsUrl: mapsLink({ lat, lng, venue, address, city }),
  };
}

function mapsLink(item: { lat: number | null; lng: number | null; venue: string; address: string; city: string }): string | null {
  if (item.lat != null && item.lng != null) return `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  const query = [item.venue, item.address, item.city].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function integer(value: unknown): number | null {
  const parsed = number(value);
  return parsed != null && Number.isInteger(parsed) ? parsed : null;
}

function clock(value: unknown): string | null {
  const raw = text(value);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : null;
}

function timeKey(time: string | null): string {
  return time ?? "99:99";
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
}

function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
