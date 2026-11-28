"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, SectionTitle } from "@/components/ui";
import { formatEur, isTreasurer, lastBalanceUpdate, monthLabel, SEASON_MONTHS, treasuryBalance } from "@/lib/shared/blagajna";
import { formatDateHr } from "@/lib/shared/dates";
import type { DueKind } from "@/lib/shared/types";

export default function TreasuryPage() {
  const { data, user, act } = useApp();
  const treasurer = isTreasurer(user);
  const balance = treasuryBalance(data.treasury);
  const [rentaInput, setRentaInput] = useState(String(data.treasury.rentaAmount));
  const [bankInput, setBankInput] = useState(String(data.treasury.bankAmount));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const saveAmounts = async () => {
    const renta = Number(rentaInput.replace(",", "."));
    const bank = Number(bankInput.replace(",", "."));
    setNote((await act({ op: "setDueAmounts", renta, bank })) || "Iznosi su spremljeni.");
  };

  const toggle = async (userId: string, month: string, kind: DueKind) => {
    setBusy(true);
    setNote((await act({ op: "toggleDue", userId, month, kind })) || "");
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Link href="/vise" className="text-sm text-orange-300">← Više</Link>
      <div>
        <SectionTitle>KLUBSKA BLAGAJNA</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Sezona 2026/27. Gotovina se upisuje ručno. Aparati su zbroj plaćene rente. Uplate na račun udruge idu na žiro, a početno stanje računa može se upisati.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <BalanceCard label="Gotovina" value={balance.cash} tone="text-orange-300" updated={lastBalanceUpdate(data.treasury.entries, "cash")} editable={treasurer} onSave={(amount) => act({ op: "setBalance", account: "cash", amount })} />
        <Card className="p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Aparati</div>
          <div className="font-display text-xl text-orange-300">{formatEur(balance.aparati)}</div>
        </Card>
        <BalanceCard label="Račun udruge" value={balance.bank} tone="" updated={lastBalanceUpdate(data.treasury.entries, "bank")} editable={treasurer} onSave={(amount) => act({ op: "setBalance", account: "bank", amount })} />
      </div>
      <Card>
        <SectionTitle>MJESEČNE UPLATE</SectionTitle>
        <p className="mt-1 text-xs text-zinc-500">Narančasto A je renta aparata ({formatEur(data.treasury.rentaAmount)}). Plavo U je uplata na račun ({formatEur(data.treasury.bankAmount)}).</p>
        {treasurer && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-zinc-400">Renta aparata
              <input value={rentaInput} onChange={(event) => setRentaInput(event.target.value)} inputMode="decimal" className="mt-1 block h-10 w-24 rounded-xl border border-white/15 bg-black px-2 text-sm text-white" />
            </label>
            <label className="text-xs text-zinc-400">Račun udruge
              <input value={bankInput} onChange={(event) => setBankInput(event.target.value)} inputMode="decimal" className="mt-1 block h-10 w-24 rounded-xl border border-white/15 bg-black px-2 text-sm text-white" />
            </label>
            <button type="button" onClick={() => void saveAmounts()} className="h-10 rounded-xl border border-orange-500/40 px-3 text-xs font-bold text-orange-200">Spremi iznose</button>
          </div>
        )}
        {note && <p className="mt-2 text-sm text-zinc-300">{note}</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="sticky left-0 bg-[#141418] px-2 py-2 text-left">Član</th>
                {SEASON_MONTHS.map((month) => <th key={month} className="px-1 py-2 text-center font-medium">{monthLabel(month)}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => {
                const mine = member.id === user?.id;
                return (
                  <tr key={member.id} className={mine ? "text-orange-100" : ""}>
                    <td className={`sticky left-0 bg-[#141418] px-2 py-1 font-semibold ${mine ? "text-orange-200" : ""}`}>{member.name}</td>
                    {SEASON_MONTHS.map((month) => (
                      <td key={month} className="px-1 py-1">
                        <div className="flex justify-center gap-1">
                          <DueMark kind="renta" interactive={treasurer} busy={busy} payment={data.treasury.dues.find((item) => item.userId === member.id && item.month === month && item.kind === "renta")} onToggle={() => void toggle(member.id, month, "renta")} />
                          <DueMark kind="racun" interactive={treasurer} busy={busy} payment={data.treasury.dues.find((item) => item.userId === member.id && item.month === month && item.kind === "racun")} onToggle={() => void toggle(member.id, month, "racun")} />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  tone,
  updated,
  editable,
  onSave,
}: {
  label: string;
  value: number;
  tone: string;
  updated?: { date: string; createdByName: string };
  editable: boolean;
  onSave: (amount: number) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    const amount = Number(input.replace(",", "."));
    const message = await onSave(amount);
    if (message) {
      setError(message);
      return;
    }
    setOpen(false);
    setError("");
  };
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      </div>
      {open && editable ? (
        <div className="mt-2 space-y-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} inputMode="decimal" aria-label={label} className="h-10 w-full rounded-xl border border-white/15 bg-black px-2 text-sm" />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} className="h-9 flex-1 rounded-lg bg-orange-500 text-xs font-bold text-black">Spremi</button>
            <button type="button" onClick={() => { setOpen(false); setError(""); }} className="h-9 flex-1 rounded-lg border border-white/15 text-xs font-bold">Odustani</button>
          </div>
        </div>
      ) : (
        editable ? (
          <button type="button" aria-label={label} className={`font-display w-full text-left text-xl ${tone}`} onClick={() => { setInput(String(value).replace(".", ",")); setOpen(true); }}>
            {formatEur(value)}
          </button>
        ) : (
          <div className={`font-display text-xl ${tone}`}>{formatEur(value)}</div>
        )
      )}
      {updated && <p className="mt-1 text-[11px] text-zinc-500">zadnje ažuriranje: {formatDateHr(updated.date)}, {updated.createdByName}</p>}
    </Card>
  );
}

function DueMark({ kind, interactive, busy, payment, onToggle }: { kind: DueKind; interactive: boolean; busy: boolean; payment?: { paidAt: string; enteredByName: string }; onToggle: () => void }) {
  const paid = Boolean(payment);
  const title = `${kind === "renta" ? "Renta aparata" : "Uplata na račun"}${payment ? `: plaćeno ${payment.paidAt.slice(0, 10)}, upisao ${payment.enteredByName}` : ": nije plaćeno"}`;
  const tone = kind === "renta" ? (paid ? "bg-orange-500 text-black" : "border border-orange-500/40 text-orange-200") : paid ? "bg-sky-400 text-black" : "border border-sky-400/40 text-sky-200";
  const mark = paid ? "✓" : kind === "renta" ? "A" : "U";
  if (!interactive) {
    return <span title={title} className={`pointer-events-none grid h-7 w-7 cursor-default select-none place-items-center rounded-md text-[10px] font-bold ${tone}`}>{mark}</span>;
  }
  return <button type="button" disabled={busy} title={title} onClick={onToggle} className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold ${tone}`}>{mark}</button>;
}
