"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "kq.launch-splash";
const PLAY_MS = 2500;
const STATIC_MS = 800;

const CRACKS = [
  "M0 0 L-10 -46 L-42 -82 M-10 -46 L16 -74",
  "M0 0 L24 -38 L62 -56 M24 -38 L46 -18",
  "M0 0 L50 -6 L88 14 M50 -6 L66 -34",
  "M0 0 L34 30 L72 64 M34 30 L56 20",
  "M0 0 L4 48 L-20 90 M4 48 L30 76",
  "M0 0 L-30 34 L-68 50 M-30 34 L-18 66",
  "M0 0 L-48 4 L-86 -18 M-48 4 L-72 30",
  "M0 0 L-14 -16 L6 18",
];

export function LaunchSplash() {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    const splash = new URLSearchParams(window.location.search).get("splash");
    const force = splash === "1" || splash === "hold";
    const seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    if (!force && seen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = splash === "hold" ? 0 : window.setTimeout(() => {
      if (splash !== "1") window.sessionStorage.setItem(SEEN_KEY, "1");
      if (alive) setVisible(false);
    }, reduce ? STATIC_MS : PLAY_MS);
    Promise.resolve().then(() => {
      if (!alive) return;
      setReduced(reduce);
      setVisible(true);
    });
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const skip = () => {
    const force = new URLSearchParams(window.location.search).get("splash") === "1";
    if (!force) window.sessionStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={reduced ? "kq-splash-static fixed inset-0 z-[80]" : "kq-splash fixed inset-0 z-[80]"}>
      <button
        type="button"
        aria-label="Preskoči uvod"
        onClick={skip}
        className="absolute inset-0 cursor-pointer bg-black text-center"
      >
        <span className="kq-splash-shake flex h-full w-full flex-col items-center justify-center">
          <span className="kq-splash-crest relative block w-[92vw] max-w-[440px]">
            <img src="/logo.png" alt="" className="block h-auto w-full" />
            {!reduced && (
              <>
                <span aria-hidden className="kq-splash-cover pointer-events-none absolute left-[70%] top-[40%] h-[16%] w-[14%] bg-[radial-gradient(circle_at_50%_55%,#ea9638_0%,#ea9638_40%,transparent_64%)]" />
                <span aria-hidden className="kq-splash-held pointer-events-none absolute left-[76%] top-[47%] w-[7.5%]">
                  <HeldDart />
                </span>
              </>
            )}
          </span>
          <span className="kq-splash-crest -mt-1 block">
            <span className="font-display block text-3xl font-bold tracking-wide text-white">KRIVI QUATTRO</span>
            <span className="mt-1 block text-xs tracking-[0.28em] text-orange-400">DARTS CLUB</span>
          </span>
        </span>
        {!reduced && (
          <>
            <span aria-hidden className="kq-splash-fly pointer-events-none absolute left-1/2 top-1/2 w-[72px] origin-[50%_8%]">
              <HeldDart />
            </span>
            <span aria-hidden className="kq-splash-flash pointer-events-none absolute inset-0 bg-white" />
            <svg aria-hidden viewBox="-100 -100 200 200" className="kq-splash-crack pointer-events-none absolute inset-0 h-full w-full">
              {CRACKS.map((d) => (
                <path key={d} d={d} fill="none" stroke="white" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round" />
              ))}
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

function HeldDart() {
  return (
    <svg viewBox="0 0 64 120" className="h-auto w-full overflow-visible">
      <polygon points="32,2 44,36 20,36" fill="#ececec" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <rect x="26" y="34" width="12" height="36" rx="2" fill="#c5c5c5" stroke="#111" strokeWidth="4" />
      <polygon points="6,66 26,58 22,108" fill="#e4d2b4" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <polygon points="58,66 38,58 42,108" fill="#a33b32" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
      <polygon points="32,70 26,104 38,104" fill="#6e2424" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
