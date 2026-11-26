import { createSession, normalizeEmail, setSessionCookie, validateCredentials, verifyPassword } from "@/lib/server/auth";
import { isSharedMode } from "@/lib/server/redis";
import { readDb } from "@/lib/server/store";
import { publicUser } from "@/lib/shared/mutate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSharedMode()) return Response.json({ ok: false, error: "Dijeljeni računi nisu uključeni." }, { status: 409 });
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = normalizeEmail(body?.email || "");
  const password = body?.password || "";
  const invalid = validateCredentials("", email, password, false);
  if (invalid) return Response.json({ ok: false, error: invalid }, { status: 400 });
  const db = await readDb();
  const user = db.users.find((item) => item.email === email);
  const dummy = "scrypt$00$00";
  const ok = await verifyPassword(password, user?.passwordHash || dummy);
  if (!user || !ok) return Response.json({ ok: false, error: "Krivi e-mail ili lozinka." }, { status: 401 });
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return Response.json({ ok: true, user: publicUser(user) });
}
