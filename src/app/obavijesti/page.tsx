"use client";

import Link from "next/link";
import { useApp } from "@/components/app-provider";
import { GhostButton, SectionTitle } from "@/components/ui";
import { formatWhen } from "@/lib/shared/dates";

export default function NotificationsPage() {
  const { data, act } = useApp();
  const unread = data.notifications.filter((item) => !item.read).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>OBAVIJESTI</SectionTitle>
        {unread > 0 && <GhostButton onClick={() => act({ op: "readNotifications" })}>Označi pročitano</GhostButton>}
      </div>
      {data.notifications.map((item) => (
        <Link key={item.id} href={item.href || "/dashboard"} className={`block rounded-xl border px-3 py-3 ${item.read ? "border-white/10" : "border-orange-500/50 bg-orange-500/10"}`}>
          <div className="text-xs text-zinc-400">{formatWhen(item.createdAt).label}</div>
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-zinc-200">{item.body}</div>
        </Link>
      ))}
      {!data.notifications.length && <p className="text-sm text-zinc-400">Nema obavijesti. Dolazak na trening ili utakmicu obavještava ostale članove.</p>}
    </div>
  );
}
