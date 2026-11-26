"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui";

export default function MorePage() {
  const { user, data, mode, logout, act, enablePush, pushEnabled, resetLocal, snapshot } = useApp();
  const [message, setMessage] = useState("");
  const [leagueName, setLeagueName] = useState(data.settings.leagueOverride?.name || "");
  const [position, setPosition] = useState(data.settings.leagueOverride ? String(data.settings.leagueOverride.position) : "");
  const [points, setPoints] = useState(data.settings.leagueOverride?.points == null ? "" : String(data.settings.leagueOverride.points));
  const [time, setTime] = useState(data.settings.trainingTime);
  const [venue, setVenue] = useState(data.settings.venue);
  const admin = user?.role === "admin";

  return (
    <div className="space-y-4">
      <SectionTitle>VIŠE</SectionTitle>
      <Card>
        <div className="font-display text-2xl">{user?.name}</div>
        <div className="text-sm text-zinc-400">{user?.email}</div>
        <div className="mt-1 text-sm text-orange-300">{user?.role === "admin" ? "Admin / trener" : "Član"}</div>
        <GhostButton className="mt-3 w-full" onClick={() => logout()}>Odjava</GhostButton>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/trening" className="rounded-2xl border border-white/10 p-4 font-display text-lg">Trening</Link>
        <Link href="/obavijesti" className="rounded-2xl border border-white/10 p-4 font-display text-lg">Obavijesti</Link>
        <Link href="/momcad" className="rounded-2xl border border-white/10 p-4 font-display text-lg">Momčad</Link>
        <Link href="/raspored" className="rounded-2xl border border-white/10 p-4 font-display text-lg">Raspored</Link>
      </div>
      <Card>
        <h2 className="font-display text-lg">Obavijesti na telefonu</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {pushEnabled ? "Web push je uključen na poslužitelju." : "Push još nije podešen. Aplikacija i dalje radi, a obavijesti ostaju unutar aplikacije."}
        </p>
        <PrimaryButton className="mt-3 w-full" onClick={async () => setMessage((await enablePush()) || "Pretplata je spremljena. Dozvoli obavijesti u pregledniku.")}>
          Uključi obavijesti
        </PrimaryButton>
        {message && <p className="mt-2 text-sm text-zinc-300">{message}</p>}
      </Card>
      <Card>
        <h2 className="font-display text-lg">Instalacija na Android</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-zinc-300">
          <li>Otvori stranicu u Chromeu.</li>
          <li>Izbornik (tri točkice) → Instaliraj aplikaciju ili Dodaj na početni zaslon.</li>
          <li>Ikona Krivi Quattro ostaje na početnom zaslonu i otvara se kao aplikacija.</li>
        </ol>
        <p className="mt-2 text-xs text-zinc-500">APK se može preuzeti iz GitHub Actions artefakta „Android APK” nakon što workflow prođe. To je omot koji otvara ovu stranicu.</p>
      </Card>
      {admin && (
        <Card>
          <h2 className="font-display text-lg">Članovi</h2>
          <ul className="mt-3 space-y-2">
            {data.members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {member.name}
                  <span className="block text-xs text-zinc-500">{member.email}</span>
                </span>
                {member.id !== user?.id && (
                  <GhostButton onClick={() => act({ op: "setRole", userId: member.id, role: member.role === "admin" ? "member" : "admin" })}>
                    {member.role === "admin" ? "Skini admin" : "Daj admin"}
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {admin && (
        <Card>
          <h2 className="font-display text-lg">Ručni podaci lige</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Automatski poredak{snapshot ? `: ${snapshot.leagueName}, ${snapshot.position}. mjesto` : " nije učitan"}. Ručni unos ima prednost na naslovnici dok ga ne obrišeš.
          </p>
          <div className="mt-3 space-y-2">
            <Field label="Naziv lige" value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
            <Field label="Mjesto" value={position} onChange={(event) => setPosition(event.target.value)} inputMode="numeric" />
            <Field label="Bodovi" value={points} onChange={(event) => setPoints(event.target.value)} inputMode="decimal" />
            <Field label="Vrijeme treninga" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            <Field label="Naše mjesto igranja" value={venue} onChange={(event) => setVenue(event.target.value)} />
            <PrimaryButton
              className="w-full"
              onClick={() =>
                act({
                  op: "setSettings",
                  settings: {
                    ...data.settings,
                    trainingTime: time,
                    venue,
                    leagueOverride: leagueName && position ? { name: leagueName, position: Number(position), points: points === "" ? null : Number(points) } : data.settings.leagueOverride,
                  },
                })
              }
            >
              Spremi
            </PrimaryButton>
            <GhostButton className="w-full" onClick={() => act({ op: "setSettings", settings: { ...data.settings, leagueOverride: null, trainingTime: time, venue } }).then(() => { setLeagueName(""); setPosition(""); setPoints(""); })}>
              Makni ručni poredak
            </GhostButton>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-display text-lg">O podacima</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          Liga, raspored i igrači vuku se s psgz.hr (sezona 2026/27, 3. liga skupina B, tablica 818). Stari link /ranking-table/295 je prethodna sezona.
          Ako stranica promijeni oblik, ostaju ručni unosi. Lozinke se ne spremaju kao običan tekst.
        </p>
        <p className="mt-2 text-xs text-zinc-500">Način rada: {mode === "shared" ? "dijeljeni poslužitelj" : "samo ovaj uređaj"}.</p>
        {mode === "local" && (
          <GhostButton
            className="mt-3 w-full"
            onClick={() => {
              if (window.confirm("Obrisati lokalne račune i podatke na ovom uređaju?")) resetLocal();
            }}
          >
            Obriši lokalne podatke
          </GhostButton>
        )}
      </Card>
    </div>
  );
}
