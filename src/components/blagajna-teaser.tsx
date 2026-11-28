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
      <div className="font-display mt-1 text-3xl">{formatEur(balance.total)}</div>
      <div className="text-xs text-zinc-500">Gotovina {formatEur(balance.cash)} · račun {formatEur(balance.bank)}</div>
    </Link>
  );
}
