export function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isSharedMode(): boolean {
  return redisEnv() !== null;
}

type RedisResult = { result?: unknown; error?: string };

export async function redis(command: (string | number)[]): Promise<unknown> {
  const env = redisEnv();
  if (!env) throw new Error("Redis nije postavljen.");
  const response = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis ${response.status}`);
  const data = (await response.json()) as RedisResult;
  if (data.error) throw new Error(data.error);
  return data.result;
}
