"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { isOurClub, normName } from "@/lib/shared/util";
import type { LeagueBundle } from "@/lib/shared/types";
import { SectionTitle } from "@/components/ui";

function PlayerStats() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialClub = search.get("klub") || "";
  const [league, setLeague] = useState<LeagueBundle | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [club, setClub] = useState(initialClub);

  useEffect(() => {
    fetch(`/api/psgz/league/${params.id}`)
      .then((response) => response.json())
      .then((body) => {
        if (body.ok) setLeague(body.league);
        else setError(body.error || "Statistika nije dostupna.");
      })
      .catch(() => setError("Statistika nije dostupna."));
  }, [params.id]);

  const clubs = useMemo(() => {
    const names = new Set((league?.players ?? []).map((player) => player.club).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "hr"));
  }, [league]);

  const rows = (league?.players ?? []).filter((player) => {
    if (club && normName(player.club) !== normName(club)) return false;
    if (!query.trim()) return true;
    const hay = normName(`${player.name} ${player.club}`);
    return hay.includes(normName(query));
  });

  return (
    <div className="space-y-4">
      <Link href="/statistika" className="text-sm text-orange-300">← Sve lige</Link>
      <SectionTitle>{league?.name || "IGRAČI"}</SectionTitle>
      {error && <p className="text-sm text-amber-200">{error}</p>}
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Traži igrača ili klub" className="h-12 w-full rounded-xl border border-white/15 bg-black px-3" />
      <select value={club} onChange={(event) => setClub(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3">
        <option value="">Svi klubovi</option>
        {clubs.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <div className="space-y-2">
        {rows.map((player) => (
          <div key={`${player.playerId}-${player.name}`} className={`rounded-xl border px-3 py-2 ${isOurClub(player.club) ? "border-orange-500/60 bg-orange-500/10" : "border-white/10"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-semibold">{player.rank}. {player.name}</div>
              <div className="font-display text-xl text-orange-300">{player.points.toFixed(2).replace(".", ",")}</div>
            </div>
            <div className="text-xs text-zinc-400">{player.club} · {player.winPct.toFixed(0)}% · odig. {player.played} · {player.wl} · leg {player.legs}</div>
          </div>
        ))}
        {league && !rows.length && <p className="text-sm text-zinc-500">Nema igrača za taj filter.</p>}
      </div>
      {league && (
        <a className="block text-sm text-orange-300 underline" href={league.sourceUrl} target="_blank" rel="noreferrer">
          Izvor: {league.sourceUrl.replace("https://", "")}
        </a>
      )}
    </div>
  );
}

export default function PlayerStatsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Učitavam…</p>}>
      <PlayerStats />
    </Suspense>
  );
}
