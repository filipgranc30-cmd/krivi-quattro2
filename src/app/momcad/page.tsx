"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { MemberName } from "@/components/member-name";
import { Card, Field, GhostButton, PrimaryButton, SectionTitle } from "@/components/ui";
import { isOurClub } from "@/lib/shared/util";

export default function SquadPage() {
  const { data, snapshot, user, act } = useApp();
  const admin = user?.role === "admin";
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [average, setAverage] = useState("");
  const [error, setError] = useState("");
  const live = snapshot?.ourPlayers ?? [];
  const real = data.roster.filter((player) => !player.demo);
  const demo = data.roster.filter((player) => player.demo);

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>MOMČAD</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Kapetan na psgz.hr je Filip Granc. Ligaški brojevi dolaze automatski, nadimke uređuje admin.</p>
      </div>
      <Card>
        <h2 className="font-display text-lg">Ligaški popis</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {live.map((player) => (
            <li key={player.playerId || player.name} className="flex justify-between gap-3">
              <span><MemberName name={player.name} /></span>
              <span className="text-orange-300">{player.points.toFixed(2).replace(".", ",")} bod</span>
            </li>
          ))}
          {!live.length && <li className="text-zinc-500">PSGZ popis nije učitan.</li>}
        </ul>
      </Card>
      <Card>
        <h2 className="font-display text-lg">Klupski popis</h2>
        <ul className="mt-3 space-y-3">
          {real.map((player) => (
            <li key={player.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <MemberName name={player.name} />
                {player.nickname ? <span className="text-zinc-400"> „{player.nickname}”</span> : null}
                {player.average != null ? <span className="block text-xs text-zinc-500">ručni prosjek {player.average}</span> : null}
              </span>
              {admin && <GhostButton onClick={() => act({ op: "deleteRoster", id: player.id })}>Ukloni</GhostButton>}
            </li>
          ))}
        </ul>
        {admin && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const message = await act({
                op: "upsertRoster",
                player: { name, nickname, average: average ? Number(average) : null, demo: false },
              });
              if (message) setError(message);
              else {
                setName("");
                setNickname("");
                setAverage("");
                setError("");
              }
            }}
          >
            <Field label="Ime" value={name} onChange={(event) => setName(event.target.value)} required />
            <Field label="Nadimak" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            <Field label="Ručni prosjek 3 strelice" value={average} onChange={(event) => setAverage(event.target.value)} inputMode="decimal" />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <PrimaryButton className="w-full">Dodaj igrača</PrimaryButton>
          </form>
        )}
      </Card>
      {demo.length > 0 && (
        <Card>
          <h2 className="font-display text-lg">Demo sastav iz skice</h2>
          <p className="mt-1 text-xs text-zinc-500">Ovi igrači su iz rane skice zaslona, nisu službeni popis kluba.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {demo.map((player) => (
              <li key={player.id} className="flex items-center justify-between gap-3">
                <span><MemberName name={player.name} /> {player.nickname ? `„${player.nickname}”` : ""} · {player.average}</span>
                {admin && <GhostButton onClick={() => act({ op: "deleteRoster", id: player.id })}>Obriši</GhostButton>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <h2 className="font-display text-lg">Članovi aplikacije</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {data.members.map((member) => (
            <li key={member.id} className="flex justify-between">
              <span><MemberName name={member.name} /></span>
              <span className="text-zinc-400">{member.role === "admin" ? "admin" : "član"}{isOurClub(member.name) ? "" : ""}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
