"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { Card, SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";

export default function TrainingStatsPage() {
  const { data } = useApp();
  const board = useMemo(() => {
    const map = new Map<string, { name: string; games: number; wins: number; avgSum: number; avgN: number; c180: number; best: number; mprSum: number; mprN: number; high: number }>();
    for (const game of data.games) {
      for (const player of game.players) {
        const key = player.name.toLocaleLowerCase("hr");
        const row = map.get(key) ?? { name: player.name, games: 0, wins: 0, avgSum: 0, avgN: 0, c180: 0, best: 0, mprSum: 0, mprN: 0, high: 0 };
        row.games += 1;
        if (player.won) row.wins += 1;
        if (player.threeDartAvg) {
          row.avgSum += player.threeDartAvg;
          row.avgN += 1;
        }
        row.c180 += player.count180 || 0;
        row.best = Math.max(row.best, player.bestCheckout || 0);
        row.high = Math.max(row.high, player.highestVisit || 0);
        if (player.cricketMpr) {
          row.mprSum += player.cricketMpr;
          row.mprN += 1;
        }
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => b.wins - a.wins || b.avgSum / Math.max(1, b.avgN) - a.avgSum / Math.max(1, a.avgN));
  }, [data.games]);

  return (
    <div className="space-y-4">
      <Link href="/trening" className="text-sm text-orange-300">← Trening</Link>
      <SectionTitle>STATISTIKA TRENINGA</SectionTitle>
      {board.map((row) => (
        <Card key={row.name}>
          <div className="flex justify-between gap-3">
            <div className="font-display text-xl">{row.name}</div>
            <div className="text-sm text-zinc-400">{row.wins}/{row.games} pobjeda</div>
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            prosjek {row.avgN ? (row.avgSum / row.avgN).toFixed(1) : "—"} · 180: {row.c180} · najbolji checkout {row.best || "—"} · najveći posjet {row.high || "—"} · cricket MPR {row.mprN ? (row.mprSum / row.mprN).toFixed(2) : "—"}
          </div>
        </Card>
      ))}
      {!board.length && <p className="text-sm text-zinc-400">Još nema spremljenih igara.</p>}
      <div className="space-y-2">
        {data.games.slice(0, 30).map((game) => (
          <div key={game.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>{game.type}</span>
              <span>{formatWhen(game.playedAt).label}</span>
            </div>
            <div>{game.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
