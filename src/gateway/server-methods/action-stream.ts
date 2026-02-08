// src/gateway/server-methods/action-stream.ts
import type { GatewayRequestHandlers } from "./types.js";
import type { ActionStreamFilter, ActionType } from "../../infra/action-stream-types.js";
import type { ActionStreamEvent } from "../../infra/action-stream-types.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatForLog } from "../ws-log.js";
import {
  initGlobalActionStreamAggregator,
  getGlobalActionStreamAggregator,
} from "../../infra/action-stream.js";
import { formatActionForDisplay } from "../../infra/action-stream-types.js";

// Constants for action stream configuration
const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 500;
const STATS_RECENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Type-safe parameter interfaces
interface ActionStreamHistoryParams {
  types?: ActionType[];
  runId?: string;
  sessionKey?: string;
  afterMs?: number;
  beforeMs?: number;
  limit?: number;
}

interface ActionStreamRunHistoryParams {
  runId?: string;
}

interface ActionStreamPauseAgentParams {
  runId?: string;
}

interface ActionStreamInjectCommandParams {
  runId?: string;
  command?: string;
}

// Track subscribed clients for real-time broadcasts
const subscribedClients = new Set<string>();

/**
 * Subscribe a client to real-time action stream updates
 */
export function subscribeClientToActionStream(clientId: string) {
  subscribedClients.add(clientId);
}

/**
 * Unsubscribe a client from action stream updates
 */
export function unsubscribeClientFromActionStream(clientId: string) {
  subscribedClients.delete(clientId);
}

/**
 * Check if a client is subscribed to action stream
 */
export function isClientSubscribedToActionStream(clientId: string): boolean {
  return subscribedClients.has(clientId);
}

/**
 * Broadcast an action event to all subscribed clients
 */
export function broadcastActionEvent(context: { broadcast: (event: string, payload: unknown) => void }, evt: ActionStreamEvent) {
  if (subscribedClients.size === 0) return;

  const display = formatActionForDisplay(evt);
  context.broadcast("actionstream.event", { action: display });
}

/**
 * Action stream RPC handlers for the Live Action Stream feature
 */
export const actionStreamHandlers: GatewayRequestHandlers = {
  /**
   * Get historical action events with optional filtering
   * Params: { types?, runId?, sessionKey?, afterMs?, beforeMs?, limit? }
   */
  "actionstream.history": async ({ respond, context, params }) => {
    try {
      const aggregator = getGlobalActionStreamAggregator();
      if (!aggregator) {
        respond(true, { actions: [], total: 0 }, undefined);
        return;
      }

      const store = aggregator.getStore();
      const filter: ActionStreamFilter = {};

      if (typeof params === "object" && params !== null) {
        const typedParams = params as ActionStreamHistoryParams;
        if (Array.isArray(typedParams.types)) {
          filter.types = typedParams.types;
        }
        if (typeof typedParams.runId === "string") {
          filter.runId = typedParams.runId;
        }
        if (typeof typedParams.sessionKey === "string") {
          filter.sessionKey = typedParams.sessionKey;
        }
        if (typeof typedParams.afterMs === "number") {
          filter.afterMs = typedParams.afterMs;
        }
        if (typeof typedParams.beforeMs === "number") {
          filter.beforeMs = typedParams.beforeMs;
        }
        if (typeof typedParams.limit === "number") {
          filter.limit = Math.max(1, Math.min(MAX_HISTORY_LIMIT, typedParams.limit));
        } else {
          filter.limit = DEFAULT_HISTORY_LIMIT;
        }
      } else {
        filter.limit = DEFAULT_HISTORY_LIMIT;
      }

      const events = store.query(filter);
      const actions = events.map((e) => formatActionForDisplay(e));
      const allEvents = store.getAll();

      respond(true, { actions, total: allEvents.length }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.history failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Subscribe to real-time action stream updates
   * Params: { types?, runId? } for filtering
   */
  "actionstream.subscribe": async ({ respond, context, client }) => {
    try {
      const aggregator = getGlobalActionStreamAggregator();
      if (!aggregator) {
        // Initialize aggregator on first subscription
        initGlobalActionStreamAggregator().start();
      }

      // Extract client ID and subscribe
      const clientId = client?.connect?.client?.id;
      if (clientId) {
        subscribeClientToActionStream(clientId);
      }

      respond(true, { subscribed: true }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.subscribe failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Unsubscribe from action stream updates
   */
  "actionstream.unsubscribe": async ({ respond, context, client }) => {
    try {
      // Extract client ID and unsubscribe
      const clientId = client?.connect?.client?.id;
      if (clientId) {
        unsubscribeClientFromActionStream(clientId);
      }

      respond(true, { subscribed: false }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.unsubscribe failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Get quick stats for the action stream
   * Returns counts by type and recent activity summary
   */
  "actionstream.stats": async ({ respond, context }) => {
    try {
      const aggregator = getGlobalActionStreamAggregator();
      if (!aggregator) {
        respond(true, { byType: {}, total: 0, recentCount: 0 }, undefined);
        return;
      }

      const store = aggregator.getStore();
      const allEvents = store.getAll();

      // Count by type
      const byType: Record<string, number> = {};
      for (const evt of allEvents) {
        byType[evt.type] = (byType[evt.type] ?? 0) + 1;
      }

      // Get recent events within the stats window
      const recentWindowStart = Date.now() - STATS_RECENT_WINDOW_MS;
      const recent = allEvents.filter((e) => e.timestamp > recentWindowStart);

      respond(
        true,
        {
          byType,
          total: allEvents.length,
          recentCount: recent.length,
        },
        undefined
      );
    } catch (err) {
      context.logGateway.error(`actionstream.stats failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Get actions for a specific run ID (all events for that run)
   */
  "actionstream.runHistory": async ({ respond, context, params }) => {
    try {
      const aggregator = getGlobalActionStreamAggregator();
      if (!aggregator) {
        respond(true, { actions: [], runId: null }, undefined);
        return;
      }

      const typedParams = typeof params === "object" ? (params as ActionStreamRunHistoryParams) : {};
      const runId = typedParams.runId;
      if (!runId || typeof runId !== "string") {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "runId is required"));
        return;
      }

      const store = aggregator.getStore();
      const events = store.getByRunId(runId);
      const actions = events.map((e) => formatActionForDisplay(e));

      respond(true, { actions, runId }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.runHistory failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Pause/resume a running agent (one-click inject control)
   */
  "actionstream.pauseAgent": async ({ respond, context }) => {
    try {
      // Not yet implemented - will integrate with existing agent.pause/abort functionality
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Not yet implemented"));
    } catch (err) {
      context.logGateway.error(`actionstream.pauseAgent failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Inject a command into a running agent
   */
  "actionstream.injectCommand": async ({ respond, context }) => {
    try {
      // Not yet implemented - will integrate with agent input injection
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "Not yet implemented"));
    } catch (err) {
      context.logGateway.error(`actionstream.injectCommand failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
