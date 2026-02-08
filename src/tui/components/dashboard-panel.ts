import { Container, Text } from "@mariozechner/pi-tui";
import type { GatewayStatusSummary } from "../tui-types.js";
import { formatAge } from "../../infra/channel-summary.js";

export interface DashboardProps {
  summary: GatewayStatusSummary;
  connected: boolean;
}

export class DashboardPanel extends Container {
  private props: DashboardProps;

  constructor(props: DashboardProps) {
    super();
    this.props = props;
    this.renderDashboard();
  }

  private renderDashboard() {
    const { summary, connected } = this.props;

    // Header
    this.addChild(new Text("┌─────────────────────────────────────────────────────────────┐"));
    this.addChild(new Text("│              UNIFIED COMMAND CENTER - DASHBOARD            │"));
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));

    // Connection Status
    const connectionStatus = connected ? "● Connected" : "○ Disconnected";
    const statusLine = `│ Status: ${connectionStatus.padEnd(51)}│`;
    this.addChild(new Text(statusLine));

    // Quick Stats Section
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));
    this.addChild(new Text("│  QUICK STATS                                                 │"));
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));

    const sessionCount = summary.sessions?.count ?? 0;
    const agentCount = summary.heartbeat?.agents?.length ?? 0;
    const linkStatus = summary.linkChannel?.linked ? "Linked" : "Not Linked";

    this.addChild(new Text(`│  Link Channel:  ${linkStatus.padEnd(46)}│`));
    this.addChild(new Text(`│  Agents:       ${String(agentCount).padEnd(46)}│`));
    this.addChild(new Text(`│  Sessions:     ${String(sessionCount).padEnd(46)}│`));

    // Recent Sessions
    const recent = Array.isArray(summary.sessions?.recent) ? summary.sessions?.recent : [];
    if (recent.length > 0) {
      this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));
      this.addChild(new Text("│  RECENT SESSIONS                                            │"));
      this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));

      for (const entry of recent.slice(0, 3)) {
        const ageLabel = typeof entry.age === "number" ? formatAge(entry.age) : "no activity";
        const model = entry.model ?? "unknown";
        const key = (entry.key ?? "").substring(0, 30);
        this.addChild(new Text(`│  • ${key.padEnd(30)} ${model.padEnd(12)} ${ageLabel.padEnd(8)} │`));
      }
    }

    // System Health
    const channelSummary = Array.isArray(summary.providerSummary) ? summary.providerSummary : [];
    if (channelSummary.length > 0) {
      this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));
      this.addChild(new Text("│  SYSTEM STATUS                                               │"));
      this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));

      for (const line of channelSummary.slice(0, 4)) {
        const paddedLine = `  ${line}`.padEnd(58);
        this.addChild(new Text(`│${paddedLine}│`));
      }
    }

    // Footer
    this.addChild(new Text("├─────────────────────────────────────────────────────────────┤"));
    this.addChild(new Text("│  Press [r]efresh, [s]essions, [c]hannels, [q]uit            │"));
    this.addChild(new Text("└─────────────────────────────────────────────────────────────┘"));
  }

  update(props: DashboardProps) {
    this.props = props;
    this.clear();
    this.renderDashboard();
  }
}

/**
 * Format dashboard summary as plain text lines
 * Useful for non-interactive display
 */
export function formatDashboardSummary(props: DashboardProps): string[] {
  const { summary, connected } = props;
  const lines: string[] = [];

  lines.push("┌─────────────────────────────────────────────────────────────┐");
  lines.push("│              UNIFIED COMMAND CENTER - DASHBOARD            │");
  lines.push("├─────────────────────────────────────────────────────────────┤");

  const connectionStatus = connected ? "● Connected" : "○ Disconnected";
  lines.push(`│ Status: ${connectionStatus.padEnd(51)}│`);

  lines.push("├─────────────────────────────────────────────────────────────┤");
  lines.push("│  QUICK STATS                                                 │");
  lines.push("├─────────────────────────────────────────────────────────────┤");

  const sessionCount = summary.sessions?.count ?? 0;
  const agentCount = summary.heartbeat?.agents?.length ?? 0;
  const linkStatus = summary.linkChannel?.linked ? "Linked" : "Not Linked";

  lines.push(`│  Link Channel:  ${linkStatus.padEnd(46)}│`);
  lines.push(`│  Agents:       ${String(agentCount).padEnd(46)}│`);
  lines.push(`│  Sessions:     ${String(sessionCount).padEnd(46)}│`);

  const recent = Array.isArray(summary.sessions?.recent) ? summary.sessions?.recent : [];
  if (recent.length > 0) {
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push("│  RECENT SESSIONS                                            │");
    lines.push("├─────────────────────────────────────────────────────────────┤");

    for (const entry of recent.slice(0, 3)) {
      const ageLabel = typeof entry.age === "number" ? formatAge(entry.age) : "no activity";
      const model = entry.model ?? "unknown";
      const key = (entry.key ?? "").substring(0, 30);
      lines.push(`│  • ${key.padEnd(30)} ${model.padEnd(12)} ${ageLabel.padEnd(8)} │`);
    }
  }

  lines.push("└─────────────────────────────────────────────────────────────┘");

  return lines;
}
