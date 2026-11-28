"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { MemberName } from "@/components/member-name";
import { Card, GhostButton, SectionTitle } from "@/components/ui";
import { buildClubElo, type EloEvent } from "@/lib/shared/elo";

export default function EloPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { data, user, act } = useApp();
  const admin = user?.role === "admin";
  const board = useMemo(
    () => buildClubElo({ games: data.games, elo: data.elo, members: data.members }),
    [data.games, data.elo, data.members],
  );
  const player = board.standings.find((row) => row.userId === id);
  const history = board.events.filter((event) => event.aId === id || event.bId === id);
  const points = [board.startRating, ...history.map((event) => (event.aId === id ? event.ratingA : event.ratingB))];

  return (
    <div className="space-y-4">
      <Link href="/elo" className="text-sm text-orange-300">Natrag na rang listu</Link>
      <SectionTitle>POVIJEST</SectionTitle>
      <Card>
        <div className="font-display text-2xl">{player ? <MemberName name={player.name} /> : "Igrač"}</div>
        <div className="mt-1 font-display text-4xl text-orange-300">{player?.rating ?? board.startRating}</div>
        <p className="text-sm text-zinc-400">{player?.matches ?? 0} mečeva · {player?.wins ?? 0}-{player?.losses ?? 0}</p>
        <RatingGraph points={points} />
      </Card>
      <div className="space-y-2">
        {history.slice().reverse().map((event) => (
          <MatchRow key={event.id} event={event} userId={id} admin={admin} onVoid={() => act({ op: "eloVoid", id: event.id, source: event.source })} />
        ))}
        {!history.length && <p className="text-sm text-zinc-500">Još nema bodovanih mečeva.</p>}
      </div>
    </div>
  );
}

function playerLegs(event: EloEvent, userId: string) {
  const [left, right] = event.legs.split(":");
  return event.aId === userId ? `${left}:${right}` : `${right}:${left}`;
}

function MatchRow({ event, userId, admin, onVoid }: { event: EloEvent; userId: string; admin: boolean; onVoid: () => void }) {
  const mine = event.aId === userId;
  const delta = mine ? event.deltaA : event.deltaB;
  const opponent = mine ? event.bName : event.aName;
  const won = mine ? event.aWon : !event.aWon;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 text-sm">
        <div>
          <div className={won ? "text-emerald-300" : "text-red-300"}>{won ? "Pobjeda" : "Poraz"} · <MemberName name={opponent} /></div>
          <div className="text-xs text-zinc-500">
            {event.at.slice(0, 10).split("-").reverse().join(".")} · {event.source === "training" ? "Trening" : "Izazov"}
            {event.format ? ` · ${event.format}` : ""}{event.legs ? ` · ${playerLegs(event, userId)}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-display text-xl ${delta > 0 ? "text-emerald-300" : "text-red-300"}`}>{delta > 0 ? `+${delta}` : delta}</div>
          <div className="text-xs text-zinc-500">{mine ? event.ratingA : event.ratingB}</div>
        </div>
      </div>
      {admin && <GhostButton className="mt-3" onClick={onVoid}>Poništi meč</GhostButton>}
    </Card>
  );
}

function RatingGraph({ points }: { points: number[] }) {
  const width = 320;
  const height = 120;
  const min = Math.min(...points) - 20;
  const max = Math.max(...points) + 20;
  const span = Math.max(1, max - min);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 16) + 8;
    const y = height - 12 - ((point - min) / span) * (height - 24);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-32 w-full" role="img" aria-label="Graf rejtinga">
      <polyline fill="none" stroke="#fb923c" strokeWidth="3" points={coords.join(" ")} />
      {coords.map((pair) => {
        const [x, y] = pair.split(",");
        return <circle key={pair} cx={x} cy={y} r="3.5" fill="#fdba74" />;
      })}
    </svg>
  );
}
