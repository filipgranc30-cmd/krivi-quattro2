"use client";

import { useApp } from "@/components/app-provider";
import { normName } from "@/lib/shared/util";

const STAR_LABEL = "Počasni član i donator kluba";

export function MemberName({ name }: { name: string }) {
  const honorary = useHonorary(name);
  return (
    <span>
      {name}
      {honorary && (
        <span className="ml-0.5 text-amber-300" title={STAR_LABEL} aria-label={STAR_LABEL}>
          ★
        </span>
      )}
    </span>
  );
}

export function MemberNames({ names, empty = "nitko", separator = ", " }: { names: string[]; empty?: string; separator?: string }) {
  if (!names.length) return <span>{empty}</span>;
  return (
    <span>
      {names.map((name, index) => (
        <span key={`${name}-${index}`}>
          {index > 0 ? separator : ""}
          <MemberName name={name} />
        </span>
      ))}
    </span>
  );
}

function useHonorary(name: string): boolean {
  const { data } = useApp();
  const key = normName(name);
  return data.members.some((member) => member.honorary && normName(member.name) === key);
}
