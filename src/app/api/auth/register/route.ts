import {
  adminEmail,
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
  validateCredentials,
} from "@/lib/server/auth";
import { sendPush } from "@/lib/server/push";
import { isSharedMode } from "@/lib/server/redis";
import { updateDb } from "@/lib/server/store";
import { accountStatus } from "@/lib/shared/types";
import { publicUser, registerAccount } from "@/lib/shared/mutate";
import { clampText, uid } from "@/lib/shared/util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSharedMode()) return Response.json({ ok: false, error: "Dijeljeni računi nisu uključeni." }, { status: 409 });
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null;
  const name = clampText(body?.name || "", 80);
  const email = normalizeEmail(body?.email || "");
  const password = body?.password || "";
  const invalid = validateCredentials(name, email, password, true);
  if (invalid) return Response.json({ ok: false, error: invalid }, { status: 400 });
  const passwordHash = await hashPassword(password);
  let createdId = "";
  try {
    await updateDb((db) => {
      if (db.users.some((user) => user.email === email)) throw new Error("EXISTS");
      if (db.users.length > 200) throw new Error("FULL");
      createdId = uid();
      registerAccount(db, { id: createdId, email, name, passwordHash, adminEmail: adminEmail() || null });
      return db;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "EXISTS") return Response.json({ ok: false, error: "Račun s tim e-mailom već postoji." }, { status: 409 });
    if (message === "FULL") return Response.json({ ok: false, error: "Klub je dosegao broj računa." }, { status: 409 });
    throw error;
  }
  const token = await createSession(createdId);
  await setSessionCookie(token);
  const { readDb } = await import("@/lib/server/store");
  const db = await readDb();
  const user = db.users.find((item) => item.id === createdId);
  if (user && accountStatus(user) === "pending") {
    const admins = db.users.filter((item) => item.role === "admin" && accountStatus(item) === "active").map((item) => item.id);
    await sendPush(db, user.id, { title: "Krivi Quattro", body: `Novi zahtjev za registraciju: ${user.name}`, url: "/vise" }, admins);
  }
  return Response.json({
    ok: true,
    user: user ? publicUser(user) : null,
    adminHint: adminEmail() || null,
  });
}
