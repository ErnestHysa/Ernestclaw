// src/infra/action-stream.ts
import type { AgentEventPayload } from "./agent-events.js";
import type { CronEvent } from "../cron/service/state.js";
import type { ActionStreamEvent } from "./action-stream-types.js";
import { generateActionId } from "./action-stream-types.js";
import {
  type ActionStreamStore,
  initGlobalActionStreamStore
} from "./action-stream-store.js";
import { onAgentEvent } from "./agent-events.js";
import { initGlobalTokenTracker } from "./token-tracker.js";

export type BrowserScreenshotEvent = {
  screenshotPath: string;
  thumbnailPath?: string;
  url?: string;
  targetId?: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
};

export type TokenUsageEvent = {
  runId: string;
  sessionKey?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  costUsd?: number;
};

export type ActionStreamAggregator = {
  /** Start aggregating events from all sources */
  start: () => void;
  /** Stop aggregating events */
  stop: () => void;
  /** Handle agent events (called from listener) */
  handleAgentEvent: (evt: AgentEventPayload) => void;
  /** Handle cron events */
  handleCronEvent: (evt: CronEvent) => void;
  /** Handle browser screenshot events */
  handleBrowserScreenshot: (evt: BrowserScreenshotEvent) => void;
  /** Record token usage */
  recordTokenUsage: (evt: TokenUsageEvent) => void;
  /** Subscribe to all aggregated actions */
  onAction: (listener: (evt: ActionStreamEvent) => void) => () => void;
  /** Get the underlying store */
  getStore: () => ActionStreamStore;
  /** Check if aggregator is running */
  isRunning: () => boolean;
};

/** Create the action stream aggregator */
export function createActionStreamAggregator(): ActionStreamAggregator {
  const store = initGlobalActionStreamStore({ maxSize: 500 });
  const actionListeners = new Set<(evt: ActionStreamEvent) => void>();
  let agentUnsub: (() => void) | null = null;
  let running = false;

  const emitAction = (evt: ActionStreamEvent) => {
    store.add(evt);
    for (const listener of actionListeners) {
      try {
        listener(evt);
      } catch {
        // Ignore listener errors
      }
    }
  };

  const handleAgentEvent: ActionStreamAggregator["handleAgentEvent"] = (agentEvt) => {
    if (!running) return;

    const baseEvt = {
      id: generateActionId(),
      timestamp: agentEvt.ts,
      runId: agentEvt.runId,
      sessionKey: agentEvt.sessionKey,
    };

    // Convert agent events to action events
    if (agentEvt.stream === "lifecycle") {
      const phase = agentEvt.data?.phase;
      if (phase === "start" || phase === "end" || phase === "error") {
        emitAction({
          ...baseEvt,
          type: "agent.lifecycle",
          data: {
            phase,
            agentId: agentEvt.data?.agentId as string | undefined,
            task: agentEvt.data?.task as string | undefined,
            startedAt: agentEvt.data?.startedAt as number | undefined,
            endedAt: agentEvt.data?.endedAt as number | undefined,
            error: agentEvt.data?.error as string | undefined,
          },
        });
      }
    } else if (agentEvt.stream === "tool") {
      const phase = agentEvt.data?.phase;
      emitAction({
        ...baseEvt,
        type: "agent.tool",
        data: {
          phase: phase ?? "start",
          toolName: (agentEvt.data?.name as string) ?? "unknown",
          args: agentEvt.data?.args as Record<string, unknown> | undefined,
          result: agentEvt.data?.result,
          error: agentEvt.data?.error as string | undefined,
          durationMs: agentEvt.data?.durationMs as number | undefined,
        },
      });
    } else if (agentEvt.stream === "assistant") {
      emitAction({
        ...baseEvt,
        type: "agent.assistant",
        data: {
          content: (agentEvt.data?.content as string) ?? "",
          delta: agentEvt.data?.delta as string | undefined,
          finished: (agentEvt.data?.finished as boolean) ?? false,
        },
      });
    } else if (agentEvt.stream === "error") {
      emitAction({
        ...baseEvt,
        type: "agent.error",
        data: {
          error: (agentEvt.data?.error as string) ?? "Unknown error",
          code: agentEvt.data?.code as string | undefined,
          recoverable: (agentEvt.data?.recoverable as boolean) ?? false,
        },
      });
    }
  };

  const handleCronEvent: ActionStreamAggregator["handleCronEvent"] = (cronEvt) => {
    if (!running) return;

    const baseEvt = {
      id: generateActionId(),
      timestamp: cronEvt.runAtMs ?? Date.now(),
    };

    if (cronEvt.action === "started") {
      emitAction({
        ...baseEvt,
        type: "cron.started",
        data: {
          jobId: cronEvt.jobId,
          jobName: cronEvt.jobId,
        },
      });
    } else if (cronEvt.action === "finished") {
      // Check if the finished event has an error status
      if (cronEvt.status === "error") {
        emitAction({
          ...baseEvt,
          type: "cron.error",
          data: {
            jobId: cronEvt.jobId,
            jobName: cronEvt.jobId,
            error: cronEvt.error ?? "Unknown error",
          },
        });
      } else {
        emitAction({
          ...baseEvt,
          type: "cron.finished",
          data: {
            jobId: cronEvt.jobId,
            jobName: cronEvt.jobId,
            status: cronEvt.status ?? "ok",
            durationMs: cronEvt.durationMs ?? 0,
            summary: cronEvt.summary,
            outputText: cronEvt.summary,
          },
        });
      }
    }
  };

  const handleBrowserScreenshot: ActionStreamAggregator["handleBrowserScreenshot"] = (evt) => {
    if (!running) return;

    emitAction({
      id: generateActionId(),
      type: "browser.screenshot",
      timestamp: Date.now(),
      data: evt,
    });
  };

  const recordTokenUsage: ActionStreamAggregator["recordTokenUsage"] = (evt) => {
    if (!running) return;

    // Record to global token tracker for cost aggregation
    const tokenTracker = initGlobalTokenTracker();
    tokenTracker.recordUsage({
      runId: evt.runId,
      sessionKey: evt.sessionKey,
      promptTokens: evt.promptTokens,
      completionTokens: evt.completionTokens,
      totalTokens: evt.totalTokens,
      model: evt.model,
      provider: evt.provider,
      costUsd: evt.costUsd,
    });

    // Also emit as an action event for streaming
    emitAction({
      id: generateActionId(),
      type: "agent.tokens",
      timestamp: Date.now(),
      runId: evt.runId,
      sessionKey: evt.sessionKey,
      data: evt,
    });
  };

  const start: ActionStreamAggregator["start"] = () => {
    if (running) return;
    running = true;
    agentUnsub = onAgentEvent(handleAgentEvent);
  };

  const stop: ActionStreamAggregator["stop"] = () => {
    running = false;
    if (agentUnsub) {
      agentUnsub();
      agentUnsub = null;
    }
  };

  const onAction: ActionStreamAggregator["onAction"] = (listener) => {
    actionListeners.add(listener);
    return () => actionListeners.delete(listener);
  };

  const getStore: ActionStreamAggregator["getStore"] = () => store;

  const isRunning: ActionStreamAggregator["isRunning"] = () => running;

  return {
    start,
    stop,
    handleAgentEvent,
    handleCronEvent,
    handleBrowserScreenshot,
    recordTokenUsage,
    onAction,
    getStore,
    isRunning,
  };
}

/** Global aggregator instance */
let globalAggregator: ActionStreamAggregator | null = null;

export function getGlobalActionStreamAggregator(): ActionStreamAggregator | null {
  return globalAggregator;
}

export function initGlobalActionStreamAggregator(): ActionStreamAggregator {
  if (!globalAggregator) {
    globalAggregator = createActionStreamAggregator();
  }
  return globalAggregator;
}

export function resetGlobalActionStreamAggregatorForTest(): void {
  if (globalAggregator) {
    globalAggregator.stop();
  }
  globalAggregator = null;
}

// Re-export token tracker functions for convenience
export { initGlobalTokenTracker, getGlobalTokenTracker as getGlobalTokenUsageTracker, resetGlobalTokenTracker } from "./token-tracker.js";
export type { TokenUsageRecord, UsageSummary, TokenTracker } from "./token-tracker.js";
