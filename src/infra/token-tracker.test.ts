// src/infra/token-tracker.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTokenTracker, resetGlobalTokenTracker } from "./token-tracker.js";

describe("TokenTracker", () => {
  beforeEach(() => {
    resetGlobalTokenTracker();
  });

  it("should track token usage per run", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai"
    });

    const usage = tracker.getUsageForRun("run_1");
    expect(usage?.totalTokens).toBe(1500);
  });

  it("should aggregate usage by provider", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai"
    });

    tracker.recordUsage({
      runId: "run_2",
      promptTokens: 2000,
      completionTokens: 1000,
      model: "claude-3-opus",
      provider: "anthropic"
    });

    const byProvider = tracker.getUsageByProvider();
    expect(byProvider.openai?.totalTokens).toBe(1500);
    expect(byProvider.anthropic?.totalTokens).toBe(3000);
  });

  it("should calculate cost estimates", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai"
    });

    const cost = tracker.getTotalCost();
    expect(cost).toBeGreaterThan(0);
  });

  it("should get recent usage with limit", () => {
    const tracker = createTokenTracker();

    // Add multiple records
    for (let i = 0; i < 10; i++) {
      tracker.recordUsage({
        runId: `run_${i}`,
        promptTokens: 100 + i,
        completionTokens: 50 + i,
        model: "gpt-4",
        provider: "openai"
      });
    }

    const recent = tracker.getRecentUsage(5);
    expect(recent).toHaveLength(5);
    // Should be sorted by timestamp descending
    expect(recent[0].runId).toBe("run_9");
  });

  it("should clear all records", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai"
    });

    expect(tracker.getUsageForRun("run_1")).toBeDefined();

    tracker.clear();

    expect(tracker.getUsageForRun("run_1")).toBeUndefined();
    expect(tracker.getTotalCost()).toBe(0);
  });

  it("should handle session key in records", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      sessionKey: "session_abc",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai"
    });

    const usage = tracker.getUsageForRun("run_1");
    expect(usage?.sessionKey).toBe("session_abc");
  });

  it("should use provided cost if available", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1000,
      completionTokens: 500,
      model: "gpt-4",
      provider: "openai",
      costUsd: 0.05
    });

    const usage = tracker.getUsageForRun("run_1");
    expect(usage?.costUsd).toBe(0.05);
    expect(tracker.getTotalCost()).toBe(0.05);
  });

  it("should calculate cost correctly for gpt-4", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      model: "gpt-4",
      provider: "openai"
    });

    // gpt-4: $30 per 1M prompt, $60 per 1M completion
    // Cost = (1M * 30 + 500K * 60) / 1M = 30 + 30 = $60
    expect(tracker.getTotalCost()).toBeCloseTo(60, 2);
  });

  it("should calculate cost correctly for claude-3-opus", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1_000_000,
      completionTokens: 500_000,
      model: "claude-3-opus",
      provider: "anthropic"
    });

    // claude-3-opus: $15 per 1M prompt, $75 per 1M completion
    // Cost = (1M * 15 + 500K * 75) / 1M = 15 + 37.5 = $52.50
    expect(tracker.getTotalCost()).toBeCloseTo(52.5, 2);
  });

  it("should use default pricing for unknown models", () => {
    const tracker = createTokenTracker();

    tracker.recordUsage({
      runId: "run_1",
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      model: "unknown-model",
      provider: "unknown-provider"
    });

    // Default: $0.001 per 1M prompt, $0.002 per 1M completion
    // Cost = (1M * 0.001 + 1M * 0.002) / 1M = 0.003
    expect(tracker.getTotalCost()).toBeCloseTo(0.003, 4);
  });
});
