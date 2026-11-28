"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { MemberName } from "@/components/member-name";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui";
import { isTreasurer } from "@/lib/shared/blagajna";
import { buildClubElo, challengeStatusLabel } from "@/lib/shared/elo";
import type { EloChallenge } from "@/lib/shared/types";

const FORMATS = ["501, best of 3", "501, best of 5", "Cricket", ""];

export default function EloPage() {
  const { data, user, act } = useApp();
  const admin = user?.role === "admin";
  const treasurer = isTreasurer(user);
  const board = useMemo(
    () => buildClubElo({ games: data.games, elo: data.elo, members: data.members }),
    [data.games, data.elo, data.members],
  );
  const [opponentId, setOpponentId] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [start, setStart] = useState(String(board.startRating));
  const mine = data.elo.challenges.filter(
    (item) => user && (item.challengerId === user.id || item.opponentId === user.id) && item.status !== "void" && item.status !== "declined",
  );

  const send = async (action: Parameters<typeof act>[0]) => {
    setNote((await act(action)) || "Spremljeno.");
  };

  return (
    <div className="space-y-4">
      <SectionTitle>ELO</SectionTitle>
      <p className="text-sm text-zinc-400">Svi kreću s {board.startRating}. Prvih 10 mečeva K je 40, zatim 32.</p>
      <Card>
        <h2 className="font-display text-lg">Rang lista</h2>
        <ol className="mt-3 divide-y divide-white/10">
          {board.standings.map((row, index) => (
            <li key={row.userId}>
              <Link href={`/elo/${row.userId}`} className="flex items-center gap-3 py-2">
                <span className="w-6 text-sm text-zinc-500">{index + 1}.</span>
                <span className="min-w-0 flex-1 text-sm">
                  <MemberName name={row.name} />
                  <span className="mt-0.5 block text-xs text-zinc-500">{row.matches} mečeva · {row.wins}-{row.losses}</span>
                </span>
                <span className="text-right">
                  <span className="font-display block text-xl text-orange-300">{row.rating}</span>
                  <Trend value={row.trend} played={row.matches > 0} />
                </span>
              </Link>
            </li>
          ))}
          {!board.standings.length && <li className="py-2 text-sm text-zinc-500">Nema članova.</li>}
        </ol>
      </Card>

      <Card>
        <h2 className="font-display text-lg">Izazovi</h2>
        <div className="mt-3 space-y-3">
          {mine.map((item) => (
            <ChallengeCard key={item.id} item={item} userId={user?.id} treasurer={treasurer} onAct={send} />
          ))}
          {!mine.length && <p className="text-sm text-zinc-500">Nema otvorenih izazova.</p>}
        </div>
        <form
          className="mt-4 space-y-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await send({ op: "eloChallenge", opponentId, format, date });
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-zinc-400">Protivnik</span>
            <select value={opponentId} onChange={(event) => setOpponentId(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3" required>
              <option value="">Odaberi člana</option>
              {data.members.filter((member) => member.id !== user?.id).map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-zinc-400">Format</span>
            <select value={format} onChange={(event) => setFormat(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3">
              <option value="501, best of 3">501, best of 3</option>
              <option value="501, best of 5">501, best of 5</option>
              <option value="Cricket">Cricket</option>
              <option value="">Bez formata</option>
            </select>
          </label>
          <Field label="Datum, nije obavezan" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <PrimaryButton className="w-full" type="submit">Izazovi</PrimaryButton>
        </form>
        {note && <p className="mt-2 text-sm text-orange-200">{note}</p>}
      </Card>

      {admin && (
        <Card>
          <h2 className="font-display text-lg">Admin</h2>
          <form
            className="mt-3 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await send({ op: "eloSettings", startRating: Number(start), trainingCounts: board.trainingCounts });
            }}
          >
            <Field label="Početni rejting" value={start} onChange={(event) => setStart(event.target.value)} inputMode="numeric" />
            <PrimaryButton className="w-full" type="submit">Spremi početni rejting</PrimaryButton>
          </form>
          <GhostButton className="mt-2 w-full" onClick={() => send({ op: "eloSettings", startRating: board.startRating, trainingCounts: !board.trainingCounts })}>
            {board.trainingCounts ? "Treninzi se računaju u ELO" : "Treninzi se ne računaju u ELO"}
          </GhostButton>
          <GhostButton className="mt-2 w-full" onClick={() => send({ op: "eloRecompute" })}>Ponovno izračunaj iz povijesti</GhostButton>
        </Card>
      )}
    </div>
  );
}

function Trend({ value, played }: { value: number; played: boolean }) {
  if (!played) return <span className="text-xs text-zinc-500">nov</span>;
  const text = value > 0 ? `+${value}` : String(value);
  return <span className={`text-xs ${value > 0 ? "text-emerald-300" : value < 0 ? "text-red-300" : "text-zinc-500"}`}>{text}</span>;
}

function ChallengeCard({
  item,
  userId,
  treasurer,
  onAct,
}: {
  item: EloChallenge;
  userId?: string;
  treasurer: boolean;
  onAct: (action: { op: "eloRespond"; id: string; accept: boolean } | { op: "eloReport"; id: string; myLegs: number; theirLegs: number } | { op: "eloConfirm"; id: string }) => Promise<void>;
}) {
  const [mine, setMine] = useState("2");
  const [theirs, setTheirs] = useState("0");
  const other = userId === item.challengerId ? item.opponentId : item.challengerId;
  const canConfirm = item.status === "reported" && ((userId === other && userId !== item.reportedById) || (treasurer && userId !== item.reportedById));
  return (
    <div className="rounded-xl border border-white/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MemberName name={item.challengerName} /> <span className="text-zinc-500">vs</span> <MemberName name={item.opponentName} />
          <div className="text-xs text-zinc-500">{item.format || "Bez formata"}{item.date ? ` · ${item.date.split("-").reverse().join(".")}` : ""}</div>
        </div>
        <span className="text-xs text-orange-300">{challengeStatusLabel(item.status)}</span>
      </div>
      {item.status === "pending" && userId === item.opponentId && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <PrimaryButton onClick={() => onAct({ op: "eloRespond", id: item.id, accept: true })}>Prihvati</PrimaryButton>
          <GhostButton onClick={() => onAct({ op: "eloRespond", id: item.id, accept: false })}>Odbij</GhostButton>
        </div>
      )}
      {item.status === "accepted" && (userId === item.challengerId || userId === item.opponentId) && (
        <form
          className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onAct({ op: "eloReport", id: item.id, myLegs: Number(mine), theirLegs: Number(theirs) });
          }}
        >
          <Field label="Moji legovi" value={mine} onChange={(event) => setMine(event.target.value)} inputMode="numeric" />
          <Field label="Njegovi" value={theirs} onChange={(event) => setTheirs(event.target.value)} inputMode="numeric" />
          <PrimaryButton type="submit">Upiši</PrimaryButton>
        </form>
      )}
      {item.status === "reported" && (
        <p className="mt-2 text-xs text-zinc-400">Upisano {item.challengerName} {item.legsChallenger}:{item.legsOpponent} {item.opponentName}. Čeka potvrdu drugog igrača ili Filipa.</p>
      )}
      {canConfirm && <PrimaryButton className="mt-3 w-full" onClick={() => onAct({ op: "eloConfirm", id: item.id })}>Potvrdi rezultat</PrimaryButton>}
    </div>
  );
}
