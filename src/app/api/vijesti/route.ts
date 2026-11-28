import { currentUser, pendingBlock } from "@/lib/server/auth";
import { getNews } from "@/lib/server/vijesti";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, error: "Nisi prijavljen." }, { status: 401 });
  const blocked = pendingBlock(user);
  if (blocked) return blocked;
  const feed = await getNews();
  return Response.json({ ok: true, ...feed });
}
