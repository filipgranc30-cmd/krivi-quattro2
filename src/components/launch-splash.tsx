"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "kq.launch-splash";
const SAFETY_MS = 6500;
const STATIC_MS = 800;
const FADE_MS = 300;

export function LaunchSplash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "fade">("hidden");
  const [reduced, setReduced] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const forceRef = useRef(false);
  const leaving = useRef(false);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    if (!forceRef.current) window.sessionStorage.setItem(SEEN_KEY, "1");
    setPhase("fade");
  };

  useEffect(() => {
    let alive = true;
    const force = new URLSearchParams(window.location.search).get("splash") === "1";
    forceRef.current = force;
    if (!force && window.sessionStorage.getItem(SEEN_KEY) === "1") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (alive) leave();
    }, reduce ? STATIC_MS : SAFETY_MS);
    Promise.resolve().then(() => {
      if (!alive) return;
      setReduced(reduce);
      setPhase("show");
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "show" || reduced) return;
    const video = videoRef.current;
    if (!video) return;
    const attempt = video.play();
    if (attempt) attempt.catch(() => leave());
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== "fade") return;
    const timer = window.setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div className={`fixed inset-0 z-[80] bg-black transition-opacity duration-300 ${phase === "fade" ? "opacity-0" : "opacity-100"}`}>
      {reduced ? (
        <img src="/splash/splash-poster.jpg" alt="" className="h-full w-full object-contain" />
      ) : (
        <video
          ref={videoRef}
          src="/splash/splash.mp4"
          poster="/splash/splash-poster.jpg"
          muted
          playsInline
          autoPlay
          preload="auto"
          className="h-full w-full object-contain"
          onEnded={leave}
          onError={leave}
        />
      )}
      <button type="button" aria-label="Preskoči uvod" className="absolute inset-0 cursor-pointer" onClick={leave} />
    </div>
  );
}
