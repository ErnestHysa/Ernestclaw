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
        if (Array.isArray((params as any).types)) {
          filter.types = (params as any).types as ActionType[];
        }
        if (typeof (params as any).runId === "string") {
          filter.runId = (params as any).runId;
        }
        if (typeof (params as any).sessionKey === "string") {
          filter.sessionKey = (params as any).sessionKey;
        }
        if (typeof (params as any).afterMs === "number") {
          filter.afterMs = (params as any).afterMs;
        }
        if (typeof (params as any).beforeMs === "number") {
          filter.beforeMs = (params as any).beforeMs;
        }
        if (typeof (params as any).limit === "number") {
          filter.limit = Math.max(1, Math.min(500, (params as any).limit));
        } else {
          filter.limit = 50; // Default limit
        }
      } else {
        filter.limit = 50;
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

      // Use client.connect.client.id as the client identifier
      if (client?.connect?.client?.id) {
        subscribeClientToActionStream(client.connect.client.id);
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
      // Use client.connect.client.id as the client identifier
      if (client?.connect?.client?.id) {
        unsubscribeClientFromActionStream(client.connect.client.id);
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

      // Get last 5 minutes
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const recent = allEvents.filter((e) => e.timestamp > fiveMinAgo);

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

      const runId = typeof params === "object" ? (params as any).runId : null;
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
  "actionstream.pauseAgent": async ({ respond, context, params }) => {
    try {
      const runId = typeof params === "object" ? (params as any).runId : null;
      if (!runId) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "runId is required"));
        return;
      }

      // This will integrate with existing agent.pause/abort functionality
      // For now, return success
      respond(true, { paused: true, runId }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.pauseAgent failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Inject a command into a running agent
   */
  "actionstream.injectCommand": async ({ respond, context, params }) => {
    try {
      const runId = typeof params === "object" ? (params as any).runId : null;
      const command = typeof params === "object" ? (params as any).command : null;

      if (!runId || !command) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "runId and command are required"));
        return;
      }

      // This will integrate with agent input injection
      // For now, return success
      respond(true, { injected: true, runId }, undefined);
    } catch (err) {
      context.logGateway.error(`actionstream.injectCommand failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
