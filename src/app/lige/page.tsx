"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FALLBACK_LEAGUES, OUR_LEAGUE_ID } from "@/lib/shared/club";
import type { LeagueInfo } from "@/lib/shared/types";
import { SectionTitle } from "@/components/ui";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<LeagueInfo[]>(FALLBACK_LEAGUES);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/psgz/leagues")
      .then((response) => response.json())
      .then((body) => {
        if (body.ok && body.leagues?.length) setLeagues(body.leagues);
        else setError(body.error || "Koristim zadnji poznati popis liga.");
      })
      .catch(() => setError("Koristim zadnji poznati popis liga."));
  }, []);
  const groups = [...new Set(leagues.map((league) => league.group))];
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>LIGE</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Odaberi natjecanje. Tablice dolaze s psgz.hr i osvježavaju se svakih nekoliko sati.</p>
      </div>
      {error && <p className="text-xs text-amber-200">{error}</p>}
      {groups.map((group) => (
        <div key={group}>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-500">{group}</h2>
          <div className="space-y-2">
            {leagues
              .filter((league) => league.group === group)
              .map((league) => (
                <Link key={league.id} href={`/lige/${league.id}`} className="block rounded-xl border border-white/10 bg-[#141418] px-4 py-3">
                  <div className="font-display text-lg">{league.name}</div>
                  {league.id === OUR_LEAGUE_ID && <div className="text-xs text-orange-300">Naša liga</div>}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
