"use client";

import { useMemo, useState } from "react";
import { todayZagreb } from "@/lib/shared/dates";
import { dayHeading, formatFee, formatFormat, formatMode, isZagrebArea, placeLine, type Tournament } from "@/lib/shared/turniri";

export function TurniriList({ tournaments }: { tournaments: Tournament[] }) {
  const [darts, setDarts] = useState<"svi" | "soft" | "steel">("svi");
  const [city, setCity] = useState("zagreb");
  const today = todayZagreb();
  const cities = useMemo(() => {
    const names = [...new Set(tournaments.map((item) => item.city).filter(Boolean))];
    return names.sort((a, b) => Number(isZagrebArea(b)) - Number(isZagrebArea(a)) || a.localeCompare(b, "hr"));
  }, [tournaments]);
  const visible = tournaments.filter((item) => {
    if (darts === "soft" && item.dartType !== "soft") return false;
    if (darts === "steel" && item.dartType !== "steel") return false;
    if (city === "zagreb" && !isZagrebArea(item.city)) return false;
    if (city !== "svi" && city !== "zagreb" && item.city !== city) return false;
    return true;
  });
  const groups = new Map<string, Tournament[]>();
  for (const item of visible) {
    const list = groups.get(item.date) ?? [];
    list.push(item);
    groups.set(item.date, list);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 text-sm">
        {(
          [
            ["svi", "Svi"],
            ["soft", "Soft"],
            ["steel", "Steel"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setDarts(value)} className={`h-10 rounded-lg font-bold ${darts === value ? "bg-orange-500 text-black" : "text-zinc-300"}`}>
            {label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-zinc-400">Grad</span>
        <select value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black px-3">
          <option value="zagreb">Zagreb i okolica</option>
          <option value="svi">Svi gradovi</option>
          {cities.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>
      <p className="text-sm text-zinc-400">{visible.length} {visible.length === 1 ? "turnir" : "turnira"}</p>
      {[...groups.entries()].map(([date, items]) => (
        <section key={date} className="space-y-2">
          <h2 className="font-display text-sm tracking-[0.14em] text-orange-400">{dayHeading(date, today).toUpperCase()}</h2>
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-[#141418] p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl leading-tight">{item.title}</h3>
                <div className="shrink-0 text-sm font-semibold text-orange-300">{item.time ?? "—"}</div>
              </div>
              <p className="mt-1 text-sm text-zinc-300">
                {item.mapsUrl ? (
                  <a className="underline decoration-white/20" href={item.mapsUrl} target="_blank" rel="noreferrer">{placeLine(item)}</a>
                ) : (
                  placeLine(item)
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                {item.dartType && <span className="rounded-full border border-orange-500/50 px-2 py-1 text-orange-200">{item.dartType === "soft" ? "Soft" : "Steel"}</span>}
                {formatFormat(item) && <span className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">{formatFormat(item)}</span>}
                {formatFee(item.fee) && <span className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">{formatFee(item.fee)}</span>}
                {formatMode(item.mode) && <span className="rounded-full border border-white/15 px-2 py-1 text-zinc-200">{formatMode(item.mode)}</span>}
                {item.status === "closed" && <span className="rounded-full border border-white/15 px-2 py-1 text-zinc-400">Prijave zatvorene</span>}
              </div>
              <a className="mt-3 inline-block text-sm font-semibold text-orange-300 underline" href={item.url} target="_blank" rel="noreferrer">
                Detalji i prijava
              </a>
            </article>
          ))}
        </section>
      ))}
      {!visible.length && <p className="text-sm text-zinc-400">Nema turnira za odabrani filter.</p>}
    </div>
  );
}
