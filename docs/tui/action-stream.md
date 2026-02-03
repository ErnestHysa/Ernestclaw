# TUI Action Stream Panel

The **Action Stream Panel** provides a terminal-based "God View" for real-time monitoring of all system activity.

## Opening the Panel

```bash
/stream
```

The panel opens as an overlay, displaying recent actions in real-time.

## Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│              LIVE ACTION STREAM - GOD VIEW                  │
├─────────────────────────────────────────────────────────────┤
│  [14:32:15] agent.tool        search                        │
│  [14:32:10] browser.navigate  nav: https://example.com      │
│  [14:32:05] cron.started      Job: daily-check              │
│  [14:32:00] skill.invoked     Skill: web-search            │
│  [14:31:55] channel.message   Channel: whatsapp-business    │
├─────────────────────────────────────────────────────────────┤
│  [r]efresh  [f]ilter  [q]uit                                │
└─────────────────────────────────────────────────────────────┘
```

## Display Format

Each action shows:

| Component | Description |
|-----------|-------------|
| **Timestamp** | When the action occurred (HH:MM:SS) |
| **Type** | Action type (20 chars, padded) |
| **Preview** | Brief description of the action |

## Action Types

| Type | Description | Example |
|------|-------------|---------|
| `agent.lifecycle` | Agent state changes | `start`, `thinking`, `finished` |
| `agent.tool` | Tool executions | `search`, `browse`, `calculate` |
| `agent.tokens` | Token usage updates | `1234 tokens` |
| `browser.screenshot` | Screenshots captured | `screenshot captured` |
| `browser.navigate` | Page navigation | `nav: https://example.com` |
| `browser.interact` | Element interactions | `click`, `type` |
| `cron.started` | Cron jobs started | `Job: daily-check` |
| `cron.finished` | Cron jobs completed | `Job: daily-check` |
| `cron.error` | Cron job failures | `Job: cleanup failed` |
| `skill.invoked` | Skill execution started | `Skill: web-search` |
| `skill.completed` | Skill execution finished | `Skill: web-search` |
| `skill.error` | Skill execution failed | `Skill: api-call failed` |
| `channel.message` | Channel messages | `Channel: telegram` |
| `channel.status` | Channel status changes | `connected`, `disconnected` |

## Keyboard Controls

| Key | Action | Description |
|-----|--------|-------------|
| **r** | Refresh | Manually refresh the action list |
| **f** | Filter | Open filter dialog (TODO) |
| **q** | Quit | Close the panel |

## Auto-Refresh

The panel automatically refreshes **every second** to show new actions as they occur.

- New actions appear at the **top** of the list
- The most recent **10 actions** are displayed
- Older actions scroll off the top

## Troubleshooting

### Panel Shows "Action stream not available"

**Cause:** The Gateway is not running or the action stream module is not loaded.

**Solutions:**
1. Verify the Gateway is running: `openclaw status`
2. Check Gateway logs: `openclaw logs --follow`
3. Restart the TUI: `/exit` then `openclaw tui`

### No Actions Appearing

**Cause:** No activity has occurred yet, or events are not being captured.

**Solutions:**
1. Run an agent task to generate activity
2. Trigger a cron job to test
3. Press **r** to manually refresh

### Panel Won't Open

**Cause:** Connection issue or module not loaded.

**Solutions:**
1. Check connection status in footer
2. Verify WebSocket is connected
3. Try `/status` to confirm Gateway is responding

## Data Source

The Action Stream Panel connects to the Gateway's action stream:

- **Gateway method:** `actionstream.history`
- **Real-time events:** `actionstream.event`
- **Store:** In-memory circular buffer (10,000 actions max)

## Integration with Web UI

The same action stream is available in the Web UI:

- Navigate to **Action Stream** tab
- Offers additional features:
  - Category filter buttons
  - Live/pause toggle
  - Statistics dashboard
  - Screenshot previews
  - Pagination for older actions

See [Action Stream Documentation](/action-stream) for Web UI details.

## See Also

- [**TUI Overview**](index.md) - TUI introduction
- [**TUI Commands**](commands.md) - Complete command reference
- [**Action Stream**](/action-stream) - Full feature documentation
