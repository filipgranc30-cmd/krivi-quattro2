"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TRAINING_PLAYER } from "@/lib/shared/seed";
import {
  checkoutLabel,
  firstTo,
  parseQuickLeg,
  starterForLeg,
  summarizeQuickMatch,
  toSavedPlayers,
  type QuickLeg,
} from "@/lib/shared/quick501";
import { normName } from "@/lib/shared/util";
import { useApp } from "./app-provider";
import { MemberName } from "./member-name";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "./ui";

type Person = { key: string; name: string; userId?: string };

export function Quick501({ people, userId, onDetailed }: { people: Person[]; userId?: string; onDetailed: () => void }) {
  const initial = useMemo(() => defaultPair(people, userId), [people, userId]);
  const [picked, setPicked] = useState<string[]>(initial);
  const [starterKey, setStarterKey] = useState(initial[0] ?? "");
  const [bestOf, setBestOf] = useState(3);
  const [started, setStarted] = useState(false);
  const players = people.filter((person) => picked.includes(person.key)).slice(0, 2);
  const starter = players.some((person) => person.key === starterKey) ? starterKey : players[0]?.key ?? "";
  const starterIndex = Math.max(0, players.findIndex((person) => person.key === starter));

  if (!started) {
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>501 DO</SectionTitle>
          <p className="mt-1 text-sm text-zinc-400">Brzi unos rezultata. Odaberi dva igrača, tko baca prvi i na koliko legova.</p>
        </div>
        <div className="space-y-2">
          {people.map((person) => {
            const on = picked.includes(person.key);
            return (
              <button
                key={person.key}
                type="button"
                onClick={() => {
                  setPicked((current) => {
                    if (current.includes(person.key)) return current.filter((id) => id !== person.key);
                    if (current.length >= 2) return current;
                    return [...current, person.key];
                  });
                  setStarterKey((current) => current || person.key);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${on ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}
              >
                <span><MemberName name={person.name} /></span>
                <span className="text-xs text-zinc-400">{on ? "Odabran" : picked.length >= 2 ? "" : "Dodaj"}</span>
              </button>
            );
          })}
        </div>
        <Card className="space-y-4">
          <div>
            <div className="text-xs text-zinc-400">Tko baca prvi</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {players.map((person) => (
                <button
                  key={person.key}
                  type="button"
                  onClick={() => setStarterKey(person.key)}
                  className={`h-12 truncate rounded-xl border px-2 text-sm font-bold ${person.key === starter ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}
                >
                  <MemberName name={person.name} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Best of</div>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setBestOf((value) => Math.max(1, value - 2))}>–</button>
              <div className="min-w-16 text-center">
                <div className="font-display text-3xl">{bestOf}</div>
                <div className="text-[11px] text-zinc-500">{bestOf === 1 ? "1 leg" : `prvi do ${firstTo(bestOf)}`}</div>
              </div>
              <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setBestOf((value) => Math.min(11, value + 2))}>+</button>
            </div>
          </div>
        </Card>
        <PrimaryButton className="w-full" disabled={players.length !== 2} onClick={() => setStarted(true)}>
          Kreni
        </PrimaryButton>
        <button type="button" className="w-full text-center text-sm text-orange-300 underline" onClick={onDetailed}>
          Detaljno bodovanje
        </button>
      </div>
    );
  }

  return <QuickMatch players={players} starterIndex={starterIndex} bestOf={bestOf} />;
}

function QuickMatch({ players, starterIndex, bestOf }: { players: Person[]; starterIndex: number; bestOf: number }) {
  const target = firstTo(bestOf);
  const [legs, setLegs] = useState<QuickLeg[]>([]);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [round, setRound] = useState("");
  const [dart, setDart] = useState<number | null>(null);
  const [remaining, setRemaining] = useState("");
  const [oneEighties, setOneEighties] = useState<number[]>(() => players.map(() => 0));
  const [error, setError] = useState("");
  const summaries = summarizeQuickMatch(2, legs);
  const done = summaries.some((player) => player.legsWon >= target);
  const legIndex = legs.length;
  const starter = starterForLeg(starterIndex, legIndex, 2);

  const preview = useMemo(() => {
    if (winnerIndex == null || dart == null) return null;
    const parsed = parseQuickLeg({
      winnerIndex,
      round: Number(round),
      dart,
      loserRemaining: Number(remaining),
      starterIndex: starter,
      playerCount: 2,
    });
    return parsed.ok ? parsed.leg : null;
  }, [dart, remaining, round, starter, winnerIndex]);

  const addLeg = () => {
    const parsed = parseQuickLeg({
      winnerIndex: winnerIndex ?? -1,
      round: Number(round),
      dart: dart ?? 0,
      loserRemaining: Number(remaining),
      starterIndex: starter,
      playerCount: 2,
    });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLegs((current) => [...current, { ...parsed.leg, oneEighties: players.map((_, index) => Math.max(0, oneEighties[index] || 0)) }]);
    setWinnerIndex(null);
    setDart(null);
    setRemaining("");
    setOneEighties(players.map(() => 0));
    setError("");
  };

  if (done) {
    return <QuickResult players={players} legs={legs} summaries={summaries} target={target} bestOf={bestOf} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>501 DO · LEG {legIndex + 1}</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">
          {bestOf === 1 ? "1 leg" : `Best of ${bestOf} · prvi do ${target}`} · prvi baca {players[starter] ? <MemberName name={players[starter].name} /> : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {players.map((person, index) => (
          <div key={person.key} className="rounded-xl border border-white/10 p-3">
            <div className="truncate text-sm text-zinc-300"><MemberName name={person.name} /></div>
            <div className="font-display text-4xl text-orange-300">{summaries[index]?.legsWon ?? 0}</div>
            <div className="text-[11px] text-zinc-500">{index === starter ? "baca prvi" : ""}</div>
          </div>
        ))}
      </div>
      <Card className="space-y-4">
        <div>
          <div className="text-xs tracking-widest text-orange-400">POBJEDNIK</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {players.map((person, index) => (
              <button
                key={person.key}
                type="button"
                onClick={() => setWinnerIndex(index)}
                className={`h-14 rounded-xl border px-2 text-sm font-bold ${winnerIndex === index ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}
              >
                <MemberName name={person.name} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">U kojoj ruci</div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setRound((value) => String(Math.max(1, (Number(value) || 1) - 1)))}>–</button>
            <input
              inputMode="numeric"
              value={round}
              onChange={(event) => setRound(event.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="1"
              className="font-display h-12 w-20 rounded-xl border border-orange-500/40 bg-black text-center text-3xl outline-none"
              aria-label="U kojoj ruci"
            />
            <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setRound((value) => String(Math.min(40, (Number(value) || 0) + 1)))}>+</button>
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400">Završna strelica</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDart(value)}
                className={`h-16 rounded-xl border text-lg font-bold ${dart === value ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}
              >
                {value}
                <span className="block text-[10px] font-semibold">strelica</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Koliko je ostalo: {winnerIndex == null || !players[winnerIndex === 0 ? 1 : 0] ? "gubitniku" : <MemberName name={players[winnerIndex === 0 ? 1 : 0].name} />}</span>
          <input
            inputMode="numeric"
            value={remaining}
            onChange={(event) => setRemaining(event.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="2–501"
            className="h-14 w-full rounded-xl border border-orange-500/40 bg-black px-3 text-2xl outline-none focus:border-orange-400"
          />
        </label>
        <div>
          <div className="text-xs text-zinc-400">180</div>
          <div className="mt-2 space-y-2">
            {players.map((person, index) => (
              <div key={person.key} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm"><MemberName name={person.name} /></span>
                <div className="flex items-center gap-2">
                  <button type="button" className="h-11 w-11 rounded-xl border border-white/15 text-xl" onClick={() => setOneEighties((current) => current.map((value, item) => (item === index ? Math.max(0, value - 1) : value)))}>–</button>
                  <div className="font-display w-8 text-center text-2xl">{oneEighties[index] ?? 0}</div>
                  <button type="button" className="h-11 w-11 rounded-xl border border-white/15 text-xl" onClick={() => setOneEighties((current) => current.map((value, item) => (item === index ? Math.min(20, value + 1) : value)))}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {preview && (
          <p className="text-sm text-zinc-300">
            Pobjednik {preview.winnerDarts} strelica, prosjek {preview.winnerAvg.toFixed(1)}. Gubitnik {preview.loserDarts} strelica, prosjek {preview.loserAvg.toFixed(1)}.
          </p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <PrimaryButton className="w-full" onClick={addLeg}>Upiši leg</PrimaryButton>
      </Card>
      {legs.length > 0 && (
        <div className="space-y-2">
          {legs.map((leg, index) => (
            <div key={`${leg.winnerIndex}-${index}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span>Leg {index + 1} · {players[leg.winnerIndex] ? <MemberName name={players[leg.winnerIndex].name} /> : ""}</span>
                <span className="text-orange-300">{leg.winnerDarts} str. · {checkoutLabel(leg.round, leg.dart)}</span>
              </div>
              <div className="text-xs text-zinc-500">
                {players[leg.loserIndex] ? <MemberName name={players[leg.loserIndex].name} /> : ""} ostalo {leg.loserRemaining} · {leg.loserDarts} strelica · prosjek {leg.loserAvg.toFixed(1)}
                {leg.oneEighties.some((count) => count > 0) && (
                  <>
                    {" · 180: "}
                    {leg.oneEighties.map((count, playerIndex) => (
                      <span key={players[playerIndex]?.key ?? playerIndex}>
                        {playerIndex > 0 ? ", " : ""}
                        {players[playerIndex] ? <MemberName name={players[playerIndex].name} /> : ""} {count}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
          <GhostButton onClick={() => setLegs((current) => current.slice(0, -1))}>Poništi zadnji leg</GhostButton>
        </div>
      )}
    </div>
  );
}

function QuickResult({
  players,
  legs,
  summaries,
  target,
  bestOf,
}: {
  players: Person[];
  legs: QuickLeg[];
  summaries: ReturnType<typeof summarizeQuickMatch>;
  target: number;
  bestOf: number;
}) {
  const { act } = useApp();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const winner = summaries.findIndex((player) => player.legsWon >= target);
  const score = `${summaries[0]?.legsWon ?? 0}:${summaries[1]?.legsWon ?? 0}`;
  const summary = winner >= 0 ? `${players[winner].name} dobiva ${score}` : score;
  return (
    <div className="space-y-4">
      <SectionTitle>REZULTAT</SectionTitle>
      <Card>
        <div className="text-center text-xs tracking-[0.16em] text-orange-400">{bestOf === 1 ? "1 LEG" : `BEST OF ${bestOf}`}</div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <div className="font-display text-xl leading-tight">{players[0] ? <MemberName name={players[0].name} /> : ""}</div>
          <div className="font-display text-4xl text-orange-400">{score}</div>
          <div className="font-display text-xl leading-tight">{players[1] ? <MemberName name={players[1].name} /> : ""}</div>
        </div>
        <p className="mt-2 text-center text-sm text-zinc-300">{winner >= 0 && players[winner] ? <><MemberName name={players[winner].name} /> dobiva {score}</> : score}</p>
      </Card>
      {summaries.map((player, index) => (
        <Card key={players[index]?.key ?? index}>
          <div className="font-display text-xl">{player.legsWon >= target ? "★ " : ""}{players[index] ? <MemberName name={players[index].name} /> : ""}</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Legovi" value={String(player.legsWon)} />
            <Stat label="Prosjek" value={player.average.toFixed(1)} />
            <Stat label="Najbolji leg" value={player.bestLegDarts ? `${player.bestLegDarts} strelica` : "—"} />
            <Stat label="Checkout" value={player.checkout ?? "—"} />
            <Stat label="180" value={String(player.count180)} />
          </dl>
        </Card>
      ))}
      <div className="space-y-2">
        {legs.map((leg, index) => (
          <div key={`${leg.round}-${index}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
            Leg {index + 1}: {players[leg.winnerIndex] ? <MemberName name={players[leg.winnerIndex].name} /> : ""} {checkoutLabel(leg.round, leg.dart)} ({leg.winnerDarts} str., prosjek {leg.winnerAvg.toFixed(1)}) · ostalo {leg.loserRemaining}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <PrimaryButton
          disabled={saved}
          onClick={async () => {
            const message = await act({
              op: "saveGame",
              game: {
                type: "501",
                playedAt: new Date().toISOString(),
                summary,
                players: toSavedPlayers(players, summaries, target),
              },
            });
            if (message) setError(message);
            else setSaved(true);
          }}
        >
          {saved ? "Spremljeno" : "Spremi"}
        </PrimaryButton>
        <GhostButton onClick={() => router.push("/trening/statistika")}>Statistika</GhostButton>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 font-semibold text-orange-200">{value}</dd>
    </div>
  );
}

export function defaultPair(people: Person[], userId?: string): string[] {
  const ids: string[] = [];
  const karlo = people.find((person) => normName(person.name) === normName(DEFAULT_TRAINING_PLAYER));
  if (karlo) ids.push(karlo.key);
  const me = userId ? people.find((person) => person.userId === userId || person.key === userId) : undefined;
  if (me && !ids.includes(me.key)) ids.push(me.key);
  for (const person of people) {
    if (ids.length >= 2) break;
    if (!ids.includes(person.key)) ids.push(person.key);
  }
  return ids.slice(0, 2);
}
