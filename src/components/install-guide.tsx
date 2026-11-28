"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { detectInstallDevice, IOS_INSTALL_URL, isInAppBrowser, type InstallDevice } from "@/lib/client/install-target";

export function InstallGuide() {
  const [device, setDevice] = useState<InstallDevice>("desktop");
  const [inApp, setInApp] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      const ua = navigator.userAgent;
      setDevice(detectInstallDevice(ua, navigator.maxTouchPoints || 0));
      setInApp(isInAppBrowser(ua));
      const nav = navigator as Navigator & { standalone?: boolean };
      setStandalone(Boolean(nav.standalone) || window.matchMedia("(display-mode: standalone)").matches);
    });
    return () => {
      alive = false;
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(IOS_INSTALL_URL);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const iosFirst = device !== "android";
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#070708] px-5 py-10 text-white">
      <img src="/logo.jpg" alt="Krivi Quattro" className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-orange-500" />
      <h1 className="font-display mt-5 text-center text-4xl font-bold tracking-wide">PREUZMI APLIKACIJU</h1>
      <p className="mt-2 text-center text-sm text-zinc-400">iPhone ide na početni zaslon. Android može preuzeti APK.</p>
      <div className="flex flex-col">
        <div className={iosFirst ? "order-1" : "order-2"}>
          <IosSection inApp={inApp} standalone={standalone} copied={copied} onCopy={copy} />
        </div>
        <div className={iosFirst ? "order-2" : "order-1"}>
          <AndroidSection />
        </div>
      </div>
      <Link href="/login" className="mt-8 text-center text-sm text-orange-300">
        Natrag na prijavu
      </Link>
    </div>
  );
}

function IosSection({ inApp, standalone, copied, onCopy }: { inApp: boolean; standalone: boolean; copied: boolean; onCopy: () => void }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl tracking-wide text-orange-300">iPhone / iPad</h2>
      {standalone ? (
        <p className="mt-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-3 text-sm text-orange-100">Aplikacija je već instalirana.</p>
      ) : (
        <>
          {inApp && (
            <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-50">
              <p>Ovo je preglednik unutar druge aplikacije. Otvori krivi-quattro2.vercel.app u Safariju.</p>
              <button type="button" onClick={onCopy} className="mt-3 h-11 rounded-xl bg-orange-500 px-4 text-sm font-bold text-black">
                Kopiraj poveznicu
              </button>
              {copied && <p className="mt-2 text-xs text-orange-200">Kopirano</p>}
            </div>
          )}
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-200">
            <li className="flex gap-3">
              <span className="font-display text-orange-300">1</span>
              <span>Otvori krivi-quattro2.vercel.app u Safariju (ne u Chromeu ni u in-app pregledniku Vibera, WhatsAppa ili Instagrama).</span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-orange-300">2</span>
              <span className="flex flex-wrap items-center gap-2">
                Stisni tipku Dijeli
                <ShareIcon />
                (kvadrat sa strelicom prema gore) na dnu.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-orange-300">3</span>
              <span className="flex flex-wrap items-center gap-2">
                Odaberi „Dodaj na početni zaslon”
                <PlusSquareIcon />
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-orange-300">4</span>
              <span>Stisni „Dodaj”.</span>
            </li>
          </ol>
          <p className="mt-4 text-sm text-zinc-100">Otvaraj aplikaciju s ikone na početnom zaslonu.</p>
        </>
      )}
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Obavijesti rade od iOS 16.4 i samo kad je aplikacija dodana na početni zaslon. Nakon prvog otvaranja omogući obavijesti u aplikaciji.
      </p>
    </section>
  );
}

function AndroidSection() {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl tracking-wide text-orange-300">Android</h2>
      <a href="/krivi-quattro.apk" className="mt-4 flex h-14 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-black">
        Preuzmi APK
      </a>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-200">
        <li>Pritisni Preuzmi APK i pričekaj da se datoteka krivi-quattro.apk spremi.</li>
        <li>Otvori preuzetu datoteku. Ako telefon pita, dozvoli instalaciju iz Chromea ili iz nepoznatih izvora.</li>
        <li>Potvrdi Instaliraj. Ikona Krivi Quattro pojavit će se među aplikacijama.</li>
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-zinc-300">
        Bez APK-a otvori ovu stranicu u Chromeu, pa izbornik (tri točkice) i odaberi Instaliraj aplikaciju ili Dodaj na početni zaslon.
      </p>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline-block h-5 w-5 shrink-0 text-orange-300" aria-hidden>
      <path d="M12 3.2v10.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.6 7.4 12 3.2l4.4 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11.2V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline-block h-5 w-5 shrink-0 text-orange-300" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
