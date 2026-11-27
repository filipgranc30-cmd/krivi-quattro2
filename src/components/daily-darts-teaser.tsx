"use client";

import Link from "next/link";
import { Card, SectionTitle } from "@/components/ui";
import { todayZagreb } from "@/lib/shared/dates";
import { TEASER_END, TEASER_START } from "@/lib/shared/daily-darts";

export function DailyDartsTeaser() {
  const today = todayZagreb();
  if (today < TEASER_START || today > TEASER_END) return null;
  return (
    <Card>
      <SectionTitle>DAILY DARTS</SectionTitle>
      <p className="mt-2 text-sm text-zinc-300">PDC World Darts Championship. Odaberi 4 igrača prije prvog meča dana.</p>
      <Link href="/daily-darts" className="mt-3 inline-block text-sm font-semibold text-orange-300">Otvori igru</Link>
    </Card>
  );
}
