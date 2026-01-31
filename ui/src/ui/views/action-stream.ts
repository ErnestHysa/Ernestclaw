/**
 * Live Action Stream View - "God View" for real-time system activity
 *
 * Displays all agent actions, cron runs, browser automation, skill invocations,
 * and channel events in a unified, filterable, real-time stream.
 */

import { html, nothing } from "lit";
import { icon } from "../icons.js";
import type { AppViewState } from "../app-view-state.js";
import { renderActionItem } from "../components/action-item.js";

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

  // Extract action stream state from AppViewState
  const actions = (state as any).actionStreamActions || [];
  const activeFilters = (state as any).actionStreamFilters || ['all'];
  const actionStats = (state as any).actionStreamStats || { total: 0, byType: {} };
  const tokenUsage = (state as any).actionStreamTokenUsage || { total: 0, limit: 100000, cost: 0 };
  const showTokenMeter = (state as any).actionStreamShowTokenMeter || false;
  const liveEnabled = (state as any).actionStreamLiveEnabled !== false;
  const hasMoreActions = (state as any).actionStreamHasMore || false;
  const loading = (state as any).actionStreamLoading || false;
  const error = (state as any).actionStreamError || null;

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
            ${icon('search')} Refresh
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
 * Render the list of actions
 */
function renderActionsList(actions: ActionDisplayFormat[], hasMore: boolean, state: AppViewState) {
  return html`
    <div class="actions-list">
      ${actions.map(action => renderActionItem({ action }))}
    </div>
    ${hasMore ? html`
      <button class="load-more-btn" @click=${() => loadMoreActions(state)}>
        ${icon('loader')} Load More Actions
      </button>
    ` : nothing}
  `;
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
