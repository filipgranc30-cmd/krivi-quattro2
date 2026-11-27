"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";
import { trainingBoards, trainingPlayers, type TrainingBoard } from "@/lib/shared/training-rank";
import { normName } from "@/lib/shared/util";

export default function TrainingStatsPage() {
  const { data, user } = useApp();
  const boards = useMemo(() => {
    const players = trainingPlayers({ members: data.members, roster: data.roster, user });
    return trainingBoards(players, data.games);
  }, [data.games, data.members, data.roster, user]);
  const [tab, setTab] = useState<TrainingBoard["type"]>("501");
  const [openId, setOpenId] = useState<string | null>(null);
  const board = boards.find((item) => item.type === tab) ?? boards[0];
  const mine = (name: string, userId?: string) =>
    Boolean(user && (normName(name) === normName(user.name) || userId === user.id));

  return (
    <div className="space-y-4">
      <Link href="/trening" className="text-sm text-orange-300">← Trening</Link>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/5 p-1 text-xs">
        {boards.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => {
              setTab(item.type);
              setOpenId(null);
            }}
            className={`h-10 rounded-lg font-bold ${item.type === board.type ? "bg-orange-500 text-black" : "text-zinc-300"}`}
          >
            {item.tab}
          </button>
        ))}
      </div>
      <div>
        <SectionTitle>{board.title}</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">{board.subtitle}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="bg-[#1c1c22] text-[10px] uppercase tracking-wider text-zinc-400">
              <th className="sticky left-0 z-10 bg-[#1c1c22] px-2 py-2 text-left">#</th>
              <th className="sticky left-8 z-10 bg-[#1c1c22] px-2 py-2 text-left">Igrač</th>
              {board.columns.map((column) => (
                <th key={column.label} title={column.hint} className="px-2 py-2 text-right font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row) => {
              const highlighted = mine(row.name, row.userId);
              const bg = highlighted ? "bg-[#3a220c]" : "bg-[#141418]";
              return (
                <tr key={row.name} className={`${bg} ${highlighted ? "text-orange-100" : ""}`}>
                  <td className={`sticky left-0 z-10 ${bg} border-t border-white/10 px-2 py-2 tabular-nums text-zinc-400`}>{row.rank}</td>
                  <td className={`sticky left-8 z-10 ${bg} border-t border-white/10 px-2 py-2 font-semibold`}>{row.name}</td>
                  {row.values.map((value, index) => (
                    <td key={`${row.name}-${board.columns[index]?.label}`} className="border-t border-white/10 px-2 py-2 text-right tabular-nums">
                      {value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!board.rows.length && <p className="text-sm text-zinc-400">Nema igrača za prikaz.</p>}
      <div className="space-y-2">
        {board.matches.map((match) => {
          const when = formatWhen(match.playedAt);
          const open = openId === match.id;
          return (
            <div key={match.id} className="rounded-xl border border-white/10">
              <button type="button" className="w-full px-3 py-2 text-left" onClick={() => setOpenId(open ? null : match.id)}>
                <div className="flex justify-between gap-3 text-xs text-zinc-400">
                  <span>{when.date} {when.time}</span>
                  <span className="font-semibold text-orange-300">{match.score}</span>
                </div>
                <div className="mt-1 text-sm">{match.players}</div>
                <div className="text-xs text-zinc-400">{match.averages}</div>
              </button>
              {open && (
                <div className="space-y-3 border-t border-white/10 px-3 py-3">
                  {match.playersDetail.map((player) => (
                    <div key={player.name}>
                      <div className="font-semibold">{player.won ? "★ " : ""}{player.name}</div>
                      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-300">
                        {player.lines.map((line) => (
                          <div key={line.label} className="flex justify-between gap-2">
                            <dt className="text-zinc-500">{line.label}</dt>
                            <dd>{line.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!board.matches.length && <p className="text-sm text-zinc-400">Još nema spremljenih mečeva.</p>}
      </div>
    </div>
  );
}
