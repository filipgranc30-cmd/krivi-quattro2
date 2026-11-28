import type { DueKind, LedgerCategory, LedgerEntry, MoneyAccount, Treasury } from "./types";

/** Ligaška sezona 2026/27: rujan 2026. do lipanj 2027. */
export const SEASON_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06"] as const;

export const DEFAULT_RENTA = 25;
export const DEFAULT_BANK = 10;

export const LEDGER_CATEGORIES: { id: LedgerCategory; label: string }[] = [
  { id: "renta", label: "Renta aparata" },
  { id: "racun", label: "Uplata na račun" },
  { id: "stash", label: "Dobrovoljni stash" },
  { id: "kotizacija", label: "Kotizacija" },
  { id: "liga", label: "Liga / savez" },
  { id: "oprema", label: "Oprema" },
  { id: "pice", label: "Piće / druženje" },
  { id: "ostalo", label: "Ostalo" },
];

const MONTH_SHORT = ["", "sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"];

export function emptyTreasury(): Treasury {
  return { rentaAmount: DEFAULT_RENTA, bankAmount: DEFAULT_BANK, dues: [], entries: [] };
}

function money(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? roundEur(Math.min(500, Math.max(0, value))) : fallback;
}

export function normalizeTreasury(value: Partial<Treasury> | undefined): Treasury {
  const base = emptyTreasury();
  if (!value) return base;
  return {
    rentaAmount: money(value.rentaAmount, base.rentaAmount),
    bankAmount: money(value.bankAmount, base.bankAmount),
    dues: Array.isArray(value.dues) ? value.dues.map((item) => ({ ...item })) : [],
    entries: Array.isArray(value.entries) ? value.entries.map((item) => ({ ...item, account: item.account === "bank" ? "bank" : "cash" })) : [],
  };
}

export function roundEur(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatEur(value: number): string {
  return `${roundEur(value).toFixed(2).replace(".", ",")} €`;
}

export function monthLabel(month: string): string {
  const [year, raw] = month.split("-");
  const name = MONTH_SHORT[Number(raw)] ?? month;
  return `${name} ${year.slice(2)}`;
}

export function categoryLabel(id: LedgerCategory): string {
  return LEDGER_CATEGORIES.find((item) => item.id === id)?.label ?? id;
}

export function isLedgerCategory(value: string): value is LedgerCategory {
  return LEDGER_CATEGORIES.some((item) => item.id === value);
}

export function isSeasonMonth(month: string): boolean {
  return (SEASON_MONTHS as readonly string[]).includes(month);
}

export function owedMonths(throughMonth: string): string[] {
  return SEASON_MONTHS.filter((month) => month <= throughMonth);
}

export type DueRow = { userId: string; name: string; rentaUnpaid: string[]; racunUnpaid: string[]; renta: number; bank: number; amount: number };

export function duesStatus(treasury: Treasury, members: { id: string; name: string }[], throughMonth: string): DueRow[] {
  const due = new Set(treasury.dues.map((item) => `${item.userId}:${item.month}:${item.kind}`));
  const months = owedMonths(throughMonth);
  return members
    .map((member) => {
      const rentaUnpaid = months.filter((month) => !due.has(`${member.id}:${month}:renta`));
      const racunUnpaid = months.filter((month) => !due.has(`${member.id}:${month}:racun`));
      const renta = roundEur(rentaUnpaid.length * treasury.rentaAmount);
      const bank = roundEur(racunUnpaid.length * treasury.bankAmount);
      return { userId: member.id, name: member.name, rentaUnpaid, racunUnpaid, renta, bank, amount: roundEur(renta + bank) };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "hr"));
}

export type MonthTotals = { month: string; income: number; expense: number };

export type TreasuryBalance = {
  cash: number;
  bank: number;
  total: number;
  stash: number;
  seasonIncome: number;
  seasonExpense: number;
  months: MonthTotals[];
};

export function treasuryBalance(treasury: Treasury): TreasuryBalance {
  const season = new Set<string>(SEASON_MONTHS);
  const byMonth = new Map<string, MonthTotals>();
  for (const month of SEASON_MONTHS) byMonth.set(month, { month, income: 0, expense: 0 });
  let cash = 0;
  let bank = 0;
  let stash = 0;
  let seasonIncome = 0;
  let seasonExpense = 0;
  for (const entry of treasury.entries) {
    const amount = roundEur(entry.amount);
    const signed = entry.direction === "income" ? amount : -amount;
    if (entry.account === "bank") bank += signed;
    else cash += signed;
    if (entry.category === "stash" && entry.direction === "income") stash += amount;
    const month = entry.date.slice(0, 7);
    if (!season.has(month)) continue;
    if (entry.direction === "income") seasonIncome += amount;
    else seasonExpense += amount;
    const row = byMonth.get(month);
    if (!row) continue;
    if (entry.direction === "income") row.income = roundEur(row.income + amount);
    else row.expense = roundEur(row.expense + amount);
  }
  cash = roundEur(cash);
  bank = roundEur(bank);
  return {
    cash,
    bank,
    total: roundEur(cash + bank),
    stash: roundEur(stash),
    seasonIncome: roundEur(seasonIncome),
    seasonExpense: roundEur(seasonExpense),
    months: [...byMonth.values()],
  };
}

export function dueEntryMatch(entry: LedgerEntry, userId: string, month: string, kind: DueKind): boolean {
  return entry.source === "dues" && entry.dueUserId === userId && entry.dueMonth === month && entry.dueKind === kind;
}

export function dueAmount(treasury: Treasury, kind: DueKind): number {
  return kind === "renta" ? treasury.rentaAmount : treasury.bankAmount;
}

export function dueAccount(kind: DueKind): MoneyAccount {
  return kind === "renta" ? "cash" : "bank";
}
