import { isSharedMode } from "@/lib/server/redis";
import { pushConfigured, vapidPublicKey } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    mode: isSharedMode() ? "shared" : "local",
    push: pushConfigured(),
    vapidPublicKey: pushConfigured() ? vapidPublicKey() : null,
  });
}
