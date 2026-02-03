import { FOLLOWUP_QUEUES } from "./queue/state.js";
import { getFollowupQueueDepth } from "./queue.js";

export interface QueueInspection {
  timestamp: number;
  totalPending: number;
  followupQueues: Array<{
    sessionKey: string;
    depth: number;
    mode: string;
    draining: boolean;
    droppedCount: number;
    lastEnqueuedAt: number;
  }>;
}

export function getQueueInspection(): QueueInspection {
  const followupQueues: QueueInspection["followupQueues"] = [];
  let totalPending = 0;

  for (const [key, state] of FOLLOWUP_QUEUES.entries()) {
    totalPending += state.items.length;
    followupQueues.push({
      sessionKey: key,
      depth: state.items.length,
      mode: state.mode,
      draining: state.draining,
      droppedCount: state.droppedCount,
      lastEnqueuedAt: state.lastEnqueuedAt,
    });
  }

  return {
    timestamp: Date.now(),
    totalPending,
    followupQueues,
  };
}

export function clearAllQueues(): { cleared: number; details: { followupQueues: number } } {
  let clearedFollowups = 0;

  for (const [key, state] of FOLLOWUP_QUEUES.entries()) {
    clearedFollowups += state.items.length;
    state.items.length = 0;
    state.droppedCount = 0;
    state.summaryLines = [];
  }

  FOLLOWUP_QUEUES.clear();

  return {
    cleared: clearedFollowups,
    details: {
      followupQueues: clearedFollowups,
    },
  };
}

export function clearQueueBySession(sessionKey: string): number {
  let cleared = 0;

  // Find and clear queues matching the session key
  for (const [key, state] of FOLLOWUP_QUEUES.entries()) {
    if (key.includes(sessionKey)) {
      cleared += state.items.length;
      state.items.length = 0;
      state.droppedCount = 0;
    }
  }

  return cleared;
}
