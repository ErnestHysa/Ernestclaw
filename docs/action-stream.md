# Live Action Stream (God View)

The **Live Action Stream** provides real-time visibility into all system activity across agents, cron jobs, browser automation, skill invocations, and channel events. It gives you a comprehensive "God View" of everything happening in your OpenClaw instance.

## Features

- **Real-time Activity Monitoring**: See every action as it happens
- **Event Filtering**: Filter by agent, cron, browser, skills, or channels
- **Token Usage Tracking**: Monitor token consumption and costs
- **Screenshot Integration**: View browser automation screenshots
- **Live Polling**: Automatic updates when live mode is enabled
- **Statistics Dashboard**: Quick stats on action counts by type

## Web UI Usage

### Accessing the Action Stream

Navigate to the **Action Stream** tab in the Control UI:

```
http://localhost:3000 → Action Stream
```

### Filter Buttons

The action stream supports category-based filtering:

| Filter | Description |
|--------|-------------|
| **All** | Show all action types |
| **Agent** | Agent lifecycle, tool calls, token usage |
| **Cron** | Cron job starts, finishes, errors |
| **Browser** | Screenshots, navigation, interactions |
| **Skills** | Skill invocations and completions |
| **Channels** | Channel messages and status changes |

### Live Mode

Toggle **Live** mode to enable real-time updates:

- **Live (enabled)**: Stream updates every 2 seconds
- **Paused (disabled)**: Stop automatic updates

### Statistics Row

The statistics row displays:

| Stat | Description |
|------|-------------|
| **Total Actions** | Total number of actions in the store |
| **Agent Runs** | Number of agent lifecycle events |
| **Cron Jobs** | Number of cron job starts |
| **Screenshots** | Number of browser screenshots captured |
| **Skills** | Number of skill invocations |

### Action Items

Each action in the stream displays:

- **Timestamp**: When the action occurred
- **Type**: Action category (e.g., `agent.tool`, `browser.screenshot`)
- **Description**: Human-readable description of the action
- **Icon**: Visual indicator for the action type
- **Status**: Success (green), error (red), pending (yellow), or info (blue)

## TUI Usage

### Open Action Stream Panel

In the Terminal UI, use the `/stream` command:

```
/stream
```

### TUI Panel Controls

| Key | Action |
|-----|--------|
| **r** | Manual refresh |
| **f** | Open filter dialog |
| **q** | Close panel |

### TUI Display

The TUI panel shows:

```
┌─────────────────────────────────────────────────────────────┐
│              LIVE ACTION STREAM - GOD VIEW                  │
├─────────────────────────────────────────────────────────────┤
│  [14:32:15] agent.tool        search                        │
│  [14:32:10] browser.navigate  nav: https://example.com      │
│  [14:32:05] cron.started      Job: daily-check              │
├─────────────────────────────────────────────────────────────┤
│  [r]efresh  [f]ilter  [q]uit                                │
└─────────────────────────────────────────────────────────────┘
```

## Gateway API Methods

### actionstream.history

Fetch historical action events with optional filtering.

```javascript
// Request
{
  "types": ["agent.tool", "browser.screenshot"],  // Optional: filter by type
  "runId": "run_123",                             // Optional: filter by run ID
  "sessionKey": "main",                           // Optional: filter by session
  "afterMs": 1706700000000,                       // Optional: events after timestamp
  "beforeMs": 1706703600000,                      // Optional: events before timestamp
  "limit": 50                                     // Optional: max events (default: 50)
}

// Response
{
  "actions": [
    {
      "id": "act_1",
      "type": "agent.tool",
      "timestamp": 1706701234567,
      "runId": "run_123",
      "sessionKey": "main",
      "data": { /* event-specific data */ }
    }
  ],
  "total": 1250
}
```

### actionstream.stats

Get statistics about actions in the stream.

```javascript
// Request
{}

// Response
{
  "byType": {
    "agent.lifecycle": 150,
    "agent.tool": 890,
    "browser.screenshot": 45,
    "cron.started": 23
  },
  "total": 1208,
  "recentCount": 45  // Actions in last 5 minutes
}
```

### actionstream.subscribe

Subscribe to real-time action stream updates via WebSocket.

```javascript
// Request
{}

// Response
{
  "subscribed": true
}

// Subsequent WebSocket events
{
  "type": "event",
  "event": "actionstream.event",
  "payload": {
    "action": { /* formatted action for display */ }
  }
}
```

### actionstream.unsubscribe

Unsubscribe from real-time updates.

```javascript
// Request
{}

// Response
{
  "subscribed": false
}
```

### actionstream.runHistory

Get all events for a specific run ID.

```javascript
// Request
{
  "runId": "run_123"
}

// Response
{
  "actions": [ /* all events for this run */ ],
  "runId": "run_123"
}
```

## Event Types

### Agent Events

| Type | Description |
|------|-------------|
| `agent.lifecycle` | Agent state changes (start, thinking, finished, error) |
| `agent.tool` | Tool call invocations |
| `agent.assistant` | Assistant message events |
| `agent.error` | Agent execution errors |
| `agent.tokens` | Token usage updates |

### Browser Events

| Type | Description |
|------|-------------|
| `browser.screenshot` | Browser screenshot captured |
| `browser.navigate` | Page navigation |
| `browser.interact` | Element interaction (click, type, etc.) |

### Cron Events

| Type | Description |
|------|-------------|
| `cron.started` | Cron job started |
| `cron.finished` | Cron job completed successfully |
| `cron.error` | Cron job failed with error |

### Skill Events

| Type | Description |
|------|-------------|
| `skill.invoked` | Skill execution started |
| `skill.completed` | Skill completed successfully |
| `skill.error` | Skill execution failed |

### Channel Events

| Type | Description |
|------|-------------|
| `channel.message` | Message sent/received on a channel |
| `channel.status` | Channel status changed |

## Data Structure

### ActionStreamEvent

```typescript
interface ActionStreamEvent {
  id: string;           // Unique action ID
  type: string;         // Event type (e.g., "agent.tool")
  timestamp: number;    // Unix timestamp in milliseconds
  runId?: string;       // Associated agent run ID
  sessionKey?: string;  // Associated session key
  data: Record<string, unknown>;  // Event-specific data
}
```

### ActionDisplayFormat (UI)

```typescript
interface ActionDisplayFormat {
  id: string;
  type: string;
  timestamp: number;
  title: string;           // Human-readable title
  description?: string;    // Detailed description
  icon: string;            // Icon name
  status: "success" | "error" | "pending" | "info";
  metadata: Record<string, string | number | boolean>;
  screenshotUrl?: string;  // For browser screenshots
  runId?: string;
  sessionKey?: string;
}
```

### ActionStreamStats

```typescript
interface ActionStreamStats {
  total: number;           // Total action count
  byType: Record<string, number>;  // Count per type
  recentCount: number;     // Actions in last 5 minutes
}
```

## Token Usage Tracking

The action stream tracks token usage across all agent runs:

- **Total Tokens**: Cumulative token consumption
- **Cost Estimation**: Calculated cost based on model pricing
- **Per-Run Breakdown**: Token usage by individual runs

Token usage is updated in real-time as agents run.

## Browser Screenshot Integration

When browser automation captures screenshots, they appear in the action stream with:

- Thumbnail preview
- Full-size image URL
- Associated page URL
- Interaction context

Click any screenshot to view the full-size image.

## Configuration

### Store Size

The in-memory circular buffer stores the most recent 10,000 actions by default. This can be configured in:

```typescript
// src/infra/action-stream-store.ts
const MAX_STORE_SIZE = 10_000;
```

### Retention Period

Actions are retained for up to 24 hours in memory. Older actions are automatically pruned.

### Broadcast Filter

By default, all subscribed clients receive all action events. Clients can filter on the client side to show only relevant events.

## Troubleshooting

### Action Stream Not Loading

1. Verify the gateway is running
2. Check browser console for errors
3. Ensure WebSocket connection is established

### No Actions Appearing

1. Verify agents or cron jobs have run
2. Check the action stream aggregator is started
3. Try clicking the **Refresh** button

### Live Mode Not Updating

1. Verify Live mode is enabled (button shows "Live")
2. Check network requests in browser DevTools
3. Ensure WebSocket connection is active

### TUI Panel Shows "Action stream not available"

1. Verify the gateway process is running
2. Check that the action-stream module is loaded
3. Restart the TUI if needed
