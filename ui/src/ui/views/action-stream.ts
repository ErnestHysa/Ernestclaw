/**
 * Live Action Stream View - "God View" for real-time system activity
 *
 * Displays all agent actions, cron runs, browser automation, skill invocations,
 * and channel events in a unified, filterable, real-time stream.
 *
 * Smart grouping: Repetitive events (assistant messages, token updates) are
 * automatically grouped when consecutive, while important events (lifecycle,
 * tool calls, errors) are always shown individually.
 */

import { html, nothing } from "lit";
import { icon } from "../icons.js";
import type { AppViewState } from "../app-view-state.js";
import { renderActionItem, renderGroupedActionItem } from "../components/action-item.js";
import { filterActions, groupActions, type GroupedAction, type ActionDisplayItem, isGroupedAction } from "../app-action-stream.js";

export interface ActionStreamProps {
  state: AppViewState;
}

export interface ActionStreamState {
  actions: ActionDisplayFormat[];
  activeFilters: string[];
  actionStats: ActionStreamStats;
  tokenUsage: TokenUsageData;
  showTokenMeter: boolean;
  liveEnabled: boolean;
  hasMoreActions: boolean;
  loading: boolean;
  error: string | null;
}

export interface ActionDisplayFormat {
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
}

export interface ActionStreamStats {
  total: number;
  byType: Record<string, number>;
  recentCount: number;
}

export interface TokenUsageData {
  total: number;
  limit: number;
  cost: number;
  byRun: Record<string, number>;
}

/**
 * Main render function for the Live Action Stream view
 */
export function renderActionStream(props: ActionStreamProps) {
  const { state } = props;

  // Extract action stream state from AppViewState (now properly typed)
  const allActions = state.actionStreamActions;
  const activeFilters = state.actionStreamFilters;
  const actionStats = state.actionStreamStats;
  const tokenUsage = state.actionStreamTokenUsage;
  const showTokenMeter = state.actionStreamShowTokenMeter;
  const liveEnabled = state.actionStreamLiveEnabled;
  const hasMoreActions = state.actionStreamHasMore;
  const loading = state.actionStreamLoading;
  const error = state.actionStreamError;
  const selectedRunId = (state as { actionStreamSelectedRunId?: string | null }).actionStreamSelectedRunId ?? null;

  // Apply filters to get actions to display
  const actions = filterActions(allActions ?? [], activeFilters ?? ["all"]);

  // Filter actions for the selected run (if any)
  const runActions = selectedRunId
    ? allActions?.filter(a => a.runId === selectedRunId) ?? []
    : [];

  return html`
    <div class="action-stream">
      <header class="action-stream__header">
        <div class="action-stream__title">
          <h1 class="action-stream__heading">Live Action Stream</h1>
          <p class="action-stream__subtitle">
            Real-time view of all agent, cron, browser, and skill activity
          </p>
        </div>
        <div class="action-stream__controls">
          <button class="btn btn--secondary btn--sm" @click=${() => refreshActionStream(state)}>
            Refresh
          </button>
          <button class="btn btn--primary btn--sm" @click=${() => toggleLiveMode(state)}>
            <span class="live-indicator ${liveEnabled ? 'live-indicator--active' : ''}"></span>
            ${liveEnabled ? 'Live' : 'Paused'}
          </button>
        </div>
      </header>

      ${error ? html`
        <div class="alert alert--error">
          <div class="alert__icon">${icon('bug')}</div>
          <div class="alert__content">
            <h3 class="alert__title">Stream Error</h3>
            <p class="alert__message">${error}</p>
          </div>
        </div>
      ` : nothing}

      <!-- Filter Bar -->
      <div class="action-stream__filters">
        ${renderFilterButtons(activeFilters, (filter: string) => toggleFilter(state, filter))}
      </div>

      <!-- Stats Summary -->
      <section class="action-stream__stats">
        ${renderStatsRow(actionStats)}
      </section>

      <!-- Live Token Meter -->
      ${showTokenMeter ? html`
        <section class="action-stream__token-meter">
          ${renderTokenMeter(tokenUsage)}
        </section>
      ` : nothing}

      <!-- Actions List -->
      <section class="action-stream__actions">
        ${loading ? renderLoadingState() : nothing}
        ${!loading && actions.length === 0 ? renderEmptyState() : nothing}
        ${!loading && actions.length > 0 ? renderActionsList(actions, hasMoreActions, state) : nothing}
      </section>
    </div>

    <!-- Run Details Modal -->
    ${selectedRunId ? renderRunDetailsModal(selectedRunId, runActions, state) : nothing}
  `;
}

/**
 * Render filter buttons for action types
 */
function renderFilterButtons(activeFilters: string[], toggle: (filter: string) => void) {
  const filters = [
    { id: 'all', label: 'All', types: [] },
    { id: 'agent', label: 'Agent', types: ['agent.lifecycle', 'agent.tool', 'agent.assistant', 'agent.error', 'agent.tokens'] },
    { id: 'cron', label: 'Cron', types: ['cron.started', 'cron.finished', 'cron.error'] },
    { id: 'browser', label: 'Browser', types: ['browser.screenshot', 'browser.navigate', 'browser.interact'] },
    { id: 'skill', label: 'Skills', types: ['skill.invoked', 'skill.completed', 'skill.error'] },
    { id: 'channel', label: 'Channels', types: ['channel.message', 'channel.status'] },
  ];

  const allActive = activeFilters.includes('all');

  return html`
    ${filters.map(f => html`
      <button
        class="filter-btn ${(allActive && f.id === 'all') || (!allActive && activeFilters.includes(f.id)) ? 'filter-btn--active' : ''}"
        @click=${() => toggle(f.id)}
        title="Filter by ${f.label}"
      >
        ${f.label}
      </button>
    `)}
  `;
}

/**
 * Render statistics row showing counts of different action types
 */
function renderStatsRow(stats: ActionStreamStats) {
  return html`
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-item__value">${stats.total.toLocaleString()}</span>
        <span class="stat-item__label">Total Actions</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__value">${(stats.byType['agent.lifecycle'] ?? 0).toLocaleString()}</span>
        <span class="stat-item__label">Agent Runs</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__value">${(stats.byType['cron.started'] ?? 0).toLocaleString()}</span>
        <span class="stat-item__label">Cron Jobs</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__value">${(stats.byType['browser.screenshot'] ?? 0).toLocaleString()}</span>
        <span class="stat-item__label">Screenshots</span>
      </div>
      <div class="stat-item">
        <span class="stat-item__value">${(stats.byType['skill.invoked'] ?? 0).toLocaleString()}</span>
        <span class="stat-item__label">Skills</span>
      </div>
    </div>
  `;
}

/**
 * Render token usage meter with progress bar
 */
function renderTokenMeter(usage: TokenUsageData) {
  const percentage = usage.limit > 0 ? Math.min(100, (usage.total / usage.limit) * 100) : 0;
  const status = percentage > 80 ? 'error' : percentage > 50 ? 'warning' : 'success';

  return html`
    <div class="token-meter">
      <div class="token-meter__header">
        <span class="token-meter__label">Token Usage</span>
        <span class="token-meter__values">${usage.total.toLocaleString()} / ${usage.limit.toLocaleString()}</span>
      </div>
      <div class="token-meter__bar">
        <div class="token-meter__fill token-meter__fill--${status}" style="width: ${percentage}%"></div>
      </div>
      <div class="token-meter__footer">
        <span class="token-meter__cost">Estimated Cost: $${usage.cost.toFixed(4)}</span>
        <span class="token-meter__percentage">${percentage.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

/**
 * Render loading state
 */
function renderLoadingState() {
  return html`
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading action stream...</p>
    </div>
  `;
}

/**
 * Render empty state when no actions are available
 */
function renderEmptyState() {
  return html`
    <div class="empty-state">
      <div class="empty-state__icon">${icon('loader')}</div>
      <h3 class="empty-state__title">No actions yet</h3>
      <p class="empty-state__message">
        Actions will appear here as agents run, cron jobs execute, and browser automation occurs.
      </p>
      <div class="empty-state__tips">
        <p><strong>Tip:</strong> Start an agent run or trigger a cron job to see activity here.</p>
      </div>
    </div>
  `;
}

/**
 * Render the list of actions with smart grouping
 */
function renderActionsList(actions: ActionDisplayFormat[], hasMore: boolean, state: AppViewState) {
  // Get expanded groups from state
  const expandedGroups = (state as { actionStreamExpandedGroups?: Set<string> }).actionStreamExpandedGroups ?? new Set<string>();
  // Get visible count for each group (pagination)
  const groupVisibleCounts = (state as { actionStreamGroupVisibleCounts?: Map<string, number> }).actionStreamGroupVisibleCounts ?? new Map<string, number>();

  // Group actions to reduce clutter
  const displayItems = groupActions(actions);

  return html`
    <div class="actions-list">
      ${displayItems.map(item => {
        if (isGroupedAction(item)) {
          // Render grouped action with expand/collapse and pagination
          const isExpanded = expandedGroups.has(item.id);
          const visibleCount = groupVisibleCounts.get(item.id) ?? 5;
          return renderGroupedActionItem({
            group: item,
            expanded: isExpanded,
            visibleCount,
            onToggle: () => toggleGroupExpanded(state, item.id),
            onShowMore: () => showMoreGroupActions(state, item.id),
          });
        } else {
          // Render individual action
          return renderActionItem({ action: item });
        }
      })}
    </div>
    ${hasMore ? html`
      <button class="load-more-btn" @click=${() => loadMoreActions(state)}>
        Load More Actions
      </button>
    ` : nothing}
  `;
}

/**
 * Toggle a group's expanded state
 */
function toggleGroupExpanded(state: AppViewState, groupId: string): void {
  const currentState = state as { actionStreamExpandedGroups?: Set<string> };
  if (!currentState.actionStreamExpandedGroups) {
    currentState.actionStreamExpandedGroups = new Set<string>();
  }
  const expandedGroups = currentState.actionStreamExpandedGroups;

  if (expandedGroups.has(groupId)) {
    expandedGroups.delete(groupId);
  } else {
    expandedGroups.add(groupId);
  }
  // Trigger re-render via custom event
  dispatchEvent(new CustomEvent('actionstream-toggle-group', {
    detail: { groupId },
    bubbles: true,
    composed: true
  }));
}

/**
 * Show more actions in a group (pagination)
 */
function showMoreGroupActions(state: AppViewState, groupId: string): void {
  const countsState = state as { actionStreamGroupVisibleCounts?: Map<string, number> };
  if (!countsState.actionStreamGroupVisibleCounts) {
    countsState.actionStreamGroupVisibleCounts = new Map<string, number>();
  }
  const currentCount = countsState.actionStreamGroupVisibleCounts.get(groupId) ?? 5;
  countsState.actionStreamGroupVisibleCounts.set(groupId, currentCount + 5);
  // Trigger re-render
  dispatchEvent(new CustomEvent('actionstream-show-more-group', {
    detail: { groupId },
    bubbles: true,
    composed: true
  }));
}

/**
 * Action handlers
 */

function refreshActionStream(state: AppViewState): void {
  dispatchEvent(new CustomEvent('actionstream-refresh', {
    bubbles: true,
    composed: true
  }));
}

function toggleLiveMode(state: AppViewState): void {
  dispatchEvent(new CustomEvent('actionstream-toggle-live', {
    bubbles: true,
    composed: true
  }));
}

function toggleFilter(state: AppViewState, filter: string): void {
  dispatchEvent(new CustomEvent('actionstream-toggle-filter', {
    detail: { filter },
    bubbles: true,
    composed: true
  }));
}

function loadMoreActions(state: AppViewState): void {
  dispatchEvent(new CustomEvent('actionstream-load-more', {
    bubbles: true,
    composed: true
  }));
}

/**
 * Render run details modal
 */
function renderRunDetailsModal(runId: string, runActions: ActionDisplayFormat[], state: AppViewState) {
  // Group the run actions for better display
  const displayItems = groupActions(runActions);

  // Count by type
  const typeCounts: Record<string, number> = {};
  for (const action of runActions) {
    typeCounts[action.type] = (typeCounts[action.type] || 0) + 1;
  }

  // Find lifecycle events
  const lifecycleEvents = runActions.filter(a => a.type === 'agent.lifecycle');
  const startEvent = lifecycleEvents.find(a => a.metadata?.phase === 'start');
  const endEvent = lifecycleEvents.find(a => a.metadata?.phase === 'end' || a.metadata?.phase === 'error');

  return html`
    <div class="modal-overlay" @click=${() => closeRunModal(state)}>
      <div class="modal modal--lg" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal__header">
          <h2 class="modal__title">Run Details</h2>
          <button class="modal__close" @click=${() => closeRunModal(state)}>
            ${icon('x')}
          </button>
        </div>
        <div class="modal__body">
          <!-- Run Info -->
          <div class="run-details__info">
            <div class="run-details__field">
              <span class="run-details__label">Run ID</span>
              <span class="run-details__value">${runId.slice(0, 16)}...</span>
            </div>
            ${startEvent ? html`
              <div class="run-details__field">
                <span class="run-details__label">Started</span>
                <span class="run-details__value">${formatTimeAgo(startEvent.timestamp)}</span>
              </div>
            ` : nothing}
            ${endEvent ? html`
              <div class="run-details__field">
                <span class="run-details__label">Status</span>
                <span class="run-details__value run-details__value--${endEvent.status}">
                  ${endEvent.metadata?.phase === 'error' ? 'Error' : 'Completed'}
                </span>
              </div>
            ` : nothing}
            <div class="run-details__field">
              <span class="run-details__label">Total Actions</span>
              <span class="run-details__value">${runActions.length}</span>
            </div>
          </div>

          <!-- Type Breakdown -->
          <div class="run-details__breakdown">
            <h3 class="run-details__subtitle">Action Breakdown</h3>
            <div class="run-details__types">
              ${Object.entries(typeCounts).map(([type, count]) => html`
                <div class="run-details__type">
                  <span class="run-details__type-name">${getTypeLabel(type)}</span>
                  <span class="run-details__type-count">${count}</span>
                </div>
              `)}
            </div>
          </div>

          <!-- Actions Timeline -->
          <div class="run-details__actions">
            <h3 class="run-details__subtitle">Timeline</h3>
            <div class="actions-list actions-list--compact">
              ${displayItems.map(item => {
                if (isGroupedAction(item)) {
                  return html`
                    <div class="run-details__grouped">
                      <div class="run-details__group-header">
                        ${icon('chevronRight')}
                        <span>${item.count} ${getTypeLabel(item.type)}s</span>
                      </div>
                    </div>
                  `;
                } else {
                  return html`
                    <div class="run-details__action">
                      <span class="run-details__action-time">${formatTimeAgo(item.timestamp)}</span>
                      <span class="run-details__action-type">${getTypeLabel(item.type)}</span>
                      <span class="run-details__action-title">${item.title}</span>
                    </div>
                  `;
                }
              })}
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--secondary" @click=${() => closeRunModal(state)}>Close</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Close run details modal
 */
function closeRunModal(state: AppViewState): void {
  dispatchEvent(new CustomEvent('actionstream-close-run-modal', {
    bubbles: true,
    composed: true
  }));
}

/**
 * Format timestamp as "time ago" string (re-export from action-item)
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
