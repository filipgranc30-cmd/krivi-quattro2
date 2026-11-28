import { clearLocalReceipts, deleteLocalReceipt, pruneLocalReceipts } from "./local-receipt";
import { clearLocalProofs, deleteLocalProof, pruneLocalProofs } from "./local-proof";
import { applyAction, publicUser, registerAccount, toPublic } from "../shared/mutate";
import { emptyDb, stripDemoData } from "../shared/seed";
import type { Action, AppData, Db, UserPublic } from "../shared/types";
import { uid } from "../shared/util";

const DB_KEY = "kq.db.v1";
const SESSION_KEY = "kq.session.v1";

function read(): Db {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as Db;
    if (!parsed || !Array.isArray(parsed.users)) return emptyDb();
    const merged = { ...emptyDb(), ...parsed, settings: { ...emptyDb().settings, ...parsed.settings } };
    const cleaned = stripDemoData(merged);
    if (cleaned.changed) write(cleaned.db);
    return cleaned.db;
  } catch {
    return emptyDb();
  }
}

function write(db: Db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

async function pbkdf2(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verify(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "pbkdf2" || !salt || !hex) return false;
  const next = await pbkdf2(password, salt);
  return next.split("$")[2] === hex;
}

export function localSessionUser(): UserPublic | null {
  const db = read();
  const id = localStorage.getItem(SESSION_KEY);
  const user = db.users.find((item) => item.id === id);
  return user ? publicUser(user) : null;
}

export function localData(user: UserPublic | null): AppData {
  return toPublic(read(), user);
}

export async function localRegister(
  name: string,
  email: string,
  password: string,
  adminEmail: string | null,
): Promise<{ user: UserPublic } | { error: string }> {
  const db = read();
  const normalized = email.trim().toLowerCase();
  if (db.users.some((user) => user.email === normalized)) return { error: "Račun s tim e-mailom već postoji." };
  const passwordHash = await pbkdf2(password);
  const user = registerAccount(db, {
    id: uid(),
    email: normalized,
    name: name.trim(),
    passwordHash,
    adminEmail,
  });
  write(db);
  localStorage.setItem(SESSION_KEY, user.id);
  return { user: publicUser(user) };
}

export async function localLogin(email: string, password: string): Promise<{ user: UserPublic } | { error: string }> {
  const db = read();
  const user = db.users.find((item) => item.email === email.trim().toLowerCase());
  if (!user || !(await verify(password, user.passwordHash))) return { error: "Krivi e-mail ili lozinka." };
  localStorage.setItem(SESSION_KEY, user.id);
  return { user: publicUser(user) };
}

export function localLogout() {
  localStorage.removeItem(SESSION_KEY);
}

export function localMutate(actor: UserPublic, action: Action): { data: AppData; error?: string } {
  const db = read();
  const result = applyAction(db, actor, action);
  if (result.error) return { data: toPublic(db, actor), error: result.error };
  if (action.op === "setRole") {
    const updated = result.db.users.find((user) => user.id === actor.id);
    if (updated) actor = publicUser(updated);
  }
  write(result.db);
  if (action.op === "setGameProof" && !action.hasProof) deleteLocalProof(action.id);
  if (action.op === "setLedgerReceipt" && !action.hasReceipt) deleteLocalReceipt(action.id);
  pruneLocalProofs(new Set(result.db.games.map((game) => game.id)));
  pruneLocalReceipts(new Set(result.db.treasury.entries.filter((entry) => entry.hasReceipt).map((entry) => entry.id)));
  return { data: toPublic(result.db, actor) };
}

export function localReset() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  clearLocalProofs();
  clearLocalReceipts();
}
