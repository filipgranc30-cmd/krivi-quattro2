"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AttendancePanel, Card, Field, GhostButton, PrimaryButton, SectionTitle, When } from "@/components/ui";
import { fromDatetimeLocal, formatWhen, toDatetimeLocal } from "@/lib/shared/dates";
import { nextMatch, shownFixtures } from "@/lib/shared/schedule";
import type { AttendanceStatus } from "@/lib/shared/types";
import { OUR_LEAGUE_NAME } from "@/lib/shared/club";

export default function SchedulePage() {
  const { data, snapshot, snapshotError, user, act } = useApp();
  const admin = user?.role === "admin";
  const fixtures = shownFixtures(data, snapshot);
  const highlighted = nextMatch(data, snapshot, Boolean(snapshotError));
  const [opponent, setOpponent] = useState("");
  const [venue, setVenue] = useState("");
  const [when, setWhen] = useState("");
  const [home, setHome] = useState(true);
  const [scoreUs, setScoreUs] = useState("");
  const [scoreThem, setScoreThem] = useState("");
  const [error, setError] = useState("");
  const [overrideOpponent, setOverrideOpponent] = useState(data.settings.nextOverride?.opponent || "");
  const [overrideVenue, setOverrideVenue] = useState(data.settings.nextOverride?.venue || "");
  const [overrideWhen, setOverrideWhen] = useState(data.settings.nextOverride ? toDatetimeLocal(data.settings.nextOverride.datetime) : "");
  const [overrideHome, setOverrideHome] = useState(data.settings.nextOverride?.home ?? true);

  const attend = async (key: string, label: string, status: AttendanceStatus | null) => {
    if (status === null) {
      await act({ op: "clearAttendance", kind: "match", targetId: key });
      return;
    }
    await act({ op: "attendance", kind: "match", targetId: key, status, label });
  };

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>RASPORED</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">
          Kola 3. lige skupine B dolaze s psgz.hr. Naslovnica automatski uzima najbliži neodigrani susret.
          {snapshot?.sourceUrl && (
            <>
              {" "}
              <a className="text-orange-300 underline" href={snapshot.sourceUrl} target="_blank" rel="noreferrer">Izvor</a>
            </>
          )}
        </p>
      </div>
      {snapshotError && <p className="text-xs text-amber-200">{snapshotError}</p>}
      {fixtures.map((fixture) => {
        const open = !fixture.played && new Date(fixture.datetime).getTime() >= Date.now() - 12 * 60 * 60 * 1000;
        const mine = data.attendance.find((item) => item.kind === "match" && item.targetId === fixture.key && item.userId === user?.id);
        const labelWhen = formatWhen(fixture.datetime);
        return (
          <Card key={fixture.key} className={highlighted?.key === fixture.key ? "border-orange-500" : ""}>
            <div className="text-xs text-orange-300">{fixture.round || "Termin"} {highlighted?.key === fixture.key ? "· sljedeća" : ""}</div>
            <div className="font-display text-2xl">vs {fixture.opponent}</div>
            <div className="text-sm text-zinc-300"><When iso={fixture.datetime} /> · {fixture.home ? "Doma" : "U gostima"}</div>
            <div className="text-sm text-zinc-400">{fixture.venue || "Mjesto nije upisano"}</div>
            {fixture.played && (
              <div className="mt-2 font-display text-3xl text-orange-300">{fixture.scoreUs}:{fixture.scoreThem}</div>
            )}
            {fixture.eventUrl && <a className="mt-1 block text-xs text-orange-300 underline" href={fixture.eventUrl} target="_blank" rel="noreferrer">Zapisnik</a>}
            {open && (
              <div className="mt-3">
                <AttendancePanel
                  targetId={fixture.key}
                  attendance={data.attendance.filter((item) => item.kind === "match")}
                  mine={mine?.status}
                  onSet={(status) => attend(fixture.key, `protiv ${fixture.opponent}, ${labelWhen.weekday} ${labelWhen.date} u ${labelWhen.time}`, status)}
                />
              </div>
            )}
            {admin && fixture.source === "manual" && (
              <GhostButton className="mt-3" onClick={() => act({ op: "deleteFixture", id: fixture.key.replace("manual:", "") })}>Obriši ručni termin</GhostButton>
            )}
          </Card>
        );
      })}
      {!fixtures.length && <p className="text-sm text-zinc-400">Raspored je prazan.</p>}

      {admin && (
        <Card>
          <h2 className="font-display text-lg">Ručni termin</h2>
          <form
            className="mt-3 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const datetime = fromDatetimeLocal(when);
              if (!datetime) {
                setError("Datum nije ispravan.");
                return;
              }
              const message = await act({
                op: "addFixture",
                fixture: {
                  opponent,
                  venue,
                  datetime,
                  home,
                  league: OUR_LEAGUE_NAME,
                  round: "Ručno",
                  scoreUs: scoreUs === "" ? null : Number(scoreUs),
                  scoreThem: scoreThem === "" ? null : Number(scoreThem),
                },
              });
              setError(message || "");
              if (!message) {
                setOpponent("");
                setVenue("");
                setWhen("");
                setScoreUs("");
                setScoreThem("");
              }
            }}
          >
            <Field label="Protivnik" value={opponent} onChange={(event) => setOpponent(event.target.value)} required />
            <Field label="Mjesto" value={venue} onChange={(event) => setVenue(event.target.value)} />
            <Field label="Datum i vrijeme" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} required />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={home} onChange={(event) => setHome(event.target.checked)} /> Doma</label>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Naši setovi (prazno ako nije odigrano)" value={scoreUs} onChange={(event) => setScoreUs(event.target.value)} inputMode="numeric" />
              <Field label="Njihovi" value={scoreThem} onChange={(event) => setScoreThem(event.target.value)} inputMode="numeric" />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <PrimaryButton className="w-full">Dodaj i obavijesti ekipu</PrimaryButton>
          </form>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.settings.useManualSchedule}
              onChange={(event) => act({ op: "setSettings", settings: { ...data.settings, useManualSchedule: event.target.checked } })}
            />
            Na rasporedu prikaži samo ručne termine
          </label>
          <h3 className="mt-4 font-display">Prisili sljedeću utakmicu</h3>
          <p className="text-xs text-zinc-500">Ako je upisano, naslovnica ne uzima automatski najbliži PSGZ susret.</p>
          <div className="mt-2 space-y-2">
            <Field label="Protivnik" value={overrideOpponent} onChange={(event) => setOverrideOpponent(event.target.value)} />
            <Field label="Mjesto" value={overrideVenue} onChange={(event) => setOverrideVenue(event.target.value)} />
            <Field label="Datum i vrijeme" type="datetime-local" value={overrideWhen} onChange={(event) => setOverrideWhen(event.target.value)} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overrideHome} onChange={(event) => setOverrideHome(event.target.checked)} /> Doma</label>
            <div className="grid grid-cols-2 gap-2">
              <PrimaryButton
                onClick={async () => {
                  const datetime = fromDatetimeLocal(overrideWhen);
                  if (!datetime || overrideOpponent.trim().length < 2) {
                    setError("Za ručnu sljedeću utakmicu treba protivnik i datum.");
                    return;
                  }
                  setError("");
                  await act({
                    op: "setSettings",
                    settings: {
                      ...data.settings,
                      nextOverride: { opponent: overrideOpponent, venue: overrideVenue, datetime, home: overrideHome, round: "Ručno" },
                    },
                  });
                }}
              >
                Spremi
              </PrimaryButton>
              <GhostButton
                onClick={() =>
                  act({ op: "setSettings", settings: { ...data.settings, nextOverride: null } }).then(() => {
                    setOverrideOpponent("");
                    setOverrideVenue("");
                    setOverrideWhen("");
                  })
                }
              >
                Vrati automatiku
              </GhostButton>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
