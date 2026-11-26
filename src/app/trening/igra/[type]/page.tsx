"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { GameScreen } from "@/components/scoreboard";
import type { SavedGame } from "@/lib/shared/types";

const ALLOWED = new Set(["501", "cricket", "marathon", "highscore"]);

export default function GamePage() {
  const params = useParams<{ type: string }>();
  const type = params.type as SavedGame["type"];
  if (!ALLOWED.has(type)) {
    return (
      <p className="text-sm">
        Nepoznata igra. <Link href="/trening" className="text-orange-300">Natrag</Link>
      </p>
    );
  }
  return (
    <div>
      <Link href="/trening" className="mb-3 block text-sm text-orange-300">← Trening</Link>
      <GameScreen type={type} />
    </div>
  );
}
