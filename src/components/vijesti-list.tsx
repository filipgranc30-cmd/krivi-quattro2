"use client";

import { useState } from "react";
import { relativeWhen, type NewsItem, type NewsRegion } from "@/lib/shared/vijesti";

const TABS: { id: "sve" | NewsRegion; label: string }[] = [
  { id: "sve", label: "Sve" },
  { id: "hr", label: "Hrvatska" },
  { id: "world", label: "Svijet" },
];

export function VijestiList({ items }: { items: NewsItem[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("sve");
  const visible = tab === "sve" ? items : items.filter((item) => item.region === tab);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-sm">
        {TABS.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`h-10 rounded-lg font-bold ${tab === item.id ? "bg-orange-500 text-black" : "text-zinc-300"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-400">{visible.length} {visible.length === 1 ? "vijest" : "vijesti"}</p>
      {visible.map((item) => <NewsCard key={`${item.source}-${item.url}`} item={item} />)}
      {!visible.length && <p className="text-sm text-zinc-400">Nema vijesti u ovom pregledu.</p>}
    </div>
  );
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="flex gap-3 rounded-2xl border border-white/10 bg-[#141418] p-3">
      {item.image && <img src={item.image} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-orange-300">{item.source} · {relativeWhen(item.publishedAt)}</span>
        <span className="mt-1 block font-semibold leading-snug">{item.title}</span>
        {item.snippet && <span className="mt-1 block text-sm text-zinc-400">{item.snippet}</span>}
      </span>
    </a>
  );
}
