"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_TRAINING_PLAYER } from "@/lib/shared/seed";
import { cricketTarget, parseCricketLeg, summarizeCricket, toCricketPlayers, type CricketLeg } from "@/lib/shared/quick-cricket";
import { formatHr } from "@/lib/shared/training-rank";
import { normName } from "@/lib/shared/util";
import { useApp } from "./app-provider";
import { MemberName } from "./member-name";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "./ui";

type Person = { key: string; name: string; userId?: string };

export function QuickCricket({ people, userId, onDetailed }: { people: Person[]; userId?: string; onDetailed: () => void }) {
  const initial = useMemo(() => defaultPair(people, userId), [people, userId]);
  const [picked, setPicked] = useState<string[]>(initial);
  const [bestOf, setBestOf] = useState(1);
  const [started, setStarted] = useState(false);
  const players = people.filter((person) => picked.includes(person.key));

  if (!started) {
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>CRICKET</SectionTitle>
          <p className="mt-1 text-sm text-zinc-400">Brzi unos. Odaberi igrače i za svaki leg samo pobjednika i ruku u kojoj je dobio.</p>
        </div>
        <div className="space-y-2">
          {people.map((person) => {
            const on = picked.includes(person.key);
            return (
              <button
                key={person.key}
                type="button"
                onClick={() => setPicked((current) => (current.includes(person.key) ? current.filter((id) => id !== person.key) : [...current, person.key]))}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${on ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}
              >
                <span><MemberName name={person.name} /></span>
                <span className="text-xs text-zinc-400">{on ? `${picked.indexOf(person.key) + 1}.` : "Dodaj"}</span>
              </button>
            );
          })}
        </div>
        <Card>
          <div className="text-xs text-zinc-400">Best of</div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setBestOf((value) => Math.max(1, value - 2))}>–</button>
            <div className="min-w-16 text-center">
              <div className="font-display text-3xl">{bestOf}</div>
              <div className="text-[11px] text-zinc-500">{bestOf === 1 ? "1 leg" : `prvi do ${cricketTarget(bestOf)}`}</div>
            </div>
            <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setBestOf((value) => Math.min(11, value + 2))}>+</button>
          </div>
        </Card>
        <PrimaryButton className="w-full" disabled={players.length < 2} onClick={() => setStarted(true)}>
          Kreni
        </PrimaryButton>
        <button type="button" className="w-full text-center text-sm text-orange-300 underline" onClick={onDetailed}>
          Detaljno bodovanje
        </button>
      </div>
    );
  }

  return <CricketMatch players={players} bestOf={bestOf} />;
}

function CricketMatch({ players, bestOf }: { players: Person[]; bestOf: number }) {
  const target = cricketTarget(bestOf);
  const [legs, setLegs] = useState<CricketLeg[]>([]);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [round, setRound] = useState("");
  const [error, setError] = useState("");
  const summaries = summarizeCricket(players.length, legs);
  const done = summaries.some((player) => player.legsWon >= target);

  const addLeg = () => {
    const parsed = parseCricketLeg({ winnerIndex: winnerIndex ?? -1, round: Number(round), playerCount: players.length });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setLegs((current) => [...current, parsed.leg]);
    setWinnerIndex(null);
    setRound("");
    setError("");
  };

  if (done) return <CricketResult players={players} legs={legs} bestOf={bestOf} target={target} />;

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>CRICKET · LEG {legs.length + 1}</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">{bestOf === 1 ? "1 leg" : `Best of ${bestOf} · prvi do ${target}`}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {players.map((person, index) => (
          <div key={person.key} className="rounded-xl border border-white/10 p-3">
            <div className="truncate text-sm text-zinc-300"><MemberName name={person.name} /></div>
            <div className="font-display text-4xl text-orange-300">{summaries[index]?.legsWon ?? 0}</div>
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
              aria-label="U kojoj ruci"
              className="font-display h-12 w-20 rounded-xl border border-orange-500/40 bg-black text-center text-3xl outline-none"
            />
            <button type="button" className="h-12 w-12 rounded-xl border border-white/15 text-xl" onClick={() => setRound((value) => String(Math.min(40, (Number(value) || 0) + 1)))}>+</button>
          </div>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <PrimaryButton className="w-full" onClick={addLeg}>Upiši leg</PrimaryButton>
      </Card>
      {legs.length > 0 && (
        <div className="space-y-2">
          {legs.map((leg, index) => (
            <div key={`${leg.winnerIndex}-${index}`} className="flex justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
              <span>Leg {index + 1} · {players[leg.winnerIndex] ? <MemberName name={players[leg.winnerIndex].name} /> : ""}</span>
              <span className="text-orange-300">{leg.round}. ruka</span>
            </div>
          ))}
          <GhostButton onClick={() => setLegs((current) => current.slice(0, -1))}>Poništi zadnji leg</GhostButton>
        </div>
      )}
    </div>
  );
}

function CricketResult({ players, legs, bestOf, target }: { players: Person[]; legs: CricketLeg[]; bestOf: number; target: number }) {
  const { act } = useApp();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const summaries = summarizeCricket(players.length, legs);
  const winner = summaries.findIndex((player) => player.legsWon >= target);
  const score = summaries.map((player) => player.legsWon).join(":");
  const summary = winner >= 0 ? `${players[winner].name} dobiva ${score}` : score;
  return (
    <div className="space-y-4">
      <SectionTitle>REZULTAT</SectionTitle>
      <Card>
        <div className="text-center text-xs tracking-[0.16em] text-orange-400">{bestOf === 1 ? "1 LEG" : `BEST OF ${bestOf}`}</div>
        <p className="mt-3 text-center font-display text-3xl text-orange-400">{score}</p>
        <p className="mt-2 text-center text-sm text-zinc-300">{winner >= 0 && players[winner] ? <><MemberName name={players[winner].name} /> dobiva {score}</> : score}</p>
      </Card>
      {summaries.map((player, index) => (
        <Card key={players[index]?.key ?? index}>
          <div className="font-display text-xl">{player.legsWon >= target ? "★ " : ""}{players[index] ? <MemberName name={players[index].name} /> : ""}</div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Legovi" value={String(player.legsWon)} />
            <Stat label="Prosječna ruka" value={player.averageRound == null ? "—" : formatHr(player.averageRound, 1)} />
            <Stat label="Najbrža pobjeda" value={player.fastest == null ? "—" : `${player.fastest}. ruka`} />
          </dl>
        </Card>
      ))}
      <div className="space-y-2">
        {legs.map((leg, index) => (
          <div key={`${leg.round}-${index}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
            Leg {index + 1}: {players[leg.winnerIndex] ? <MemberName name={players[leg.winnerIndex].name} /> : ""} u {leg.round}. ruci
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
                type: "cricket",
                playedAt: new Date().toISOString(),
                summary,
                players: toCricketPlayers(players, summaries, target),
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

function defaultPair(people: Person[], userId?: string): string[] {
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
