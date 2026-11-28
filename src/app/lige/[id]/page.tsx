"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isOurClub } from "@/lib/shared/util";
import type { LeagueBundle } from "@/lib/shared/types";
import { MemberName } from "@/components/member-name";
import { SectionTitle } from "@/components/ui";

export default function LeagueTablePage() {
  const params = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueBundle | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/psgz/league/${params.id}`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        if (body.ok) setLeague(body.league);
        else setError(body.error || "Tablica nije dostupna.");
      })
      .catch(() => {
        if (!cancelled) setError("Tablica nije dostupna.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="space-y-4">
      <Link href="/lige" className="text-sm text-orange-300">← Sve lige</Link>
      <SectionTitle>{league?.name || "LJESTVICA"}</SectionTitle>
      {error && <p className="text-sm text-amber-200">{error}</p>}
      {!league && !error && <p className="text-sm text-zinc-400">Učitavam tablicu…</p>}
      {league && (
        <>
          <div className="space-y-2">
            {league.standings.map((row) => (
              <div key={row.crewId} className={`rounded-xl border px-3 py-2 ${isOurClub(row.name) ? "border-orange-500 bg-orange-500/15" : "border-white/10"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold">
                    {row.position}. <MemberName name={row.name} />
                  </div>
                  <div className="font-display text-xl text-orange-300">{String(row.points).replace(".", ",")}</div>
                </div>
                <div className="text-xs text-zinc-400">
                  {row.played} odigranih · {row.won} pobjeda · ner. {row.draw} · {row.lost} poraza · susreti {row.legs}
                </div>
              </div>
            ))}
          </div>
          {!league.standings.length && <p className="text-sm text-zinc-400">Ovo natjecanje nema klasičnu ljestvicu ili je stranica drukčija.</p>}
          <a className="block text-sm text-orange-300 underline" href={league.sourceUrl} target="_blank" rel="noreferrer">
            Otvori izvor na psgz.hr
          </a>
        </>
      )}
    </div>
  );
}
