"use client";

import { useEffect, useState } from "react";
import { FoldCard, useStoredOpen } from "@/components/dash-fold";
import { relativeWhen, type NewsItem } from "@/lib/shared/vijesti";

const STORAGE_KEY = "kq.fold.vijesti";

export function VijestiTeaser() {
  const [open, toggle] = useStoredOpen(STORAGE_KEY);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  useEffect(() => {
    if (!open || items) return;
    let cancelled = false;
    fetch("/api/vijesti", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; items?: NewsItem[] }) => {
        if (cancelled) return;
        setItems(body.ok && body.items?.length ? body.items.slice(0, 3) : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, items]);
  return (
    <FoldCard title="PIKADO VIJESTI" storageKey={STORAGE_KEY} href="/vijesti" linkLabel="Sve" open={open} onToggle={toggle}>
      {open && items === null ? <p className="mt-3 text-sm text-zinc-500">Učitavam…</p> : null}
      {items && !items.length ? <p className="mt-3 text-sm text-zinc-500">Nema novih naslova.</p> : null}
      {items?.length ? (
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
      ) : null}
    </FoldCard>
  );
}
