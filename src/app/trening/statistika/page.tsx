"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { TrainingBoardPanel } from "@/components/training-board";
import { trainingBoards, trainingPlayers, type TrainingBoard } from "@/lib/shared/training-rank";

export default function TrainingStatsPage() {
  const { data, user } = useApp();
  const boards = useMemo(() => {
    const players = trainingPlayers({ members: data.members, roster: data.roster, user });
    return trainingBoards(players, data.games);
  }, [data.games, data.members, data.roster, user]);
  const [tab, setTab] = useState<TrainingBoard["type"]>("501");
  const board = boards.find((item) => item.type === tab) ?? boards[0];

  return (
    <div className="space-y-4">
      <Link href="/trening" className="text-sm text-orange-300">← Trening</Link>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/5 p-1 text-xs">
        {boards.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => setTab(item.type)}
            className={`h-10 rounded-lg font-bold ${item.type === board.type ? "bg-orange-500 text-black" : "text-zinc-300"}`}
          >
            {item.tab}
          </button>
        ))}
      </div>
      <TrainingBoardPanel board={board} />
    </div>
  );
}
