import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preuzmi aplikaciju · Krivi Quattro",
  description: "Preuzmi Krivi Quattro APK za Android ili instaliraj aplikaciju iz Chromea.",
};

export default function PreuzmiPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#070708] px-5 py-10 text-white">
      <img src="/logo.jpg" alt="Krivi Quattro" className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-orange-500" />
      <h1 className="font-display mt-5 text-center text-4xl font-bold tracking-wide">PREUZMI APLIKACIJU</h1>
      <p className="mt-2 text-center text-sm text-zinc-400">Android datoteka za članove kluba. GitHub račun nije potreban.</p>
      <a
        href="/krivi-quattro.apk"
        className="mt-6 flex h-14 items-center justify-center rounded-xl bg-orange-500 text-lg font-bold text-black"
      >
        Preuzmi APK
      </a>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-200">
        <li>Pritisni Preuzmi APK i pričekaj da se datoteka krivi-quattro.apk spremi.</li>
        <li>Otvori preuzetu datoteku. Ako telefon pita, dozvoli instalaciju iz Chromea ili iz nepoznatih izvora.</li>
        <li>Potvrdi Instaliraj. Ikona Krivi Quattro pojavit će se među aplikacijama.</li>
      </ol>
      <h2 className="font-display mt-8 text-2xl tracking-wide text-orange-300">Instaliraj iz Chromea</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        Bez APK-a otvori ovu stranicu u Chromeu, pa izbornik (tri točkice) i odaberi Instaliraj aplikaciju ili Dodaj na početni zaslon.
        Aplikacija se otvara preko interneta i ne traži dopuštenje za nepoznate izvore.
      </p>
      <Link href="/login" className="mt-8 text-center text-sm text-orange-300">
        Natrag na prijavu
      </Link>
    </div>
  );
}
