/**
 * Simple in-memory rate limiter for OTP actions.
 * Limits are per-email, reset on server restart.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function checkRateLimit(email: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = store.get(key);

  // No entry or window expired → allow
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  // Within window, check count
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  // Increment and allow
  entry.count++;
  return { allowed: true };
}

export function resetRateLimit(email: string): void {
  store.delete(email.toLowerCase());
}

// Test helpers - exported for testing purposes only
export function _getCount(email: string): number {
  return store.get(email.toLowerCase())?.count ?? 0;
}

export function _clear(): void {
  store.clear();
}
