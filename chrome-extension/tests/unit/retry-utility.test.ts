import { describe, expect, test } from "bun:test";
import { retryWithBackoff, retryWithResult } from "../../src/background/retry-utility";

describe("retry utility", () => {
  test("retries on retryable error and eventually succeeds", async () => {
    let attempts = 0;

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("network timeout");
        }
        return "ok";
      },
      {
        maxRetries: 3,
        initialDelayMs: 1,
        maxDelayMs: 2,
      }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  test("fails fast on non-retryable error", async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error("boom");
        },
        {
          maxRetries: 3,
          initialDelayMs: 1,
          maxDelayMs: 2,
        }
      )
    ).rejects.toThrow("boom");

    expect(attempts).toBe(1);
  });

  test("retryWithResult retries on retryable error payload", async () => {
    let attempts = 0;

    const result = await retryWithResult(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          return { success: false, error: "fetch failed" } as const;
        }
        return { success: true, value: "ok" } as const;
      },
      {
        maxRetries: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
      }
    );

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });
});
