/**
 * Pure utility functions for countdown timer calculations.
 * Uses count-up approach: store start time, calculate elapsed/remaining on demand.
 * This avoids setInterval race conditions and React Strict Mode issues.
 */

/**
 * Calculate elapsed seconds since start time.
 * @param startTime - Unix timestamp (ms) when timer started
 * @param now - Current timestamp (ms), defaults to Date.now()
 * @returns Elapsed whole seconds (floored), minimum 0
 */
export function getElapsedSeconds(startTime: number, now: number): number {
  const elapsedMs = now - startTime;
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / 1000);
}

/**
 * Calculate remaining seconds until limit is reached.
 * @param startTime - Unix timestamp (ms) when timer started
 * @param limitSeconds - Total seconds allowed
 * @param now - Current timestamp (ms), defaults to Date.now()
 * @returns Remaining whole seconds (ceiled to avoid showing 0 prematurely), minimum 0
 */
export function getRemainingSeconds(
  startTime: number,
  limitSeconds: number,
  now: number,
): number {
  const elapsedMs = now - startTime;
  const remainingMs = limitSeconds * 1000 - elapsedMs;

  if (remainingMs <= 0) return 0;

  // Ceil so we show "1" until we truly hit 0, not "0" at 0.5s remaining
  return Math.ceil(remainingMs / 1000);
}

/**
 * Check if the time limit has been reached or exceeded.
 * @param startTime - Unix timestamp (ms) when timer started
 * @param limitSeconds - Total seconds allowed
 * @param now - Current timestamp (ms), defaults to Date.now()
 * @returns true if elapsed time >= limit
 */
export function isTimeUp(
  startTime: number,
  limitSeconds: number,
  now: number,
): boolean {
  const elapsedMs = now - startTime;
  return elapsedMs >= limitSeconds * 1000;
}
