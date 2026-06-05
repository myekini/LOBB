// In-memory sliding-window rate limiter.
// Each warm Vercel function instance maintains its own store. This provides
// meaningful per-instance protection without external dependencies.
// To enforce limits across all instances, replace with @upstash/ratelimit + Redis.

const store = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSecs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let hits = store.get(key) ?? [];
  hits = hits.filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const retryAfterMs = hits[0] + windowMs - now;
    store.set(key, hits);
    return { ok: false, retryAfterSecs: Math.ceil(retryAfterMs / 1000) };
  }

  hits.push(now);
  store.set(key, hits);
  return { ok: true, retryAfterSecs: 0 };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
