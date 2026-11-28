"use client";

import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { formatEur, treasuryBalance } from "@/lib/shared/blagajna";

export function BlagajnaTeaser() {
  const { user, data } = useApp();
  if (user?.role !== "admin") return null;
  const balance = treasuryBalance(data.treasury);
  return (
    <Link href="/blagajna" className="block rounded-2xl border border-orange-500/40 bg-[#141418] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-300">Klupska blagajna</div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Gotovina</div>
          <div className="font-display text-2xl text-orange-300">{formatEur(balance.cash)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Račun udruge</div>
          <div className="font-display text-2xl">{formatEur(balance.bank)}</div>
        </div>
      </div>
    </Link>
  );
}
