export type NewsRegion = "hr" | "world";

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  region: NewsRegion;
  publishedAt: string;
  snippet: string;
  image: string | null;
};

export type NewsSource = {
  id: string;
  name: string;
  region: NewsRegion;
  url: string;
  kind: "rss" | "wp";
  limit?: number;
};

export const NEWS_SOURCES: NewsSource[] = [
  { id: "hps", name: "HPS", region: "hr", kind: "rss", url: "https://hps-dart.hr/rss" },
  { id: "psgz", name: "PSGZ", region: "hr", kind: "rss", url: "https://psgz.hr/rss" },
  { id: "bbc", name: "BBC Sport", region: "world", kind: "rss", url: "https://feeds.bbci.co.uk/sport/darts/rss.xml" },
  { id: "dartsnews", name: "Dartsnews.com", region: "world", kind: "rss", url: "https://dartsnews.com/sitemap/news.xml", limit: 30 },
  { id: "dartsworld", name: "Darts World", region: "world", kind: "wp", url: "https://dartsworld.com/wp-json/wp/v2/posts?per_page=10&_embed=1" },
  { id: "dartsplanet", name: "Darts Planet", region: "world", kind: "wp", url: "https://dartsplanet.tv/wp-json/wp/v2/posts?per_page=10&_embed=1" },
];

export function parseRss(xml: string, source: NewsSource): NewsItem[] {
  const items: NewsItem[] = [];
  for (const block of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const chunk = block[1].replace(/<content:encoded\b[\s\S]*?<\/content:encoded>/gi, " ");
    const title = cleanText(tag(chunk, "title"));
    const url = firstLink(chunk);
    const publishedAt = toIso(tag(chunk, "pubDate") || tag(chunk, "dc:date"));
    if (!title || !url || !publishedAt) continue;
    const rawDescription = tag(chunk, "description");
    items.push({
      title,
      url,
      source: source.name,
      region: source.region,
      publishedAt,
      snippet: snippet(rawDescription),
      image: imageFrom(chunk, rawDescription),
    });
  }
  return takeNewest(items, source.limit);
}

export function parseWpPosts(body: unknown, source: NewsSource): NewsItem[] {
  if (!Array.isArray(body)) return [];
  const items: NewsItem[] = [];
  for (const row of body) {
    if (!row || typeof row !== "object") continue;
    const post = row as Record<string, unknown>;
    const title = cleanText(rendered(post.title));
    const url = typeof post.link === "string" ? post.link.trim() : "";
    const publishedAt = wpDate(post);
    if (!title || !url || !publishedAt) continue;
    items.push({
      title,
      url,
      source: source.name,
      region: source.region,
      publishedAt,
      snippet: snippet(rendered(post.excerpt)),
      image: wpImage(post),
    });
  }
  return takeNewest(items, source.limit);
}

export function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const sorted = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const unique: NewsItem[] = [];
  for (const item of sorted) {
    const key = item.title.toLocaleLowerCase("hr").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function relativeWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = now.getTime() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "upravo";
  if (minutes < 60) return `prije ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && zagrebDay(date) === zagrebDay(now)) return `prije ${hours} ${croatianHours(hours)}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (zagrebDay(date) === zagrebDay(yesterday)) return "jučer";
  const days = Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)));
  if (days < 7) return `prije ${days} ${days === 1 ? "dan" : "dana"}`;
  const [year, month, day] = zagrebDay(date).split("-");
  return `${Number(day)}.${Number(month)}.${year}.`;
}

function takeNewest(items: NewsItem[], limit?: number): NewsItem[] {
  const sorted = [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return limit ? sorted.slice(0, limit) : sorted;
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? stripCdata(match[1]) : "";
}

function firstLink(block: string): string {
  const link = tag(block, "link") || block.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i)?.[1] || "";
  const url = stripCdata(link).trim();
  return url.startsWith("http") ? url : "";
}

function imageFrom(block: string, description: string): string | null {
  const thumb = block.match(/<media:thumbnail\b[^>]*\burl="([^"]+)"/i)?.[1]
    || block.match(/<media:content\b[^>]*\bmedium="image"[^>]*\burl="([^"]+)"/i)?.[1]
    || block.match(/<enclosure\b[^>]*\burl="([^"]+)"/i)?.[1]
    || description.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1]
    || description.match(/<img\b[^>]*\bsrc='([^']+)'/i)?.[1];
  return safeUrl(thumb);
}

function wpImage(post: Record<string, unknown>): string | null {
  if (typeof post.jetpack_featured_media_url === "string") return safeUrl(post.jetpack_featured_media_url);
  const embedded = post._embedded;
  if (!embedded || typeof embedded !== "object") return null;
  const media = (embedded as { "wp:featuredmedia"?: { source_url?: string }[] })["wp:featuredmedia"];
  return safeUrl(media?.[0]?.source_url);
}

function rendered(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const renderedText = (value as { rendered?: unknown }).rendered;
  return typeof renderedText === "string" ? renderedText : "";
}

function wpDate(post: Record<string, unknown>): string {
  const gmt = typeof post.date_gmt === "string" ? post.date_gmt.trim() : "";
  if (gmt) return toIso(gmt.endsWith("Z") ? gmt : `${gmt.replace(" ", "T")}Z`);
  return typeof post.date === "string" ? toIso(post.date) : "";
}

function snippet(html: string): string {
  const text = cleanText(html.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " "));
  if (text.length <= 200) return text;
  return `${text.slice(0, 197).trimEnd()}…`;
}

function cleanText(value: string): string {
  return decode(stripCdata(value)).replace(/\s+/g, " ").trim();
}

function stripCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function decode(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  const url = decode(value).trim();
  return url.startsWith("https://") || url.startsWith("http://") ? url : null;
}

function toIso(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function zagrebDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function croatianHours(hours: number): string {
  const mod10 = hours % 10;
  const mod100 = hours % 100;
  if (mod10 === 1 && mod100 !== 11) return "sat";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "sata";
  return "sati";
}
