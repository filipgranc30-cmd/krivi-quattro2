"use client";

import Link from "next/link";
import { TrainingNav } from "@/components/training-nav";
import { SectionTitle } from "@/components/ui";

const GAMES = [
  { href: "/trening/igra/501", title: "501 DO", text: "Brzi unos rezultata" },
  { href: "/trening/igra/cricket", title: "Cricket", text: "Brzi unos, ruka pobjede" },
  { href: "/trening/igra/marathon", title: "Maraton", text: "20 rundi, Bull pa D20 do D1" },
  { href: "/trening/igra/highscore", title: "High score", text: "Konačni zbroj nakon 15 rundi" },
];

export default function TrainingPage() {
  return (
    <div className="space-y-4">
      <TrainingNav current="igre" />
      <div>
        <SectionTitle>TRENING</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Igre za trening. Rezultat se sprema u statistiku kluba.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game) => (
          <Link key={game.href} href={game.href} className="rounded-2xl border border-white/10 bg-[#141418] p-4">
            <div className="font-display text-xl text-orange-300">{game.title}</div>
            <div className="text-xs text-zinc-500">{game.text}</div>
          </Link>
        ))}
      </div>
      <Link href="/trening/statistika" className="block rounded-2xl border border-orange-500/40 px-4 py-3 text-center font-bold text-orange-200">
        Statistika igrača na treningu
      </Link>
    </div>
  );
}
