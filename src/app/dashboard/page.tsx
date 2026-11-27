"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { DailyDartsTeaser } from "@/components/daily-darts-teaser";
import { TurniriTeaser } from "@/components/turniri-teaser";
import { ZapisnikLink } from "@/components/zapisnik-link";
import { AttendancePanel, Card, SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";
import { leagueBadge, nextMatch, opponentBoard } from "@/lib/shared/schedule";
import type { AttendanceStatus } from "@/lib/shared/types";
import { PSGZ_ORIGIN } from "@/lib/shared/club";

const TILES = [
  { href: "/lige", label: "Lige", text: "Sve tablice PSGZ-a" },
  { href: "/statistika", label: "Statistika", text: "Igrači lige" },
  { href: "/momcad", label: "Momčad", text: "Naši igrači" },
  { href: "/raspored", label: "Raspored", text: "Kola i termini" },
  { href: "/trening", label: "Trening", text: "Igre i dolasci" },
  { href: "/rezultati", label: "Rezultati", text: "Odigrano" },
];

export default function DashboardPage() {
  const { data, snapshot, snapshotError, user, act } = useApp();
  const [pending, setPending] = useState(false);
  const match = nextMatch(data, snapshot, Boolean(snapshotError));
  const badge = leagueBadge(data, snapshot, Boolean(snapshotError));
  const when = match ? formatWhen(match.datetime) : null;
  const board = match ? opponentBoard(match.opponent, data, snapshot, match.source === "demo") : { rows: [], note: "" };
  const mine = data.attendance.find((item) => item.kind === "match" && item.targetId === match?.key && item.userId === user?.id);

  const setStatus = async (status: AttendanceStatus | null) => {
    if (!match || !when) return;
    setPending(true);
    if (status === null) {
      await act({ op: "clearAttendance", kind: "match", targetId: match.key });
    } else {
      await act({
        op: "attendance",
        kind: "match",
        targetId: match.key,
        status,
        label: `protiv ${match.opponent}, ${when.weekday} ${when.date} u ${when.time}`,
      });
    }
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl px-4 py-3 ${badge.demo ? "bg-zinc-800" : "bg-gradient-to-r from-orange-600 to-amber-500 text-black"}`}>
        <div className="flex items-center gap-2 font-display text-lg font-bold tracking-wide">
          <span aria-hidden>🏆</span>
          <span>{badge.title}</span>
        </div>
        <div className={`text-xs ${badge.demo ? "text-zinc-400" : "text-black/70"}`}>{badge.detail}</div>
      </div>

      {snapshotError && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{snapshotError}</p>
      )}

      <Card>
        <SectionTitle>SLJEDEĆA UTAKMICA</SectionTitle>
        {match && when ? (
          <>
            <p className="mt-3 text-center text-sm text-zinc-400">
              {match.round} · {when.weekday} {when.date} u {when.time}
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">{match.home ? "Doma" : "U gostima"} · vs</p>
            <h2 className="font-display mt-1 text-center text-5xl font-bold leading-none text-orange-400">{match.opponent}</h2>
            <p className="mt-2 text-center text-sm text-zinc-300">{match.venue || (match.home ? data.settings.venue : "Mjesto nije objavljeno")}</p>
            {match.source === "demo" && <p className="mt-2 text-center text-xs text-amber-200">Demo susret iz skice, nije iz službenog rasporeda.</p>}
            <p className="mt-2 text-center">
              <ZapisnikLink eventUrl={match.eventUrl} className="text-xs font-semibold text-orange-300 underline" />
            </p>
            <div className="mt-4">
              <AttendancePanel targetId={match.key} attendance={data.attendance.filter((item) => item.kind === "match")} mine={mine?.status} onSet={setStatus} disabled={pending} />
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <SectionTitle>IGRAČI PROTIVNIKA</SectionTitle>
              <p className="mt-1 text-xs text-zinc-500">{board.note}</p>
              <ol className="mt-3 space-y-2">
                {board.rows.length === 0 && <li className="text-sm text-zinc-500">Nema popisa.</li>}
                {board.rows.map((row, index) => (
                  <li key={`${row.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      <span className="mr-2 text-zinc-500">{index + 1}.</span>
                      {row.name}
                      <span className="block text-xs text-zinc-500">{row.detail}{row.hint ? ` · ${row.hint}` : ""}</span>
                    </span>
                    <span className="font-display text-xl text-orange-300">{row.value}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-300">Nema najavljene utakmice. Admin može dodati termin u rasporedu.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>NAŠI IGRAČI</SectionTitle>
          <Link href="/statistika/818?klub=KRIVI%20QUATTRO" className="text-xs text-orange-300">Svi</Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Bodovni prosjek lige, psgz.hr. Nije prosjek tri strelice s ploče.</p>
        <ol className="mt-3 space-y-2">
          {(snapshot?.ourPlayers ?? []).slice(0, 8).map((player) => (
            <li key={player.playerId || player.name} className="flex items-center justify-between text-sm">
              <span>
                <span className="text-zinc-500">{player.rank}.</span> {player.name}
              </span>
              <span className="font-display text-lg text-orange-300">{player.points.toFixed(2).replace(".", ",")}</span>
            </li>
          ))}
          {!snapshot?.ourPlayers.length && <li className="text-sm text-zinc-500">Ligaški popis još nije učitan.</li>}
        </ol>
      </Card>

      <DailyDartsTeaser />
      <TurniriTeaser />

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} className="rounded-2xl border border-white/10 bg-[#141418] p-4">
            <div className="font-display text-xl tracking-wide text-orange-300">{tile.label}</div>
            <div className="text-xs text-zinc-500">{tile.text}</div>
          </Link>
        ))}
      </div>
      <p className="text-center text-[11px] text-zinc-600">
        Izvor lige: <a className="underline" href={`${PSGZ_ORIGIN}/ranking-table/818`}>psgz.hr</a>
      </p>
    </div>
  );
}
