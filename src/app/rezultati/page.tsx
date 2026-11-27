"use client";

import { useApp } from "@/components/app-provider";
import { ZapisnikLink } from "@/components/zapisnik-link";
import { Card, SectionTitle, When } from "@/components/ui";
import { resultsOf } from "@/lib/shared/schedule";

export default function ResultsPage() {
  const { data, snapshot } = useApp();
  const results = resultsOf(data, snapshot);
  return (
    <div className="space-y-4">
      <div>
        <SectionTitle>REZULTATI</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Odigrani susreti Krivih Quattra u tekućoj sezoni, plus ručno upisani rezultati.</p>
      </div>
      {results.map((fixture) => (
        <Card key={fixture.key}>
          <div className="text-xs text-zinc-500">{fixture.round} · <When iso={fixture.datetime} /></div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400">{fixture.home ? "Doma" : "U gostima"}</div>
              <div className="font-display text-2xl">vs {fixture.opponent}</div>
            </div>
            <div className="font-display text-4xl text-orange-300">{fixture.scoreUs}:{fixture.scoreThem}</div>
          </div>
          <ZapisnikLink eventUrl={fixture.eventUrl} />
        </Card>
      ))}
      {!results.length && <p className="text-sm text-zinc-400">Još nema učitanih rezultata.</p>}
    </div>
  );
}
