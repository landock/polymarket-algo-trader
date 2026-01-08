import { describe, expect, test } from "bun:test";
import { evaluateTrailingStop } from "../../src/background/algo/trailing-stop";

describe("trailing stop", () => {
  test("buy side triggers after price rebounds by trail percent", () => {
    const order = {
      id: "order-1",
      side: "BUY",
      params: { trailPercent: 10 },
    };

    const initialState = { isActivated: false };
    const first = evaluateTrailingStop(order, { price: 1.0 } as any, initialState);
    expect(first.shouldExecute).toBe(false);

    const second = evaluateTrailingStop(
      order,
      { price: 1.1 } as any,
      first.updatedState
    );
    expect(second.shouldExecute).toBe(true);
  });

  test("sell side triggers after price drops by trail percent", () => {
    const order = {
      id: "order-2",
      side: "SELL",
      params: { trailPercent: 10 },
    };

    const initialState = { isActivated: false };
    const first = evaluateTrailingStop(order, { price: 1.0 } as any, initialState);
    expect(first.shouldExecute).toBe(false);

    const second = evaluateTrailingStop(
      order,
      { price: 0.9 } as any,
      first.updatedState
    );
    expect(second.shouldExecute).toBe(true);
  });

  test("respects trigger price before activation", () => {
    const order = {
      id: "order-3",
      side: "BUY",
      params: { trailPercent: 5, triggerPrice: 0.8 },
    };

    const state = { isActivated: false };
    const result = evaluateTrailingStop(order, { price: 0.9 } as any, state);
    expect(result.shouldExecute).toBe(false);
    expect(result.updatedState.isActivated).toBe(false);
  });
});
