import { describe, expect, test } from "bun:test";
import { evaluateTWAP } from "../../src/background/algo/twap";

describe("TWAP", () => {
  test("does not execute before the first interval", () => {
    const startTime = 1_000_000;
    const order = {
      id: "twap-1",
      params: {
        totalSize: 10,
        durationMinutes: 10,
        intervalMinutes: 2,
        startTime,
      },
      executionHistory: [],
      executedSize: 0,
    };

    const originalNow = Date.now;
    Date.now = () => startTime + 30_000;
    try {
      const result = evaluateTWAP(order, { price: 0.5 } as any);
      expect(result.shouldExecute).toBe(false);
    } finally {
      Date.now = originalNow;
    }
  });

  test("executes remaining size when duration exceeded", () => {
    const startTime = 2_000_000;
    const order = {
      id: "twap-2",
      params: {
        totalSize: 10,
        durationMinutes: 10,
        intervalMinutes: 2,
        startTime,
      },
      executionHistory: [{ executedAt: startTime + 60_000 }],
      executedSize: 4,
    };

    const originalNow = Date.now;
    Date.now = () => startTime + 11 * 60_000;
    try {
      const result = evaluateTWAP(order, { price: 0.5 } as any);
      expect(result.shouldExecute).toBe(true);
      expect(result.executeSize).toBeCloseTo(6);
      expect(result.isComplete).toBe(true);
    } finally {
      Date.now = originalNow;
    }
  });
});
