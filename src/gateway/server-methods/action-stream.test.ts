// src/gateway/server-methods/action-stream.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetGlobalActionStreamAggregatorForTest } from "../../infra/action-stream.js";
import { resetGlobalActionStreamStoreForTest } from "../../infra/action-stream-store.js";
import { actionStreamHandlers } from "./action-stream.js";
import { subscribeClientToActionStream, isClientSubscribedToActionStream } from "./action-stream.js";

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

  it("should unsubscribe from action stream", async () => {
    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    const testClientId = "test-client-unsubscribe";

    // First subscribe
    subscribeClientToActionStream(testClientId);
    expect(isClientSubscribedToActionStream(testClientId)).toBe(true);

    // Then unsubscribe via handler
    await actionStreamHandlers["actionstream.unsubscribe"]({
      req: { id: "4", method: "actionstream.unsubscribe", params: {} },
      params: {},
      client: { connect: { client: { id: testClientId } } } as any,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      { subscribed: false },
      undefined
    );
    expect(isClientSubscribedToActionStream(testClientId)).toBe(false);
  });

  it("should return stats", async () => {
    const { initGlobalActionStreamAggregator } = await import("../../infra/action-stream.js");
    const aggregator = initGlobalActionStreamAggregator();
    aggregator.start();

    // Add test events
    aggregator.getStore().add({
      id: "act_2",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      runId: "run_2",
      data: { phase: "start" }
    });

    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.stats"]({
      req: { id: "5", method: "actionstream.stats", params: {} },
      params: {},
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    const result = respond.mock.calls[0][1] as { byType: Record<string, number>; total: number; recentCount: number };
    expect(result.total).toBeGreaterThan(0);
    expect(result.byType["agent.lifecycle"]).toBe(1);

    aggregator.stop();
  });

  it("should return empty stats when no aggregator", async () => {
    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.stats"]({
      req: { id: "6", method: "actionstream.stats", params: {} },
      params: {},
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      { byType: {}, total: 0, recentCount: 0 },
      undefined
    );
  });

  it("should return run history for specific run ID", async () => {
    const { initGlobalActionStreamAggregator } = await import("../../infra/action-stream.js");
    const aggregator = initGlobalActionStreamAggregator();
    aggregator.start();

    const testRunId = "run_test_123";
    aggregator.getStore().add({
      id: "act_3",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      runId: testRunId,
      data: { phase: "start" }
    });

    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.runHistory"]({
      req: { id: "7", method: "actionstream.runHistory", params: {} },
      params: { runId: testRunId },
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    const result = respond.mock.calls[0][1] as { actions: unknown[]; runId: string };
    expect(result.runId).toBe(testRunId);
    expect(result.actions.length).toBeGreaterThan(0);

    aggregator.stop();
  });

  it("should return error for run history without runId", async () => {
    const { initGlobalActionStreamAggregator } = await import("../../infra/action-stream.js");
    const aggregator = initGlobalActionStreamAggregator();
    aggregator.start();

    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.runHistory"]({
      req: { id: "8", method: "actionstream.runHistory", params: {} },
      params: {},
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    // Should be called with success=false (error response)
    const successParam = respond.mock.calls[0][0];
    expect(successParam).toBe(false);

    aggregator.stop();
  });

  it("should return not implemented error for pauseAgent", async () => {
    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.pauseAgent"]({
      req: { id: "9", method: "actionstream.pauseAgent", params: {} },
      params: { runId: "run_1" },
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    const successParam = respond.mock.calls[0][0];
    expect(successParam).toBe(false);

    // Check error message
    const errorParam = respond.mock.calls[0][2];
    expect(errorParam).toBeDefined();
    expect(errorParam.message).toBe("Not yet implemented");
  });

  it("should return not implemented error for injectCommand", async () => {
    const respond = vi.fn();
    const context = {
      broadcast: vi.fn(),
      logGateway: { error: vi.fn() },
    };

    await actionStreamHandlers["actionstream.injectCommand"]({
      req: { id: "10", method: "actionstream.injectCommand", params: {} },
      params: { runId: "run_1", command: "help" },
      client: null,
      isWebchatConnect: () => false,
      respond,
      context: context as any,
    });

    expect(respond).toHaveBeenCalled();
    const successParam = respond.mock.calls[0][0];
    expect(successParam).toBe(false);

    // Check error message
    const errorParam = respond.mock.calls[0][2];
    expect(errorParam).toBeDefined();
    expect(errorParam.message).toBe("Not yet implemented");
  });
});
