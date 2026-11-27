import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import type { UserPublic } from "../shared/types";
import { publicUser } from "../shared/mutate";
import { clampText } from "../shared/util";
import { readDb, updateDb } from "./store";

const scrypt = promisify(scryptCb);
export const COOKIE = "kq_session";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (token) return createHash("sha256").update(`kq-session|${token}`).digest("hex");
  return "krivi-quattro-dev-only-secret";
}

export function signSession(id: string): string {
  const mac = createHmac("sha256", secret()).update(id).digest("hex");
  return `${id}.${mac}`;
}

export function readSessionId(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(id).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${buf.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const buf = (await scrypt(password, salt, 32)) as Buffer;
  const current = Buffer.from(hex, "hex");
  if (current.length !== buf.length) return false;
  return timingSafeEqual(current, buf);
}

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateCredentials(name: string, email: string, password: string, withName: boolean): string | null {
  if (withName && clampText(name, 80).length < 2) return "Upiši ime i prezime.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail nije ispravan.";
  if (password.length < 6) return "Lozinka mora imati barem 6 znakova.";
  if (password.length > 100) return "Lozinka je predugačka.";
  return null;
}

async function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, await cookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...(await cookieOptions()), maxAge: 0 });
}

export async function currentUser(): Promise<UserPublic | null> {
  const jar = await cookies();
  const id = readSessionId(jar.get(COOKIE)?.value);
  if (!id) return null;
  const db = await readDb();
  const session = db.sessions.find((item) => item.id === id);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = db.users.find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
}

export async function createSession(userId: string): Promise<string> {
  const id = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
  await updateDb((db) => {
    db.sessions = db.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now() && item.userId !== userId);
    db.sessions.push({ id, userId, expiresAt });
    if (db.sessions.length > 500) db.sessions = db.sessions.slice(-500);
    return db;
  });
  return signSession(id);
}

export async function destroySession() {
  const jar = await cookies();
  const id = readSessionId(jar.get(COOKIE)?.value);
  if (id) {
    await updateDb((db) => {
      db.sessions = db.sessions.filter((item) => item.id !== id);
      return db;
    });
  }
  await clearSessionCookie();
}

export function pendingBlock(user: UserPublic | null): Response | null {
  if (user && user.status === "pending") {
    return Response.json({ ok: false, pending: true, user, error: "Čeka odobrenje admina." }, { status: 403 });
  }
  return null;
}
