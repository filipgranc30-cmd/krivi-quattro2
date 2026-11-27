import Link from "next/link";
import { getSnapshot } from "@/lib/server/psgz";
import { getZapisnik, validZapisnikId } from "@/lib/server/zapisnik";
import type { Zapisnik, ZapisnikGame, ZapisnikPlayer } from "@/lib/server/zapisnik-parse";
import { formatWhen } from "@/lib/shared/dates";
import { zapisnikSource } from "@/lib/shared/zapisnik";
import { isOurClub } from "@/lib/shared/util";
import type { SnapshotFixture } from "@/lib/shared/types";

export const dynamic = "force-dynamic";

export default async function MatchReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = zapisnikSource(id);
  if (!validZapisnikId(id)) return <Failure source={source} />;

  let fixture: SnapshotFixture | null = null;
  let league = "";
  try {
    const snapshot = await getSnapshot();
    league = snapshot.leagueName;
    fixture = snapshot.fixtures.find((item) => item.eventUrl.includes(`/event/${id}`)) ?? null;
  } catch {
    fixture = null;
  }

  let report: Zapisnik | null = null;
  let failed = false;
  try {
    report = await getZapisnik(id, fixture?.datetime);
  } catch {
    failed = true;
  }
  if (failed || !report || (!report.home && !report.games.length)) return <Failure source={source} />;

  const when = fixture ? formatWhen(fixture.datetime) : null;
  const homeOurs = isOurClub(report.home);
  const awayOurs = isOurClub(report.away);
  return (
    <div className="space-y-4">
      <Link href="/rezultati" className="text-sm text-orange-300">
        ← Rezultati
      </Link>
      <section className="rounded-2xl border border-white/10 bg-[#141418] p-4">
        <div className="text-center text-xs tracking-[0.16em] text-orange-400">
          {[report.round || fixture?.round, league].filter(Boolean).join(" · ")}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className={`text-right font-display text-xl leading-tight ${homeOurs ? "text-orange-300" : ""}`}>{report.home}</div>
          <div className="font-display text-4xl text-orange-400">
            {score(report.homeScore)}:{score(report.awayScore)}
          </div>
          <div className={`font-display text-xl leading-tight ${awayOurs ? "text-orange-300" : ""}`}>{report.away}</div>
        </div>
        <p className="mt-3 text-center text-sm text-zinc-400">
          {when ? `${when.weekday} ${when.date} u ${when.time}` : "Datum nije objavljen"}
          {fixture?.venue ? ` · ${fixture.venue}` : ""}
          {fixture ? ` · ${fixture.home ? "Doma" : "U gostima"}` : ""}
        </p>
      </section>

      {report.games.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-zinc-400">
          Zapisnik još nema unesenih mečeva.
        </p>
      )}

      {groupGames(report.games).map((group) => (
        <section key={group.key} className="space-y-2">
          <h2 className="font-display text-sm tracking-[0.14em] text-orange-400">
            {[group.stage, group.round].filter(Boolean).join(" · ") || "MEČEVI"}
          </h2>
          {group.games.map((game) => (
            <article key={game.order} className="rounded-2xl border border-white/10 bg-[#141418] p-3">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">
                {game.order}. {game.kind === "parovi" ? "Parovi" : "Pojedinačno"}
              </div>
              <Side names={game.home} score={game.homeScore} won={game.homeWon} average={game.homeAverage} ours={homeOurs} />
              <Side names={game.away} score={game.awayScore} won={game.awayWon} average={game.awayAverage} ours={awayOurs} />
              {game.info.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {game.info.map((item) => (
                    <span key={`${item.label}-${item.value}`} className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-zinc-300">
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      ))}

      {report.players.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm tracking-[0.14em] text-orange-400">IGRAČI</h2>
          {[report.home, report.away].filter(Boolean).map((team) => (
            <div key={team} className="rounded-2xl border border-white/10 bg-[#141418] p-3">
              <div className={`mb-2 font-display text-lg ${isOurClub(team) ? "text-orange-300" : ""}`}>{team}</div>
              <ul className="space-y-2 text-sm">
                {report.players.filter((player) => player.team === team).map((player) => (
                  <PlayerRow key={`${player.team}-${player.name}`} player={player} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <a className="block text-center text-sm text-orange-300 underline" href={source} target="_blank" rel="noreferrer">
        Otvori na psgz.hr
      </a>
    </div>
  );
}

function Side({
  names,
  score,
  won,
  average,
  ours,
}: {
  names: string[];
  score: number | null;
  won: boolean;
  average: string;
  ours: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${won ? "text-white" : "text-zinc-400"}`}>
      <div>
        <div className={ours && won ? "text-orange-200" : ""}>{names.join(" / ") || "—"}</div>
        {average && <div className="text-[11px] text-zinc-500">prosjek {average}</div>}
      </div>
      <div className={`font-display text-2xl ${won ? "text-orange-300" : ""}`}>{score ?? "–"}</div>
    </div>
  );
}

function PlayerRow({ player }: { player: ZapisnikPlayer }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span>{player.name}</span>
      <span className="text-xs text-zinc-400">
        {player.wins}/{player.games} pobjeda · legovi {player.legsFor}:{player.legsAgainst}
      </span>
    </li>
  );
}

function groupGames(games: ZapisnikGame[]) {
  const groups: { key: string; stage: string; round: string; games: ZapisnikGame[] }[] = [];
  for (const game of games) {
    const key = `${game.stage}|${game.round}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.games.push(game);
    else groups.push({ key, stage: game.stage, round: game.round, games: [game] });
  }
  return groups;
}

function score(value: number | null) {
  return value == null ? "–" : value;
}

function Failure({ source }: { source: string }) {
  return (
    <div className="space-y-4">
      <Link href="/rezultati" className="text-sm text-orange-300">
        ← Rezultati
      </Link>
      <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm text-amber-50">
        Zapisnik se trenutno ne može pročitati. Stranica saveza je nedostupna ili je zapis promijenjen.
      </p>
      <a className="block text-sm text-orange-300 underline" href={source} target="_blank" rel="noreferrer">
        Otvori na psgz.hr
      </a>
    </div>
  );
}
