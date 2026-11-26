"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FALLBACK_LEAGUES } from "@/lib/shared/club";
import type { LeagueInfo } from "@/lib/shared/types";
import { SectionTitle } from "@/components/ui";

export default function StatsPickerPage() {
  const [leagues, setLeagues] = useState<LeagueInfo[]>(FALLBACK_LEAGUES);
  useEffect(() => {
    fetch("/api/psgz/leagues")
      .then((response) => response.json())
      .then((body) => {
        if (body.ok && body.leagues?.length) setLeagues(body.leagues);
      })
      .catch(() => undefined);
  }, []);
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>STATISTIKA IGRAČA</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Prvo odaberi ligu. Zatim vidiš sve igrače te lige, poredane kako ih vodi psgz.hr.</p>
      </div>
      <div className="space-y-2">
        {leagues.map((league) => (
          <Link key={league.id} href={`/statistika/${league.id}`} className="block rounded-xl border border-white/10 bg-[#141418] px-4 py-3">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">{league.group}</div>
            <div className="font-display text-lg">{league.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
