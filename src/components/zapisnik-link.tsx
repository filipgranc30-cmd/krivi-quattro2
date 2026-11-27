"use client";

import Link from "next/link";
import { zapisnikPath } from "@/lib/shared/zapisnik";

export function ZapisnikLink({ eventUrl, className }: { eventUrl?: string | null; className?: string }) {
  const href = zapisnikPath(eventUrl);
  if (!href) return null;
  return (
    <Link href={href} className={className ?? "mt-2 inline-block text-xs font-semibold text-orange-300 underline"}>
      Zapisnik
    </Link>
  );
}
