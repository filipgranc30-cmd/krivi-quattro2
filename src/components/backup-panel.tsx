"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, GhostButton, PrimaryButton } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";

type Item = { name: string; bytes: number; uploadedAt: string; week: string };

export function BackupPanel() {
  const { mode } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/backup", { cache: "no-store", credentials: "include" });
    const body = (await response.json().catch(() => null)) as { items?: Item[]; error?: string; message?: string } | null;
    if (!response.ok) {
      setNote(body?.error || "Popis kopija nije učitan.");
      return;
    }
    setItems(body?.items ?? []);
    if (body?.message) setNote(body.message);
  }, []);

  useEffect(() => {
    if (mode !== "shared") return;
    let cancelled = false;
    fetch("/api/backup", { cache: "no-store", credentials: "include" })
      .then((response) => response.json())
      .then((body: { items?: Item[]; error?: string; message?: string }) => {
        if (cancelled) return;
        if (body.error && !body.items) {
          setNote(body.error);
          return;
        }
        setItems(body.items ?? []);
        if (body.message) setNote(body.message);
      })
      .catch(() => {
        if (!cancelled) setNote("Popis kopija nije učitan.");
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const make = async () => {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/backup", { method: "POST", cache: "no-store", credentials: "include" });
      const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      setNote(body?.message || body?.error || "Kopija nije uspjela.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="font-display text-lg">Sigurnosne kopije</h2>
      <p className="mt-1 text-sm text-zinc-400">Jedna privatna kopija tjedno, nedjeljom. Zadržava se zadnjih 12.</p>
      {mode !== "shared" && <p className="mt-2 text-sm text-amber-100">Kopije rade samo na dijeljenom poslužitelju.</p>}
      {mode === "shared" && (
        <>
          <PrimaryButton className="mt-3 w-full" disabled={busy} onClick={() => void make()}>
            {busy ? "Spremanje…" : "Napravi kopiju sada"}
          </PrimaryButton>
          {note && <p className="mt-2 text-sm text-zinc-300">{note}</p>}
          <ul className="mt-3 space-y-2">
            {items.length === 0 && <li className="text-sm text-zinc-500">Još nema kopija.</li>}
            {items.map((item) => {
              const when = formatWhen(item.uploadedAt);
              return (
                <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {when.date} {when.time}
                    <span className="block text-xs text-zinc-500">{item.week} · {formatBytes(item.bytes)}</span>
                  </span>
                  <a href={`/api/backup/${item.name}`} className="font-semibold text-orange-300">
                    Preuzmi
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {mode === "shared" && items.length > 0 && (
        <GhostButton className="mt-3 w-full" onClick={() => void load()}>
          Osvježi popis
        </GhostButton>
      )}
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
