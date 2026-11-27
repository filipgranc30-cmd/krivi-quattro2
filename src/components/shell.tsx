"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";

const NAV = [
  { href: "/dashboard", label: "Naslovnica", icon: HomeIcon },
  { href: "/lige/818", label: "Ljestvice", icon: TrophyIcon },
  { href: "/rezultati", label: "Rezultati", icon: ListIcon },
  { href: "/vise", label: "Više", icon: MenuIcon },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { data, mode, user } = useApp();
  const path = usePathname();
  const unread = data.notifications.filter((item) => !item.read).length;
  const pendingCount = user?.role === "admin" ? data.pendingRequests.length : 0;
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-ink">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-ink/95 px-4 py-3 backdrop-blur">
        <img src="/logo.jpg" alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-orange-500/70" />
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-xl font-bold leading-none tracking-wide">KRIVI QUATTRO</div>
          <div className="mt-1 text-[11px] tracking-[0.22em] text-zinc-400">DARTS CLUB</div>
        </div>
        <Link href="/obavijesti" className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10" aria-label="Obavijesti">
          <BellIcon />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </header>
      {mode === "local" && (
        <div className="bg-amber-500/15 px-4 py-2 text-xs leading-relaxed text-amber-100">
          Lokalni način: računi i dolasci ostaju samo na ovom uređaju. Da bi cijela ekipa vidjela isto, u Vercelu poveži Upstash Redis
          (KV_REST_API_URL i KV_REST_API_TOKEN).
        </div>
      )}
      <main className="px-4 pb-28 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
          {NAV.map((item) => {
            const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] ${active ? "text-orange-400" : "text-zinc-500"}`}>
                <span className="relative">
                  <Icon active={active} />
                  {item.href === "/vise" && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-black">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M9 20h6M12 14v6" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8">
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
