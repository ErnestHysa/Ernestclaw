import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { abortEmbeddedPiRun } from "../../agents/pi-embedded.js";
import { listSubagentRunsForRequester } from "../../agents/subagent-registry.js";
import type { OpenClawConfig } from "../../config/config.js";
import {
  loadSessionStore,
  resolveStorePath,
  type SessionEntry,
  updateSessionStore,
} from "../../config/sessions.js";
import { parseAgentSessionKey } from "../../routing/session-key.js";
import { resolveCommandAuthorization } from "../command-auth.js";
import { normalizeCommandBody } from "../commands-registry.js";
import type { FinalizedMsgContext, MsgContext } from "../templating.js";
import { logVerbose } from "../../globals.js";
import { stripMentions, stripStructuralPrefixes } from "./mentions.js";
import { clearSessionQueues } from "./queue.js";
import {
  resolveInternalSessionKey,
  resolveMainSessionAlias,
} from "../../agents/tools/sessions-helpers.js";

const ABORT_TRIGGERS = new Set(["stop", "esc", "abort", "wait", "exit", "interrupt"]);
const ABORT_MEMORY = new Map<string, { aborted: boolean; timestamp: number }>();
const ABORT_COOLDOWN_MS = 5000; // 5 second cooldown
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute cleanup interval

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Periodic cleanup to prevent unbounded memory growth
 */
function startAbortMemoryCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, record] of ABORT_MEMORY.entries()) {
      // Delete entries older than cooldown + buffer
      if (now - record.timestamp > ABORT_COOLDOWN_MS + 1000) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      ABORT_MEMORY.delete(key);
    }

    if (toDelete.length > 0) {
      logVerbose(`Abort memory cleanup: removed ${toDelete.length} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);

  // Unref to allow process to exit cleanly
  cleanupTimer.unref?.();
}

/**
 * Stop the cleanup timer (useful for testing/shutdown)
 */
export function stopAbortMemoryCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export function isAbortTrigger(text?: string): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return ABORT_TRIGGERS.has(normalized);
}

export function getAbortMemory(key: string): boolean | undefined {
  const record = ABORT_MEMORY.get(key);
  return record?.aborted;
}

export function setAbortMemory(key: string, value: boolean): void {
  ABORT_MEMORY.set(key, {
    aborted: value,
    timestamp: Date.now(),
  });
  // Start cleanup on first use
  if (!cleanupTimer) startAbortMemoryCleanup();
}

export function shouldSkipProcessing(key: string): boolean {
  const record = ABORT_MEMORY.get(key);
  if (!record) return false;

  const elapsed = Date.now() - record.timestamp;
  if (elapsed < ABORT_COOLDOWN_MS) {
    logVerbose(`Skipping ${key}: within abort cooldown (${elapsed}ms elapsed)`);
    return true;
  }

  // Auto-expire after cooldown + buffer to prevent 1ms window
  if (elapsed > ABORT_COOLDOWN_MS + 1000) {
    ABORT_MEMORY.delete(key);
  }
  return false;
}

export function clearAbortMemory(key: string): void {
  ABORT_MEMORY.delete(key);
}

export function formatAbortReplyText(stoppedSubagents?: number): string {
  if (typeof stoppedSubagents !== "number" || stoppedSubagents <= 0) {
    return "?? Agent was aborted.";
  }
  const label = stoppedSubagents === 1 ? "sub-agent" : "sub-agents";
  return `?? Agent was aborted. Stopped ${stoppedSubagents} ${label}.`;
}

export function stopSubagentsForRequester({
  cfg,
  requesterSessionKey,
}: {
  cfg: OpenClawConfig;
  requesterSessionKey: string;
}): { stopped: number } {
  const runs = listSubagentRunsForRequester(requesterSessionKey);
  let stopped = 0;
  for (const run of runs) {
    abortEmbeddedPiRun(run.childSessionKey);
    stopped++;
  }
  return { stopped };
}

export async function tryFastAbortFromMessage({
  ctx,
  cfg,
}: {
  ctx: MsgContext;
  cfg: OpenClawConfig;
}): Promise<{ handled: boolean; stoppedSubagents?: number }> {
  const commandBody = normalizeCommandBody(ctx.CommandBody ?? "");
  const isStopCommand = commandBody === "/stop";

  if (!isStopCommand) {
    return { handled: false };
  }

  const authorization = resolveCommandAuthorization({
    ctx,
    cfg,
    commandAuthorized: ctx.CommandAuthorized ?? false,
  });
  if (!authorization.isAuthorizedSender) {
    return { handled: false };
  }

  const sessionKey = ctx.SessionKey;
  if (!sessionKey) {
    return { handled: false };
  }

  // Mark this session as aborted
  setAbortMemory(sessionKey, true);

  // Clear queued followups
  clearSessionQueues([sessionKey]);

  // Clear the session lane
  const { alias, mainKey } = resolveMainSessionAlias(cfg);
  const internalKey = resolveInternalSessionKey({ key: sessionKey, alias, mainKey });
  const { clearCommandLane } = await import("../../process/command-queue.js");
  clearCommandLane(internalKey);

  // Stop subagents
  const { stopped } = stopSubagentsForRequester({
    cfg,
    requesterSessionKey: sessionKey,
  });

  // Also stop child sessions of subagents
  const runs = listSubagentRunsForRequester(sessionKey);
  for (const run of runs) {
    const childInternalKey = resolveInternalSessionKey({ key: run.childSessionKey, alias, mainKey });
    clearCommandLane(childInternalKey);
  }

  return { handled: true, stoppedSubagents: stopped };
}
