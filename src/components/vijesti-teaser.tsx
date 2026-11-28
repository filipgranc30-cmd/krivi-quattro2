"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { relativeWhen, type NewsItem } from "@/lib/shared/vijesti";

export function VijestiTeaser() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/vijesti", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; items?: NewsItem[] }) => {
        if (!cancelled && body.ok && body.items?.length) setItems(body.items.slice(0, 3));
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
        <SectionTitle>PIKADO VIJESTI</SectionTitle>
        <Link href="/vijesti" className="text-xs text-orange-300">Sve</Link>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={`${item.source}-${item.url}`}>
            <a href={item.url} target="_blank" rel="noreferrer" className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">{item.source} · {relativeWhen(item.publishedAt)}</span>
              <span className="mt-0.5 block text-sm font-semibold leading-snug">{item.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
