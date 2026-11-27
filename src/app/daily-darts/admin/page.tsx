"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui";
import type { DailyDartsScoring, DailyDartsStat } from "@/lib/shared/types";
import { normName } from "@/lib/shared/util";

const STAT_FIELDS: { key: keyof Omit<DailyDartsStat, "matchId" | "playerId" | "won" | "average">; label: string }[] = [
  { key: "count180", label: "180" },
  { key: "checkoutBull", label: "Izlaz bull" },
  { key: "bigFish", label: "Izlaz big fish / 170" },
  { key: "checkoutRound4", label: "Izlaz u 4. ruci" },
  { key: "checkoutRound5", label: "Izlaz u 5. ruci" },
  { key: "nineDarter", label: "9-darter" },
  { key: "checkoutOver100", label: "Izlaz preko 100" },
];

export default function DailyDartsAdminPage() {
  const { data, user, act } = useApp();
  const daily = data.dailyDarts;
  const [message, setMessage] = useState("");
  const [names, setNames] = useState(daily.players.map((player) => player.name).join("\n"));
  const [date, setDate] = useState("");
  const [lockTime, setLockTime] = useState("13:30");
  const [dayId, setDayId] = useState(daily.days[0]?.id ?? "");
  const [scoring, setScoring] = useState<Record<keyof DailyDartsScoring, string>>(() =>
    Object.fromEntries((Object.keys(daily.scoring) as (keyof DailyDartsScoring)[]).map((key) => [key, String(daily.scoring[key])])) as Record<keyof DailyDartsScoring, string>,
  );
  const day = daily.days.find((item) => item.id === dayId) ?? daily.days[0];

  const run = async (action: Parameters<typeof act>[0]) => {
    setMessage((await act(action)) ?? "Spremljeno.");
  };

  if (user?.role !== "admin") {
    return (
      <div className="space-y-3">
        <Link href="/daily-darts" className="text-sm text-orange-300">← Daily Darts</Link>
        <p className="text-sm text-zinc-300">Samo admin može unositi mečeve i statistiku.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/daily-darts" className="text-sm text-orange-300">← Daily Darts</Link>
      <SectionTitle>DAILY DARTS · ADMIN</SectionTitle>
      {message && <p className="text-sm text-orange-200">{message}</p>}

      <Card className="space-y-3">
        <h2 className="font-display text-lg">Bodovanje</h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["win", "Pobjeda"],
              ["averageBase", "Prosjek od"],
              ["averagePoint", "Bod po prosjeku"],
              ["oneEighty", "180"],
              ["checkoutOver100", "Izlaz 100+"],
              ["checkoutRound4", "4. ruka"],
              ["checkoutRound5", "5. ruka"],
              ["checkoutBull", "Bull"],
              ["bigFish", "170"],
              ["nineDarter", "9-darter"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs text-zinc-400">
              {label}
              <input
                inputMode="decimal"
                value={String(scoring[key])}
                onChange={(event) => setScoring({ ...scoring, [key]: event.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-2 text-base text-white"
              />
            </label>
          ))}
        </div>
        <PrimaryButton className="w-full" onClick={() => run({ op: "dailySetScoring", scoring: numberScoring(scoring) })}>Spremi bodove</PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg">Igrači</h2>
        <p className="text-xs text-zinc-400">Jedno ime po retku. Nakon ždrijeba 30.11. zalijepi svih 128.</p>
        <textarea value={names} onChange={(event) => setNames(event.target.value)} rows={8} className="w-full rounded-xl border border-white/15 bg-black p-3 text-sm" />
        <PrimaryButton className="w-full" onClick={() => run({ op: "dailySetPlayers", names: names.split("\n") })}>Spremi popis</PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg">Dani</h2>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-black px-3" />
          <input type="time" value={lockTime} onChange={(event) => setLockTime(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-black px-3" />
        </div>
        <PrimaryButton className="w-full" onClick={() => run({ op: "dailyUpsertDay", day: { date, lockTime: lockTime || "13:30" } })}>Dodaj dan</PrimaryButton>
        <div className="space-y-2">
          {daily.days.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <button type="button" className={item.id === day?.id ? "text-orange-300" : ""} onClick={() => setDayId(item.id)}>{item.date} · {item.lockTime}</button>
              <GhostButton onClick={() => run({ op: "dailyDeleteDay", id: item.id })}>Obriši</GhostButton>
            </div>
          ))}
        </div>
      </Card>

      {day && <MatchEditor dayId={day.id} />}
    </div>
  );
}

function numberScoring(scoring: Record<keyof DailyDartsScoring, string>): DailyDartsScoring {
  const next = {} as DailyDartsScoring;
  for (const key of Object.keys(scoring) as (keyof DailyDartsScoring)[]) next[key] = Number(scoring[key].replace(",", ".")) || 0;
  return next;
}

function MatchEditor({ dayId }: { dayId: string }) {
  const { data, act } = useApp();
  const daily = data.dailyDarts;
  const matches = daily.matches.filter((match) => match.dayId === dayId);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [round, setRound] = useState("");
  const [startTime, setStartTime] = useState("");
  const [message, setMessage] = useState("");
  const names = useMemo(() => new Map(daily.players.map((player) => [player.id, player.name])), [daily.players]);

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <h2 className="font-display text-lg">Novi meč</h2>
        <PlayerField label="Igrač A" players={daily.players} value={playerAId} onChange={setPlayerAId} />
        <PlayerField label="Igrač B" players={daily.players} value={playerBId} onChange={setPlayerBId} />
        <div className="grid grid-cols-2 gap-2">
          <input value={round} onChange={(event) => setRound(event.target.value)} placeholder="Runda" className="h-12 rounded-xl border border-white/15 bg-black px-3" />
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-black px-3" />
        </div>
        {message && <p className="text-sm text-orange-200">{message}</p>}
        <PrimaryButton
          className="w-full"
          onClick={async () => setMessage((await act({ op: "dailyUpsertMatch", match: { dayId, playerAId, playerBId, round, startTime } })) ?? "Meč je dodan.")}
        >
          Dodaj meč
        </PrimaryButton>
      </Card>
      {matches.map((match) => (
        <StatsForm
          key={match.id}
          title={`${names.get(match.playerAId) ?? "A"} – ${names.get(match.playerBId) ?? "B"}`}
          hint={[match.round, match.startTime].filter(Boolean).join(" · ")}
          playerAId={match.playerAId}
          playerBId={match.playerBId}
          names={names}
          existing={daily.stats.filter((stat) => stat.matchId === match.id)}
          onDelete={() => act({ op: "dailyDeleteMatch", id: match.id })}
          onSave={(rows) => act({ op: "dailySetStats", matchId: match.id, rows })}
        />
      ))}
      <p className="text-xs text-zinc-500">Statistiku možeš prepisati s rezultati.com, stranica statistike meča.</p>
    </div>
  );
}

function PlayerField({ label, players, value, onChange }: { label: string; players: { id: string; name: string }[]; value: string; onChange: (id: string) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const selected = players.find((player) => player.id === value);
  const options = players.filter((player) => !text || normName(player.name).includes(normName(text))).slice(0, 8);
  return (
    <label className="relative block text-xs text-zinc-400">
      {label}
      <input
        value={open ? text : selected?.name ?? ""}
        onFocus={() => { setOpen(true); setText(""); }}
        onChange={(event) => { setText(event.target.value); setOpen(true); onChange(""); }}
        className="mt-1 h-12 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-black">
          {options.map((player) => (
            <button key={player.id} type="button" className="block w-full px-3 py-2 text-left text-sm text-white" onClick={() => { onChange(player.id); setText(""); setOpen(false); }}>
              {player.name}
            </button>
          ))}
          {!options.length && <p className="px-3 py-2 text-sm text-zinc-500">Nema igrača.</p>}
        </div>
      )}
    </label>
  );
}

function StatsForm({
  title,
  hint,
  playerAId,
  playerBId,
  names,
  existing,
  onSave,
  onDelete,
}: {
  title: string;
  hint: string;
  playerAId: string;
  playerBId: string;
  names: Map<string, string>;
  existing: DailyDartsStat[];
  onSave: (rows: Omit<DailyDartsStat, "matchId">[]) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const initial = (playerId: string) => existing.find((stat) => stat.playerId === playerId);
  const [winner, setWinner] = useState(initial(playerAId)?.won ? playerAId : initial(playerBId)?.won ? playerBId : "");
  const [rows, setRows] = useState(() => [blank(playerAId, initial(playerAId)), blank(playerBId, initial(playerBId))]);
  const [note, setNote] = useState("");
  const patch = (index: number, key: string, value: string) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  };
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint && <p className="text-xs text-zinc-500">{hint}</p>}
        </div>
        <GhostButton onClick={() => onDelete()}>Obriši</GhostButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[playerAId, playerBId].map((playerId) => (
          <button key={playerId} type="button" onClick={() => setWinner(playerId)} className={`h-12 rounded-xl border text-sm font-bold ${winner === playerId ? "border-orange-500 bg-orange-500 text-black" : "border-white/15"}`}>
            Pobjeda · {names.get(playerId)?.split(" ")[0]}
          </button>
        ))}
      </div>
      {rows.map((row, index) => (
        <div key={row.playerId} className="space-y-2 rounded-xl border border-white/10 p-2">
          <div className="text-sm">{names.get(row.playerId)}</div>
          <label className="block text-xs text-zinc-400">
            Prosjek
            <input inputMode="decimal" value={row.average} onChange={(event) => patch(index, "average", event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-2 text-base text-white" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STAT_FIELDS.map((field) => (
              <label key={field.key} className="text-xs text-zinc-400">
                {field.label}
                <input inputMode="numeric" value={row[field.key]} onChange={(event) => patch(index, field.key, event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-2 text-base text-white" />
              </label>
            ))}
          </div>
        </div>
      ))}
      {note && <p className="text-sm text-orange-200">{note}</p>}
      <PrimaryButton
        className="w-full"
        onClick={async () => {
          const payload = rows.map((row) => ({
            playerId: row.playerId,
            won: winner === row.playerId,
            average: Number(row.average.replace(",", ".")) || 0,
            count180: num(row.count180),
            checkoutBull: num(row.checkoutBull),
            bigFish: num(row.bigFish),
            checkoutRound4: num(row.checkoutRound4),
            checkoutRound5: num(row.checkoutRound5),
            nineDarter: num(row.nineDarter),
            checkoutOver100: num(row.checkoutOver100),
          }));
          setNote((await onSave(payload)) ?? "Statistika je spremljena.");
        }}
      >
        Spremi statistiku
      </PrimaryButton>
    </Card>
  );
}

function blank(playerId: string, stat?: DailyDartsStat) {
  return {
    playerId,
    average: stat ? String(stat.average).replace(".", ",") : "",
    count180: String(stat?.count180 ?? 0),
    checkoutBull: String(stat?.checkoutBull ?? 0),
    bigFish: String(stat?.bigFish ?? 0),
    checkoutRound4: String(stat?.checkoutRound4 ?? 0),
    checkoutRound5: String(stat?.checkoutRound5 ?? 0),
    nineDarter: String(stat?.nineDarter ?? 0),
    checkoutOver100: String(stat?.checkoutOver100 ?? 0),
  };
}

function num(value: string) {
  return Math.max(0, Math.round(Number(value) || 0));
}
