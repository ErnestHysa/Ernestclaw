# Auto-Reply Commands Reference

Complete reference for all slash commands available in the Auto-Reply system.

## Command Overview

Auto-reply supports **slash commands** that can be sent via any connected channel:

- **WhatsApp**: `/help`, `/status`, etc.
- **Telegram**: `/help`, `/status`, etc.
- **Discord**: `/help`, `/status`, etc.
- **And all other supported channels**

## Status Commands

### `/help`

Display available commands and brief descriptions.

```
/help
```

**Output:** Lists all available commands for the current channel.

---

### `/commands`

List all available slash commands.

```
/commands
```

**Output:** Comprehensive command list with categories.

---

### `/status`

Display current system status.

```
/status
```

**Output includes:**
- Connection status
- Active agent
- Model information
- Queue status
- Recent errors

---

### `/context`

Explain how context is built and used.

```
/context
```

**Optional arguments:**
- `tokens` - Show token count
- `summary` - Show condensed summary
- `full` - Show full context details

## Control Commands

### `/model`

Change the AI model for the current session.

```
/model claude/opus-4
/model openai/gpt-4
/model gemini/pro
```

**Format:** `<provider>/<model-id>`

**Use `/models` to see available models.**

---

### `/models`

Display available models with provider information.

```
/models
```

**Output includes:**
- Model ID
- Provider
- Current selection indicator

---

### `/think`

Set thinking level for Claude models.

```
/think high
/think medium
/think low
/think minimal
/think off
```

| Level | Description |
|-------|-------------|
| `high` | Maximum extended thinking |
| `medium` | Balanced thinking (recommended) |
| `low` | Light thinking |
| `minimal` | Brief thinking for complex tasks only |
| `off` | No extended thinking |

---

### `/verbose`

Control verbosity of agent responses.

```
/verbose on
/verbose full
/verbose off
```

| Level | Description |
|-------|-------------|
| `on` | Show detailed responses |
| `full` | Maximum verbosity |
| `off` | Concise responses |

---

### `/reasoning`

Control reasoning output for capable models.

```
/reasoning on
/reasoning off
/reasoning stream
```

## Queue Commands

### `/queue`

Show queue status.

```
/queue
```

**Output includes:**
- Pending message count
- Current run status
- Recent queue activity

---

### `/queue-info`

Show detailed queue information.

```
/queue-info
```

**Output includes:**
- Queue depth
- Processing rate
- Average wait time
- Error counts

---

### `/abort`

Abort the currently active agent run.

```
/abort
```

**Effect:** Stops the current run and clears the queue.

---

### `/approve`

Approve or deny execution requests.

```
/approve <request-id>
/approve <request-id> allow-once
/approve <request-id> deny
```

## Session Commands

### `/session`

Switch to a different session.

```
/session main
/session research
```

**Effect:** Changes the active session for the conversation.

---

### `/new`

Create a new session with cleared history.

```
/new
```

**Effect:** Starts fresh with no previous context.

---

### `/reset`

Reset the current session.

```
/reset
```

**Effect:** Clears conversation history for the current session.

---

## Tools Commands

### `/skill`

Run a skill by name.

```
/skill <name> [input]
```

**Examples:**
```
/skill web-search What is the capital of France?
/skill calculate 25 * 37
/skill weather Paris
```

---

### `/bash`

Execute a bash command (if enabled).

```
/bash <command>
```

**Note:** Requires `commands.bash: true` in config.

---

### `/compact`

Compact consecutive user messages.

```
/compact
```

**Effect:** Groups your last messages into a single context entry.

---

## Media Commands

### `/tts`

Control text-to-speech.

```
/tts on
/tts off
/tts voice
```

**Options:**
- `on` - Enable TTS for responses
- `off` - Disable TTS
- `voice` - Read response as voice note

---

### `/voice`

Alias for `/tts voice`.

```
/voice
```

**Effect:** Sends the next response as a voice note.

---

## Configuration Commands

### `/config`

View or edit configuration (if enabled).

```
/config
/config get <key>
/config set <key> <value>
```

**Note:** Requires `commands.config: true` in config.

---

### `/allowlist`

Manage allowlist entries.

```
/allowlist
/allowlist add <identifier>
/allowlist remove <identifier>
```

**Identifiers:**
- Phone numbers: `+1234567890`
- User IDs: `telegram:user123`
- Group IDs: `whatsapp:group-id`

---

## Channel Dock Commands

Switch active reply channel:

```
/dock-telegram
/dock-whatsapp
/dock-discord
/dock-signal
```

**Effect:** Subsequent replies go to the specified channel.

---

## Quick Reference

| Command | Description | Args |
|---------|-------------|------|
| `/help` | Show help | - |
| `/commands` | List commands | - |
| `/status` | Show status | - |
| `/context` | Explain context | - |
| `/model` | Set model | `<provider/model>` |
| `/models` | List models | - |
| `/think` | Set thinking | `<level>` |
| `/verbose` | Set verbosity | `<level>` |
| `/reasoning` | Set reasoning | `<mode>` |
| `/queue` | Queue status | - |
| `/queue-info` | Queue details | - |
| `/abort` | Abort run | - |
| `/approve` | Approve exec | `<id>` |
| `/session` | Switch session | `<key>` |
| `/new` | New session | - |
| `/reset` | Reset session | - |
| `/skill` | Run skill | `<name> [input]` |
| `/bash` | Run command | `<cmd>` |
| `/compact` | Compact messages | - |
| `/tts` | Control TTS | `<mode>` |
| `/voice` | Voice reply | - |
| `/config` | Edit config | `<key> <val>` |
| `/allowlist` | Manage allowlist | `<cmd> <id>` |

## Inline Directives

Commands can be embedded in messages:

```
/model=gpt-4 Explain quantum physics
/think=high What is the meaning of life?
```

## Command Aliases

Some commands have aliases:

| Command | Aliases |
|---------|---------|
| `/voice` | `/tts voice` |
| `/dock-telegram` | `/dock_telegram` |
| `/reset` | `/new` (in some contexts) |

## See Also

- [**Auto-Reply Overview**](index.md) - Auto-reply system introduction
- [**Queue Management**](queue.md) - Queue operations
- [**Configuration**](config.md) - Config reference
- [**Slash Commands**](/tools/slash-commands) - Command development
