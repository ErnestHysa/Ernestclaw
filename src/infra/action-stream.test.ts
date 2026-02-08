// src/infra/action-stream.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createActionStreamAggregator,
  type ActionStreamAggregator
} from "./action-stream.js";
import { resetGlobalActionStreamStoreForTest } from "./action-stream-store.js";
import { resetAgentRunContextForTest } from "./agent-events.js";

describe("ActionStreamAggregator", () => {
  let aggregator: ActionStreamAggregator;

  beforeEach(() => {
    resetGlobalActionStreamStoreForTest();
    resetAgentRunContextForTest();
    aggregator = createActionStreamAggregator();
  });

  it("should subscribe to agent events and convert them to action events", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    // Start the aggregator
    aggregator.start();

    // Simulate agent lifecycle event
    aggregator.handleAgentEvent({
      runId: "run_1",
      seq: 1,
      stream: "lifecycle",
      ts: Date.now(),
      sessionKey: "session_1",
      data: { phase: "start", task: "Test task" }
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; runId: string };
    expect(action.type).toBe("agent.lifecycle");
    expect(action.runId).toBe("run_1");
  });

  it("should convert agent tool events", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleAgentEvent({
      runId: "run_1",
      seq: 1,
      stream: "tool",
      ts: Date.now(),
      data: {
        phase: "start",
        name: "browser_navigate",
        args: { url: "https://example.com" }
      }
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; data: { toolName: string } };
    expect(action.type).toBe("agent.tool");
    expect(action.data.toolName).toBe("browser_navigate");
  });

  it("should convert cron events", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleCronEvent({
      jobId: "job_1",
      action: "started",
      runAtMs: Date.now()
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; data: { jobId: string } };
    expect(action.type).toBe("cron.started");
    expect(action.data.jobId).toBe("job_1");
  });

  it("should convert browser screenshot events", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleBrowserScreenshot({
      screenshotPath: "/media/screenshot.jpg",
      thumbnailPath: "/media/thumb.jpg",
      url: "https://example.com",
      targetId: "tab_1"
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; data: { screenshotPath: string } };
    expect(action.type).toBe("browser.screenshot");
    expect(action.data.screenshotPath).toBe("/media/screenshot.jpg");
  });

  it("should emit browser screenshot with full metadata", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleBrowserScreenshot({
      screenshotPath: "/media/screenshot-123.jpg",
      thumbnailPath: undefined,
      url: "https://example.com",
      targetId: "tab_abc123",
      fullPage: false,
      width: 1920,
      height: 1080,
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as {
      type: string;
      id: string;
      timestamp: number;
      data: {
        screenshotPath: string;
        thumbnailPath?: string;
        url?: string;
        targetId?: string;
        fullPage?: boolean;
        width?: number;
        height?: number;
      };
    };
    expect(action.type).toBe("browser.screenshot");
    expect(action.id).toMatch(/^act_\d+_[a-z0-9]+$/);
    expect(action.timestamp).toBeGreaterThan(0);
    expect(action.data.screenshotPath).toBe("/media/screenshot-123.jpg");
    expect(action.data.url).toBe("https://example.com");
    expect(action.data.targetId).toBe("tab_abc123");
    expect(action.data.fullPage).toBe(false);
    expect(action.data.width).toBe(1920);
    expect(action.data.height).toBe(1080);
  });

  it("should emit browser screenshot with minimal fields", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleBrowserScreenshot({
      screenshotPath: "/media/screenshot-minimal.jpg",
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; data: { screenshotPath: string } };
    expect(action.type).toBe("browser.screenshot");
    expect(action.data.screenshotPath).toBe("/media/screenshot-minimal.jpg");
  });

  it("should not emit browser screenshot when aggregator is stopped", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    // Don't start the aggregator

    aggregator.handleBrowserScreenshot({
      screenshotPath: "/media/screenshot.jpg",
    });

    expect(captured.length).toBe(0);
  });

  it("should include thumbnail path when provided", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.handleBrowserScreenshot({
      screenshotPath: "/media/screenshot.jpg",
      thumbnailPath: "/media/thumb.jpg",
      url: "https://example.com",
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as {
      type: string;
      data: { screenshotPath: string; thumbnailPath?: string };
    };
    expect(action.data.screenshotPath).toBe("/media/screenshot.jpg");
    expect(action.data.thumbnailPath).toBe("/media/thumb.jpg");
  });

  it("should track token usage", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();

    aggregator.recordTokenUsage({
      runId: "run_1",
      sessionKey: "session_1",
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      model: "gpt-4",
      provider: "openai"
    });

    expect(captured.length).toBe(1);
    const action = captured[0] as { type: string; data: { totalTokens: number } };
    expect(action.type).toBe("agent.tokens");
    expect(action.data.totalTokens).toBe(1500);
  });

  it("should unsubscribe from action events", () => {
    const listener = vi.fn();
    const unsubscribe = aggregator.onAction(listener);

    unsubscribe();

    aggregator.handleAgentEvent({
      runId: "run_1",
      seq: 1,
      stream: "lifecycle",
      ts: Date.now(),
      data: { phase: "start" }
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("should start and stop aggregation", () => {
    const captured: unknown[] = [];
    aggregator.onAction((evt) => captured.push(evt));

    aggregator.start();
    aggregator.handleAgentEvent({
      runId: "run_1",
      seq: 1,
      stream: "lifecycle",
      ts: Date.now(),
      data: { phase: "start" }
    });
    aggregator.stop();

    // After stop, new events should not be processed
    aggregator.handleAgentEvent({
      runId: "run_2",
      seq: 1,
      stream: "lifecycle",
      ts: Date.now(),
      data: { phase: "start" }
    });

    expect(captured.length).toBe(1);
  });
});
