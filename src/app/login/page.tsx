"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Field, PrimaryButton } from "@/components/ui";

export default function LoginPage() {
  const { login, register, mode } = useApp();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");
    const message = tab === "login" ? await login(email, password) : await register(name, email, password);
    if (message) setError(message);
    setPending(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-ink px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/logo.jpg" alt="Grb Krivi Quattro" className="mx-auto h-36 w-36 rounded-full object-cover ring-2 ring-orange-500" />
        <h1 className="font-display mt-4 text-4xl font-bold tracking-wide">KRIVI QUATTRO</h1>
        <p className="mt-1 text-xs tracking-[0.28em] text-orange-400">DARTS CLUB</p>
      </div>
      {mode === "local" && (
        <p className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-50">
          Dijeljena baza još nije spojena. Možeš se registrirati na ovom uređaju, ali ekipa na drugim telefonima neće vidjeti iste račune ni dolaske.
          U Vercelu dodaj Upstash Redis: <strong>KV_REST_API_URL</strong> i <strong>KV_REST_API_TOKEN</strong>.
        </p>
      )}
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-white/5 p-1">
        <button type="button" className={`h-10 rounded-lg font-semibold ${tab === "login" ? "bg-orange-500 text-black" : "text-zinc-300"}`} onClick={() => setTab("login")}>
          Prijava
        </button>
        <button type="button" className={`h-10 rounded-lg font-semibold ${tab === "register" ? "bg-orange-500 text-black" : "text-zinc-300"}`} onClick={() => setTab("register")}>
          Registracija
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {tab === "register" && <Field label="Ime i prezime" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />}
        <Field label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        <Field label="Lozinka" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={tab === "login" ? "current-password" : "new-password"} required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <PrimaryButton type="submit" className="w-full" disabled={pending}>
          {pending ? "Pričekaj…" : tab === "login" ? "Prijava" : "Otvori račun"}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
        Prvi registrirani račun postaje admin. Ako je u Vercelu postavljen ADMIN_EMAIL, taj e-mail dobiva admin ulogu i kasnije.
      </p>
    </div>
  );
}
