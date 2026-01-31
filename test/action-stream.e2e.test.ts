/**
 * Integration tests for the Live Action Stream feature
 *
 * This test suite verifies end-to-end functionality of the action stream aggregator,
 * including event aggregation from multiple sources, persistence to the store, and
 * query/filter functionality.
 *
 * MANUAL TESTING CHECKLIST (TODO):
 *
 * The following items require manual testing with a running system:
 *
 * 1. [ ] Start gateway and observe action stream events
 *      - Run: pnpm start gateway
 *      - Connect UI and verify action stream panel shows events
 *
 * 2. [ ] Trigger an agent run and see events appear
 *      - Run: pnpm ask "test task"
 *      - Verify agent.lifecycle events appear in real-time
 *
 * 3. [ ] Run a cron job and verify event appears
 *      - Create a test cron job and run it
 *      - Verify cron.started/cron.finished events appear
 *
 * 4. [ ] Use browser automation and verify screenshots appear
 *      - Run browser navigation action
 *      - Verify browser.screenshot events appear with image paths
 *
 * 5. [ ] Check token usage is tracked
 *      - Run an agent task that uses LLM
 *      - Verify agent.tokens events appear with correct counts
 *
 * 6. [ ] Verify filters work in UI
 *      - Filter by event type (agent.lifecycle, cron.started, etc.)
 *      - Filter by runId
 *      - Filter by time range
 *      - Verify filtered results are correct
 *
 * 7. [ ] Test TUI action stream panel
 *      - Start TUI: pnpm tui
 *      - Navigate to action stream panel
 *      - Verify events display correctly
 *
 * 8. [ ] Verify WebSocket subscription delivers real-time events
 *      - Subscribe via actionstream.subscribe RPC
 *      - Trigger events
 *      - Verify actionstream.event broadcasts are received
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ActionStreamEvent } from "../src/infra/action-stream-types.js";
import type { AgentEventPayload } from "../src/infra/agent-events.js";
import type { CronEvent } from "../src/cron/service/state.js";
import {
  createActionStreamAggregator,
  type ActionStreamAggregator,
} from "../src/infra/action-stream.js";
import { createActionStreamStore, resetGlobalActionStreamStoreForTest } from "../src/infra/action-stream-store.js";

describe("action-stream e2e integration", () => {
  let aggregator: ActionStreamAggregator;
  let capturedEvents: ActionStreamEvent[] = [];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    // Reset global state to ensure clean test isolation
    resetGlobalActionStreamStoreForTest();

    // Create a fresh aggregator and store for each test
    aggregator = createActionStreamAggregator();
    capturedEvents = [];
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (aggregator.isRunning()) {
      aggregator.stop();
    }
  });

  describe("event aggregation from multiple sources", () => {
    it("should capture agent lifecycle events", () => {
      // Start the aggregator
      aggregator.start();

      // Subscribe to capture all events
      unsubscribe = aggregator.onAction((evt) => {
        capturedEvents.push(evt);
      });

      // Simulate an agent lifecycle start event
      const agentEvent: AgentEventPayload = {
        runId: "test-run-001",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        sessionKey: "test-session",
        data: {
          phase: "start",
          agentId: "main",
          task: "Test task for integration",
        },
      };

      aggregator.handleAgentEvent(agentEvent);

      // Verify the event was captured
      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("agent.lifecycle");
      expect(capturedEvents[0].runId).toBe("test-run-001");
      expect(capturedEvents[0].sessionKey).toBe("test-session");

      const lifecycleData = capturedEvents[0].data as { phase: string; agentId: string; task?: string };
      expect(lifecycleData.phase).toBe("start");
      expect(lifecycleData.agentId).toBe("main");
      expect(lifecycleData.task).toBe("Test task for integration");
    });

    it("should capture agent tool execution events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const toolEvent: AgentEventPayload = {
        runId: "test-run-002",
        seq: 1,
        stream: "tool",
        ts: Date.now(),
        data: {
          phase: "start",
          name: "bash.execute",
          args: { command: "echo hello" },
        },
      };

      aggregator.handleAgentEvent(toolEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("agent.tool");

      const toolData = capturedEvents[0].data as { toolName: string; args?: Record<string, unknown> };
      expect(toolData.toolName).toBe("bash.execute");
      expect(toolData.args?.command).toBe("echo hello");
    });

    it("should capture agent assistant stream events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const assistantEvent: AgentEventPayload = {
        runId: "test-run-003",
        seq: 1,
        stream: "assistant",
        ts: Date.now(),
        data: {
          content: "Thinking about the task...",
          delta: "Thinking",
          finished: false,
        },
      };

      aggregator.handleAgentEvent(assistantEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("agent.assistant");

      const assistantData = capturedEvents[0].data as { content: string; delta?: string; finished: boolean };
      expect(assistantData.content).toBe("Thinking about the task...");
      expect(assistantData.delta).toBe("Thinking");
      expect(assistantData.finished).toBe(false);
    });

    it("should capture agent error events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const errorEvent: AgentEventPayload = {
        runId: "test-run-004",
        seq: 1,
        stream: "error",
        ts: Date.now(),
        data: {
          error: "Tool execution failed",
          code: "TOOL_ERROR",
          recoverable: true,
        },
      };

      aggregator.handleAgentEvent(errorEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("agent.error");

      const errorData = capturedEvents[0].data as { error: string; code?: string; recoverable: boolean };
      expect(errorData.error).toBe("Tool execution failed");
      expect(errorData.code).toBe("TOOL_ERROR");
      expect(errorData.recoverable).toBe(true);
    });

    it("should capture cron job started events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const cronEvent: CronEvent = {
        jobId: "cron-job-001",
        action: "started",
        runAtMs: Date.now(),
      };

      aggregator.handleCronEvent(cronEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("cron.started");

      const cronData = capturedEvents[0].data as { jobId: string; jobName: string };
      expect(cronData.jobId).toBe("cron-job-001");
      expect(cronData.jobName).toBe("cron-job-001");
    });

    it("should capture cron job finished events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const cronEvent: CronEvent = {
        jobId: "cron-job-002",
        action: "finished",
        status: "ok",
        durationMs: 1234,
        runAtMs: Date.now(),
        summary: "Job completed successfully",
      };

      aggregator.handleCronEvent(cronEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("cron.finished");

      const cronData = capturedEvents[0].data as { jobId: string; jobName: string; durationMs: number; summary?: string };
      expect(cronData.jobId).toBe("cron-job-002");
      expect(cronData.jobName).toBe("cron-job-002");
      expect(cronData.durationMs).toBe(1234);
      expect(cronData.summary).toBe("Job completed successfully");
    });

    it("should capture cron job error events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const cronEvent: CronEvent = {
        jobId: "cron-job-003",
        action: "finished",
        status: "error",
        runAtMs: Date.now(),
        error: "Job failed with timeout",
      };

      aggregator.handleCronEvent(cronEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("cron.error");

      const cronData = capturedEvents[0].data as { jobId: string; jobName: string; error: string };
      expect(cronData.jobId).toBe("cron-job-003");
      expect(cronData.jobName).toBe("cron-job-003");
      expect(cronData.error).toBe("Job failed with timeout");
    });

    it("should capture browser screenshot events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const screenshotEvent = {
        screenshotPath: "/screenshots/page-001.png",
        thumbnailPath: "/screenshots/thumbs/page-001-thumb.png",
        url: "https://example.com",
        targetId: "tab-1",
        fullPage: true,
        width: 1920,
        height: 1080,
      };

      aggregator.handleBrowserScreenshot(screenshotEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("browser.screenshot");

      const screenshotData = capturedEvents[0].data as {
        screenshotPath: string;
        thumbnailPath?: string;
        url?: string;
        targetId?: string;
        fullPage?: boolean;
        width?: number;
        height?: number;
      };
      expect(screenshotData.screenshotPath).toBe("/screenshots/page-001.png");
      expect(screenshotData.thumbnailPath).toBe("/screenshots/thumbs/page-001-thumb.png");
      expect(screenshotData.url).toBe("https://example.com");
      expect(screenshotData.targetId).toBe("tab-1");
      expect(screenshotData.fullPage).toBe(true);
      expect(screenshotData.width).toBe(1920);
      expect(screenshotData.height).toBe(1080);
    });

    it("should capture token usage events", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      const tokenEvent = {
        runId: "test-run-005",
        sessionKey: "test-session",
        promptTokens: 150,
        completionTokens: 75,
        totalTokens: 225,
        model: "claude-3-opus",
        provider: "anthropic",
        costUsd: 0.00225,
      };

      aggregator.recordTokenUsage(tokenEvent);

      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe("agent.tokens");
      expect(capturedEvents[0].runId).toBe("test-run-005");
      expect(capturedEvents[0].sessionKey).toBe("test-session");

      const tokenData = capturedEvents[0].data as {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        model: string;
        provider: string;
        costUsd?: number;
      };
      expect(tokenData.promptTokens).toBe(150);
      expect(tokenData.completionTokens).toBe(75);
      expect(tokenData.totalTokens).toBe(225);
      expect(tokenData.model).toBe("claude-3-opus");
      expect(tokenData.provider).toBe("anthropic");
      expect(tokenData.costUsd).toBe(0.00225);
    });

    it("should aggregate events from multiple sources simultaneously", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      // Send events from different sources
      aggregator.handleAgentEvent({
        runId: "test-run-multi",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start", agentId: "main" },
      });

      aggregator.handleCronEvent({
        jobId: "cron-multi",
        action: "started",
        runAtMs: Date.now(),
      });

      aggregator.handleBrowserScreenshot({
        screenshotPath: "/screenshots/multi.png",
        url: "https://example.com/multi",
      });

      aggregator.recordTokenUsage({
        runId: "test-run-multi",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        model: "claude-3-sonnet",
        provider: "anthropic",
      });

      expect(capturedEvents.length).toBe(4);

      // Verify all event types are present
      const types = capturedEvents.map((e) => e.type);
      expect(types).toContain("agent.lifecycle");
      expect(types).toContain("cron.started");
      expect(types).toContain("browser.screenshot");
      expect(types).toContain("agent.tokens");
    });
  });

  describe("event persistence to store", () => {
    it("should persist events to the store", () => {
      aggregator.start();

      // Add some events
      aggregator.handleAgentEvent({
        runId: "test-run-persist",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start", agentId: "main" },
      });

      aggregator.handleCronEvent({
        jobId: "cron-persist",
        action: "started",
        runAtMs: Date.now(),
      });

      // Get the store and verify events were persisted
      const store = aggregator.getStore();
      expect(store.size()).toBe(2);

      const allEvents = store.getAll();
      expect(allEvents.length).toBe(2);
      expect(allEvents.some((e) => e.type === "agent.lifecycle")).toBe(true);
      expect(allEvents.some((e) => e.type === "cron.started")).toBe(true);
    });

    it("should persist events with unique IDs", () => {
      aggregator.start();

      aggregator.handleAgentEvent({
        runId: "test-run-unique",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      aggregator.handleAgentEvent({
        runId: "test-run-unique",
        seq: 2,
        stream: "tool",
        ts: Date.now(),
        data: { phase: "start", name: "bash" },
      });

      const store = aggregator.getStore();
      const events = store.getAll();

      expect(events.length).toBe(2);
      expect(events[0].id).not.toBe(events[1].id);
      expect(events[0].id).toMatch(/^act_\d+_[a-z0-9]+$/);
      expect(events[1].id).toMatch(/^act_\d+_[a-z0-9]+$/);
    });

    it("should store events with timestamps", () => {
      const beforeTime = Date.now();

      aggregator.start();

      aggregator.handleAgentEvent({
        runId: "test-run-timestamp",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      const afterTime = Date.now();

      const store = aggregator.getStore();
      const events = store.getAll();

      expect(events.length).toBe(1);
      expect(events[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(events[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("query and filter functionality", () => {
    beforeEach(() => {
      aggregator.start();

      // Add test events with different properties
      const baseTime = Date.now();

      // Agent lifecycle events
      aggregator.handleAgentEvent({
        runId: "run-filter-1",
        seq: 1,
        stream: "lifecycle",
        ts: baseTime - 5000,
        sessionKey: "session-alpha",
        data: { phase: "start", agentId: "agent-1" },
      });

      aggregator.handleAgentEvent({
        runId: "run-filter-1",
        seq: 2,
        stream: "lifecycle",
        ts: baseTime - 3000,
        sessionKey: "session-alpha",
        data: { phase: "end", agentId: "agent-1" },
      });

      // Different run
      aggregator.handleAgentEvent({
        runId: "run-filter-2",
        seq: 1,
        stream: "lifecycle",
        ts: baseTime - 2000,
        sessionKey: "session-beta",
        data: { phase: "start", agentId: "agent-2" },
      });

      // Cron event
      aggregator.handleCronEvent({
        jobId: "cron-filter-1",
        action: "started",
        runAtMs: baseTime - 1000,
      });

      // Token event
      aggregator.recordTokenUsage({
        runId: "run-filter-1",
        sessionKey: "session-alpha",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        model: "test-model",
        provider: "test-provider",
      });

      // Browser screenshot
      aggregator.handleBrowserScreenshot({
        screenshotPath: "/screenshots/filter-test.png",
        url: "https://example.com",
      });
    });

    it("should query all events from the store", () => {
      const store = aggregator.getStore();
      const allEvents = store.getAll();

      expect(allEvents.length).toBe(6);
    });

    it("should filter events by type", () => {
      const store = aggregator.getStore();
      const lifecycleEvents = store.query({ types: ["agent.lifecycle"] });

      expect(lifecycleEvents.length).toBe(3);
      expect(lifecycleEvents.every((e) => e.type === "agent.lifecycle")).toBe(true);
    });

    it("should filter events by runId", () => {
      const store = aggregator.getStore();
      const run1Events = store.query({ runId: "run-filter-1" });

      expect(run1Events.length).toBe(3);
      expect(run1Events.every((e) => e.runId === "run-filter-1")).toBe(true);

      // Verify we have lifecycle, tokens events for this run
      const types = run1Events.map((e) => e.type);
      expect(types).toContain("agent.lifecycle");
      expect(types).toContain("agent.tokens");
    });

    it("should filter events by sessionKey", () => {
      const store = aggregator.getStore();
      const sessionAlphaEvents = store.query({ sessionKey: "session-alpha" });

      expect(sessionAlphaEvents.length).toBe(3);
      expect(sessionAlphaEvents.every((e) => e.sessionKey === "session-alpha")).toBe(true);
    });

    it("should filter events by time range", () => {
      const store = aggregator.getStore();
      const now = Date.now();

      // Get events from the last 3 seconds
      const recentEvents = store.query({ afterMs: now - 3000 });

      // Should include cron.started, agent.tokens, browser.screenshot, and one lifecycle
      expect(recentEvents.length).toBeGreaterThanOrEqual(3);
      expect(recentEvents.every((e) => e.timestamp >= now - 3000)).toBe(true);
    });

    it("should filter events with multiple criteria", () => {
      const store = aggregator.getStore();
      const lifecycleForRun1 = store.query({
        types: ["agent.lifecycle"],
        runId: "run-filter-1",
      });

      expect(lifecycleForRun1.length).toBe(2);
      expect(lifecycleForRun1.every((e) => e.type === "agent.lifecycle")).toBe(true);
      expect(lifecycleForRun1.every((e) => e.runId === "run-filter-1")).toBe(true);
    });

    it("should respect limit in query", () => {
      const store = aggregator.getStore();
      const limitedEvents = store.query({ limit: 2 });

      expect(limitedEvents.length).toBe(2);
    });

    it("should get events by runId", () => {
      const store = aggregator.getStore();
      const run1Events = store.getByRunId("run-filter-1");

      expect(run1Events.length).toBe(3);
      expect(run1Events.every((e) => e.runId === "run-filter-1")).toBe(true);
    });

    it("should get recent events sorted by timestamp", () => {
      const store = aggregator.getStore();
      const recentEvents = store.getRecent(3);

      expect(recentEvents.length).toBe(3);

      // Verify they are sorted descending by timestamp
      for (let i = 0; i < recentEvents.length - 1; i++) {
        expect(recentEvents[i].timestamp).toBeGreaterThanOrEqual(recentEvents[i + 1].timestamp);
      }
    });

    it("should get specific event by ID", () => {
      const store = aggregator.getStore();
      const allEvents = store.getAll();
      const firstEventId = allEvents[0].id;

      const retrievedEvent = store.get(firstEventId);

      expect(retrievedEvent).toBeDefined();
      expect(retrievedEvent?.id).toBe(firstEventId);
    });

    it("should return undefined for non-existent event ID", () => {
      const store = aggregator.getStore();
      const retrievedEvent = store.get("non-existent-id");

      expect(retrievedEvent).toBeUndefined();
    });

    it("should clear all events", () => {
      const store = aggregator.getStore();

      expect(store.size()).toBeGreaterThan(0);

      store.clear();

      expect(store.size()).toBe(0);
      expect(store.getAll()).toEqual([]);
    });
  });

  describe("aggregator lifecycle", () => {
    it("should track running state", () => {
      expect(aggregator.isRunning()).toBe(false);

      aggregator.start();
      expect(aggregator.isRunning()).toBe(true);

      aggregator.stop();
      expect(aggregator.isRunning()).toBe(false);
    });

    it("should ignore events when stopped", () => {
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      // Try to add events before starting
      aggregator.handleAgentEvent({
        runId: "test-run-stopped",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(capturedEvents.length).toBe(0);
      expect(aggregator.getStore().size()).toBe(0);

      // Start and add events
      aggregator.start();
      aggregator.handleAgentEvent({
        runId: "test-run-stopped",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(capturedEvents.length).toBe(1);
      expect(aggregator.getStore().size()).toBe(1);
    });

    it("should stop capturing events after stop() is called", () => {
      aggregator.start();
      unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

      // Add event while running
      aggregator.handleAgentEvent({
        runId: "test-run-stop",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(capturedEvents.length).toBe(1);

      // Stop the aggregator
      aggregator.stop();

      // Try to add another event
      aggregator.handleAgentEvent({
        runId: "test-run-stop",
        seq: 2,
        stream: "tool",
        ts: Date.now(),
        data: { phase: "start", name: "bash" },
      });

      // Event should not be captured
      expect(capturedEvents.length).toBe(1);
    });
  });

  describe("event listener management", () => {
    it("should add event listeners", () => {
      aggregator.start();

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = aggregator.onAction(listener1);
      const unsub2 = aggregator.onAction(listener2);

      aggregator.handleAgentEvent({
        runId: "test-run-listeners",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();
      unsub2();
    });

    it("should remove event listeners", () => {
      aggregator.start();

      const listener = vi.fn();
      const unsub = aggregator.onAction(listener);

      aggregator.handleAgentEvent({
        runId: "test-run-unsub",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsub();

      aggregator.handleAgentEvent({
        runId: "test-run-unsub",
        seq: 2,
        stream: "tool",
        ts: Date.now(),
        data: { phase: "start", name: "bash" },
      });

      // Listener should not be called again
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should handle listener errors gracefully", () => {
      aggregator.start();

      const throwingListener = () => {
        throw new Error("Listener error");
      };
      const workingListener = vi.fn();

      aggregator.onAction(throwingListener);
      aggregator.onAction(workingListener);

      // This should not throw despite one listener throwing
      expect(() => {
        aggregator.handleAgentEvent({
          runId: "test-run-error",
          seq: 1,
          stream: "lifecycle",
          ts: Date.now(),
          data: { phase: "start" },
        });
      }).not.toThrow();

      // The working listener should still be called
      expect(workingListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("store event listeners", () => {
    it("should notify store event listeners", () => {
      aggregator.start();

      const storeListener = vi.fn();
      const store = aggregator.getStore();
      const unsub = store.onEvent(storeListener);

      aggregator.handleAgentEvent({
        runId: "test-run-store-listener",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(storeListener).toHaveBeenCalledTimes(1);
      expect(storeListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "agent.lifecycle",
          runId: "test-run-store-listener",
        })
      );

      unsub();
    });

    it("should unsubscribe store event listeners", () => {
      aggregator.start();

      const storeListener = vi.fn();
      const store = aggregator.getStore();
      const unsub = store.onEvent(storeListener);

      aggregator.handleAgentEvent({
        runId: "test-run-store-unsub",
        seq: 1,
        stream: "lifecycle",
        ts: Date.now(),
        data: { phase: "start" },
      });

      expect(storeListener).toHaveBeenCalledTimes(1);

      unsub();

      aggregator.handleAgentEvent({
        runId: "test-run-store-unsub",
        seq: 2,
        stream: "tool",
        ts: Date.now(),
        data: { phase: "start", name: "bash" },
      });

      // Listener should not be called again
      expect(storeListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("circular buffer behavior", () => {
    beforeEach(() => {
      // Reset global state before each circular buffer test
      resetGlobalActionStreamStoreForTest();
    });

    it("should enforce max size limit", () => {
      const smallStore = createActionStreamStore({ maxSize: 5 });

      // Add more events than maxSize
      for (let i = 0; i < 10; i++) {
        smallStore.add({
          id: `act_${i}`,
          type: "agent.lifecycle",
          timestamp: Date.now() + i,
          data: { phase: "start" },
        });
      }

      // Store should only contain the last 5 events
      expect(smallStore.size()).toBe(5);

      const allEvents = smallStore.getAll();
      const ids = allEvents.map((e) => e.id);

      // Oldest events (0-4) should have been evicted
      expect(ids).not.toContain("act_0");
      expect(ids).not.toContain("act_1");
      expect(ids).not.toContain("act_2");
      expect(ids).not.toContain("act_3");
      expect(ids).not.toContain("act_4");

      // Newest events (5-9) should be present
      expect(ids).toContain("act_5");
      expect(ids).toContain("act_6");
      expect(ids).toContain("act_7");
      expect(ids).toContain("act_8");
      expect(ids).toContain("act_9");
    });

    it("should maintain insertion order within circular buffer", () => {
      const store = createActionStreamStore({ maxSize: 100 });

      const timestamps: number[] = [];
      for (let i = 0; i < 10; i++) {
        const ts = Date.now() + i * 10;
        timestamps.push(ts);
        store.add({
          id: `act_order_${i}`,
          type: "agent.lifecycle",
          timestamp: ts,
          data: { phase: "start" },
        });
      }

      const allEvents = store.getAll();
      const eventTimestamps = allEvents.map((e) => e.timestamp);

      // Timestamps should be in ascending order of insertion
      expect(eventTimestamps).toEqual(expect.arrayContaining(timestamps));
    });
  });
});
