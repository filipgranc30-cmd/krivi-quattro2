import { unstable_cache } from "next/cache";
import { dedupeNews, NEWS_SOURCES, parseRss, parseWpPosts, type NewsItem, type NewsSource } from "../shared/vijesti";

const UA = "KriviQuattroClubApp/1.0 (+https://krivi-quattro2.vercel.app; vijesti)";

export type NewsFeed = { items: NewsItem[]; failed: string[] };

export async function getNews(): Promise<NewsFeed> {
  return unstable_cache(() => loadNews(), ["pikado-vijesti-v1"], { revalidate: 30 * 60 })();
}

async function loadNews(): Promise<NewsFeed> {
  const results = await Promise.all(NEWS_SOURCES.map(loadSource));
  const items = dedupeNews(results.flatMap((result) => result.items));
  const failed = results.filter((result) => result.failed).map((result) => result.name);
  return { items, failed };
}

async function loadSource(source: NewsSource): Promise<{ name: string; items: NewsItem[]; failed: boolean }> {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": UA, Accept: source.kind === "wp" ? "application/json" : "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { name: source.name, items: [], failed: true };
    if (source.kind === "wp") {
      const body: unknown = await response.json();
      const items = parseWpPosts(body, source);
      return { name: source.name, items, failed: items.length === 0 };
    }
    const items = parseRss(await response.text(), source);
    return { name: source.name, items, failed: items.length === 0 };
  } catch {
    return { name: source.name, items: [], failed: true };
  }
}
