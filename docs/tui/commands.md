# TUI Commands Reference

Complete reference for all slash commands available in the Terminal UI.

## Core Commands

### `/help`

Display help text with available commands and current model info.

```bash
/help
```

**Output includes:**
- Available slash commands
- Current model provider and ID
- Thinking level options for the current model

---

### `/status`

Display current Gateway status including health, agents, and active runs.

```bash
/status
```

**Output includes:**
- Gateway connection status
- Active agent runs
- Model availability
- System health check

---

### `/agent <id>` / `/agents`

Switch to a different agent or open the agent picker.

```bash
# Switch to specific agent
/agent research

# Open agent picker
/agents
```

**Without arguments:** Opens interactive agent picker

**With argument:** Switches directly to specified agent

---

### `/session <key>` / `/sessions`

Switch to a different session or open the session picker.

```bash
# Switch to specific session (expanded)
/session main
# Expands to: agent:<currentAgent>:main

# Switch to specific agent session explicitly
/session agent:research:main

# Open session picker
/sessions
```

**Session Key Formats:**
- `main` → `agent:<currentAgent>:main`
- `agent:other:main` → Switches to different agent's session
- `global` → Uses global session (if scope is global)

---

### `/model <provider/model>` / `/models`

Set the session model override or open the model picker.

```bash
# Set specific model
/model claude/opus-4
/model openai/gpt-4

# Open model picker
/models
```

**Format:** `<provider>/<model-id>`

---

## Session Controls

### `/think <level>`

Set the thinking level for Claude models.

```bash
/think medium
```

**Available levels:** `off`, `minimal`, `low`, `medium`, `high`

**Level descriptions:**
| Level | Description |
|-------|-------------|
| `off` | No extended thinking |
| `minimal` | Brief thinking for complex tasks |
| `low` | Light thinking |
| `medium` | Balanced thinking (recommended) |
| `high` | Maximum thinking for complex reasoning |

---

### `/verbose <level>`

Set verbosity level for responses.

```bash
/verbose on
/verbose full
/verbose off
```

**Levels:** `on`, `full`, `off`

---

### `/reasoning <level>`

Control reasoning output for models that support it.

```bash
/reasoning on
/reasoning off
/reasoning stream
```

**Levels:** `on`, `off`, `stream`

---

### `/usage <mode>`

Control token usage display in the footer.

```bash
/usage off
/usage tokens
/usage full
```

**Modes:**
| Mode | Description |
|------|-------------|
| `off` | Hide token usage |
| `tokens` | Show token counts only |
| `full` | Show tokens + cost estimate |

---

### `/elevated <level>` / `/elev`

Control elevated permissions for tool execution.

```bash
/elevated on
/elevated off
/elevated ask
/elevated full
```

**Levels:**
| Level | Description |
|-------|-------------|
| `off` | No elevated permissions |
| `on` | Elevated permissions enabled |
| `ask` | Prompt before elevated actions |
| `full` | Full elevated permissions |

---

### `/activation <mode>`

Control how group agents are activated.

```bash
/activation mention
/activation always
```

**Modes:**
| Mode | Description |
|------|-------------|
| `mention` | Activate on @mention only |
| `always` | Activate on any message |

---

### `/deliver <state>`

Control delivery of assistant replies to the configured channel.

```bash
/deliver on
/deliver off
```

**When enabled:** Assistant messages are sent to the channel (WhatsApp, Telegram, etc.)

**When disabled:** Messages stay in the session only (safer for testing)

---

## Session Lifecycle

### `/new` / `/reset`

Reset the current session, clearing all conversation history.

```bash
/new
# or
/reset
```

**Effects:**
- Clears chat history for the current session
- Resets token counts
- Session key remains the same

---

### `/abort`

Abort the currently active agent run.

```bash
/abort
```

**Keyboard shortcut:** Press `Esc` to abort

---

### `/settings`

Open the settings panel to toggle TUI options.

```bash
/settings
```

**Settings available:**
| Setting | Options | Description |
|---------|---------|-------------|
| Tool output | `collapsed` / `expanded` | Default tool card display |
| Show thinking | `on` / `off` | Show thinking in chat log |

---

## Panels & Views

### `/stream`

Open the **Live Action Stream** panel for real-time system monitoring.

```bash
/stream
```

**Features:**
- Real-time action monitoring
- Filter by type (agent, cron, browser, skills, channels)
- Auto-refresh every second
- Keyboard controls: `r` (refresh), `f` (filter), `q` (quit)

See [Action Stream Panel](action-stream.md) for details.

---

### `/exit` / `/quit`

Exit the TUI.

```bash
/exit
# or
/quit
```

**Keyboard shortcuts:** `Ctrl+C` (twice) or `Ctrl+D`

---

## Other Gateway Commands

Any unrecognized slash command is forwarded to the Gateway for processing.

```bash
# Examples of Gateway-forwarded commands
/context
/queue
/queue-info
```

See [Slash Commands](/tools/slash-commands) for a complete list of Gateway commands.

---

## Command Summary Table

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/help` | - | Show help and model info |
| `/status` | - | Show Gateway status |
| `/agent` | `<id>` | Switch agent or open picker |
| `/agents` | - | Open agent picker |
| `/session` | `<key>` | Switch session or open picker |
| `/sessions` | - | Open session picker |
| `/model` | `<provider/model>` | Set model or open picker |
| `/models` | - | Open model picker |
| `/think` | `<level>` | Set thinking level |
| `/verbose` | `<level>` | Set verbosity |
| `/reasoning` | `<level>` | Set reasoning mode |
| `/usage` | `<mode>` | Set token usage display |
| `/elevated` | `<level>` | Set elevated permissions |
| `/activation` | `<mode>` | Set group activation |
| `/deliver` | `<state>` | Toggle message delivery |
| `/new` | - | Reset session |
| `/reset` | - | Reset session |
| `/abort` | - | Abort active run |
| `/settings` | - | Open settings panel |
| `/stream` | - | Open action stream panel |
| `/exit` | - | Exit TUI |
| `/quit` | - | Exit TUI |

---

## See Also

- [**TUI Overview**](index.md) - TUI introduction and concepts
- [**Key Bindings**](keybindings.md) - Keyboard shortcuts
- [**Action Stream Panel**](action-stream.md) - Live monitoring
