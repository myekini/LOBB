// Sliding-window rate limiter, backed by Upstash Redis so limits are shared
// across every serverless instance (an in-memory Map only protects the one
// warm instance handling a given request — meaningless at real concurrency).
// Falls back to the old in-memory behavior if Redis isn't configured (e.g.
// local dev without `vercel env pull`), so nothing breaks without it.

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

// One Ratelimit instance per distinct (limit, window) pair, built lazily and
// reused across requests on the same warm instance — constructing a fresh
// one per call works but throws away Upstash's internal ephemeral cache.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.round(windowMs / 1000))} s`),
      prefix: "lobb-ratelimit",
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// In-memory fallback — identical to the original implementation, used only
// when Redis env vars aren't present.
const memoryStore = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let hits = memoryStore.get(key) ?? [];
  hits = hits.filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const retryAfterMs = hits[0] + windowMs - now;
    memoryStore.set(key, hits);
    return { ok: false, retryAfterSecs: Math.ceil(retryAfterMs / 1000) };
  }

  hits.push(now);
  memoryStore.set(key, hits);

  if (memoryStore.size > 50_000) {
    const staleBefore = now - 60 * 60 * 1000;
    memoryStore.forEach((v, k) => {
      if (v.every((t) => t <= staleBefore)) memoryStore.delete(k);
    });
  }

  return { ok: true, retryAfterSecs: 0 };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSecs: number }> {
  if (!redis) return memoryRateLimit(key, limit, windowMs);

  try {
    const result = await getLimiter(limit, windowMs).limit(key);
    if (result.success) return { ok: true, retryAfterSecs: 0 };
    return { ok: false, retryAfterSecs: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
  } catch (error) {
    // Redis unreachable — fail open on the limiter rather than locking every
    // signed-in/signing-up user out because Upstash had a bad moment. The
    // in-memory fallback still provides per-instance protection in the
    // meantime.
    console.error("[rate-limit] Upstash request failed, falling back to in-memory:", error instanceof Error ? error.message : error);
    return memoryRateLimit(key, limit, windowMs);
  }
}

export function clientIp(request: Request): string {
  return (
    // Set by Cloudflare when the app is proxied through it — this is the real
    // visitor IP. Without it every request would share Cloudflare's edge IP and
    // per-IP limits would collapse into one bucket.
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
