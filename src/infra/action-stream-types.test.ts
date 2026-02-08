// src/infra/action-stream-types.test.ts
import { describe, it, expect } from "vitest";
import {
  type ActionStreamEvent,
  type ActionStreamFilter,
  isActionOfType,
  filterActions,
  formatActionForDisplay,
} from "./action-stream-types.js";

describe("ActionStreamEvent", () => {
  it("should create valid agent lifecycle events", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      runId: "run_123",
      sessionKey: "session_abc",
      data: {
        phase: "start",
        agentId: "main",
        task: "Test task",
      },
    };
    expect(evt.type).toBe("agent.lifecycle");
    expect(evt.data.phase).toBe("start");
  });

  it("should filter actions by type", () => {
    const actions: ActionStreamEvent[] = [
      {
        id: "act_1",
        type: "agent.lifecycle",
        timestamp: Date.now(),
        runId: "run_1",
        data: { phase: "start" },
      },
      {
        id: "act_2",
        type: "cron.started",
        timestamp: Date.now(),
        data: { jobId: "job_1" },
      },
    ];

    const filtered = filterActions(actions, { types: ["agent.lifecycle"] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe("agent.lifecycle");
  });

  it("should identify agent tool events", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.tool",
      timestamp: Date.now(),
      runId: "run_1",
      data: {
        phase: "start",
        toolName: "browser_navigate",
        args: { url: "https://example.com" },
      },
    };
    expect(isActionOfType(evt, "agent.tool")).toBe(true);
    expect(isActionOfType(evt, "agent.lifecycle")).toBe(false);
  });

  it("should format action for display", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.tool",
      timestamp: 1706650800000,
      runId: "run_1",
      data: {
        phase: "start",
        toolName: "file_write",
        args: { path: "/test.txt" },
      },
    };
    const display = formatActionForDisplay(evt);
    expect(display.title).toContain("file_write");
    expect(display.type).toBe("agent.tool");
  });

  it("should include browser screenshot events", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "browser.screenshot",
      timestamp: Date.now(),
      runId: "run_1",
      data: {
        screenshotPath: "/media/browser/screenshot_1.jpg",
        thumbnailPath: "/media/browser/thumb_screenshot_1.jpg",
        url: "https://example.com",
        targetId: "tab_1",
      },
    };
    expect(evt.type).toBe("browser.screenshot");
    expect(evt.data.screenshotPath).toBe("/media/browser/screenshot_1.jpg");
  });

  it("should include token usage events", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.tokens",
      timestamp: Date.now(),
      runId: "run_1",
      sessionKey: "session_1",
      data: {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        model: "gpt-4",
        provider: "openai",
      },
    };
    expect(evt.type).toBe("agent.tokens");
    expect(evt.data.totalTokens).toBe(1500);
  });
});
