import type { OpenClawConfig } from "../../config/config.js";
import type { CommandContext } from "./commands-types.js";
import type { ReplyPayload } from "../types.js";
import { getFollowupQueueDepth } from "./queue.js";
import { FOLLOWUP_QUEUES } from "./queue/state.js";
import { clearAllQueues, clearQueueBySession, getQueueInspection } from "./queue-inspector.js";
import { logVerbose } from "../../globals.js";

function formatAgeShort(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

function formatQueueSummary(action?: string): string {
  const lines: string[] = [];
  lines.push("📊 **Queue Status**");
  lines.push("");

  // Handle clear action result
  if (action === "cleared") {
    lines.push("✅ All queues cleared.");
    lines.push("");
  }

  // Followup Queues
  lines.push("**Followup Queues:**");
  let followupTotal = 0;
  let followupDropped = 0;
  let drainingCount = 0;
  let oldestAge = 0;
  const now = Date.now();
  let oldestTimestamp = 0;

  for (const [key, state] of FOLLOWUP_QUEUES.entries()) {
    followupTotal += state.items.length;
    followupDropped += state.droppedCount;
    if (state.draining) drainingCount++;

    if (state.items.length > 0 && state.lastEnqueuedAt > 0) {
      const enqueuedAge = now - state.lastEnqueuedAt;
      if (enqueuedAge > oldestAge) {
        oldestAge = enqueuedAge;
        oldestTimestamp = state.lastEnqueuedAt;
      }
    }

    if (state.items.length > 0 || state.droppedCount > 0) {
      const shortKey = key.length > 40 ? key.slice(0, 37) + "..." : key;
      lines.push(`  • ${shortKey}:`);
      if (state.items.length > 0) {
        lines.push(`    - ${state.items.length} queued`);
      }
      if (state.droppedCount > 0) {
        lines.push(`    - ${state.droppedCount} dropped`);
      }
      if (state.draining) {
        lines.push(`    - draining...`);
      }
      if (state.mode) {
        lines.push(`    - mode: ${state.mode}`);
      }
    }
  }

  if (followupTotal === 0 && followupDropped === 0) {
    lines.push("  • No active followup queues");
  }

  lines.push("");
  lines.push("**Summary:**");
  lines.push(`  • Total queued: ${followupTotal}`);
  if (followupDropped > 0) {
    lines.push(`  • Total dropped: ${followupDropped}`);
  }
  if (drainingCount > 0) {
    lines.push(`  • Draining: ${drainingCount} queue(s)`);
  }
  if (oldestAge > 0) {
    lines.push(`  • Oldest item: ${formatAgeShort(oldestAge)} ago`);
  }
  lines.push("");
  lines.push("**Commands:**");
  lines.push(`  • /queueinfo - Show this status`);
  lines.push(`  • /queueinfo clear - Clear all queues`);
  lines.push(`  • /queue <mode> <options> - Adjust settings`);

  return lines.join("\n");
}

export async function buildQueueInfoReply(params: {
  cfg: OpenClawConfig;
  ctx: CommandContext;
  args?: string[];
}): Promise<ReplyPayload> {
  const { cfg, ctx, args = [] } = params;

  // Parse action from args (for "clear" command)
  const action = args[0]?.toLowerCase();

  if (action === "clear") {
    if (!ctx.isAuthorizedSender) {
      logVerbose(`Ignoring /queueinfo clear from unauthorized sender: ${ctx.senderId || "<unknown>"}`);
      return { text: "❌ Not authorized to clear queues." };
    }

    const result = clearAllQueues();
    logVerbose(`Cleared ${result.cleared} items from queues`);

    return {
      text: formatQueueSummary("cleared"),
    };
  }

  // Build the queue status message (default)
  const text = formatQueueSummary();

  return {
    text,
  };
}
