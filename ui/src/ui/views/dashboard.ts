import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { icons, icon } from "../icons.js";
import type { AppViewState } from "../app-view-state.js";

export interface DashboardProps {
  state: AppViewState;
}

export function renderDashboard(props: DashboardProps) {
  const { state } = props;
  
  // Calculate quick stats
  const channelsConnected = Object.values(state.channelsSnapshot?.channels ?? {}).filter(
    (c: any) => c?.connected === true
  ).length;
  const totalChannels = Object.keys(state.channelsSnapshot?.channels ?? {}).length;
  const sessionsCount = state.sessionsResult?.count ?? 0;
  const agentsCount = state.agentsList?.agents?.length ?? 0;
  const cronJobsCount = state.cronStatus?.jobs ?? 0;
  const presenceCount = state.presenceEntries.length;
  
  // Check health status
  const healthOk = state.health && typeof state.health === 'object' && !Object.keys(state.health).some(
    (key: string) => {
      const val = (state.health as Record<string, unknown>)[key];
      return val === null || val === false || val === 'error' || val === 'unhealthy';
    }
  );
  
  const lastError = state.lastError;
  
  return html`
    <div class="dashboard">
      <header class="dashboard__header">
        <div class="dashboard__title">
          <h1 class="dashboard__heading">Command Center</h1>
          <p class="dashboard__subtitle">
            Real-time system overview with one-click fixes
          </p>
        </div>
        <div class="dashboard__status">
          ${state.connected
            ? html`
                <span class="badge badge--success">
                  ${icon('check')} Connected
                </span>
              `
            : html`
                <span class="badge badge--error">
                  ${icon('x')} Disconnected
                </span>
              `}
        </div>
      </header>
      
      ${!state.connected ? renderNotConnected(state) : nothing}
      ${state.connected ? renderConnectedDashboard(state, {
        channelsConnected, totalChannels, sessionsCount, agentsCount,
        cronJobsCount, presenceCount, healthOk, lastError
      }) : nothing}
    </div>
  `;
}

function renderNotConnected(state: AppViewState) {
  return html`
    <div class="dashboard__not-connected">
      <div class="alert alert--warning">
        <div class="alert__icon">${icon('radio')}</div>
        <div class="alert__content">
          <h3 class="alert__title">Gateway Not Connected</h3>
          <p class="alert__message">
            The Unified Command Center requires an active gateway connection.
            Please connect to a gateway to view real-time status and controls.
          </p>
        </div>
      </div>
      <div class="dashboard__quick-actions">
        <h3 class="dashboard__section-title">Quick Actions</h3>
        <div class="dashboard__actions-grid">
          <button class="dashboard__action-card" @click=${() => state.connect()}>
            <div class="dashboard__action-icon">${icon('link')}</div>
            <div class="dashboard__action-title">Connect Gateway</div>
            <div class="dashboard__action-desc">Connect to the gateway server</div>
          </button>
          <button class="dashboard__action-card" @click=${() => state.setTab('debug')}>
            <div class="dashboard__action-icon">${icon('bug')}</div>
            <div class="dashboard__action-title">Debug Connection</div>
            <div class="dashboard__action-desc">Test gateway connectivity</div>
          </button>
        </div>
      </div>
    </div>
  `;
}

interface ConnectedDashboardProps {
  channelsConnected: number;
  totalChannels: number;
  sessionsCount: number;
  agentsCount: number;
  cronJobsCount: number;
  presenceCount: number;
  healthOk: boolean;
  lastError: string | null;
}

function renderConnectedDashboard(
  state: AppViewState,
  props: ConnectedDashboardProps
) {
  const {
    channelsConnected, totalChannels, sessionsCount, agentsCount,
    cronJobsCount, presenceCount, healthOk, lastError
  } = props;

  const statCardsData = [
    {
      label: 'Channels',
      value: `${channelsConnected}/${totalChannels}`,
      icon: 'link',
      status: channelsConnected === totalChannels ? 'success' : channelsConnected > 0 ? 'warning' : 'error',
      description: `${channelsConnected} of ${totalChannels} channels connected`
    },
    {
      label: 'Agents',
      value: String(agentsCount),
      icon: 'brain',
      status: 'success' as const,
      description: 'Active agents configured'
    },
    {
      label: 'Sessions',
      value: String(sessionsCount),
      icon: 'fileText',
      status: 'success' as const,
      description: 'Active chat sessions'
    },
    {
      label: 'Cron Jobs',
      value: String(cronJobsCount),
      icon: 'loader',
      status: 'success' as const,
      description: 'Scheduled tasks'
    },
    {
      label: 'Nodes',
      value: String(presenceCount),
      icon: 'monitor',
      status: 'success' as const,
      description: 'Connected devices'
    },
    {
      label: 'Health',
      value: healthOk ? 'OK' : 'Issues',
      icon: 'zap',
      status: healthOk ? 'success' as const : 'error' as const,
      description: healthOk ? 'All systems healthy' : 'Some issues detected'
    }
  ];

  return html`
    <div class="dashboard__connected">
      <!-- Quick Stats Grid -->
      <section class="dashboard__stats-grid">
        ${statCardsData.map((cardData, index) =>
          renderStatCard({ ...cardData }, index)
        )}
      </section>
      
      <!-- Health Warnings -->
      ${lastError ? html`
        <section class="dashboard__alerts">
          <div class="alert alert--error">
            <div class="alert__icon">${icon('bug')}</div>
            <div class="alert__content">
              <h3 class="alert__title">System Error</h3>
              <p class="alert__message">${lastError}</p>
              <div class="alert__actions">
                <button class="btn btn--primary" @click=${() => state.loadOverview()}>
                  ${icon('search')} Refresh Status
                </button>
                <button class="btn btn--secondary" @click=${() => state.setTab('debug')}>
                  ${icon('bug')} View Debug
                </button>
              </div>
            </div>
          </div>
        </section>
      ` : nothing}
      
      ${!healthOk ? html`
        <section class="dashboard__alerts">
          <div class="alert alert--warning">
            <div class="alert__icon">${icon('zap')}</div>
            <div class="alert__content">
              <h3 class="alert__title">Health Issues Detected</h3>
              <p class="alert__message">
                Some components are reporting unhealthy status.
                Click below to run diagnostics and see suggested fixes.
              </p>
              <div class="alert__actions">
                <button class="btn btn--primary" @click=${() => state.setTab('debug')}>
                  ${icon('bug')} Run Diagnostics
                </button>
              </div>
            </div>
          </div>
        </section>
      ` : nothing}

      <!-- Quick Actions -->
      <section class="dashboard__actions">
        <h2 class="dashboard__section-title">Quick Actions</h2>
        <div class="dashboard__actions-grid">
          ${renderActionCards(state)}
        </div>
      </section>
      
      <!-- System Status -->
      <section class="dashboard__status-section">
        <h2 class="dashboard__section-title">System Status</h2>
        <div class="dashboard__status-grid">
          ${renderStatusItems(state)}
        </div>
      </section>
    </div>
  `;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  status: 'success' | 'warning' | 'error';
  description: string;
}

function renderStatCard(props: StatCardProps, index: number = 0) {
  const { label, value, icon: iconName, status, description } = props;
  const statusClass = `stat-card--${status}`;
  const staggerClass = `stagger-${(index % 12) + 1}`;

  return html`
    <div class="dashboard__stat-card ${statusClass} ${staggerClass}" style="animation-delay: ${(index % 12) * 40}ms;">
      <div class="stat-card__icon">${icon(iconName)}</div>
      <div class="stat-card__content">
        <div class="stat-card__label">${label}</div>
        <div class="stat-card__value">${value}</div>
        <div class="stat-card__description">${description}</div>
      </div>
      <div class="stat-card__status">
        ${status === 'success' ? icon('check') : status === 'warning' ? icon('zap') : icon('x')}
      </div>
    </div>
  `;
}

// Quick Actions Data
const actionCardsData = [
  { icon: 'link', title: 'Manage Channels', desc: 'Connect, configure, and monitor channels', tab: 'channels' },
  { icon: 'fileText', title: 'View Sessions', desc: 'Inspect and manage active sessions', tab: 'sessions' },
  { icon: 'loader', title: 'Cron Jobs', desc: 'Schedule and manage recurring tasks', tab: 'cron' },
  { icon: 'zap', title: 'Skills', desc: 'Enable and configure agent skills', tab: 'skills' },
  { icon: 'settings', title: 'Edit Config', desc: 'Modify gateway and agent settings', tab: 'config' },
  { icon: 'scrollText', title: 'View Logs', desc: 'Tail and search gateway logs', tab: 'logs' },
] as const;

function renderActionCards(state: AppViewState) {
  return actionCardsData.map((action, index) => {
    const staggerClass = `stagger-${(index % 12) + 1}`;
    return html`
      <button
        class="dashboard__action-card ${staggerClass}"
        style="animation-delay: ${200 + (index % 12) * 40}ms;"
        @click=${() => state.setTab(action.tab)}
      >
        <div class="dashboard__action-icon">${icon(action.icon)}</div>
        <div class="dashboard__action-title">${action.title}</div>
        <div class="dashboard__action-desc">${action.desc}</div>
      </button>
    `;
  });
}

interface StatusItemProps {
  label: string;
  value: string;
  icon: string;
  status: 'success' | 'warning' | 'error';
}

function renderStatusItem(props: StatusItemProps, index: number = 0) {
  const { label, value, icon: iconName, status } = props;
  const statusClass = `status-item--${status}`;
  const staggerClass = `stagger-${(index % 12) + 1}`;

  return html`
    <div class="dashboard__status-item ${statusClass} ${staggerClass}" style="animation-delay: ${400 + (index % 12) * 40}ms;">
      <div class="status-item__icon">${icon(iconName)}</div>
      <div class="status-item__content">
        <div class="status-item__label">${label}</div>
        <div class="status-item__value">${value}</div>
      </div>
      <div class="status-item__status">
        <span class="badge badge--${status}">${status}</span>
      </div>
    </div>
  `;
}

// System Status Items Data
function renderStatusItems(state: AppViewState) {
  const statusItemsData = [
    {
      label: 'Gateway',
      value: state.hello?.version || 'Unknown',
      icon: 'monitor',
      status: 'success' as const
    },
    {
      label: 'Default Agent',
      value: state.agentsList?.defaultId || 'main',
      icon: 'brain',
      status: 'success' as const
    },
    {
      label: 'Session Mode',
      value: state.agentsList?.scope || 'per-sender',
      icon: 'fileText',
      status: 'success' as const
    },
    {
      label: 'Discovery',
      value: 'Enabled',
      icon: 'radio',
      status: 'success' as const
    }
  ];

  return statusItemsData.map((item, index) =>
    renderStatusItem(item, index)
  );
}