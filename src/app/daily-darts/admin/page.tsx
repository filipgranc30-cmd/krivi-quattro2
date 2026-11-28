"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { prepareImage } from "@/lib/client/prepare-image";
import { MemberName } from "@/components/member-name";
import { Card, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui";
import type { DailyDartsScoring, DailyDartsStat } from "@/lib/shared/types";
import { normName } from "@/lib/shared/util";

export default function DailyDartsAdminPage() {
  const { data, user, act, refresh } = useApp();
  const daily = data.dailyDarts;
  const [message, setMessage] = useState("");
  const [names, setNames] = useState(daily.players.map((player) => player.name).join("\n"));
  const [date, setDate] = useState("");
  const [lockTime, setLockTime] = useState("13:30");
  const [dayId, setDayId] = useState(daily.days[0]?.id ?? "");
  const [tournamentId, setTournamentId] = useState((daily.tournamentIds || ["10872", "10873"]).join(", "));
  const [syncing, setSyncing] = useState(false);
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
        <h2 className="font-display text-lg">PDC raspored</h2>
        <p className="text-xs text-zinc-400">
          Aktivni turniri, odvojeni zarezom. 10872 je proba (Players Championship Finals), 10873 je svjetsko prvenstvo. Hobby plan ima jedan dnevni cron, a otvaranje stranice povlači raspored najviše svakih 15 minuta.
        </p>
        <label className="block text-xs text-zinc-400">
          ID-evi turnira
          <input value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-base text-white" />
        </label>
        <GhostButton className="w-full" onClick={() => run({ op: "dailySetTournament", tournamentId })}>Spremi ID</GhostButton>
        <p className="text-xs text-zinc-500">Zadnje: {daily.lastSyncAt ? new Date(daily.lastSyncAt).toLocaleString("hr-HR") : "nije sinkronizirano"}{daily.lastSyncMessage ? ` · ${daily.lastSyncMessage}` : ""}</p>
        <PrimaryButton
          className="w-full"
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            const response = await fetch("/api/daily-darts/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }) });
            const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
            setMessage(body.message || body.error || "Sinkronizacija nije uspjela.");
            await refresh();
            setSyncing(false);
          }}
        >
          {syncing ? "Sinkroniziram…" : "Sinkroniziraj sada"}
        </PrimaryButton>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg">Bodovanje</h2>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["win", "Pobjeda"],
              ["averageBase", "Prosjek od"],
              ["averagePoint", "Bod po prosjeku"],
              ["oneEighty", "180"],
              ["oneForty", "140+"],
              ["oneHundred", "100+"],
              ["checkoutPercentStep", "Izlaz % korak"],
              ["checkoutPercentPoint", "Bod po koraku"],
              ["checkoutOver100", "Izlazi 100+"],
              ["highest100", "Izlaz 100–149"],
              ["highest150", "Izlaz 150–169"],
              ["highest170", "Izlaz 170"],
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
          source={match.source}
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
              <MemberName name={player.name} />
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
  source,
  hint,
  playerAId,
  playerBId,
  names,
  existing,
  onSave,
  onDelete,
}: {
  title: string;
  source?: string;
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
          <h3 className="font-semibold">{title}{source === "pdc" ? " · PDC" : ""}</h3>
          {hint && <p className="text-xs text-zinc-500">{hint}</p>}
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-orange-500/40 px-3 text-sm font-semibold text-orange-200">
            Učitaj sliku
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setNote("Čitam sliku…");
                try {
                  const image = await prepareImage(file);
                  const body = new FormData();
                  body.set("image", image, "statistika.jpg");
                  body.set("playerA", names.get(playerAId) ?? "");
                  body.set("playerB", names.get(playerBId) ?? "");
                  const response = await fetch("/api/daily-darts/scan", { method: "POST", body });
                  const json = (await response.json()) as {
                    ok?: boolean;
                    error?: string;
                    summary?: string;
                    swapped?: boolean;
                    weak?: boolean;
                    winnerPlayer?: "a" | "b" | null;
                    a?: SideValues;
                    b?: SideValues;
                  };
                  if (!json.ok || !json.a || !json.b) {
                    setNote(json.error || "Sliku nisam uspio pročitati.");
                    return;
                  }
                  setRows([fill(playerAId, json.a), fill(playerBId, json.b)]);
                  if (json.winnerPlayer === "a") setWinner(playerAId);
                  if (json.winnerPlayer === "b") setWinner(playerBId);
                  setNote(`${json.summary ?? "Pročitano"}. ${json.swapped ? "Strane su zamijenjene prema prezimenima. " : ""}${json.weak ? "Imena se slabo poklapaju, provjeri strane. " : ""}Provjeri brojke prije spremanja.`);
                } catch (error) {
                  setNote(error instanceof Error ? error.message : "Sliku nisam učitao.");
                }
              }}
            />
          </label>
          <GhostButton onClick={() => onDelete()}>Obriši</GhostButton>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1.3fr)_1fr_1fr] items-center gap-2 text-xs text-zinc-400">
        <span />
        <span className="truncate text-center font-semibold text-white">{short(names.get(playerAId))}</span>
        <span className="truncate text-center font-semibold text-white">{short(names.get(playerBId))}</span>
        <span>Pobjeda</span>
        {[playerAId, playerBId].map((playerId) => (
          <button key={playerId} type="button" onClick={() => setWinner(playerId)} className={`h-11 rounded-xl border text-sm font-bold ${winner === playerId ? "border-orange-500 bg-orange-500 text-black" : "border-white/15 text-white"}`}>
            {winner === playerId ? "Da" : "Ne"}
          </button>
        ))}
        <span>Prosjek (3 strelice)</span>
        {rows.map((row, index) => (
          <input key={`avg-${row.playerId}`} inputMode="decimal" value={row.average} onChange={(event) => patch(index, "average", event.target.value)} className={cell} />
        ))}
        <span>Bacanja od 180</span>
        {rows.map((row, index) => (
          <input key={`180-${row.playerId}`} inputMode="numeric" value={row.count180} onChange={(event) => patch(index, "count180", event.target.value)} className={cell} />
        ))}
        <span>Bacanja od 140+</span>
        {rows.map((row, index) => (
          <input key={`140-${row.playerId}`} inputMode="numeric" value={row.count140} onChange={(event) => patch(index, "count140", event.target.value)} className={cell} />
        ))}
        <span>Bacanja od 100+</span>
        {rows.map((row, index) => (
          <input key={`100-${row.playerId}`} inputMode="numeric" value={row.count100} onChange={(event) => patch(index, "count100", event.target.value)} className={cell} />
        ))}
        <span>Izlazi</span>
        {rows.map((row, index) => (
          <span key={`out-${row.playerId}`} className="flex items-center gap-1">
            <input inputMode="numeric" aria-label="Pogođeno" value={row.checkoutHits} onChange={(event) => patch(index, "checkoutHits", event.target.value)} className={cell} />
            <span>/</span>
            <input inputMode="numeric" aria-label="Pokušaji" value={row.checkoutAttempts} onChange={(event) => patch(index, "checkoutAttempts", event.target.value)} className={cell} />
          </span>
        ))}
        <span>Izlazi 100+</span>
        {rows.map((row, index) => (
          <input key={`c100-${row.playerId}`} inputMode="numeric" value={row.checkoutOver100} onChange={(event) => patch(index, "checkoutOver100", event.target.value)} className={cell} />
        ))}
        <span>Najveći izlaz</span>
        {rows.map((row, index) => (
          <input key={`high-${row.playerId}`} inputMode="numeric" value={row.highestCheckout} onChange={(event) => patch(index, "highestCheckout", event.target.value)} className={cell} />
        ))}
      </div>
      {note && <p className="text-sm text-orange-200">{note}</p>}
      <PrimaryButton
        className="w-full"
        onClick={async () => {
          const payload = rows.map((row) => ({
            playerId: row.playerId,
            won: winner === row.playerId,
            average: Number(row.average.replace(",", ".")) || 0,
            count180: num(row.count180),
            count140: num(row.count140),
            count100: num(row.count100),
            checkoutHits: num(row.checkoutHits),
            checkoutAttempts: num(row.checkoutAttempts),
            checkoutOver100: num(row.checkoutOver100),
            highestCheckout: num(row.highestCheckout),
          }));
          setNote((await onSave(payload)) ?? "Statistika je spremljena.");
        }}
      >
        Spremi statistiku
      </PrimaryButton>
    </Card>
  );
}

const cell = "h-11 w-full rounded-xl border border-white/15 bg-black px-2 text-center text-base text-white";

function short(name?: string) {
  return name?.split(" ")[0] || "Igrač";
}

type SideValues = {
  average: number;
  count180: number;
  count140: number;
  count100: number;
  checkoutHits: number;
  checkoutAttempts: number;
  checkoutOver100: number;
  highestCheckout: number;
};

function fill(playerId: string, side: SideValues) {
  return {
    playerId,
    average: String(side.average).replace(".", ","),
    count180: String(side.count180),
    count140: String(side.count140),
    count100: String(side.count100),
    checkoutHits: String(side.checkoutHits),
    checkoutAttempts: String(side.checkoutAttempts),
    checkoutOver100: String(side.checkoutOver100),
    highestCheckout: String(side.highestCheckout),
  };
}

function blank(playerId: string, stat?: DailyDartsStat) {
  return {
    playerId,
    average: stat ? String(stat.average).replace(".", ",") : "",
    count180: String(stat?.count180 ?? 0),
    count140: String(stat?.count140 ?? 0),
    count100: String(stat?.count100 ?? 0),
    checkoutHits: String(stat?.checkoutHits ?? 0),
    checkoutAttempts: String(stat?.checkoutAttempts ?? 0),
    checkoutOver100: String(stat?.checkoutOver100 ?? 0),
    highestCheckout: String(stat?.highestCheckout ?? 0),
  };
}

function num(value: string) {
  return Math.max(0, Math.round(Number(value) || 0));
}
