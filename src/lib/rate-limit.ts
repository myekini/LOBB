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

  // Bound the store itself — a key with nothing recent is dead weight.
  // Without this a warm instance accumulates one entry per unique IP/email
  // it has ever seen, for as long as it stays warm. Uses a fixed staleness
  // window (not the caller's windowMs) since call sites share this store
  // with different window lengths.
  if (store.size > 50_000) {
    const staleBefore = now - 60 * 60 * 1000;
    store.forEach((v, k) => {
      if (v.every((t) => t <= staleBefore)) store.delete(k);
    });
  }

  return { ok: true, retryAfterSecs: 0 };
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
