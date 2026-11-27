import Link from "next/link";
import { TurniriList } from "@/components/turniri-list";
import { SectionTitle } from "@/components/ui";
import { getUpcomingTournaments } from "@/lib/server/rundapikada";

export const revalidate = 3600;

export default async function TournamentsPage() {
  const feed = await getUpcomingTournaments();
  return (
    <div className="space-y-4">
      <Link href="/vise" className="text-sm text-orange-300">← Više</Link>
      <div>
        <SectionTitle>TURNIRI</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Nadolazeći pikado turniri. Vrijeme je lokalno, popis se osvježava otprilike svaki sat.</p>
      </div>
      {!feed.ok && (
        <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-50">
          Trenutno nije moguće učitati turnire.
        </p>
      )}
      {feed.ok && <TurniriList tournaments={feed.tournaments} />}
      <p className="text-center text-xs text-zinc-500">
        Izvor: <a className="text-orange-300 underline" href="https://rundapikada.com" target="_blank" rel="noreferrer">Runda Pikada</a>
      </p>
    </div>
  );
}
