"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { formatDateHr } from "@/lib/shared/dates";
import { isZagrebArea, placeLine, type Tournament } from "@/lib/shared/turniri";

export function TurniriTeaser() {
  const [items, setItems] = useState<Tournament[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/turniri", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; tournaments?: Tournament[] }) => {
        if (cancelled || !body.ok || !body.tournaments) return;
        const next = body.tournaments.filter((item) => isZagrebArea(item.city)).slice(0, 3);
        setItems(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  if (!items?.length) return null;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>NADOLAZEĆI TURNIRI</SectionTitle>
        <Link href="/turniri" className="text-xs text-orange-300">Svi</Link>
      </div>
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
    </Card>
  );
}
