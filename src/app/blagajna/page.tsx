"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Card, PrimaryButton, SectionTitle } from "@/components/ui";
import { prepareProofImage } from "@/lib/client/proof-image";
import { localReceiptUrl } from "@/lib/client/local-receipt";
import { saveLedgerReceipt } from "@/lib/client/receipt-api";
import { categoryLabel, formatEur, isLedgerCategory, lastBalanceUpdate, LEDGER_CATEGORIES, monthLabel, SEASON_MONTHS, treasuryBalance } from "@/lib/shared/blagajna";
import { formatDateHr, todayZagreb } from "@/lib/shared/dates";
import type { DueKind, LedgerCategory, LedgerEntry, MoneyAccount } from "@/lib/shared/types";
import { uid } from "@/lib/shared/util";

export default function TreasuryPage() {
  const { data, user, act, mode, refresh } = useApp();
  const admin = user?.role === "admin";
  const today = todayZagreb();
  const balance = treasuryBalance(data.treasury);
  const [rentaInput, setRentaInput] = useState(String(data.treasury.rentaAmount));
  const [bankInput, setBankInput] = useState(String(data.treasury.bankAmount));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(blankDraft(today));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [stashAmount, setStashAmount] = useState("");
  const [stashDate, setStashDate] = useState(today);
  const [stashDonor, setStashDonor] = useState("");

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

  const saveEntry = async () => {
    if (!isLedgerCategory(draft.category)) return;
    setBusy(true);
    setNote("");
    const id = draft.id || uid();
    const payload = {
      id,
      date: draft.date,
      amount: Number(draft.amount.replace(",", ".")),
      direction: draft.direction,
      account: draft.account,
      category: draft.category,
      description: draft.description,
    };
    const message = draft.id ? await act({ op: "updateLedger", entry: payload }) : await act({ op: "addLedger", entry: payload });
    if (message) {
      setNote(message);
      setBusy(false);
      return;
    }
    if (receipt) {
      try {
        const blob = await prepareProofImage(receipt);
        const upload = await saveLedgerReceipt(mode, id, blob, act);
        if (upload) setNote(upload);
        await refresh();
      } catch (error) {
        setNote(error instanceof Error ? error.message : "Račun nije spremljen.");
      }
    }
    setDraft(blankDraft(today));
    setReceipt(null);
    setBusy(false);
  };

  const saveStash = async () => {
    setBusy(true);
    setNote((await act({ op: "addStash", date: stashDate, amount: Number(stashAmount.replace(",", ".")), donorUserId: stashDonor || undefined })) || "");
    setStashAmount("");
    setBusy(false);
  };

  const remove = async (entry: LedgerEntry) => {
    const text = entry.source === "dues" ? "Maknuti ovu uplatu? Član će opet biti dužan za taj mjesec." : "Obrisati ovaj unos iz blagajne?";
    if (!window.confirm(text)) return;
    setNote((await act({ op: "deleteLedger", id: entry.id })) || "");
  };

  const stash = data.treasury.entries.filter((entry) => entry.category === "stash").sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <Link href="/vise" className="text-sm text-orange-300">← Više</Link>
      <div>
        <SectionTitle>KLUBSKA BLAGAJNA</SectionTitle>
        <p className="mt-1 text-sm text-zinc-400">Sezona 2026/27. Renta aparata ide u gotovinu, uplata na račun udruge na žiro. Članovi vide stanje i cijelu tablicu.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BalanceCard label="Gotovina" value={balance.cash} tone="text-orange-300" updated={lastBalanceUpdate(data.treasury.entries, "cash")} admin={admin} onSave={(amount) => act({ op: "setBalance", account: "cash", amount })} />
        <BalanceCard label="Račun udruge" value={balance.bank} tone="" updated={lastBalanceUpdate(data.treasury.entries, "bank")} admin={admin} onSave={(amount) => act({ op: "setBalance", account: "bank", amount })} />
      </div>
      <Card>
        <SectionTitle>PO MJESECU</SectionTitle>
        <p className="mt-1 text-xs text-zinc-500">Prihod sezone {formatEur(balance.seasonIncome)} · rashod {formatEur(balance.seasonExpense)}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-xs">
            <thead className="text-zinc-500"><tr>{balance.months.map((month) => <th key={month.month} className="px-2 py-1 text-right font-medium">{monthLabel(month.month)}</th>)}</tr></thead>
            <tbody>
              <tr>{balance.months.map((month) => <td key={month.month} className="px-2 py-1 text-right text-orange-200">{formatEur(month.income)}</td>)}</tr>
              <tr>{balance.months.map((month) => <td key={month.month} className="px-2 py-1 text-right text-red-300">{formatEur(month.expense)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <SectionTitle>MJESEČNE UPLATE</SectionTitle>
        <p className="mt-1 text-xs text-zinc-500">Narančasto je renta aparata ({formatEur(data.treasury.rentaAmount)}, gotovina). Plavo je uplata na račun ({formatEur(data.treasury.bankAmount)}).</p>
        {admin && (
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
                          <DueMark kind="renta" admin={admin} busy={busy} payment={data.treasury.dues.find((item) => item.userId === member.id && item.month === month && item.kind === "renta")} onToggle={() => void toggle(member.id, month, "renta")} />
                          <DueMark kind="racun" admin={admin} busy={busy} payment={data.treasury.dues.find((item) => item.userId === member.id && item.month === month && item.kind === "racun")} onToggle={() => void toggle(member.id, month, "racun")} />
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
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <SectionTitle>DOBROVOLJNI STASH</SectionTitle>
          <span className="font-display text-xl text-orange-300">{formatEur(balance.stash)}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Gotovina ostavljena u klubu. Ulazi u gotovinu.</p>
        {admin && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input type="date" value={stashDate} onChange={(event) => setStashDate(event.target.value)} className="h-11 rounded-xl border border-white/15 bg-black px-2 text-sm" />
            <input value={stashAmount} onChange={(event) => setStashAmount(event.target.value)} inputMode="decimal" placeholder="Iznos EUR" className="h-11 rounded-xl border border-white/15 bg-black px-3 text-sm" />
            <select value={stashDonor} onChange={(event) => setStashDonor(event.target.value)} className="col-span-2 h-11 rounded-xl border border-white/15 bg-black px-2 text-sm">
              <option value="">Anonimno</option>
              {data.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
            <PrimaryButton className="col-span-2" disabled={busy} onClick={() => void saveStash()}>Upiši stash</PrimaryButton>
          </div>
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {stash.length === 0 && <li className="text-zinc-500">Još nema stash unosa.</li>}
          {stash.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3">
              <span>{entry.date} · {entry.donorName || "Anonimno"}</span>
              <span className="text-orange-300">{formatEur(entry.amount)}{admin && <button type="button" className="ml-2 text-xs text-red-300" onClick={() => void remove(entry)}>Obriši</button>}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <SectionTitle>OSTALI UNOSI</SectionTitle>
        {admin && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="h-11 rounded-xl border border-white/15 bg-black px-2 text-sm" />
              <input value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} inputMode="decimal" placeholder="Iznos EUR" className="h-11 rounded-xl border border-white/15 bg-black px-3 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={draft.direction} onChange={(event) => setDraft({ ...draft, direction: event.target.value as "income" | "expense" })} className="h-11 rounded-xl border border-white/15 bg-black px-2 text-sm">
                <option value="income">Prihod</option>
                <option value="expense">Rashod</option>
              </select>
              <select value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value as MoneyAccount })} className="h-11 rounded-xl border border-white/15 bg-black px-2 text-sm">
                <option value="cash">Gotovina</option>
                <option value="bank">Račun udruge</option>
              </select>
            </div>
            <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as LedgerCategory })} className="h-11 w-full rounded-xl border border-white/15 bg-black px-2 text-sm">
              {LEDGER_CATEGORIES.filter((item) => item.id !== "stash" && item.id !== "korekcija").map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Opis" className="h-11 w-full rounded-xl border border-white/15 bg-black px-3 text-sm" />
            <label className="flex h-11 items-center justify-center rounded-xl border border-orange-500/40 text-sm font-bold text-orange-200">
              {receipt ? receipt.name : "Dodaj račun"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="sr-only" onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} />
            </label>
            <PrimaryButton className="w-full" disabled={busy} onClick={() => void saveEntry()}>{draft.id ? "Spremi izmjenu" : "Dodaj unos"}</PrimaryButton>
          </div>
        )}
        {note && <p className="mt-2 text-sm text-zinc-300">{note}</p>}
        <ul className="mt-3 space-y-2">
          {[...data.treasury.entries].filter((entry) => entry.category !== "stash").sort((a, b) => b.date.localeCompare(a.date)).map((entry) => (
            <li key={entry.id} className="rounded-xl border border-white/10 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{entry.date} · {categoryLabel(entry.category)}</div>
                  <div className="text-zinc-400">{entry.description}</div>
                  <div className="text-xs text-zinc-500">{entry.account === "bank" ? "Račun udruge" : "Gotovina"} · {entry.createdByName}{entry.hasReceipt ? " · račun" : ""}</div>
                </div>
                <div className={entry.direction === "income" ? "font-display text-lg text-orange-300" : "font-display text-lg text-red-300"}>
                  {entry.direction === "income" ? "+" : "−"}{formatEur(entry.amount)}
                </div>
              </div>
              {entry.hasReceipt && <ReceiptLink id={entry.id} rev={entry.receiptRev} />}
              {admin && entry.source !== "dues" && entry.source !== "balance" && (
                <div className="mt-2 flex gap-2">
                  <button type="button" className="text-xs font-semibold text-orange-300" onClick={() => setDraft({ id: entry.id, date: entry.date, amount: String(entry.amount), direction: entry.direction, account: entry.account, category: entry.category, description: entry.description })}>Uredi</button>
                  <button type="button" className="text-xs font-semibold text-red-300" onClick={() => void remove(entry)}>Obriši</button>
                </div>
              )}
              {admin && (entry.source === "dues" || entry.source === "balance") && <button type="button" className="mt-2 text-xs font-semibold text-red-300" onClick={() => void remove(entry)}>Obriši</button>}
            </li>
          ))}
          {data.treasury.entries.filter((entry) => entry.category !== "stash").length === 0 && <li className="text-sm text-zinc-500">Još nema unosa.</li>}
        </ul>
      </Card>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  tone,
  updated,
  admin,
  onSave,
}: {
  label: string;
  value: number;
  tone: string;
  updated?: { date: string; createdByName: string };
  admin: boolean;
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
        {admin && !open && (
          <button type="button" className="text-[11px] font-semibold text-orange-300" onClick={() => { setInput(String(value).replace(".", ",")); setOpen(true); }}>
            Uredi
          </button>
        )}
      </div>
      {open ? (
        <div className="mt-2 space-y-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} inputMode="decimal" aria-label={label} className="h-10 w-full rounded-xl border border-white/15 bg-black px-2 text-sm" />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} className="h-9 flex-1 rounded-lg bg-orange-500 text-xs font-bold text-black">Spremi</button>
            <button type="button" onClick={() => { setOpen(false); setError(""); }} className="h-9 flex-1 rounded-lg border border-white/15 text-xs font-bold">Odustani</button>
          </div>
        </div>
      ) : (
        <div className={`font-display text-xl ${tone}`}>{formatEur(value)}</div>
      )}
      {updated && <p className="mt-1 text-[11px] text-zinc-500">zadnje ažuriranje: {formatDateHr(updated.date)}, {updated.createdByName}</p>}
    </Card>
  );
}

function DueMark({ kind, admin, busy, payment, onToggle }: { kind: DueKind; admin: boolean; busy: boolean; payment?: { paidAt: string; enteredByName: string }; onToggle: () => void }) {
  const paid = Boolean(payment);
  const title = `${kind === "renta" ? "Renta aparata" : "Uplata na račun"}${payment ? `: plaćeno ${payment.paidAt.slice(0, 10)}, upisao ${payment.enteredByName}` : ": nije plaćeno"}`;
  const tone = kind === "renta" ? (paid ? "bg-orange-500 text-black" : "border border-orange-500/40 text-orange-200") : paid ? "bg-sky-400 text-black" : "border border-sky-400/40 text-sky-200";
  if (!admin) return <span title={title} className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold ${tone}`}>{paid ? "✓" : kind === "renta" ? "A" : "U"}</span>;
  return <button type="button" disabled={busy} title={title} onClick={onToggle} className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-bold ${tone}`}>{paid ? "✓" : kind === "renta" ? "A" : "U"}</button>;
}

function ReceiptLink({ id, rev }: { id: string; rev?: number }) {
  const { mode } = useApp();
  const src = mode === "local" ? localReceiptUrl(id) : `/api/blagajna/receipt/${id}?v=${rev ?? 0}`;
  if (!src) return null;
  return <a href={src} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-orange-300">Otvori račun</a>;
}

function blankDraft(today: string): { id: string; date: string; amount: string; direction: "income" | "expense"; account: MoneyAccount; category: LedgerCategory; description: string } {
  return { id: "", date: today, amount: "", direction: "expense", account: "cash", category: "oprema", description: "" };
}
