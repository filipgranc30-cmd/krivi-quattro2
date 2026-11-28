"use client";

import { useMemo, useState } from "react";
import { ProofLightbox, ProofThumb } from "@/components/highscore-proof";
import { SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";
import { trainingBoards, trainingPlayers, type ScoreProof, type TrainingBoard } from "@/lib/shared/training-rank";
import { normName } from "@/lib/shared/util";
import { useApp } from "./app-provider";

export function HighScoreStandings() {
  const { data, user } = useApp();
  const board = useMemo(() => {
    const players = trainingPlayers({ members: data.members, roster: data.roster, user });
    return trainingBoards(players, data.games).find((item) => item.type === "highscore");
  }, [data.games, data.members, data.roster, user]);
  if (!board) return null;
  return <TrainingBoardPanel board={board} heading="LJESTVICA" />;
}

export function TrainingBoardPanel({ board, heading }: { board: TrainingBoard; heading?: string }) {
  const { user } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [proof, setProof] = useState<ScoreProof | null>(null);
  const mine = (name: string, userId?: string) =>
    Boolean(user && (normName(name) === normName(user.name) || userId === user.id));

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>{heading || board.title}</SectionTitle>
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
                  <td className={`sticky left-8 z-10 ${bg} border-t border-white/10 px-2 py-2 font-semibold`}>
                    <span className="inline-flex items-center gap-2">
                      {row.name}
                      {board.type === "highscore" && row.proof && <ProofThumb proof={row.proof} onOpen={() => setProof(row.proof ?? null)} />}
                    </span>
                  </td>
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
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                  <span>{when.date} {when.time}</span>
                  <span className="flex items-center gap-2">
                    {board.type === "highscore" && match.hasProof && (
                      <ProofThumb
                        proof={{ id: match.id, rev: match.proofRev ?? 0, userId: match.proofUserId }}
                        onOpen={() => setProof({ id: match.id, rev: match.proofRev ?? 0, userId: match.proofUserId })}
                      />
                    )}
                    <span className="font-semibold text-orange-300">{match.score}</span>
                  </span>
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
      {proof && <ProofLightbox proof={proof} onClose={() => setProof(null)} onChanged={() => setProof(null)} />}
    </div>
  );
}
