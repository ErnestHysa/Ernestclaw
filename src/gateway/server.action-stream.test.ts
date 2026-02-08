// src/gateway/server.action-stream.test.ts
import { describe, expect, test } from "vitest";
import {
  installGatewayTestHooks,
  startServerWithClient,
} from "./test-helpers.js";
import {
  getGlobalActionStreamAggregator,
  resetGlobalActionStreamAggregatorForTest,
} from "../infra/action-stream.js";

installGatewayTestHooks({ scope: "suite" });

describe("gateway server action stream integration", () => {
  test("initializes action stream aggregator on gateway start", { timeout: 30_000 }, async () => {
    // Reset global state before test
    resetGlobalActionStreamAggregatorForTest();

    // Start the gateway server
    const { server } = await startServerWithClient();

    try {
      // Verify the aggregator was initialized and started
      const aggregator = getGlobalActionStreamAggregator();

      expect(aggregator).not.toBeNull();
      expect(aggregator?.isRunning()).toBe(true);

      // Verify the store is accessible
      const store = aggregator?.getStore();
      expect(store).not.toBeNull();

      // Verify we can subscribe to actions
      const actions: unknown[] = [];
      const unsubscribe = aggregator?.onAction((evt) => actions.push(evt));
      expect(typeof unsubscribe).toBe("function");

      unsubscribe?.();
    } finally {
      await server.close();
      resetGlobalActionStreamAggregatorForTest();
    }
  });

  test("action stream aggregator survives gateway close", { timeout: 30_000 }, async () => {
    // Reset global state before test
    resetGlobalActionStreamAggregatorForTest();

    const { server } = await startServerWithClient();

    try {
      const aggregator1 = getGlobalActionStreamAggregator();
      expect(aggregator1).not.toBeNull();
      expect(aggregator1?.isRunning()).toBe(true);

      await server.close();

      // After close, aggregator should still exist but be stopped
      const aggregator2 = getGlobalActionStreamAggregator();
      expect(aggregator2).not.toBeNull();
      expect(aggregator2?.isRunning()).toBe(false);
    } finally {
      resetGlobalActionStreamAggregatorForTest();
    }
  });
});
