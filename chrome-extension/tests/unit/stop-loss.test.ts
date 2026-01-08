import { describe, expect, test } from "bun:test";
import { evaluateStopLoss } from "../../src/background/algo/stop-loss";

describe("stop loss", () => {
  test("triggers stop-loss on buy when price falls", () => {
    const order = {
      id: "order-1",
      side: "BUY",
      params: { stopLossPrice: 0.4 },
    };

    const result = evaluateStopLoss(order, { price: 0.39 } as any);
    expect(result.shouldExecute).toBe(true);
    expect(result.reason).toContain("Stop-loss");
  });

  test("triggers take-profit on sell when price falls", () => {
    const order = {
      id: "order-2",
      side: "SELL",
      params: { takeProfitPrice: 0.5 },
    };

    const result = evaluateStopLoss(order, { price: 0.49 } as any);
    expect(result.shouldExecute).toBe(true);
    expect(result.reason).toContain("Take-profit");
  });

  test("does nothing when thresholds are not met", () => {
    const order = {
      id: "order-3",
      side: "BUY",
      params: { stopLossPrice: 0.4, takeProfitPrice: 0.7 },
    };

    const result = evaluateStopLoss(order, { price: 0.5 } as any);
    expect(result.shouldExecute).toBe(false);
  });
});
