"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, PrimaryButton, SectionTitle } from "@/components/ui";
import { todayZagreb } from "@/lib/shared/dates";
import {
  dailyRanking,
  focusDay,
  isDayLocked,
  lockInstant,
  memberDayPoints,
  mostPickedPlayer,
  overallRanking,
  playerDayPoints,
  type DailyRankRow,
} from "@/lib/shared/daily-darts";
import type { DailyDartsPick, DailyDartsState, PublicDailyDarts } from "@/lib/shared/types";

export default function DailyDartsPage() {
  const { data, user, act } = useApp();
  const daily = data.dailyDarts;
  const today = todayZagreb();
  const suggested = focusDay(daily.days, today);
  const [dayId, setDayId] = useState(suggested?.id ?? "");
  const day = daily.days.find((item) => item.id === (dayId || suggested?.id)) ?? suggested;
  const state = useMemo(() => asState(daily), [daily]);
  const locked = day ? isDayLocked(day) : false;
  const [now, setNow] = useState(() => Date.now());
  const mine = day && user ? daily.myPicks.find((pick) => pick.dayId === day.id && pick.userId === user.id) : undefined;
  const [draft, setDraft] = useState<{ dayId: string; ids: string[] } | null>(null);
  const picked = draft && draft.dayId === day?.id ? draft.ids : (mine?.playerIds ?? []);
  const setPicked = (update: string[] | ((current: string[]) => string[])) => {
    const ids = typeof update === "function" ? update(picked) : update;
    setDraft({ dayId: day?.id ?? "", ids });
  };
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    fetch("/api/daily-darts/remind", { method: "POST" }).catch(() => undefined);
    return () => window.clearInterval(timer);
  }, []);

  const names = new Map(daily.players.map((player) => [player.id, player.name]));
  const matches = day ? daily.matches.filter((match) => match.dayId === day.id) : [];
  const count = daily.pickCounts.find((item) => item.dayId === day?.id)?.count ?? 0;
  const ranking = day && locked ? dailyRanking({ ...state, picks: daily.revealedPicks }, day.id) : [];
  const overall = overallRanking(state);
  const favourite = mostPickedPlayer(state);
  const best = overall[0];

  const toggle = (playerId: string) => {
    if (locked) return;
    setPicked((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 4) return current;
      return [...current, playerId];
    });
  };

  const save = async () => {
    if (!day) return;
    setPending(true);
    setMessage((await act({ op: "dailySetPicks", dayId: day.id, playerIds: picked })) ?? "Odabir je spremljen.");
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>DAILY DARTS</SectionTitle>
          <p className="mt-1 text-sm text-zinc-400">PDC World Darts Championship, Alexandra Palace. Odaberi 4 igrača dana.</p>
        </div>
        {user?.role === "admin" && <Link href="/daily-darts/admin" className="text-sm font-semibold text-orange-300">Admin</Link>}
      </div>

      {daily.days.length > 1 && (
        <select value={day?.id ?? ""} onChange={(event) => setDayId(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3">
          {daily.days.map((item) => (
            <option key={item.id} value={item.id}>{item.date.split("-").reverse().join(".")} · {item.lockTime}</option>
          ))}
        </select>
      )}

      {!day && <p className="text-sm text-zinc-400">Još nema dana za odabir. Admin će dodati mečeve nakon ždrijeba.</p>}

      {day && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-2xl">{formatDay(day.date)}</div>
              <div className="text-xs text-zinc-400">Zaključavanje u {day.lockTime}</div>
            </div>
            <Countdown until={new Date(lockInstant(day)).getTime()} now={now} locked={locked || now >= new Date(lockInstant(day)).getTime()} />
          </div>
          <p className="mt-3 text-sm text-zinc-300">Odabralo {count} {count === 1 ? "član" : "članova"}.</p>
          {!matches.length && <p className="mt-3 text-sm text-zinc-400">Za ovaj dan nema mečeva, pa nema ni odabira.</p>}
        </Card>
      )}

      {day && matches.length > 0 && (
        <div className="space-y-2">
          {matches.map((match) => (
            <Card key={match.id} className="space-y-2">
              <div className="text-xs text-zinc-500">{[match.round, match.startTime].filter(Boolean).join(" · ") || "Meč"}</div>
              <PickButton name={names.get(match.playerAId) ?? "Igrač"} points={pointsOf(state, day.id, match.playerAId)} selected={picked.includes(match.playerAId)} locked={locked} onClick={() => toggle(match.playerAId)} />
              <PickButton name={names.get(match.playerBId) ?? "Igrač"} points={pointsOf(state, day.id, match.playerBId)} selected={picked.includes(match.playerBId)} locked={locked} onClick={() => toggle(match.playerBId)} />
            </Card>
          ))}
          {!locked && (
            <>
              <p className="text-sm text-zinc-400">Odabrano {picked.length}/4. Prije zaključavanja odabir možeš mijenjati.</p>
              {message && <p className="text-sm text-orange-200">{message}</p>}
              <PrimaryButton className="w-full" disabled={pending || picked.length !== 4} onClick={save}>Spremi odabir</PrimaryButton>
            </>
          )}
        </div>
      )}

      {day && locked && (
        <section className="space-y-2">
          <SectionTitle>POREDAK DANA</SectionTitle>
          <Ranking rows={ranking} />
          {daily.revealedPicks.filter((pick) => pick.dayId === day.id).map((pick) => (
            <Card key={pick.id}>
              <div className="flex justify-between gap-3">
                <div className="font-semibold">{pick.userName}</div>
                <div className="font-display text-xl text-orange-300">{memberDayPoints(state, pick)}</div>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{pick.playerIds.map((id) => `${names.get(id) ?? "Igrač"} (${pointsOf(state, day.id, id)})`).join(" · ")}</p>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <SectionTitle>UKUPNI POREDAK</SectionTitle>
        {!overall.length && <p className="text-sm text-zinc-400">Poredak se puni nakon zaključavanja dana.</p>}
        {overall.map((row, index) => (
          <Card key={row.userId}>
            <div className="flex justify-between gap-3">
              <div className="font-semibold">{index + 1}. {row.name}</div>
              <div className="font-display text-xl text-orange-300">{row.points}</div>
            </div>
            <p className="text-xs text-zinc-500">{row.days} dana · najbolji dan {row.bestDay}</p>
          </Card>
        ))}
        {best && <p className="text-sm text-zinc-300">Najbolji dan: {best.name}, {best.bestDay} bodova.</p>}
        {favourite && <p className="text-sm text-zinc-300">Najbiraniji igrač: {favourite.player.name} ({favourite.count}×).</p>}
      </section>

      <details className="rounded-2xl border border-white/10 bg-[#141418] p-4">
        <summary className="cursor-pointer font-display text-lg text-orange-300">Bodovanje</summary>
        <ul className="mt-3 space-y-1 text-sm text-zinc-300">
          <li>Pobjeda {daily.scoring.win}</li>
          <li>Prosjek: {daily.scoring.averagePoint} bod za svaki cijeli bod iznad {daily.scoring.averageBase} (106,02 daje 16, ispod {daily.scoring.averageBase} daje 0)</li>
          <li>180 = {daily.scoring.oneEighty} · izlaz preko 100 = {daily.scoring.checkoutOver100}</li>
          <li>Izlaz u 4. ruci = {daily.scoring.checkoutRound4} · izlaz u 5. ruci = {daily.scoring.checkoutRound5}</li>
          <li>Izlaz bull = {daily.scoring.checkoutBull} · big fish 170 = {daily.scoring.bigFish} · 9-darter = {daily.scoring.nineDarter}</li>
          <li>Bodovi člana su zbroj njegova 4 igrača. Isti igrač može biti odabran drugi dan.</li>
        </ul>
      </details>
    </div>
  );
}

function Ranking({ rows }: { rows: DailyRankRow[] }) {
  if (!rows.length) return <p className="text-sm text-zinc-400">Nitko nije odabrao igrače.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.userId} className="flex justify-between rounded-xl border border-white/10 px-3 py-2">
          <span>{index + 1}. {row.name}</span>
          <span className="font-display text-lg text-orange-300">{row.points}</span>
        </div>
      ))}
    </div>
  );
}

function PickButton({ name, points, selected, locked, onClick }: { name: string; points: number; selected: boolean; locked: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={locked && !selected} onClick={onClick} className={`flex h-12 w-full items-center justify-between rounded-xl border px-3 text-left ${selected ? "border-orange-500 bg-orange-500/15" : "border-white/10"}`}>
      <span className="truncate font-semibold">{name}</span>
      <span className="text-sm text-orange-300">{points || "–"}</span>
    </button>
  );
}

function Countdown({ until, now, locked }: { until: number; now: number; locked: boolean }) {
  if (!until || locked) return <div className="rounded-full bg-white/10 px-3 py-1 text-xs">Zaključano</div>;
  const left = Math.max(0, until - now);
  const hours = Math.floor(left / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return <div className="font-display text-xl text-orange-300">{hours}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</div>;
}

function formatDay(date: string) {
  const [year, month, day] = date.split("-");
  return `${Number(day)}.${Number(month)}.${year}.`;
}

function pointsOf(state: DailyDartsState, dayId: string, playerId: string) {
  const stat = state.stats.find((item) => item.playerId === playerId && state.matches.some((match) => match.id === item.matchId && match.dayId === dayId));
  return playerDayPoints(stat, state.scoring);
}

function asState(daily: PublicDailyDarts): DailyDartsState {
  const picks = mergePicks(daily.revealedPicks, daily.myPicks);
  return { players: daily.players, days: daily.days, matches: daily.matches, stats: daily.stats, picks, scoring: daily.scoring, reminderSent: [] };
}

function mergePicks(revealed: DailyDartsPick[], mine: DailyDartsPick[]) {
  const ids = new Set(revealed.map((pick) => pick.id));
  return [...revealed, ...mine.filter((pick) => !ids.has(pick.id))];
}
