/**
 * TUI Action Stream Panel
 * Displays live action stream events in the terminal UI
 *
 * Features:
 * - Bordered panel with "LIVE ACTION STREAM - GOD VIEW" header
 * - Recent 10 actions displayed in rows
 * - Auto-refreshes every second
 * - Shows "No actions yet" when empty
 * - Controls: [r]efresh, [f]ilter, [q]uit
 */
import { Container, Text } from "@mariozechner/pi-tui";
import type { ActionStreamStore } from "../../infra/action-stream-store.js";
import type { ActionStreamEvent } from "../../infra/action-stream-types.js";

export interface ActionStreamPanelProps {
  store: ActionStreamStore;
  onClose: () => void;
}

export class ActionStreamPanel extends Container {
  private props: ActionStreamPanelProps;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(props: ActionStreamPanelProps) {
    super();
    this.props = props;
    this.renderPanel();
    this.startAutoRefresh();
  }

  private renderPanel() {
    const { store } = this.props;
    const actions = store.getRecent(10);

    this.clear();

    // Top border and header
    this.addChild(new Text("┌─────────────────────────────────────────────────────────────┐"));
    this.addChild(new Text("│              LIVE ACTION STREAM - GOD VIEW                  │"));
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));

    if (actions.length === 0) {
      this.addChild(new Text("│  No actions yet. Waiting for activity...                   │"));
    } else {
      for (const action of actions) {
        const timestamp = new Date(action.timestamp).toLocaleTimeString();
        const type = action.type.padEnd(20);
        const preview = formatActionPreview(action);
        // Truncate preview to fit within remaining space (about 19 chars)
        const truncatedPreview = preview.length > 19
          ? preview.substring(0, 16) + "..."
          : preview;
        const line = `│  [${timestamp}] ${type} ${truncatedPreview.padEnd(19)} │`;
        this.addChild(new Text(line));
      }
    }

    // Bottom border and controls
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));
    this.addChild(new Text("│  [r]efresh  [f]ilter  [q]uit                                │"));
    this.addChild(new Text("└─────────────────────────────────────────────────────────────┘"));
  }

  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.renderPanel();
    }, 1000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  destroy(): void {
    this.stopAutoRefresh();
  }

  update(props?: ActionStreamPanelProps) {
    if (props) {
      this.props = props;
    }
    this.clear();
    this.renderPanel();
  }

  /**
   * Handle keyboard input for panel controls
   */
  handleKey(key: string): void {
    switch (key) {
      case "q":
      case "Q":
        this.props.onClose();
        break;
      case "r":
      case "R":
        this.update();
        break;
      case "f":
      case "F":
        // TODO: Implement filter dialog
        break;
    }
  }

  /**
   * Get all child components for testing
   */
  getChildren(): unknown[] {
    return this.children ?? [];
  }

  /**
   * Get text content from children for testing
   */
  getText(): string[] {
    return this.children
      .filter((child): child is Text => child instanceof Text)
      .map((child) => child.toString());
  }
}

/**
 * Format action preview text based on event type
 */
export function formatActionPreview(action: ActionStreamEvent): string {
  const data = action.data as Record<string, unknown>;

  switch (action.type) {
    case "agent.lifecycle":
      return data.phase ? String(data.phase) : "lifecycle";

    case "agent.tool":
      return data.toolName ? String(data.toolName) : "tool";

    case "browser.screenshot":
      return "screenshot captured";

    case "browser.navigate":
      return data.url ? `nav: ${String(data.url).substring(0, 15)}` : "navigate";

    case "browser.interact":
      return data.action ? `${String(data.action)}` : "interact";

    case "cron.started":
    case "cron.finished":
    case "cron.error":
      return data.jobId ? `cron ${String(data.jobId)}` : "cron";

    case "channel.message":
      return data.channelId ? `${String(data.channelId)}` : "message";

    case "channel.status":
      return data.status ? `${String(data.status)}` : "status";

    case "skill.invoked":
    case "skill.completed":
    case "skill.error":
      return data.skillName ? String(data.skillName) : "skill";

    case "agent.tokens":
      return data.totalTokens ? `${data.totalTokens} tokens` : "tokens";

    default:
      return `Unknown: ${action.type}`;
  }
}
