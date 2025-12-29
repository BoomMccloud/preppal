// Timer configuration constants for the interview session state machine
// These values control the tick interval, pause duration, and default time limits

export const TIMER_CONFIG = {
  TICK_INTERVAL_MS: 100,
  ANSWER_TIMEOUT_PAUSE_DURATION_MS: 3000,
  DEFAULT_BLOCK_DURATION_SEC: 600,
  DEFAULT_ANSWER_LIMIT_SEC: 120,
} as const;
