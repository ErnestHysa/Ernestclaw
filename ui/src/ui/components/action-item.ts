/**
 * Action Item Component - Renders individual action items in the Live Action Stream
 *
 * Each action represents an event from the agent system (agent lifecycle, tool usage,
 * cron jobs, browser automation, channel events, skill invocations, etc.)
 */

import { html, nothing } from "lit";
import { icon, type IconName } from "../icons.js";
import type { GroupedAction } from "../app-action-stream.js";
import { getTypeLabel, formatTimeRange, isGroupedAction } from "../app-action-stream.js";

/**
 * Icon mapping for action types.
 * Maps common icon names from backend to our IconName type.
 * Provides a safe fallback for unknown icons.
 */
const ACTION_ICON_MAP: Record<string, IconName> = {
  "brain": "brain",
  "tool": "wrench",
  "loader": "loader",
  "monitor": "monitor",
  "link": "link",
  "zap": "zap",
  "messageSquare": "messageSquare",
  "x": "x",
  "check": "check",
  "search": "search",
  "circle": "circle",
  "activity": "activity",
  "arrowDown": "messageSquare",
  "arrowUp": "messageSquare",
  "mouse": "monitor",
  // Chevron icons for expandable groups
  "chevronDown": "chevronDown",
  "chevronRight": "chevronRight",
  // Agent events
  "assistant": "messageSquare",  // assistant messages
  "lifecycle": "brain",        // agent lifecycle
  "error": "x",                // agent error
  // Token usage
  "tokens": "zap",
};

const DEFAULT_ICON: IconName = "circle";

export interface ActionItemProps {
  action: {
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
}

/**
 * Grouped action - represents multiple collapsed actions of the same type
 */
export interface GroupedActionItemProps {
  group: {
    id: string;
    type: string;
    timestamp: number;
    count: number;
    oldestTimestamp: number;
    newestTimestamp: number;
    firstActionId: string;
    lastActionId: string;
    runId?: string;
    actions: ActionItemProps["action"][];
  };
  expanded: boolean;
  visibleCount?: number; // Number of actions to show when expanded (pagination)
  onToggle: () => void;
  onShowMore: () => void;
}

/**
 * Render a single action item with its status, icon, description, and optional screenshot
 */
export function renderActionItem(props: ActionItemProps) {
  const { action } = props;
  const statusClass = `action-item--${action.status}`;
  const timeAgo = formatTimeAgo(action.timestamp);

  return html`
    <div class="action-item ${statusClass}" data-action-id="${action.id}">
      <div class="action-item__header">
        <div class="action-item__icon">${renderActionIcon(action.icon, action.status)}</div>
        <div class="action-item__info">
          <div class="action-item__title">${action.title}</div>
          <div class="action-item__time">${timeAgo}</div>
        </div>
        <div class="action-item__status">
          <span class="badge badge--${action.status}">${action.status}</span>
        </div>
      </div>

      ${action.description ? html`
        <div class="action-item__description">${action.description}</div>
      ` : nothing}

      ${action.thumbnailUrl ? html`
        <div class="action-item__screenshot">
          <img src="${action.thumbnailUrl}" alt="Screenshot" class="action-item__thumb" />
          <button class="action-item__expand" @click=${() => expandScreenshot(action.screenshotUrl!)}>
            ${icon('search')} View Screenshot
          </button>
        </div>
      ` : nothing}

      ${Object.keys(action.metadata).length > 0 ? html`
        <div class="action-item__metadata">
          ${Object.entries(action.metadata).map(([key, value]) => renderMetaItem(key, value))}
        </div>
      ` : nothing}

      ${action.runId ? html`
        <div class="action-item__actions">
          <button class="btn btn--sm" @click=${() => showRunDetails(action.runId!)}>
            ${icon('search')} View Run
          </button>
          <button class="btn btn--sm btn--secondary" @click=${() => pauseAgent(action.runId!)}>
            ${icon('circle')} Pause
          </button>
        </div>
      ` : nothing}
    </div>
  `;
}

/**
 * Render the icon for an action with appropriate styling based on status
 */
function renderActionIcon(iconName: string, status: string) {
  const safeIconName: IconName = ACTION_ICON_MAP[iconName] ?? DEFAULT_ICON;
  return html`
    <span class="action-item__icon-wrap action-item__icon-wrap--${status}">
      ${icon(safeIconName)}
    </span>
  `;
}

/**
 * Render a single metadata item as a pill/badge
 */
function renderMetaItem(key: string, value: string | number | boolean) {
  return html`
    <span class="action-item__meta">
      <strong>${formatMetaKey(key)}:</strong> ${String(value)}
    </span>
  `;
}

/**
 * Format metadata key for display (convert camelCase to Title Case)
 */
function formatMetaKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Format timestamp as "time ago" string
 */
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Expand screenshot in a modal or new tab
 */
function expandScreenshot(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Navigate to run details view
 */
function showRunDetails(runId: string): void {
  dispatchEvent(new CustomEvent('navigate-to-run', {
    detail: { runId },
    bubbles: true,
    composed: true
  }));
}

/**
 * Pause a running agent
 */
function pauseAgent(runId: string): void {
  dispatchEvent(new CustomEvent('pause-agent', {
    detail: { runId },
    bubbles: true,
    composed: true
  }));
}

/**
 * Render a grouped action item (collapsed multiple events)
 * Uses pagination to avoid performance issues with large groups
 */
export function renderGroupedActionItem(props: GroupedActionItemProps) {
  const { group, expanded, visibleCount = 5, onToggle, onShowMore } = props;
  const iconKey = group.type.split('.')[1] || group.type;
  const safeIconName: IconName = ACTION_ICON_MAP[iconKey] ?? DEFAULT_ICON;
  const timeRange = formatTimeRange(group.oldestTimestamp, group.newestTimestamp);

  // Determine label based on type
  const typeLabel = getTypeLabel(group.type);
  const countLabel = group.count === 1 ? typeLabel : `${group.count} ${typeLabel}s`;

  // Only render visible actions for performance (pagination)
  const visibleActions = group.actions.slice(0, visibleCount);
  const hasMore = visibleCount < group.actions.length;
  const remainingCount = group.actions.length - visibleCount;

  return html`
    <div class="action-item action-item--group" data-action-group="${group.id}">
      <div class="action-item__header" @click=${onToggle}>
        <div class="action-item__icon action-item__icon--group">
          ${expanded ? icon('chevronDown') : icon('chevronRight')}
        </div>
        <div class="action-item__info">
          <div class="action-item__title">${countLabel}</div>
          <div class="action-item__time">${timeRange}</div>
        </div>
        <div class="action-item__status">
          <span class="badge badge--info">group</span>
        </div>
      </div>

      ${expanded ? html`
        <div class="action-item__grouped-actions">
          ${visibleActions.map(action => renderActionItem({ action }))}
          ${hasMore ? html`
            <button class="group-show-more-btn" @click=${(e) => { e.stopPropagation(); onShowMore(); }}>
              Show ${Math.min(remainingCount, 5)} more... (${remainingCount} remaining)
            </button>
          ` : nothing}
        </div>
      ` : nothing}

      ${group.runId && !expanded ? html`
        <div class="action-item__actions">
          <button class="btn btn--sm" @click=${(e) => { e.stopPropagation(); showRunDetails(group.runId!); }}>
            ${icon('search')} View Run
          </button>
        </div>
      ` : nothing}
    </div>
  `;
}
