import { getStatusSummary } from "../../commands/status.js";
import { defaultRuntime } from "../../runtime.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import { formatForLog } from "../ws-log.js";
import type { GatewayRequestHandlers } from "./types.js";

/**
 * Dashboard RPC handlers for Unified Command Center
 * Provides one-click fix actions and real-time status
 */
export const dashboardHandlers: GatewayRequestHandlers = {
  /**
   * Get comprehensive dashboard status including channels, agents, sessions, cron jobs
   */
  "dashboard.status": async ({ respond, context }) => {
    try {
      const status = await getStatusSummary();
      respond(true, status, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Probe all channels to check connectivity status
   * Returns status of all channels after probing
   */
  "dashboard.probeChannels": async ({ respond, context }) => {
    try {
      const channelsStatusImport = await import("../../commands/channels/status.js");
      // Use default runtime for channel status
      const result = await channelsStatusImport.channelsStatusCommand({ probe: true }, defaultRuntime);
      respond(true, { success: true, channels: result }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Run diagnostics on the system
   * Returns doctor report with issues and suggested fixes
   */
  "dashboard.runDiagnostics": async ({ respond, context }) => {
    try {
      const status = await getStatusSummary();
      const diagnostics = {
        success: true,
        timestamp: Date.now(),
        issues: [] as Array<{ type: string; severity: "error" | "warning" | "info"; message: string; suggestion?: string }>,
      };

      // Check link channel status
      if (status.linkChannel && !status.linkChannel.linked) {
        diagnostics.issues.push({
          type: "link_channel",
          severity: "warning",
          message: "Link channel is not connected",
          suggestion: "Check your link channel configuration and connectivity",
        });
      }

      // Check sessions
      if (status.sessions && status.sessions.count > 50) {
        diagnostics.issues.push({
          type: "session_count",
          severity: "info",
          message: `High session count: ${status.sessions.count}`,
          suggestion: "Consider clearing old sessions to improve performance",
        });
      }

      // Check agents
      if (status.heartbeat) {
        if (!status.heartbeat.agents || status.heartbeat.agents.length === 0) {
          diagnostics.issues.push({
            type: "no_agents",
            severity: "warning",
            message: "No agents detected",
            suggestion: "Verify your agent configuration is correct",
          });
        }
      }

      // Check provider summary for issues
      if (status.providerSummary && Array.isArray(status.providerSummary)) {
        const errorLines = status.providerSummary.filter(line =>
          line.toLowerCase().includes("error") ||
          line.toLowerCase().includes("failed") ||
          line.toLowerCase().includes("disconnected")
        );
        for (const line of errorLines) {
          diagnostics.issues.push({
            type: "provider",
            severity: "error",
            message: line,
            suggestion: "Check provider logs for detailed error information",
          });
        }
      }

      respond(true, diagnostics, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Get quick stats for the dashboard
   * Returns channels count, agents count, sessions count, health status
   */
  "dashboard.quickStats": async ({ respond, context }) => {
    try {
      const status = await getStatusSummary();

      const channelConnected = status.linkChannel?.linked ? 1 : 0;
      const totalChannels = status.linkChannel ? 1 : 0;

      const quickStats = {
        channels: {
          connected: channelConnected,
          total: totalChannels,
          healthy: status.linkChannel?.linked ?? false,
        },
        sessions: {
          count: status.sessions?.count ?? 0,
          recent: status.sessions?.recent ?? [],
        },
        agents: {
          count: status.heartbeat?.agents?.length ?? 0,
          defaultId: status.heartbeat?.defaultAgentId ?? "main",
        },
        linkChannel: status.linkChannel,
        channelSummary: status.channelSummary,
        timestamp: Date.now(),
      };
      respond(true, quickStats, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },

  /**
   * Get system health snapshot with detailed component status
   */
  "dashboard.healthSnapshot": async ({ respond, context }) => {
    const { refreshHealthSnapshot, logHealth } = context;
    try {
      const snap = await refreshHealthSnapshot({ probe: true });
      respond(true, snap, undefined);
    } catch (err) {
      logHealth.error(`Dashboard health snapshot failed: ${formatForLog(err)}`);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
    }
  },
};
