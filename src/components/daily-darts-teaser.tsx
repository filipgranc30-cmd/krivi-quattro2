"use client";

import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { todayZagreb } from "@/lib/shared/dates";
import { TEASER_END, TEASER_START } from "@/lib/shared/daily-darts";

export function DailyDartsTeaser() {
  const today = todayZagreb();
  if (today < TEASER_START || today > TEASER_END) return null;
  const trial = today <= "2026-11-29";
  return (
    <Card>
      <div className="flex items-center gap-2">
        <SectionTitle>DAILY DARTS</SectionTitle>
        {trial && <span className="rounded-full border border-orange-500/50 px-2 py-0.5 text-[10px] font-semibold text-orange-200">Proba</span>}
      </div>
      <p className="mt-2 text-sm text-zinc-300">
        {trial ? "Proba: Players Championship Finals u Mineheadu. Odaberi 4 igrača prije prvog meča." : "PDC World Darts Championship. Odaberi 4 igrača prije prvog meča dana."}
      </p>
      <Link href="/daily-darts" className="mt-3 inline-block text-sm font-semibold text-orange-300">Otvori igru</Link>
    </Card>
  );
}
