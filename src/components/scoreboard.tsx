"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { suggestCheckout } from "@/lib/shared/checkout";
import { createMarathon, MARATHON_ROUNDS, MARATHON_TARGETS, marathonWinner, throwMarathonDart, type MarathonState } from "@/lib/shared/marathon";
import { checkoutLabel } from "@/lib/shared/quick501";
import { DEFAULT_TRAINING_PLAYER } from "@/lib/shared/seed";
import type { AppData, GamePlayerResult, SavedGame } from "@/lib/shared/types";
import { normName } from "@/lib/shared/util";
import { useApp } from "./app-provider";
import { QuickCricket } from "./quick-cricket";
import { Quick501 } from "./quick501";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "./ui";

type Person = { key: string; name: string; userId?: string; demo?: boolean };
type GameType = SavedGame["type"];

export function GameScreen({ type }: { type: GameType }) {
  const { data, user } = useApp();
  const people = useMemo(() => candidates(data, user?.id, user?.name), [data, user]);
  const [picked, setPicked] = useState<string[] | null>(null);
  const selection = picked ?? defaultTrainingPick(people, user?.id);
  const [started, setStarted] = useState(false);
  const [mode501, setMode501] = useState<"quick" | "detail">("quick");
  const [modeCricket, setModeCricket] = useState<"quick" | "detail">("quick");
  const [legsToWin, setLegsToWin] = useState(2);
  const [setsToWin, setSetsToWin] = useState(1);
  const [rounds, setRounds] = useState(type === "marathon" ? 10 : 8);
  const selected = people.filter((person) => selection.includes(person.key));

  if (type === "501" && mode501 === "quick") {
    return <Quick501 people={people} userId={user?.id} onDetailed={() => setMode501("detail")} />;
  }
  if (type === "cricket" && modeCricket === "quick") {
    return <QuickCricket people={people} userId={user?.id} onDetailed={() => setModeCricket("detail")} />;
  }

  if (!started) {
    return (
      <div className="space-y-4">
        <div>
          <SectionTitle>{titleOf(type)}</SectionTitle>
          <p className="mt-1 text-sm text-zinc-400">
            {type === "marathon"
              ? "20 rundi po 3 strelice. Meta ide Bull, D20, D19 … D1. Pogodak odmah prebacuje na sljedeću metu. Igra staje nakon 20 rundi ili kad netko pogodi D1."
              : type === "501" || type === "cricket"
                ? "Detaljno bodovanje. Odaberi tko igra. Redoslijed je red bacanja."
                : "Odaberi tko igra. Redoslijed je red bacanja."}
          </p>
        </div>
        <div className="space-y-2">
          {people.map((person) => {
            const on = selection.includes(person.key);
            return (
              <button
                key={person.key}
                type="button"
                onClick={() =>
                  setPicked(selection.includes(person.key) ? selection.filter((id) => id !== person.key) : [...selection, person.key])
                }
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${on ? "border-orange-500 bg-orange-500/10" : "border-white/10"}`}
              >
                <span>{person.name}</span>
                <span className="text-xs text-zinc-400">{on ? `${selection.indexOf(person.key) + 1}.` : "Dodaj"}</span>
              </button>
            );
          })}
        </div>
        {type === "501" && (
          <Card className="grid grid-cols-2 gap-3">
            <Stepper label="Legovi" value={legsToWin} min={1} max={5} onChange={setLegsToWin} />
            <Stepper label="Setovi" value={setsToWin} min={1} max={3} onChange={setSetsToWin} />
          </Card>
        )}
        {type === "highscore" && (
          <Card>
            <Stepper label="Runde" value={rounds} min={5} max={20} onChange={setRounds} />
          </Card>
        )}
        <PrimaryButton className="w-full" disabled={!selected.length} onClick={() => setStarted(true)}>
          Kreni
        </PrimaryButton>
        {(type === "501" || type === "cricket") && (
          <button type="button" className="w-full text-center text-sm text-orange-300 underline" onClick={() => (type === "501" ? setMode501("quick") : setModeCricket("quick"))}>
            Brzi unos
          </button>
        )}
      </div>
    );
  }

  if (type === "501") return <Game501 players={selected} legsToWin={legsToWin} setsToWin={setsToWin} />;
  if (type === "cricket") return <GameCricket players={selected} />;
  if (type === "marathon") return <GameMarathon players={selected} />;
  return <GameTotals type="highscore" players={selected} rounds={rounds} />;
}

function candidates(data: AppData, userId?: string, userName?: string): Person[] {
  const list: Person[] = [];
  const seen = new Set<string>();
  const add = (person: Person) => {
    const key = normName(person.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push(person);
  };
  for (const member of data.members) add({ key: member.id, name: member.name, userId: member.id });
  if (userId && userName) add({ key: userId, name: userName, userId });
  for (const player of data.roster) {
    if (player.demo) continue;
    add({ key: player.id, name: player.name });
  }
  add({ key: "karlo-sedmak", name: DEFAULT_TRAINING_PLAYER });
  return list;
}

function defaultTrainingPick(people: Person[], userId?: string): string[] {
  const ids: string[] = [];
  const karlo = people.find((person) => normName(person.name) === normName(DEFAULT_TRAINING_PLAYER));
  if (karlo) ids.push(karlo.key);
  const me = userId ? people.find((person) => person.userId === userId || person.key === userId) : undefined;
  if (me && !ids.includes(me.key)) ids.push(me.key);
  return ids;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="h-11 w-11 rounded-xl border border-white/15 text-xl" onClick={() => onChange(Math.max(min, value - 1))}>–</button>
        <div className="font-display min-w-8 text-center text-2xl">{value}</div>
        <button type="button" className="h-11 w-11 rounded-xl border border-white/15 text-xl" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}

type P501 = {
  key: string;
  name: string;
  userId?: string;
  remaining: number;
  darts: number;
  scored: number;
  legDarts: number;
  first9Scored: number;
  first9Darts: number;
  legs: number;
  sets: number;
  attempts: number;
  checkouts: number;
  best: number;
  legsWon: number;
  bestLegDarts: number;
  c180: number;
  c140: number;
  c100: number;
  highest: number;
};

function Game501({ players, legsToWin, setsToWin }: { players: Person[]; legsToWin: number; setsToWin: number }) {
  const blank = (): P501[] =>
    players.map((person) => ({
      key: person.key,
      name: person.name,
      userId: person.userId,
      remaining: 501,
      darts: 0,
      scored: 0,
      legDarts: 0,
      first9Scored: 0,
      first9Darts: 0,
      legs: 0,
      sets: 0,
      attempts: 0,
      checkouts: 0,
      best: 0,
      legsWon: 0,
      bestLegDarts: 0,
      c180: 0,
      c140: 0,
      c100: 0,
      highest: 0,
    }));
  const [list, setList] = useState(blank);
  const [turn, setTurn] = useState(0);
  const [entry, setEntry] = useState("");
  const [mode, setMode] = useState<"total" | "dart">("total");
  const [mult, setMult] = useState<1 | 2 | 3>(1);
  const [visit, setVisit] = useState<number[]>([]);
  const [askDouble, setAskDouble] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [winner, setWinner] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const current = list[turn];

  const snapshot = () => JSON.stringify({ list, turn, visit, winner });
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    const parsed = JSON.parse(prev) as { list: P501[]; turn: number; visit: number[]; winner: number | null };
    setList(parsed.list);
    setTurn(parsed.turn);
    setVisit(parsed.visit);
    setWinner(parsed.winner);
    setHistory((items) => items.slice(0, -1));
    setAskDouble(null);
    setMessage("");
  };

  const finishVisit = (total: number, darts: number, isDouble: boolean) => {
    if (!current || winner != null) return;
    setHistory((items) => [...items.slice(-30), snapshot()]);
    const start = current.remaining;
    const bust = total > 180 || start - total < 0 || start - total === 1 || (start - total === 0 && !isDouble);
    const next = list.map((player) => ({ ...player }));
    const player = next[turn];
    const thrown = Math.max(1, darts);
    player.darts += thrown;
    if (player.legDarts < 9) {
      const room = 9 - player.legDarts;
      const used = Math.min(thrown, room);
      player.first9Scored += bust ? 0 : Math.round(total * (used / thrown));
      player.first9Darts += used;
    }
    player.legDarts += thrown;
    if (start <= 170) player.attempts += 1;
    if (bust) {
      setList(next);
      setTurn((turn + 1) % next.length);
      setVisit([]);
      setEntry("");
      setMessage("Bust");
      setAskDouble(null);
      return;
    }
    player.scored += total;
    player.highest = Math.max(player.highest, total);
    if (total === 180) player.c180 += 1;
    else if (total >= 140) player.c140 += 1;
    else if (total >= 100) player.c100 += 1;
    if (start - total === 0) {
      player.remaining = 0;
      player.checkouts += 1;
      player.best = Math.max(player.best, start);
      player.legs += 1;
      player.legsWon += 1;
      if (!player.bestLegDarts || player.legDarts < player.bestLegDarts) player.bestLegDarts = player.legDarts;
      let done: number | null = null;
      if (setsToWin <= 1) {
        if (player.legs >= legsToWin) done = turn;
      } else if (player.legs >= legsToWin) {
        player.sets += 1;
        next.forEach((item) => {
          item.legs = 0;
          item.remaining = 501;
          item.legDarts = 0;
        });
        if (player.sets >= setsToWin) done = turn;
      }
      if (done == null) {
        next.forEach((item) => {
          item.remaining = 501;
          item.legDarts = 0;
        });
      }
      setList(next);
      setWinner(done);
      setTurn(done == null ? (turn + 1) % next.length : turn);
      setMessage(done == null ? "Leg" : "Pobjeda");
    } else {
      player.remaining = start - total;
      setList(next);
      setTurn((turn + 1) % next.length);
      setMessage("");
    }
    setVisit([]);
    setEntry("");
    setAskDouble(null);
  };

  const submitTotal = () => {
    const total = Number(entry);
    if (!Number.isInteger(total) || total < 0 || total > 180) {
      setMessage("Upiši zbroj od 0 do 180.");
      return;
    }
    if (current && current.remaining - total === 0) {
      setAskDouble(total);
      return;
    }
    finishVisit(total, 3, false);
  };

  const addDart = (score: number, isDouble: boolean) => {
    if (!current || winner != null || askDouble != null) return;
    const scores = [...visit, score];
    const sum = scores.reduce((total, value) => total + value, 0);
    const start = current.remaining;
    if (sum > start || start - sum === 1 || (start - sum === 0 && !isDouble)) {
      finishVisit(sum, scores.length, false);
      return;
    }
    if (start - sum === 0) {
      finishVisit(sum, scores.length, true);
      return;
    }
    if (scores.length === 3) finishVisit(sum, 3, false);
    else setVisit(scores);
  };

  const legsPlayed = list.reduce((sum, player) => sum + player.legsWon, 0);
  const results: GamePlayerResult[] = list.map((player, index) => ({
    name: player.name,
    userId: player.userId,
    won: winner === index,
    threeDartAvg: player.darts ? round1((player.scored / player.darts) * 3) : 0,
    first9: player.first9Darts ? round1((player.first9Scored / player.first9Darts) * 3) : 0,
    checkoutPct: player.attempts ? round1((player.checkouts / player.attempts) * 100) : 0,
    highestVisit: player.highest,
    count180: player.c180,
    count140: player.c140,
    count100: player.c100,
    bestCheckout: player.best || undefined,
    legsWon: player.legsWon,
    legsPlayed,
    dartsThrown: player.darts,
    pointsScored: player.scored,
    bestLegDarts: player.bestLegDarts || undefined,
    checkout: player.bestLegDarts
      ? checkoutLabel(Math.ceil(player.bestLegDarts / 3), ((player.bestLegDarts - 1) % 3) + 1)
      : undefined,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>501 DOUBLE OUT</SectionTitle>
          <p className="text-xs text-zinc-400">
            do {legsToWin} leg. {setsToWin > 1 ? `· do ${setsToWin} set.` : ""}
          </p>
        </div>
        <GhostButton onClick={undo}>Poništi</GhostButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((player, index) => (
          <div key={player.key} className={`rounded-xl border p-3 ${index === turn && winner == null ? "border-orange-500" : "border-white/10"}`}>
            <div className="truncate text-sm text-zinc-300">{player.name}</div>
            <div className="font-display text-4xl leading-none">{player.remaining}</div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {player.sets > 0 || setsToWin > 1 ? `${player.sets} set · ` : ""}
              {player.legs} leg · prosjek {player.darts ? ((player.scored / player.darts) * 3).toFixed(1) : "0"}
              {player.c180 ? ` · 180: ${player.c180}` : ""}
            </div>
          </div>
        ))}
      </div>
      {winner == null && current && (
        <Card>
          <div className="text-xs tracking-widest text-orange-400">NA REDU · {current.name}</div>
          <div className="font-display mt-1 text-6xl leading-none">{current.remaining}</div>
          <div className="mt-2 text-sm text-orange-200">
            {current.remaining <= 170 ? suggestCheckout(current.remaining) || "Nema izlaza na duplo" : "Izlaz na duplo kreće od 170"}
          </div>
          {message && <div className="mt-2 font-bold text-red-300">{message}</div>}
          <div className="mt-3 flex gap-2">
            <button type="button" className={`h-10 flex-1 rounded-lg border ${mode === "total" ? "border-orange-500 text-orange-300" : "border-white/10"}`} onClick={() => setMode("total")}>Zbroj</button>
            <button type="button" className={`h-10 flex-1 rounded-lg border ${mode === "dart" ? "border-orange-500 text-orange-300" : "border-white/10"}`} onClick={() => setMode("dart")}>Po strelici</button>
          </div>
          {mode === "total" ? (
            <>
              <div className="font-display mt-3 text-center text-4xl">{entry || "0"}</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="h-14 rounded-xl bg-white/5 text-xl font-bold"
                    onClick={() => {
                      if (key === "C") setEntry("");
                      else if (key === "OK") submitTotal();
                      else setEntry((value) => (value + key).replace(/^0+(?=\d)/, "").slice(0, 3));
                    }}
                  >
                    {key === "OK" ? "Upiši" : key === "C" ? "Briši" : key}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[26, 41, 45, 60, 81, 85, 100, 140, 180].map((score) => (
                  <button key={score} type="button" className="h-10 rounded-lg border border-white/10 text-sm" onClick={() => setEntry(String(score))}>
                    {score}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mt-3 text-sm text-zinc-300">Posjeta: {visit.join(" + ") || "—"} ({visit.reduce((sum, value) => sum + value, 0)})</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((value) => (
                  <button key={value} type="button" className={`h-10 rounded-lg border ${mult === value ? "border-orange-500 text-orange-300" : "border-white/10"}`} onClick={() => setMult(value)}>
                    {value === 1 ? "Single" : value === 2 ? "Double" : "Triple"}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {Array.from({ length: 20 }, (_, index) => index + 1).map((number) => (
                  <button key={number} type="button" className="h-12 rounded-lg bg-white/5 font-bold" onClick={() => { addDart(number * mult, mult === 2); setMult(1); }}>
                    {number}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button type="button" className="h-12 rounded-lg border border-white/10" onClick={() => { addDart(25, false); setMult(1); }}>25</button>
                <button type="button" className="h-12 rounded-lg border border-orange-500/50" onClick={() => { addDart(50, true); setMult(1); }}>Bull</button>
                <button type="button" className="h-12 rounded-lg border border-white/10" onClick={() => { addDart(0, false); setMult(1); }}>Promašaj</button>
              </div>
            </>
          )}
          {askDouble != null && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PrimaryButton onClick={() => finishVisit(askDouble, mode === "dart" ? Math.max(visit.length, 1) : 3, true)}>Duplo</PrimaryButton>
              <GhostButton onClick={() => finishVisit(askDouble, 3, false)}>Nije duplo</GhostButton>
            </div>
          )}
        </Card>
      )}
      {winner != null && <ResultBox type="501" summary={`${list[winner].name} dobiva 501`} players={results} />}
    </div>
  );
}

const CRICKET = [20, 19, 18, 17, 16, 15, 25] as const;

function GameCricket({ players }: { players: Person[] }) {
  type P = { key: string; name: string; userId?: string; marks: Record<number, number>; points: number; darts: number; totalMarks: number };
  const fresh = (): P[] => players.map((person) => ({ key: person.key, name: person.name, userId: person.userId, marks: {}, points: 0, darts: 0, totalMarks: 0 }));
  const [list, setList] = useState(fresh);
  const [turn, setTurn] = useState(0);
  const [thrown, setThrown] = useState(0);
  const [mult, setMult] = useState<1 | 2 | 3>(1);
  const [winner, setWinner] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const closed = (player: P, number: number) => (player.marks[number] || 0) >= 3;
  const allClosed = (player: P) => CRICKET.every((number) => closed(player, number));

  const hit = (number: number, marks: number) => {
    if (winner != null) return;
    setHistory((items) => [...items.slice(-30), JSON.stringify({ list, turn, thrown, winner })]);
    const next = list.map((player) => ({ ...player, marks: { ...player.marks } }));
    const player = next[turn];
    player.darts += 1;
    if (number > 0 && marks > 0) {
      const before = player.marks[number] || 0;
      const extra = Math.max(0, before + marks - 3);
      player.marks[number] = before + marks;
      player.totalMarks += marks;
      const someoneOpen = next.some((other, index) => index !== turn && (other.marks[number] || 0) < 3);
      if (extra > 0 && someoneOpen) player.points += extra * number;
    }
    const dartsNow = thrown + 1;
    let win: number | null = null;
    if (allClosed(player)) {
      const beats = next.every((other, index) => index === turn || other.points < player.points || (other.points === player.points && !allClosed(other)));
      if (beats) win = turn;
    }
    setList(next);
    setWinner(win);
    if (win != null) return;
    if (dartsNow >= 3) {
      setThrown(0);
      setTurn((turn + 1) % next.length);
    } else setThrown(dartsNow);
    setMult(1);
  };

  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    const parsed = JSON.parse(prev) as { list: P[]; turn: number; thrown: number; winner: number | null };
    setList(parsed.list);
    setTurn(parsed.turn);
    setThrown(parsed.thrown);
    setWinner(parsed.winner);
    setHistory((items) => items.slice(0, -1));
  };

  const mark = (count: number) => (count >= 3 ? "●●●" : "●".repeat(count));
  const results: GamePlayerResult[] = list.map((player, index) => ({
    name: player.name,
    userId: player.userId,
    won: winner === index,
    cricketMpr: player.darts ? round1(player.totalMarks / (player.darts / 3)) : 0,
    totalScore: player.points,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>CRICKET</SectionTitle>
        <GhostButton onClick={undo}>Poništi</GhostButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-400">
              <th className="py-1">Broj</th>
              {list.map((player, index) => (
                <th key={player.key} className={index === turn && winner == null ? "text-orange-300" : ""}>
                  {player.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRICKET.map((number) => (
              <tr key={number} className="border-t border-white/10">
                <td className="py-2 font-display text-lg">{number === 25 ? "Bull" : number}</td>
                {list.map((player) => (
                  <td key={player.key}>{mark(player.marks[number] || 0)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-white/10">
              <td className="py-2">Bodovi</td>
              {list.map((player) => (
                <td key={player.key} className="font-bold text-orange-300">{player.points}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {winner == null && (
        <Card>
          <div className="text-sm text-orange-300">{list[turn]?.name} · strelica {thrown + 1}/3</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((value) => (
              <button key={value} type="button" className={`h-10 rounded-lg border ${mult === value ? "border-orange-500" : "border-white/10"}`} onClick={() => setMult(value)}>
                {value === 1 ? "S" : value === 2 ? "D" : "T"}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CRICKET.filter((number) => number !== 25).map((number) => (
              <button key={number} type="button" className="h-14 rounded-xl bg-white/5 font-display text-xl" onClick={() => hit(number, mult)}>
                {number}
              </button>
            ))}
            <button type="button" className="h-14 rounded-xl bg-orange-500 font-bold text-black" onClick={() => hit(25, Math.min(2, mult))}>Bull</button>
          </div>
          <button type="button" className="mt-2 h-12 w-full rounded-xl border border-white/15" onClick={() => hit(0, 0)}>
            Promašaj
          </button>
        </Card>
      )}
      {winner != null && <ResultBox type="cricket" summary={`${list[winner].name} zatvara cricket`} players={results} />}
    </div>
  );
}

function GameMarathon({ players }: { players: Person[] }) {
  const [state, setState] = useState<MarathonState>(() => createMarathon(players));
  const [history, setHistory] = useState<MarathonState[]>([]);
  const current = state.players[state.turn];
  const target = current ? MARATHON_TARGETS[current.target] : MARATHON_TARGETS[0];
  const winnerIndex = state.over ? marathonWinner(state) : null;

  const throwDart = (hit: boolean) => {
    if (state.over) return;
    setHistory((items) => [...items.slice(-40), state]);
    setState(throwMarathonDart(state, hit));
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setState(previous);
    setHistory((items) => items.slice(0, -1));
  };

  const results: GamePlayerResult[] = state.players.map((player, index) => ({
    name: player.name,
    userId: player.userId,
    won: winnerIndex === index,
    totalScore: player.hits,
    marathonPoints: player.points,
    threeDartAvg: player.rounds ? round1(player.points / player.rounds) : 0,
    highestVisit: player.bestRound,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>MARATON</SectionTitle>
          <p className="text-xs text-zinc-400">Bull, zatim D20 do D1. Pogodak = 1, bull vrijedi 50, duplo je dvostruki broj.</p>
        </div>
        <GhostButton onClick={undo}>Poništi</GhostButton>
      </div>
      {state.players.map((player, index) => (
        <div key={player.key} className={`rounded-xl border p-3 ${!state.over && index === state.turn ? "border-orange-500" : "border-white/10"}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{player.name}</span>
            <span className="text-xs text-zinc-400">{player.finished ? "D1" : MARATHON_TARGETS[player.target].label}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span>Pogoci <span className="font-display text-2xl text-orange-300">{player.hits}</span></span>
            <span className="text-zinc-400">{player.points} bod · {player.rounds}/{MARATHON_ROUNDS}</span>
          </div>
        </div>
      ))}
      {!state.over && current && (
        <Card>
          <div className="flex items-center justify-between text-sm text-orange-300">
            <span>{current.name}</span>
            <span>Runda {current.rounds + 1}/{MARATHON_ROUNDS} · strelica {state.dart + 1}/3</span>
          </div>
          <div className="mt-2 text-center text-xs tracking-[0.2em] text-zinc-500">TRENUTNA META</div>
          <div className="font-display text-center text-7xl leading-none text-orange-400">{target.label}</div>
          <div className="mt-1 text-center text-sm text-zinc-300">{target.points} bodova ako pogodiš</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="h-20 rounded-2xl bg-orange-500 text-xl font-bold text-black" onClick={() => throwDart(true)}>
              Pogodak
            </button>
            <button type="button" className="h-20 rounded-2xl border border-white/20 text-xl font-bold" onClick={() => throwDart(false)}>
              Promašaj
            </button>
          </div>
        </Card>
      )}
      {state.over && winnerIndex != null && (
        <ResultBox
          type="marathon"
          summary={
            state.players[winnerIndex].finished
              ? `${state.players[winnerIndex].name} pogađa D1 · ${state.players[winnerIndex].hits} pogodaka`
              : `${state.players[winnerIndex].name} ima najviše pogodaka (${state.players[winnerIndex].hits})`
          }
          players={results}
        />
      )}
    </div>
  );
}

function GameTotals({ type, players, rounds }: { type: "highscore"; players: Person[]; rounds: number }) {
  type P = { key: string; name: string; userId?: string; total: number; roundsDone: number; highest: number; c180: number; c140: number; c100: number };
  const [list, setList] = useState<P[]>(() => players.map((person) => ({ key: person.key, name: person.name, userId: person.userId, total: 0, roundsDone: 0, highest: 0, c180: 0, c140: 0, c100: 0 })));
  const [turn, setTurn] = useState(0);
  const [entry, setEntry] = useState("");
  const [message, setMessage] = useState("");
  const done = list.every((player) => player.roundsDone >= rounds);
  const winnerIndex = done ? list.reduce((best, player, index, all) => (player.total > all[best].total ? index : best), 0) : null;

  const submit = () => {
    const total = Number(entry);
    if (!Number.isInteger(total) || total < 0 || total > 180) {
      setMessage("Upiši zbroj 0–180.");
      return;
    }
    const next = list.map((player) => ({ ...player }));
    const player = next[turn];
    player.total += total;
    player.roundsDone += 1;
    player.highest = Math.max(player.highest, total);
    if (total === 180) player.c180 += 1;
    else if (total >= 140) player.c140 += 1;
    else if (total >= 100) player.c100 += 1;
    setList(next);
    setEntry("");
    setMessage("");
    const order = [...next.keys()].filter((index) => next[index].roundsDone < rounds);
    if (!order.length) return;
    const nextTurn = order.find((index) => index > turn) ?? order[0];
    setTurn(nextTurn);
  };

  const results: GamePlayerResult[] = list.map((player, index) => ({
    name: player.name,
    userId: player.userId,
    won: winnerIndex === index,
    threeDartAvg: player.roundsDone ? round1(player.total / player.roundsDone) : 0,
    totalScore: player.total,
    highestVisit: player.highest,
    count180: player.c180,
    count140: player.c140,
    count100: player.c100,
  }));

  return (
    <div className="space-y-4">
      <SectionTitle>{titleOf(type)}</SectionTitle>
      <p className="text-sm text-zinc-400">{rounds} rundi po tri strelice. Najveći zbroj pobjeđuje. Prosjek je zbroj podijeljen s brojem rundi.</p>
      {list.map((player, index) => (
        <div key={player.key} className={`rounded-xl border p-3 ${!done && index === turn ? "border-orange-500" : "border-white/10"}`}>
          <div className="flex justify-between">
            <span>{player.name}</span>
            <span className="text-zinc-400">{player.roundsDone}/{rounds}</span>
          </div>
          <div className="font-display text-4xl">{player.total}</div>
          <div className="text-xs text-zinc-500">prosjek {player.roundsDone ? (player.total / player.roundsDone).toFixed(1) : "0"}</div>
        </div>
      ))}
      {!done && (
        <Card>
          <div className="text-sm text-orange-300">{list[turn]?.name} · runda {list[turn].roundsDone + 1}</div>
          <div className="font-display mt-2 text-center text-5xl">{entry || "0"}</div>
          {message && <div className="mt-1 text-sm text-red-300">{message}</div>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((key) => (
              <button
                key={key}
                type="button"
                className="h-14 rounded-xl bg-white/5 text-xl font-bold"
                onClick={() => {
                  if (key === "C") setEntry("");
                  else if (key === "OK") submit();
                  else setEntry((value) => (value + key).replace(/^0+(?=\d)/, "").slice(0, 3));
                }}
              >
                {key === "OK" ? "Upiši" : key === "C" ? "Briši" : key}
              </button>
            ))}
          </div>
        </Card>
      )}
      {done && winnerIndex != null && <ResultBox type={type} summary={`${list[winnerIndex].name} ima najveći zbroj`} players={results} />}
    </div>
  );
}

function ResultBox({ type, summary, players }: { type: GameType; summary: string; players: GamePlayerResult[] }) {
  const { act } = useApp();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card>
      <SectionTitle>KRAJ</SectionTitle>
      <p className="mt-2 text-lg">{summary}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {players.map((player) => (
          <li key={player.name} className="flex justify-between gap-3">
            <span>{player.won ? "★ " : ""}{player.name}</span>
            <span className="text-orange-300">
              {type === "marathon"
                ? `${player.totalScore ?? 0} pogodaka${player.marathonPoints != null ? ` · ${player.marathonPoints} bod` : ""}`
                : type === "501"
                  ? `prosjek ${player.threeDartAvg ?? 0}${player.legsWon != null ? ` · legovi ${player.legsWon}` : ""}${player.bestLegDarts ? ` · najbolji leg ${player.bestLegDarts}` : ""}${player.checkout ? ` · ${player.checkout}` : ""}${player.count180 ? ` · 180: ${player.count180}` : ""}`
                  : `${player.threeDartAvg != null ? `prosjek ${player.threeDartAvg}` : ""}${player.cricketMpr != null ? `MPR ${player.cricketMpr}` : ""}${player.totalScore != null ? ` · ${player.totalScore}` : ""}`}
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <PrimaryButton
          disabled={saved}
          onClick={async () => {
            const message = await act({ op: "saveGame", game: { type, playedAt: new Date().toISOString(), summary, players } });
            if (message) setError(message);
            else setSaved(true);
          }}
        >
          {saved ? "Spremljeno" : "Spremi"}
        </PrimaryButton>
        <GhostButton onClick={() => router.push("/trening/statistika")}>Statistika</GhostButton>
      </div>
    </Card>
  );
}

function titleOf(type: GameType) {
  if (type === "501") return "501 DO";
  if (type === "cricket") return "CRICKET";
  if (type === "marathon") return "MARATON";
  return "HIGH SCORE";
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
