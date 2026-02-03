/**
 * Action Stream Controller
 * Handles loading action stream data from gateway and managing live updates
 */

import type { AppViewState } from "./app-view-state.js";
import type {
  ActionDisplayFormat,
  ActionStreamStats,
  TokenUsageData,
} from "./views/action-stream";

/**
 * Activity log for saving and viewing all actions
 */
export type ActivityLogEntry = {
  id: string;
  type: string;
  timestamp: number;
  title: string;
  description?: string;
  icon: string;
  status: "success" | "error" | "pending" | "info";
  metadata: Record<string, string | number | boolean>;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  runId?: string;
  sessionKey?: string;
};

const MAX_ACTIVITY_LOG_SIZE = 1000;
const ACTIVITY_LOG_KEY = "openclaw-activity-log";

function getActivityLog(): ActivityLogEntry[] {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveActivityLog(activities: ActivityLogEntry[]): void {
  try {
    const limited = activities.slice(0, MAX_ACTIVITY_LOG_SIZE);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(limited));
  } catch (err) {
    console.error("[activity-log] Failed to save:", err);
  }
}

export function logAction(action: ActionDisplayFormat): void {
  const log: ActivityLogEntry = {
    id: action.id,
    type: action.type,
    timestamp: action.timestamp,
    title: action.title,
    description: action.description,
    icon: action.icon,
    status: action.status,
    metadata: action.metadata,
    screenshotUrl: action.screenshotUrl,
    thumbnailUrl: action.thumbnailUrl,
    runId: action.runId,
    sessionKey: action.sessionKey,
  };
  const currentLog = getActivityLog();
  saveActivityLog([log, ...currentLog]);
}

export function getSavedActivities(): ActivityLogEntry[] {
  return getActivityLog();
}

export function clearActivityLog(): void {
  localStorage.removeItem(ACTIVITY_LOG_KEY);
}

// Gateway RPC method types
type ActionStreamEvent = {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
  };

export async function loadActionStream(
  state: AppViewState,
): Promise<void> {
  if (!state.client || state.actionStreamLoading) return;

  state.actionStreamLoading = true;
  state.actionStreamError = null;

  try {
    // Subscribe to real-time updates on first load only
    if (!(state as { actionStreamSubscribed?: boolean }).actionStreamSubscribed) {
      await state.client.request("actionstream.subscribe", {});
      (state as { actionStreamSubscribed?: boolean }).actionStreamSubscribed = true;
    }

    // Check if we're filtering by a specific runId
    const runIdFilter = (state as { actionStreamRunFilter?: string }).actionStreamRunFilter;

    // Fetch recent actions
    const historyResult = (await state.client.request("actionstream.history", {
      limit: 50,
      runId: runIdFilter,
    })) as HistoryResponse;

    // Fetch stats
    const statsResult = (await state.client.request("actionstream.stats", {})) as ActionStreamStats;

    if (historyResult) {
      const newActions = normalizeActions(historyResult.actions ?? []);

      // Always update on first load or when data changes
      const isFirstLoad = state.actionStreamActions.length === 0;
      if (isFirstLoad) {
        state.actionStreamActions = newActions;
      } else {
        // Only update if actions have actually changed (compare by IDs)
        const oldIds = new Set(state.actionStreamActions.map(a => a.id));
        const hasNewActions = newActions.some(a => !oldIds.has(a.id));
        if (hasNewActions) {
          state.actionStreamActions = newActions;
        }
      }
      state.actionStreamHasMore = (historyResult.total ?? 0) > newActions.length;
    }

    if (statsResult) {
      // Always update stats on first load, otherwise only if total changed
      const isFirstLoad = state.actionStreamStats.total === 0;
      if (isFirstLoad || statsResult.total !== state.actionStreamStats.total) {
        state.actionStreamStats = statsResult;
      }
    }
  } catch (err) {
    console.error("[action-stream] load failed:", err);
    state.actionStreamError = String(err);
  } finally {
    state.actionStreamLoading = false;
  }
}

/**
 * Load more actions (pagination)
 */
export async function loadMoreActionStream(
  state: AppViewState,
): Promise<void> {
  if (!state.client || state.actionStreamLoading || !state.actionStreamHasMore) return;
  if (state.actionStreamActions.length === 0) return;

  state.actionStreamLoading = true;

  try {
    // Get's timestamp of oldest action we have for pagination
    const oldestAction = state.actionStreamActions[state.actionStreamActions.length - 1];
    const beforeMs = oldestAction?.timestamp;

    if (beforeMs === undefined) {
      console.warn("[action-stream] Cannot load more: no valid timestamp found");
      state.actionStreamLoading = false;
      return;
    }

    const result = (await state.client.request("actionstream.history", {
      limit: 50,
      beforeMs,
    })) as HistoryResponse;

    if (result?.actions) {
      const newActions = normalizeActions(result.actions);
      state.actionStreamActions = [...state.actionStreamActions, ...newActions];
      state.actionStreamHasMore = (result.total ?? 0) > state.actionStreamActions.length;
    }
  } catch (err) {
    console.error("[action-stream] load more failed:", err);
  } finally {
    state.actionStreamLoading = false;
  }
}

/**
 * Normalize gateway action events to display format.
 * The gateway returns pre-formatted ActionDisplayFormat objects,
 * so we use them directly with defensive fallbacks.
 */
function normalizeActions(
  actions: unknown[],
): ActionDisplayFormat[] {
  return actions
    .filter((action): action is ActionDisplayFormat => {
      // Guard: ensure action is a non-null object with required fields
      return (
        action !== null &&
        typeof action === "object" &&
        "id" in action &&
        "type" in action &&
        "timestamp" in action
      );
    })
    .map((action) => ({
      id: action.id,
      type: action.type,
      timestamp: action.timestamp,
      title: action.title ?? formatActionTitle(action.type),
      description: action.description ?? "",
      icon: action.icon ?? "activity",
      status: action.status ?? "info",
      metadata: action.metadata ?? {},
      screenshotUrl: action.screenshotUrl,
      thumbnailUrl: action.thumbnailUrl,
      runId: action.runId,
      sessionKey: action.sessionKey,
    }));
}

function formatActionTitle(type: string): string {
  const parts = type.split(".");
  return parts[parts.length - 1] || type;
}

/**
 * Toggle live mode (auto-refresh)
 * Only polls when action stream tab is active to prevent unnecessary refreshes
 */
export function toggleLiveMode(
  state: AppViewState,
  enabled?: boolean,
): void {
  const newEnabled = enabled ?? !state.actionStreamLiveEnabled;

  // If disabling, clear the interval
  if (!newEnabled) {
    const interval = (state as { actionStreamPollInterval?: number }).actionStreamPollInterval;
    if (interval) {
      window.clearInterval(interval);
      (state as { actionStreamPollInterval?: number }).actionStreamPollInterval = undefined;
    }
    state.actionStreamLiveEnabled = false;
    return;
  }

  // If enabling and no interval exists, create one
  if (newEnabled && !(state as { actionStreamPollInterval?: number }).actionStreamPollInterval) {
    state.actionStreamLiveEnabled = true;
    (state as { actionStreamPollInterval?: number }).actionStreamPollInterval = window.setInterval(
      () => {
        // Only load if we're on the action-stream tab
        if (state.tab === "action-stream") {
          void loadActionStream(state);
        }
      },
      5000,
    );
  }
}

/**
 * Stop live mode polling (call when leaving action stream tab)
 */
export function stopLiveMode(state: AppViewState): void {
  const interval = (state as { actionStreamPollInterval?: number }).actionStreamPollInterval;
  if (interval) {
    window.clearInterval(interval);
    (state as { actionStreamPollInterval?: number }).actionStreamPollInterval = undefined;
  }
}

/**
 * Toggle a filter on/off
 */
export function toggleFilter(
  state: AppViewState,
  filter: string,
): void {
  const filters = state.actionStreamFilters;

  if (filter === "all") {
    state.actionStreamFilters = ["all"];
    return;
  }

  // Remove "all" if selecting a specific filter
  const hasAll = filters.includes("all");
  const hasFilter = filters.includes(filter);

  if (hasAll) {
    // Switch from "all" to specific filter
    state.actionStreamFilters = [filter];
  } else if (hasFilter) {
    // Remove filter; if none left, go back to "all"
    const newFilters = filters.filter((f) => f !== filter);
    state.actionStreamFilters = newFilters.length > 0 ? newFilters : ["all"];
  } else {
    // Add filter
    state.actionStreamFilters = [...filters, filter];
  }
}

/**
 * Filter actions based on current filters
 */
export function filterActions(
  actions: ActionDisplayFormat[],
  activeFilters: string[],
): ActionDisplayFormat[] {
  if (activeFilters.includes("all")) {
    return actions;
  }

  // Map filter IDs to event types
  const filterTypes: Record<string, string[]> = {
    agent: ["agent.lifecycle", "agent.tool", "agent.assistant", "agent.error", "agent.tokens"],
    cron: ["cron.started", "cron.finished", "cron.error"],
    browser: ["browser.screenshot", "browser.navigate", "browser.interact"],
    skill: ["skill.invoked", "skill.completed", "skill.error"],
    channel: ["channel.message", "channel.status"],
  };

  const allowedTypes = activeFilters.flatMap((f) => filterTypes[f] ?? []);

  return actions.filter((action) =>
    allowedTypes.some((type) => action.type === type || action.type.startsWith(type)),
  );
}

/**
 * Handle action stream events from gateway
 */
export function handleActionStreamEvent(
  state: AppViewState,
  event: GatewayEventFrame,
): void {
  if (event.event !== "actionstream.event") return;

  // Gateway sends { action: formattedAction }
  const payload = event.payload as { action?: ActionDisplayFormat } | undefined;
  const action = payload?.action;
  if (!action) return;

  // Add to beginning of actions list
  state.actionStreamActions = [action, ...state.actionStreamActions];

  // Update stats when new action arrives
  if (action.type) {
    const currentStats = state.actionStreamStats;
    const byType = { ...currentStats.byType };
    byType[action.type] = (byType[action.type] ?? 0) + 1;
    state.actionStreamStats = {
      ...currentStats,
      total: currentStats.total + 1,
      byType,
      recentCount: currentStats.recentCount + 1,
    };
  }
}

type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
};

/**
 * Grouped action - represents multiple collapsed actions of the same type
 */
export type GroupedAction = {
  id: string;
  type: string;
  timestamp: number;
  count: number;
  oldestTimestamp: number;
  newestTimestamp: number;
  firstActionId: string;
  lastActionId: string;
  runId?: string;
  actions: ActionDisplayFormat[];
};

/**
 * Display item - either a single action or a grouped action
 */
export type ActionDisplayItem = ActionDisplayFormat | GroupedAction;

/**
 * Event types that should always be shown individually (important events)
 */
const IMPORTANT_EVENT_TYPES = new Set([
  "agent.lifecycle",
  "agent.tool",
  "agent.error",
  "cron.error",
  "browser.screenshot",
  "skill.error",
  "channel.message",
]);

/**
 * Event types that can be grouped when consecutive
 */
const GROUPABLE_EVENT_TYPES = new Set([
  "agent.assistant",
  "agent.tokens",
]);

/**
 * Group consecutive actions of the same type to reduce clutter
 * Important events (lifecycle, tools, errors) are always shown individually
 * Repetitive events (assistant messages, tokens) are grouped when consecutive
 */
export function groupActions(actions: ActionDisplayFormat[]): ActionDisplayItem[] {
  if (actions.length === 0) return [];

  const result: ActionDisplayItem[] = [];
  let currentGroup: ActionDisplayFormat[] = [];
  let currentType: string | null = null;
  let currentRunId: string | undefined;

  for (const action of actions) {
    const isGroupable = GROUPABLE_EVENT_TYPES.has(action.type);
    const isImportant = IMPORTANT_EVENT_TYPES.has(action.type);
    const sameType = action.type === currentType;
    const sameRun = action.runId === currentRunId;

    // Important events are always shown individually
    if (isImportant || !isGroupable) {
      // Flush any pending group first
      if (currentGroup.length > 0) {
        result.push(createGroupFromActions(currentGroup));
        currentGroup = [];
        currentType = null;
        currentRunId = undefined;
      }
      result.push(action);
      continue;
    }

    // Groupable events - group if consecutive and same type
    if (sameType && sameRun && currentGroup.length > 0) {
      currentGroup.push(action);
    } else {
      // Flush previous group if exists
      if (currentGroup.length > 0) {
        result.push(createGroupFromActions(currentGroup));
      }
      // Start new group
      currentGroup = [action];
      currentType = action.type;
      currentRunId = action.runId;
    }
  }

  // Flush final group
  if (currentGroup.length > 0) {
    result.push(createGroupFromActions(currentGroup));
  }

  return result;
}

/**
 * Create a grouped action from an array of actions
 */
function createGroupFromActions(actions: ActionDisplayFormat[]): GroupedAction {
  if (actions.length === 0) {
    throw new Error("Cannot create group from empty array");
  }

  const first = actions[0];
  const last = actions[actions.length - 1];

  return {
    id: `group-${first.id}-${last.id}`,
    type: first.type,
    timestamp: first.timestamp,
    count: actions.length,
    oldestTimestamp: last.timestamp, // Actions are in reverse chronological order
    newestTimestamp: first.timestamp,
    firstActionId: last.id,
    lastActionId: first.id,
    runId: first.runId,
    actions,
  };
}

/**
 * Check if an item is a grouped action
 */
export function isGroupedAction(item: ActionDisplayItem): item is GroupedAction {
  return "count" in item && "actions" in item;
}

/**
 * Get the display label for an action type
 */
export function getTypeLabel(type: string): string {
  if (type === "agent.assistant") return "assistant message";
  if (type === "agent.lifecycle") return "lifecycle event";
  if (type === "agent.tool") return "tool call";
  if (type === "agent.error") return "error";
  if (type === "agent.tokens") return "token update";
  if (type.startsWith("cron.")) return "cron event";
  if (type.startsWith("browser.")) return "browser event";
  if (type.startsWith("channel.")) return "channel event";
  if (type.startsWith("skill.")) return "skill event";
  return "event";
}

/**
 * Format time range for grouped actions
 */
export function formatTimeRange(oldest: number, newest: number): string {
  const oldestSec = Math.floor((Date.now() - oldest) / 1000);
  const newestSec = Math.floor((Date.now() - newest) / 1000);

  if (oldestSec < 60 && newestSec < 60) return "just now";
  if (oldestSec < 60) return `${newestSec}s ago`;

  const oldestM = Math.floor(oldestSec / 60);
  const newestM = Math.floor(newestSec / 60);

  if (oldestM < 60 && newestM < 60) return `${newestM - oldestM}-${newestM}m ago`;

  const oldestH = Math.floor(oldestM / 60);
  const newestH = Math.floor(newestM / 60);

  if (oldestH < 24 && newestH < 24) return `${newestH - oldestH}-${newestH}h ago`;

  return "over an hour";
}
