"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FoldCard, useStoredOpen } from "@/components/dash-fold";
import { formatDateHr } from "@/lib/shared/dates";
import { isZagrebArea, placeLine, type Tournament } from "@/lib/shared/turniri";

const STORAGE_KEY = "kq.fold.turniri";

export function TurniriTeaser() {
  const [open, toggle] = useStoredOpen(STORAGE_KEY);
  const [items, setItems] = useState<Tournament[] | null>(null);
  useEffect(() => {
    if (!open || items) return;
    let cancelled = false;
    fetch("/api/turniri", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; tournaments?: Tournament[] }) => {
        if (cancelled) return;
        const next = body.ok && body.tournaments ? body.tournaments.filter((item) => isZagrebArea(item.city)).slice(0, 3) : [];
        setItems(next);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, items]);
  return (
    <FoldCard title="NADOLAZEĆI TURNIRI" storageKey={STORAGE_KEY} href="/turniri" linkLabel="Svi" open={open} onToggle={toggle}>
      {open && items === null ? <p className="mt-3 text-sm text-zinc-500">Učitavam…</p> : null}
      {items && !items.length ? <p className="mt-3 text-sm text-zinc-500">Nema najavljenih turnira.</p> : null}
      {items?.length ? (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href="/turniri" className="block">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold">{item.title}</span>
                  <span className="shrink-0 text-orange-300">{item.time ?? formatDateHr(item.date).slice(0, -5)}</span>
                </div>
                <div className="text-xs text-zinc-500">{formatDateHr(item.date)} {placeLine(item)}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </FoldCard>
  );
}
