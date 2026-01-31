/**
 * Action Stream - Unified event types for Live Action Stream feature
 * Captures agent, cron, browser, skill, and token events in real-time
 */

/** Action event types across all systems */
export type ActionType =
  // Agent lifecycle events
  | "agent.lifecycle" // Agent started, ended, error
  | "agent.tool" // Tool execution start/update/result
  | "agent.assistant" // Assistant message events
  | "agent.error" // Agent errors
  // Token usage
  | "agent.tokens" // Token usage per request
  // Cron events
  | "cron.started" // Cron job started
  | "cron.finished" // Cron job finished
  | "cron.error" // Cron job error
  // Browser events
  | "browser.screenshot" // Browser screenshot captured
  | "browser.navigate" // Browser navigation
  | "browser.interact" // Browser interaction (click, type, etc.)
  // Channel events
  | "channel.message" // Message received/sent
  | "channel.status" // Channel status changed
  // Skill events
  | "skill.invoked" // Skill invoked
  | "skill.completed" // Skill completed
  | "skill.error"; // Skill error

/** Base action stream event */
export type ActionStreamEvent = {
  /** Unique action ID */
  id: string;
  /** Event type */
  type: ActionType;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Related agent run ID (if applicable) */
  runId?: string;
  /** Related session key (if applicable) */
  sessionKey?: string;
  /** Event-specific data */
  data: ActionStreamEventData;
};

/** Event data union type */
export type ActionStreamEventData =
  | AgentLifecycleData
  | AgentToolData
  | AgentAssistantData
  | AgentErrorData
  | AgentTokensData
  | CronStartedData
  | CronFinishedData
  | CronErrorData
  | BrowserScreenshotData
  | BrowserNavigateData
  | BrowserInteractData
  | ChannelMessageData
  | ChannelStatusData
  | SkillInvokedData
  | SkillCompletedData
  | SkillErrorData
  | Record<string, unknown>;

/** Agent lifecycle: start, end, error */
export type AgentLifecycleData = {
  phase: "start" | "end" | "error";
  agentId?: string;
  task?: string;
  startedAt?: number;
  endedAt?: number;
  error?: string;
  outcome?: { status: "ok" | "error"; error?: string };
};

/** Agent tool execution */
export type AgentToolData = {
  phase: "start" | "update" | "result";
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  durationMs?: number;
};

/** Assistant message */
export type AgentAssistantData = {
  content: string;
  delta?: string;
  finished: boolean;
};

/** Agent error */
export type AgentErrorData = {
  error: string;
  code?: string;
  recoverable: boolean;
};

/** Token usage */
export type AgentTokensData = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  costUsd?: number;
};

/** Cron job started */
export type CronStartedData = {
  jobId: string;
  jobName: string;
  schedule?: string;
};

/** Cron job finished */
export type CronFinishedData = {
  jobId: string;
  jobName: string;
  status: "ok" | "error" | "skipped";
  durationMs: number;
  summary?: string;
  outputText?: string;
};

/** Cron job error */
export type CronErrorData = {
  jobId: string;
  jobName: string;
  error: string;
};

/** Browser screenshot captured */
export type BrowserScreenshotData = {
  screenshotPath: string;
  thumbnailPath?: string;
  url?: string;
  targetId?: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
};

/** Browser navigation */
export type BrowserNavigateData = {
  url: string;
  targetId?: string;
  success: boolean;
};

/** Browser interaction */
export type BrowserInteractData = {
  action: "click" | "type" | "hover" | "scroll" | "select";
  targetId?: string;
  element?: string;
  value?: string;
  success: boolean;
};

/** Channel message */
export type ChannelMessageData = {
  channelId: string;
  direction: "inbound" | "outbound";
  messageId?: string;
  from?: string;
  to?: string;
  preview?: string;
};

/** Channel status change */
export type ChannelStatusData = {
  channelId: string;
  status: "connected" | "disconnected" | "error";
  previousStatus?: string;
};

/** Skill invoked */
export type SkillInvokedData = {
  skillId: string;
  skillName: string;
  input?: Record<string, unknown>;
};

/** Skill completed */
export type SkillCompletedData = {
  skillId: string;
  skillName: string;
  durationMs: number;
  result?: unknown;
};

/** Skill error */
export type SkillErrorData = {
  skillId: string;
  skillName: string;
  error: string;
};

/** Filter options for querying actions */
export type ActionStreamFilter = {
  /** Filter by event types */
  types?: ActionType[];
  /** Filter by run ID */
  runId?: string;
  /** Filter by session key */
  sessionKey?: string;
  /** Filter by time range */
  afterMs?: number;
  beforeMs?: number;
  /** Maximum number of results */
  limit?: number;
};

/** Display-formatted action for UI */
export type ActionDisplayFormat = {
  id: string;
  type: ActionType;
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

/** Check if event is of specific type */
export function isActionOfType(evt: ActionStreamEvent, type: ActionType): boolean {
  return evt.type === type;
}

/** Filter actions by criteria */
export function filterActions(
  actions: ActionStreamEvent[],
  filter: ActionStreamFilter,
): ActionStreamEvent[] {
  let result = [...actions];

  if (filter.types && filter.types.length > 0) {
    const typeSet = new Set(filter.types);
    result = result.filter((a) => typeSet.has(a.type));
  }

  if (filter.runId) {
    result = result.filter((a) => a.runId === filter.runId);
  }

  if (filter.sessionKey) {
    result = result.filter((a) => a.sessionKey === filter.sessionKey);
  }

  if (filter.afterMs) {
    result = result.filter((a) => a.timestamp >= filter.afterMs!);
  }

  if (filter.beforeMs) {
    result = result.filter((a) => a.timestamp <= filter.beforeMs!);
  }

  // Sort by timestamp descending (newest first)
  result.sort((a, b) => b.timestamp - a.timestamp);

  if (filter.limit) {
    result = result.slice(0, filter.limit);
  }

  return result;
}

/** Format action for UI display */
export function formatActionForDisplay(evt: ActionStreamEvent): ActionDisplayFormat {
  const metadata: Record<string, string | number | boolean> = {};

  let title = "";
  let description: string | undefined;
  let icon = "activity";
  let status: "success" | "error" | "pending" | "info" = "info";
  let screenshotUrl: string | undefined;
  let thumbnailUrl: string | undefined;

  switch (evt.type) {
    case "agent.lifecycle": {
      const data = evt.data as AgentLifecycleData;
      icon = "brain";
      if (data.phase === "start") {
        title = "Agent Started";
        status = "pending";
        description = data.task ?? "No task description";
      } else if (data.phase === "end") {
        title = "Agent Completed";
        status = "success";
        description = data.task ?? "Task completed";
      } else if (data.phase === "error") {
        title = "Agent Error";
        status = "error";
        description = data.error ?? "Unknown error";
      }
      if (data.agentId) metadata.agentId = data.agentId;
      break;
    }

    case "agent.tool": {
      const data = evt.data as AgentToolData;
      icon = "tool";
      if (data.phase === "start") {
        title = `Tool: ${data.toolName}`;
        status = "pending";
        description = "Starting...";
      } else if (data.phase === "result") {
        title = `Tool: ${data.toolName}`;
        status = data.error ? "error" : "success";
        description = data.error ?? "Completed";
        if (data.durationMs) metadata.duration = `${data.durationMs}ms`;
      } else {
        title = `Tool: ${data.toolName}`;
        status = "pending";
        description = "Running...";
      }
      metadata.tool = data.toolName;
      break;
    }

    case "agent.tokens": {
      const data = evt.data as AgentTokensData;
      icon = "zap";
      title = "Token Usage";
      status = "info";
      description = `${data.totalTokens} tokens (${data.provider}/${data.model})`;
      metadata.tokens = data.totalTokens;
      metadata.model = data.model;
      if (data.costUsd) metadata.cost = `$${data.costUsd.toFixed(4)}`;
      break;
    }

    case "cron.started": {
      const data = evt.data as CronStartedData;
      icon = "loader";
      title = `Cron: ${data.jobName}`;
      status = "pending";
      description = "Started";
      metadata.jobId = data.jobId;
      break;
    }

    case "cron.finished": {
      const data = evt.data as CronFinishedData;
      icon = "loader";
      title = `Cron: ${data.jobName}`;
      status = data.status === "error" ? "error" : "success";
      description = data.summary ?? `Finished in ${data.durationMs}ms`;
      metadata.jobId = data.jobId;
      metadata.duration = data.durationMs;
      break;
    }

    case "cron.error": {
      const data = evt.data as CronErrorData;
      icon = "loader";
      title = `Cron: ${data.jobName}`;
      status = "error";
      description = data.error;
      metadata.jobId = data.jobId;
      break;
    }

    case "browser.screenshot": {
      const data = evt.data as BrowserScreenshotData;
      icon = "monitor";
      title = "Browser Screenshot";
      status = "info";
      description = data.url ?? "Screenshot captured";
      screenshotUrl = data.screenshotPath;
      thumbnailUrl = data.thumbnailPath;
      if (data.targetId) metadata.tab = data.targetId;
      break;
    }

    case "browser.navigate": {
      const data = evt.data as BrowserNavigateData;
      icon = "link";
      title = "Browser Navigate";
      status = data.success ? "success" : "error";
      description = data.url;
      metadata.url = data.url;
      break;
    }

    case "browser.interact": {
      const data = evt.data as BrowserInteractData;
      icon = "mouse";
      title = `Browser ${data.action}`;
      status = data.success ? "success" : "error";
      description = data.element ?? "Element interaction";
      metadata.action = data.action;
      break;
    }

    case "channel.message": {
      const data = evt.data as ChannelMessageData;
      icon = data.direction === "inbound" ? "arrowDown" : "arrowUp";
      title = `${data.channelId}: ${data.direction}`;
      status = "info";
      description =
        data.preview ?? (data.direction === "inbound" ? "Message received" : "Message sent");
      metadata.channel = data.channelId;
      break;
    }

    case "channel.status": {
      const data = evt.data as ChannelStatusData;
      icon = data.status === "connected" ? "check" : "x";
      title = `${data.channelId}: ${data.status}`;
      status = data.status === "connected" ? "success" : data.status === "error" ? "error" : "info";
      description = `Channel ${data.status}`;
      metadata.channel = data.channelId;
      break;
    }

    case "skill.invoked": {
      const data = evt.data as SkillInvokedData;
      icon = "zap";
      title = `Skill: ${data.skillName}`;
      status = "pending";
      description = "Invoked";
      metadata.skill = data.skillName;
      break;
    }

    case "skill.completed": {
      const data = evt.data as SkillCompletedData;
      icon = "zap";
      title = `Skill: ${data.skillName}`;
      status = "success";
      description = `Completed in ${data.durationMs}ms`;
      metadata.skill = data.skillName;
      break;
    }

    case "skill.error": {
      const data = evt.data as SkillErrorData;
      icon = "zap";
      title = `Skill: ${data.skillName}`;
      status = "error";
      description = data.error;
      metadata.skill = data.skillName;
      break;
    }

    default:
      title = evt.type;
      description = "Unknown event type";
  }

  return {
    id: evt.id,
    type: evt.type,
    timestamp: evt.timestamp,
    title,
    description,
    icon,
    status,
    metadata,
    screenshotUrl,
    thumbnailUrl,
    runId: evt.runId,
    sessionKey: evt.sessionKey,
  };
}

/** Generate unique action ID */
export function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
