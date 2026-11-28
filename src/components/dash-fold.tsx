"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export function useStoredOpen(storageKey: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setOpen(window.localStorage.getItem(storageKey) === "1");
    });
    return () => {
      alive = false;
    };
  }, [storageKey]);
  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  };
  return [open, toggle] as const;
}

export function FoldCard({
  title,
  storageKey,
  href,
  linkLabel,
  open,
  onToggle,
  children,
}: {
  title: string;
  storageKey: string;
  href: string;
  linkLabel: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = `${storageKey}-panel`;
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="font-display text-sm font-semibold tracking-[0.16em] text-orange-400">{title}</span>
          <svg aria-hidden viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link href={href} className="shrink-0 text-xs text-orange-300">{linkLabel}</Link>
      </div>
      <div
        id={panelId}
        inert={!open}
        aria-hidden={!open}
        className={`overflow-hidden transition-[max-height] duration-200 ease-out ${open ? "max-h-96" : "max-h-0"}`}
      >
        {children}
      </div>
    </Card>
  );
}
