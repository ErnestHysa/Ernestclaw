---
summary: "Terminal UI (TUI): connect to the Gateway from any machine"
read_when:
  - You want a beginner-friendly walkthrough of the TUI
  - You need the complete list of TUI features, commands, and shortcuts
---

# Terminal UI (TUI)

The **Terminal UI (TUI)** provides a full-featured terminal interface for interacting with OpenClaw. It supports chat, tool execution, action streaming, and complete agent management - all from your terminal.

## Quick Start

### Basic Usage

1. **Start the Gateway:**
   ```bash
   openclaw gateway
   ```

2. **Open the TUI:**
   ```bash
   openclaw tui
   ```

3. **Type a message and press Enter**

### Remote Gateway

Connect to a remote gateway:

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

Use `--password` if your Gateway uses password auth.

## TUI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ws://127.0.0.1:3000          main  agent:main:main                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Chat Log:                                                          │
│  ├─ User messages                                                   │
│  ├─ Assistant replies                                               │
│  ├─ System notices                                                  │
│  └─ Tool cards (with args + results)                                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  idle | connected | main | claude/opus-4 | think:medium | 1.2k tokens│
│                                                                     │
│  > Your message here...                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Layout Components

| Component | Description |
|-----------|-------------|
| **Header** | Connection URL, current agent, current session |
| **Chat Log** | User messages, assistant replies, system notices, tool cards |
| **Status Line** | Connection/run state (connecting, running, streaming, idle, error) |
| **Footer** | Connection state + agent + session + model + thinking level + token counts |
| **Input** | Text editor with autocomplete |

## Mental Model: Agents + Sessions

### Agents

- **Agents** are unique slugs (e.g., `main`, `research`, `coder`)
- The Gateway exposes the list of available agents
- Each agent can have multiple sessions

### Sessions

- **Sessions** belong to the current agent
- **Session keys** are stored as `agent:<agentId>:<sessionKey>`
- Session shortcuts:
  - `/session main` → expands to `agent:<currentAgent>:main`
  - `/session agent:other:main` → switches to that agent's session explicitly

### Session Scope

| Scope | Description |
|-------|-------------|
| `per-sender` (default) | Each agent has many sessions |
| `global` | TUI always uses the `global` session |

The current agent + session are always visible in the footer.

## Sending Messages & Delivery

- Messages are sent to the Gateway
- **Delivery to providers is off by default** (for safety)

### Enabling Delivery

Turn delivery on to send assistant replies to the configured channel:

```bash
# Method 1: Slash command
/deliver on

# Method 2: Settings panel
/settings

# Method 3: Start with delivery enabled
openclaw tui --deliver
```

## Pickers & Overlays

The TUI provides interactive pickers for common tasks:

| Picker | Description | Command |
|--------|-------------|---------|
| **Model Picker** | List available models and set session override | `/models` or Ctrl+L |
| **Agent Picker** | Choose a different agent | `/agents` or Ctrl+G |
| **Session Picker** | Show sessions for current agent | `/sessions` or Ctrl+P |
| **Settings** | Toggle deliver, tool output, thinking | `/settings` |
| **Action Stream** | Live action monitoring panel | `/stream` |

### Using Pickers

1. Open the picker with its command or keyboard shortcut
2. Use arrow keys to navigate
3. Type to filter/search
4. Press Enter to select, Esc to cancel

## Tool Output

- Tool calls show as **cards** with arguments and results
- **Ctrl+O** toggles between collapsed/expanded views
- Partial updates stream into the same card while tools run

### Tool Card States

| State | Description |
|-------|-------------|
| **Pending** | Tool call initiated, waiting for result |
| **Running** | Tool is executing (shows spinner) |
| **Complete** | Tool finished with result |
| **Error** | Tool execution failed |

## History & Streaming

- On connect, the TUI loads the latest history (default: 200 messages)
- Streaming responses update in place until finalized
- The TUI listens to agent tool events for richer tool cards

### History Limit

Adjust how many messages to load:

```bash
openclaw tui --history-limit 500
```

## Connection Details

- The TUI registers with the Gateway as `mode: "tui"`
- Reconnects show a system message
- Event gaps are surfaced in the log

### Connection States

| State | Description |
|-------|-------------|
| `connecting` | Establishing WebSocket connection |
| `connected` | Connection established, ready for requests |
| `disconnected` | Connection lost (check Gateway is running) |
| `idle` | No active agent run |
| `running` | Agent is processing |
| `streaming` | Receiving streamed response |
| `error` | An error occurred |

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--url <url>` | Gateway WebSocket URL | Config or `ws://127.0.0.1:<port>` |
| `--token <token>` | Gateway token (if required) | None |
| `--password <password>` | Gateway password (if required) | None |
| `--session <key>` | Session key | `main` (or `global` for global scope) |
| `--deliver` | Deliver assistant replies to provider | `off` |
| `--thinking <level>` | Override thinking level | Config default |
| `--timeout-ms <ms>` | Agent timeout in milliseconds | Config default |
| `--history-limit <n>` | History entries to load | 200 |

## Advanced Features

### Local Shell Commands

Prefix a line with `!` to run a local shell command on the TUI host:

```bash
!ls -la
!git status
!npm test
```

**Notes:**
- The TUI prompts once per session to allow local execution
- Declining keeps `!` disabled for the session
- Commands run in a fresh, non-interactive shell
- No persistent `cd` or environment between commands
- A lone `!` is sent as a normal message
- Leading spaces do not trigger local exec

### Autocomplete

The TUI provides autocomplete for:
- Slash commands
- Session keys
- Agent IDs
- File paths (in certain contexts)

Press **Tab** to autocomplete or cycle through options.

## Next Steps

- [**TUI Commands**](commands.md) - Complete reference for all slash commands
- [**Key Bindings**](keybindings.md) - All keyboard shortcuts
- [**Action Stream Panel**](action-stream.md) - Live action monitoring in TUI
- [**CLI Reference**](/cli/) - Full CLI documentation
