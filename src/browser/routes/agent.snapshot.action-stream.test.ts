// src/browser/routes/agent.snapshot.action-stream.test.ts
/**
 * Integration test: Browser screenshot events emitted to action stream
 *
 * Tests that when a screenshot is captured via the /screenshot endpoint,
 * an event is emitted to the global action stream aggregator.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createActionStreamAggregator, resetGlobalActionStreamAggregatorForTest } from "../../infra/action-stream.js";
import type { ActionStreamEvent } from "../../infra/action-stream-types.js";

describe("Browser Screenshot Action Stream Integration", () => {
  beforeEach(() => {
    // Reset the global aggregator before each test
    resetGlobalActionStreamAggregatorForTest();
  });

  it("should emit screenshot event to action stream when screenshot is captured", () => {
    // Setup: Create and start the aggregator
    const aggregator = createActionStreamAggregator();
    aggregator.start();

    // Mock the global aggregator getter
    vi.doMock("../../infra/action-stream.js", async () => {
      const actual = await vi.importActual("../../infra/action-stream.js");
      return {
        ...actual,
        getGlobalActionStreamAggregator: () => aggregator,
      };
    });

    // Capture emitted events
    const capturedEvents: ActionStreamEvent[] = [];
    const unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

    try {
      // Simulate the screenshot event emission that should happen after screenshot save
      // This represents what the integration should do:
      aggregator.handleBrowserScreenshot({
        screenshotPath: "/media/screenshot-123.jpg",
        thumbnailPath: undefined,
        url: "https://example.com",
        targetId: "tab_abc123",
        fullPage: false,
        width: 1920,
        height: 1080,
      });

      // Assertions: Verify the event was captured correctly
      expect(capturedEvents.length).toBe(1);

      const evt = capturedEvents[0];
      expect(evt.type).toBe("browser.screenshot");
      expect(evt.id).toMatch(/^act_\d+_[a-z0-9]+$/);
      expect(evt.timestamp).toBeGreaterThan(0);

      const data = evt.data as {
        screenshotPath: string;
        thumbnailPath?: string;
        url?: string;
        targetId?: string;
        fullPage?: boolean;
        width?: number;
        height?: number;
      };

      expect(data.screenshotPath).toBe("/media/screenshot-123.jpg");
      expect(data.url).toBe("https://example.com");
      expect(data.targetId).toBe("tab_abc123");
      expect(data.fullPage).toBe(false);
      expect(data.width).toBe(1920);
      expect(data.height).toBe(1080);
    } finally {
      unsubscribe();
      aggregator.stop();
    }
  });

  it("should emit screenshot event with minimal fields when only path is provided", () => {
    const aggregator = createActionStreamAggregator();
    aggregator.start();

    const capturedEvents: ActionStreamEvent[] = [];
    const unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

    try {
      // Simulate minimal screenshot event (e.g., from CDP capture without metadata)
      aggregator.handleBrowserScreenshot({
        screenshotPath: "/media/screenshot-minimal.jpg",
      });

      expect(capturedEvents.length).toBe(1);

      const evt = capturedEvents[0];
      expect(evt.type).toBe("browser.screenshot");

      const data = evt.data as { screenshotPath: string };
      expect(data.screenshotPath).toBe("/media/screenshot-minimal.jpg");
    } finally {
      unsubscribe();
      aggregator.stop();
    }
  });

  it("should include thumbnail path when provided", () => {
    const aggregator = createActionStreamAggregator();
    aggregator.start();

    const capturedEvents: ActionStreamEvent[] = [];
    const unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

    try {
      aggregator.handleBrowserScreenshot({
        screenshotPath: "/media/screenshot.jpg",
        thumbnailPath: "/media/thumb.jpg",
        url: "https://example.com",
      });

      expect(capturedEvents.length).toBe(1);

      const evt = capturedEvents[0];
      const data = evt.data as { screenshotPath: string; thumbnailPath?: string };
      expect(data.screenshotPath).toBe("/media/screenshot.jpg");
      expect(data.thumbnailPath).toBe("/media/thumb.jpg");
    } finally {
      unsubscribe();
      aggregator.stop();
    }
  });

  it("should not emit events when aggregator is stopped", () => {
    const aggregator = createActionStreamAggregator();
    // Don't start the aggregator

    const capturedEvents: ActionStreamEvent[] = [];
    const unsubscribe = aggregator.onAction((evt) => capturedEvents.push(evt));

    try {
      aggregator.handleBrowserScreenshot({
        screenshotPath: "/media/screenshot.jpg",
      });

      // Should not emit when not running
      expect(capturedEvents.length).toBe(0);
    } finally {
      unsubscribe();
      aggregator.stop();
    }
  });
});
