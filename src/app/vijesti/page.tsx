import Link from "next/link";
import { VijestiList } from "@/components/vijesti-list";
import { SectionTitle } from "@/components/ui";
import { getNews } from "@/lib/server/vijesti";

export const revalidate = 1800;

export default async function NewsPage() {
  const feed = await getNews();
  return (
    <div className="space-y-4">
      <Link href="/vise" className="text-sm text-orange-300">← Više</Link>
      <div>
        <SectionTitle>PIKADO VIJESTI</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Naslovi iz hrvatskih i svjetskih izvora. Otvara se izvorna stranica. Popis se osvježava otprilike svakih 30 minuta.</p>
      </div>
      {!feed.items.length && (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-50">Trenutno nije moguće učitati vijesti.</p>
      )}
      {feed.items.length > 0 && <VijestiList items={feed.items} />}
      {feed.failed.length > 0 && <p className="text-xs text-zinc-500">Nisu učitani: {feed.failed.join(", ")}.</p>}
    </div>
  );
}
