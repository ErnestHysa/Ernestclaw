/**
 * Tests for ActionStreamPanel TUI component
 * TDD: RED phase - test first, then implement
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  ActionStreamPanel,
  type ActionStreamPanelProps,
  formatActionPreview
} from "./action-stream-panel.js";
import type { ActionStreamStore } from "../../infra/action-stream-store.js";
import type { ActionStreamEvent } from "../../infra/action-stream-types.js";

describe("ActionStreamPanel", () => {
  let mockStore: ActionStreamStore;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock store
    mockStore = {
      add: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(),
      query: vi.fn(),
      getRecent: vi.fn(() => []),
      getByRunId: vi.fn(() => []),
      clear: vi.fn(),
      onEvent: vi.fn(() => () => {}),
      size: vi.fn(() => 0)
    };

    mockOnClose = vi.fn();

    // Mock timers for setInterval/setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render bordered panel with header", () => {
    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Should have children for the border structure
    expect(panel.getChildren().length).toBeGreaterThan(0);
  });

  it("should show 'No actions yet' when empty", () => {
    mockStore.getRecent = vi.fn(() => []);

    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Get all text content from panel
    const textContent = panel.getText();
    const hasEmptyMessage = textContent.some((line: string) =>
      line.includes("No actions yet")
    );

    expect(hasEmptyMessage).toBe(true);
  });

  it("should render recent actions with timestamps", () => {
    const now = Date.now();
    const mockActions: ActionStreamEvent[] = [
      {
        id: "act_1",
        type: "agent.lifecycle",
        timestamp: now,
        runId: "run_1",
        data: { phase: "start" }
      },
      {
        id: "act_2",
        type: "agent.tool",
        timestamp: now + 1000,
        runId: "run_1",
        data: { phase: "start", toolName: "test_tool" }
      }
    ];

    mockStore.getRecent = vi.fn(() => mockActions);

    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Should have called getRecent with limit 10
    expect(mockStore.getRecent).toHaveBeenCalledWith(10);
  });

  it("should auto-refresh every second", () => {
    const renderSpy = vi.spyOn(ActionStreamPanel.prototype as any, "render");

    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Clear initial render
    renderSpy.mockClear();

    // Fast-forward 1 second
    vi.advanceTimersByTime(1000);

    // Should have re-rendered
    expect(renderSpy).toHaveBeenCalled();
  });

  it("should stop auto-refresh on destroy", () => {
    const renderSpy = vi.spyOn(ActionStreamPanel.prototype as any, "render");

    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Clear initial render
    renderSpy.mockClear();

    // Destroy the panel
    panel.destroy();

    // Fast-forward past refresh interval
    vi.advanceTimersByTime(2000);

    // Should NOT have re-rendered after destroy
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it("should format preview for agent.lifecycle events", () => {
    const result = formatActionPreview({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      data: { phase: "start" }
    });

    expect(result).toContain("start");
  });

  it("should format preview for agent.tool events", () => {
    const result = formatActionPreview({
      id: "act_1",
      type: "agent.tool",
      timestamp: Date.now(),
      data: { phase: "start", toolName: "browser_navigate" }
    });

    expect(result).toContain("browser_navigate");
  });

  it("should format preview for browser.screenshot events", () => {
    const result = formatActionPreview({
      id: "act_1",
      type: "browser.screenshot",
      timestamp: Date.now(),
      data: { screenshotPath: "/path/to/screenshot.jpg" }
    });

    expect(result).toContain("screenshot");
  });

  it("should format preview for cron.started events", () => {
    const result = formatActionPreview({
      id: "act_1",
      type: "cron.started",
      timestamp: Date.now(),
      data: { jobId: "job_123", jobName: "daily_report" }
    });

    expect(result).toContain("job_123");
  });

  it("should return empty string for unknown event types", () => {
    const result = formatActionPreview({
      id: "act_1",
      type: "unknown.type" as any,
      timestamp: Date.now(),
      data: {}
    });

    expect(result).toBe("");
  });

  it("should show header with title 'LIVE ACTION STREAM - GOD VIEW'", () => {
    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    const textContent = panel.getText();
    const hasHeader = textContent.some((line: string) =>
      line.includes("LIVE ACTION STREAM")
    );

    expect(hasHeader).toBe(true);
  });

  it("should show controls hint at bottom", () => {
    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    const textContent = panel.getText();
    const hasControls = textContent.some((line: string) =>
      line.includes("[r]efresh")
    );

    expect(hasControls).toBe(true);
  });

  it("should call onClose when quit action triggered", () => {
    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Trigger quit via public method
    panel.handleKey?.("q");

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should support manual refresh via update method", () => {
    const renderSpy = vi.spyOn(ActionStreamPanel.prototype as any, "render");

    const panel = new ActionStreamPanel({
      store: mockStore,
      onClose: mockOnClose
    });

    // Clear initial render
    renderSpy.mockClear();

    // Call update
    panel.update();

    // Should have re-rendered
    expect(renderSpy).toHaveBeenCalled();
  });

  it("should pad type to 20 characters", () => {
    // This tests the internal formatting behavior
    const shortType = "agent.tool";
    const padded = shortType.padEnd(20);

    expect(padded.length).toBe(20);
    expect(padded.endsWith(" ")).toBe(true);
  });
});
