"use client";

import { MemberName } from "@/components/member-name";
import type { Attendance, AttendanceStatus } from "@/lib/shared/types";
import { formatWhen } from "@/lib/shared/dates";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-white/10 bg-[#141418] p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-sm font-semibold tracking-[0.16em] text-orange-400">{children}</h2>;
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
      <input {...props} className="h-12 w-full rounded-xl border border-orange-500/40 bg-black px-3 text-white outline-none focus:border-orange-400" />
    </label>
  );
}

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`h-12 rounded-xl bg-orange-500 px-4 font-bold text-black disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`h-11 rounded-xl border border-white/15 px-3 text-sm text-zinc-100 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function When({ iso }: { iso: string }) {
  const when = formatWhen(iso);
  return (
    <span>
      {when.weekday} {when.date} u {when.time}
    </span>
  );
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  dolazim: "Dolazim",
  ne_dolazim: "Ne dolazim",
  mozda: "Možda",
};

export function AttendancePanel({
  targetId,
  attendance,
  mine,
  onSet,
  disabled,
}: {
  targetId: string;
  attendance: Attendance[];
  mine?: AttendanceStatus;
  onSet: (status: AttendanceStatus | null) => void;
  disabled?: boolean;
}) {
  const rows = attendance.filter((item) => item.targetId === targetId);
  const count = (status: AttendanceStatus) => rows.filter((item) => item.status === status).length;
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {(["dolazim", "ne_dolazim", "mozda"] as AttendanceStatus[]).map((status) => {
          const selected = mine === status;
          const tone =
            status === "dolazim"
              ? selected
                ? "bg-orange-500 text-black border-orange-500"
                : "border-orange-500/50 text-orange-200"
              : status === "ne_dolazim"
                ? selected
                  ? "bg-red-500 text-white border-red-500"
                  : "border-white/15 text-zinc-200"
                : selected
                  ? "bg-zinc-200 text-black border-zinc-200"
                  : "border-white/15 text-zinc-300";
          return (
            <button key={status} type="button" disabled={disabled} onClick={() => onSet(selected ? null : status)} className={`h-12 rounded-xl border text-sm font-bold ${tone}`}>
              {STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-3 text-xs text-zinc-400">
        <span>Dolazi {count("dolazim")}</span>
        <span>Ne dolazi {count("ne_dolazim")}</span>
        <span>Možda {count("mozda")}</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.length === 0 && <li className="text-zinc-500">Još nitko nije potvrdio.</li>}
        {rows.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span><MemberName name={item.userName} /></span>
            <span className={item.status === "dolazim" ? "text-orange-300" : "text-zinc-400"}>{STATUS_LABEL[item.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-zinc-400">{children}</p>;
}
