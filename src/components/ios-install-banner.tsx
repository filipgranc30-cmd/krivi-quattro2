"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { detectInstallDevice, IOS_BANNER_KEY } from "@/lib/client/install-target";

export function IosInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive || window.localStorage.getItem(IOS_BANNER_KEY) === "1") return;
      const ios = detectInstallDevice(navigator.userAgent, navigator.maxTouchPoints || 0) === "ios";
      const nav = navigator as Navigator & { standalone?: boolean };
      const standalone = Boolean(nav.standalone) || window.matchMedia("(display-mode: standalone)").matches;
      setShow(ios && !standalone);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-orange-500/40 bg-[#141418] px-4 py-3">
      <p className="text-sm text-zinc-200">
        Na iPhoneu dodaj Krivi Quattro na početni zaslon.{" "}
        <Link href="/preuzmi" className="font-semibold text-orange-300">Upute</Link>
      </p>
      <button
        type="button"
        aria-label="Sakrij"
        className="shrink-0 text-sm text-zinc-400"
        onClick={() => {
          window.localStorage.setItem(IOS_BANNER_KEY, "1");
          setShow(false);
        }}
      >
        Sakrij
      </button>
    </div>
  );
}
