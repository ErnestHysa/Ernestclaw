// src/gateway/server-methods/action-stream.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetGlobalActionStreamAggregatorForTest } from "../../infra/action-stream.js";
import { resetGlobalActionStreamStoreForTest } from "../../infra/action-stream-store.js";
import { actionStreamHandlers } from "./action-stream.js";

describe("action-stream gateway handlers", () => {
  beforeEach(() => {
    resetGlobalActionStreamAggregatorForTest();
    resetGlobalActionStreamStoreForTest();
  });

  it("should return empty history when no events", async () => {
    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.history"]({
      req: { id: "1", method: "actionstream.history", params: {} },
      params: { limit: 10 },
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      { actions: [], total: 0 },
      undefined
    );
  });

  it("should return recent actions with limit", async () => {
    const { initGlobalActionStreamAggregator } = await import("../../infra/action-stream.js");
    const aggregator = initGlobalActionStreamAggregator();
    aggregator.start();

    // Add some test events
    aggregator.getStore().add({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      runId: "run_1",
      data: { phase: "start" }
    });

    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.history"]({
      req: { id: "2", method: "actionstream.history", params: {} },
      params: { limit: 10 },
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    const result = respond.mock.calls[0][1] as { actions: unknown[] };
    expect(result.actions.length).toBeGreaterThan(0);

    aggregator.stop();
  });

  it("should subscribe to action stream", async () => {
    const broadcast = vi.fn();
    const respond = vi.fn();
    const context = {
      broadcast,
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.subscribe"]({
      req: { id: "3", method: "actionstream.subscribe", params: {} },
      params: {},
      client: { connect: { client: { id: "test-client-1" } } } as any,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      { subscribed: true },
      undefined
    );
  });
});
