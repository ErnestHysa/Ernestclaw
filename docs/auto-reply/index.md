---
summary: "Auto-Reply: automatic agent responses to channel messages"
read_when:
  - You want to understand how auto-reply works
  - You need to configure auto-reply behavior
  - You want to customize triggers and commands
---

# Auto-Reply System

The **Auto-Reply System** enables automatic agent responses to messages received from connected channels (WhatsApp, Telegram, Discord, etc.). It provides intelligent message filtering, command detection, queue management, and flexible response handling.

## Overview

Auto-reply monitors incoming messages from all connected channels and:

1. **Detects commands** in messages (e.g., `/help`, `/status`)
2. **Evaluates triggers** (mentions, approved senders, group activation)
3. **Queues messages** for processing when the agent is available
4. **Routes to agents** based on configuration
5. **Handles responses** with streaming and status updates

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Channel        │────>│  Auto-Reply     │────>│  Agent Runner   │
│  (WhatsApp/TG)  │     │  Dispatcher     │     │  (Claude/GPT)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Queue Manager  │
                        │  (Debounce)     │
                        └─────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **Dispatcher** | Receives channel events and routes to handlers |
| **Command Detection** | Identifies slash commands in messages |
| **Trigger Evaluation** | Determines if agent should respond |
| **Queue Manager** | Debounces and queues incoming messages |
| **Agent Runner** | Executes agents and streams responses |

## Message Flow

```
1. Channel Event Received
       │
       ▼
2. Command Detection
   ├─ Is this a command? → Handle directly
   └─ Not a command → Continue
       │
       ▼
3. Trigger Evaluation
   ├─ Is sender approved? → Queue message
   ├─ Is bot mentioned? → Queue message
   └─ Is group activation on? → Queue message
       │
       ▼
4. Queue Management
   ├─ Adaptive debounce (100ms-10s)
   └─ Compact consecutive user messages
       │
       ▼
5. Agent Execution
   ├─ Build context (history, metadata)
   ├─ Run agent with streaming
   └─ Handle response/attachments
```

## Triggers

Auto-reply responds to messages based on these triggers:

| Trigger | Description |
|---------|-------------|
| **Direct Message** | Messages in 1:1 conversations |
| **Mention** | @botname in group chats |
| **Reply** | Reply to bot's message |
| **Approved Sender** | Allowlisted users/groups |
| **Group Activation** | When activation mode is "always" |

## Command Detection

Auto-reply detects commands at the **start of messages**:

```
/help                    → Show help
/status                  → Show status
/model claude/opus-4     → Change model
/think high              → Set thinking level
```

### Command Categories

| Category | Commands |
|----------|----------|
| **Status** | `/help`, `/status`, `/commands`, `/context` |
| **Control** | `/model`, `/think`, `/verbose`, `/reasoning` |
| **Queue** | `/queue`, `/approve`, `/abort` |
| **Sessions** | `/session`, `/new`, `/reset` |
| **Tools** | `/skill`, `/bash`, `/compact` |
| **Media** | `/tts`, `/voice` |
| **Config** | `/config` (if enabled) |
| **Docks** | `/dock-telegram`, `/dock-whatsapp`, etc. |

See [**Commands Reference**](commands.md) for complete command list.

## Queue Management

Auto-reply uses intelligent queue management to handle message bursts:

### Adaptive Debouncing

- **Burst detection**: Rapid messages are grouped
- **Adaptive window**: 100ms minimum, up to 10s for active streams
- **Compaction**: Consecutive user messages are combined

### Queue States

| State | Description |
|-------|-------------|
| `queued` | Message waiting to be processed |
| `processing` | Agent is running |
| `delivered` | Response sent to channel |
| `error` | Processing failed |

### Queue Commands

```
/queue              → Show queue status
/queue info         → Show detailed queue info
/abort              → Abort current run
/approve <id>       → Approve exec request
```

See [**Queue Management**](queue.md) for details.

## Configuration

### Basic Settings

```yaml
# config.yml
autoReply:
  enabled: true

  # Trigger settings
  triggers:
    mention: true          # Respond to @mentions
    approvedSenders: true  # Use allowlist
    groupActivation: mention  # mention | always

  # Queue settings
  queue:
    debounceMin: 100      # Min debounce (ms)
    debounceMax: 10000    # Max debounce (ms)
    compact: true         # Compact consecutive messages

  # Response settings
  streaming: true         # Stream responses
    typingIndicator: true # Show "typing..." status
```

### Allowlist Configuration

Control who can trigger auto-reply:

```yaml
autoReply:
  allowlist:
    # Phone numbers (WhatsApp)
    - "+1234567890"

    # User IDs (Telegram, Discord)
    - "telegram:user123"
    - "discord:user456"

    # Group IDs
    - "whatsapp:group-chat-id"
    - "telegram:-100123456789"

    # Channels
    - "discord:channel-id"
```

### Per-Agent Settings

Configure auto-reply behavior per agent:

```yaml
agents:
  main:
    autoReply:
      enabled: true
      model: claude/opus-4
      thinking: medium
      deliver: true

  research:
    autoReply:
      enabled: true
      model: claude/sonnet-4
      thinking: high
      triggerOnMention: false  # Always active
```

## Response Handling

### Streaming Responses

Auto-reply streams agent responses in real-time:

1. **Initial response** with immediate acknowledgment
2. **Streaming tokens** as agent generates
3. **Tool cards** for tool executions
4. **Final message** with completion status

### Attachments

Auto-reply handles file attachments:

- **Images**: Transcribed and included in context
- **Documents**: Staged in sandbox workspace
- **Audio**: Transcribed when TTS is configured

### Error Handling

| Error Type | Behavior |
|------------|----------|
| Agent timeout | Send error message, keep session |
| Rate limit | Queue for retry |
| Network error | Retry with exponential backoff |
| Invalid command | Show usage/help message |

## Advanced Features

### Directives in Messages

Control behavior inline with messages:

```
/model=gpt-4 What is the capital of France?
/think=high Explain quantum physics
```

### Group Activation Modes

| Mode | Description |
|------|-------------|
| `mention` | Only respond to @mentions (safer) |
| `always` | Respond to all messages (chatty) |

### Per-Channel Overrides

Different behavior per channel:

```yaml
channels:
  whatsapp-business:
    autoReply:
      enabled: true
      groupActivation: always

  telegram:
    autoReply:
      enabled: true
      groupActivation: mention
```

## Troubleshooting

### Auto-Reply Not Responding

1. Check agent is running: `/status`
2. Verify auto-reply is enabled
3. Check allowlist configuration
4. Review logs: `openclaw logs --follow`

### Commands Not Working

1. Verify command is enabled in config
2. Check command syntax
3. Review permissions for sender
4. Test with `/help` command

### Queue Backed Up

1. Check agent health
2. Consider increasing timeout
3. Review message rate
4. Use `/abort` if needed

## Next Steps

- [**Commands Reference**](commands.md) - All available commands
- [**Queue Management**](queue.md) - Queue operations and monitoring
- [**Configuration**](config.md) - Detailed configuration options
- [**Slash Commands**](/tools/slash-commands) - Command development
