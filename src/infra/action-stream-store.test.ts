// src/infra/action-stream-store.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createActionStreamStore,
  type ActionStreamStore,
  type ActionStreamEvent
} from "./action-stream-store.js";

describe("ActionStreamStore", () => {
  let store: ActionStreamStore;

  beforeEach(() => {
    store = createActionStreamStore({ maxSize: 100 });
  });

  it("should add events to the store", () => {
    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      runId: "run_1",
      data: { phase: "start" }
    };

    store.add(evt);
    const retrieved = store.get("act_1");
    expect(retrieved).toEqual(evt);
  });

  it("should enforce max size with circular buffer", () => {
    const smallStore = createActionStreamStore({ maxSize: 3 });

    for (let i = 0; i < 5; i++) {
      smallStore.add({
        id: `act_${i}`,
        type: "agent.lifecycle",
        timestamp: Date.now(),
        data: { phase: "start" }
      });
    }

    // Should only have the last 3 events
    expect(smallStore.getAll().length).toBe(3);
    expect(smallStore.get("act_0")).toBeUndefined();
    expect(smallStore.get("act_1")).toBeUndefined();
    expect(smallStore.get("act_2")).toBeDefined();
    expect(smallStore.get("act_3")).toBeDefined();
    expect(smallStore.get("act_4")).toBeDefined();
  });

  it("should filter events by query", () => {
    store.add({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: 1000,
      runId: "run_1",
      data: { phase: "start" }
    });
    store.add({
      id: "act_2",
      type: "cron.started",
      timestamp: 2000,
      data: { jobId: "job_1", jobName: "test" }
    });
    store.add({
      id: "act_3",
      type: "agent.lifecycle",
      timestamp: 3000,
      runId: "run_2",
      data: { phase: "start" }
    });

    const agentEvents = store.query({ types: ["agent.lifecycle"] });
    expect(agentEvents).toHaveLength(2);

    const runEvents = store.query({ runId: "run_1" });
    expect(runEvents).toHaveLength(1);
    expect(runEvents[0].id).toBe("act_1");
  });

  it("should notify listeners on new events", () => {
    const listener = vi.fn();
    store.onEvent(listener);

    const evt: ActionStreamEvent = {
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      data: { phase: "start" }
    };

    store.add(evt);

    expect(listener).toHaveBeenCalledWith(evt);
  });

  it("should unsubscribe listeners", () => {
    const listener = vi.fn();
    const unsubscribe = store.onEvent(listener);

    unsubscribe();

    store.add({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      data: { phase: "start" }
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("should get recent events with limit", () => {
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      store.add({
        id: `act_${i}`,
        type: "agent.lifecycle",
        timestamp: now + i,
        data: { phase: "start" }
      });
    }

    const recent = store.getRecent(5);
    expect(recent).toHaveLength(5);
    // Should return newest first
    expect(recent[0].id).toBe("act_9");
  });

  it("should clear all events", () => {
    store.add({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: Date.now(),
      data: { phase: "start" }
    });

    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });

  it("should get events by run ID", () => {
    store.add({
      id: "act_1",
      type: "agent.lifecycle",
      timestamp: 1000,
      runId: "run_1",
      data: { phase: "start" }
    });
    store.add({
      id: "act_2",
      type: "agent.tool",
      timestamp: 2000,
      runId: "run_1",
      data: { phase: "start", toolName: "test" }
    });
    store.add({
      id: "act_3",
      type: "agent.lifecycle",
      timestamp: 3000,
      runId: "run_2",
      data: { phase: "start" }
    });

    const run1Events = store.getByRunId("run_1");
    expect(run1Events).toHaveLength(2);
    expect(run1Events.every((e) => e.runId === "run_1")).toBe(true);
  });

  it("should update existing event without changing insertion order", () => {
    store.add({
      id: "act_1",
      type: "agent.tool",
      timestamp: 1000,
      runId: "run_1",
      data: { phase: "start", toolName: "test" }
    });

    store.add({
      id: "act_1", // Same ID
      type: "agent.tool",
      timestamp: 2000, // Different data
      runId: "run_1",
      data: { phase: "result", toolName: "test", result: "done" }
    });

    const retrieved = store.get("act_1");
    expect(retrieved?.timestamp).toBe(2000); // Updated
    expect(retrieved?.data).toEqual({ phase: "result", toolName: "test", result: "done" });
    expect(store.getAll()).toHaveLength(1); // No duplicate
  });
});
