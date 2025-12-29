/**
 * Unit tests for countdown timer utilities.
 * Tests pure functions that calculate elapsed/remaining time from a start timestamp.
 */

import { describe, it, expect } from "vitest";
import {
  getElapsedSeconds,
  getRemainingSeconds,
  isTimeUp,
} from "~/lib/countdown-timer";

describe("Countdown Timer Utilities", () => {
  describe("getElapsedSeconds", () => {
    it("should return 0 when now equals startTime", () => {
      const startTime = 1000000;
      const now = 1000000;

      expect(getElapsedSeconds(startTime, now)).toBe(0);
    });

    it("should return elapsed seconds since start", () => {
      const startTime = 1000000;
      const now = 1005000; // 5 seconds later

      expect(getElapsedSeconds(startTime, now)).toBe(5);
    });

    it("should floor partial seconds", () => {
      const startTime = 1000000;
      const now = 1002500; // 2.5 seconds later

      expect(getElapsedSeconds(startTime, now)).toBe(2);
    });

    it("should handle large time differences", () => {
      const startTime = 1000000;
      const now = 1000000 + 3600 * 1000; // 1 hour later

      expect(getElapsedSeconds(startTime, now)).toBe(3600);
    });

    it("should return 0 if now is before startTime", () => {
      const startTime = 1000000;
      const now = 999000; // 1 second before

      expect(getElapsedSeconds(startTime, now)).toBe(0);
    });
  });

  describe("getRemainingSeconds", () => {
    it("should return full limit when just started", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1000000;

      expect(getRemainingSeconds(startTime, limit, now)).toBe(60);
    });

    it("should decrease as time passes", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1010000; // 10 seconds later

      expect(getRemainingSeconds(startTime, limit, now)).toBe(50);
    });

    it("should return 0 when limit exceeded", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1070000; // 70 seconds later

      expect(getRemainingSeconds(startTime, limit, now)).toBe(0);
    });

    it("should return 0 exactly at limit", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1060000; // exactly 60 seconds later

      expect(getRemainingSeconds(startTime, limit, now)).toBe(0);
    });

    it("should never return negative", () => {
      const startTime = 1000000;
      const limit = 10;
      const now = 1100000; // 100 seconds later

      expect(getRemainingSeconds(startTime, limit, now)).toBe(0);
    });

    it("should ceil remaining to avoid showing 0 prematurely", () => {
      const startTime = 1000000;
      const limit = 10;
      const now = 1009001; // 9.001 seconds later, 0.999 remaining

      // Should show 1, not 0 (user expects to see "1" until it hits 0)
      expect(getRemainingSeconds(startTime, limit, now)).toBe(1);
    });
  });

  describe("isTimeUp", () => {
    it("should return false when time remains", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1030000; // 30 seconds in

      expect(isTimeUp(startTime, limit, now)).toBe(false);
    });

    it("should return true when limit reached", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1060000; // exactly 60 seconds

      expect(isTimeUp(startTime, limit, now)).toBe(true);
    });

    it("should return true when limit exceeded", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1090000; // 90 seconds

      expect(isTimeUp(startTime, limit, now)).toBe(true);
    });

    it("should return false at start", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1000000;

      expect(isTimeUp(startTime, limit, now)).toBe(false);
    });

    it("should return false 1ms before limit", () => {
      const startTime = 1000000;
      const limit = 60;
      const now = 1059999; // 1ms before 60 seconds

      expect(isTimeUp(startTime, limit, now)).toBe(false);
    });
  });
});
