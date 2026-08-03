// In-memory sliding-window limiter. Resets on redeploy and isn't shared across
// instances — acceptable for endpoints whose cost is one email per hit.
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, number[]>();

export const isRateLimited = (key: string, max: number, windowMs: number = WINDOW_MS) => {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  // Opportunistic pruning so the map doesn't grow unbounded.
  if (attempts.size > 10_000) {
    for (const [k, v] of attempts) {
      if (v.every((t) => now - t >= windowMs)) attempts.delete(k);
    }
  }
  return false;
};

export const requestIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
