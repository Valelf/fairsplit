const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute per user

export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = requests.get(userId);

  if (!entry || now > entry.resetAt) {
    requests.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true };
}

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requests) {
      if (now > entry.resetAt) {
        requests.delete(key);
      }
    }
  }, 60_000);
}
