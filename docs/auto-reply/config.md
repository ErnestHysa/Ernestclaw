# Auto-Reply Configuration

Complete reference for configuring the Auto-Reply system.

## Configuration File

Auto-reply settings are configured in `config.yml`:

```yaml
# Basic settings
autoReply:
  enabled: true
```

## Core Settings

### Enable/Disable

```yaml
autoReply:
  enabled: true    # Enable auto-reply globally
```

To disable auto-reply for specific agents:

```yaml
agents:
  research:
    autoReply:
      enabled: false
```

---

## Trigger Settings

Control when auto-reply responds to messages.

```yaml
autoReply:
  triggers:
    # Respond to @mentions
    mention: true

    # Respond to approved senders only
    approvedSenders: true

    # Group activation mode
    groupActivation: mention    # mention | always

    # Respond to replies to bot messages
    reply: true
```

### Trigger Types

| Trigger | Description |
|---------|-------------|
| `mention` | Bot is @mentioned in the message |
| `approvedSenders` | Sender is in the allowlist |
| `reply` | Message is a reply to bot's message |
| `always` | Respond to all messages (when groupActivation is "always") |

---

## Allowlist Configuration

Control who can trigger auto-reply.

```yaml
autoReply:
  allowlist:
    # Phone numbers (WhatsApp)
    - "+1234567890"
    - "+9876543210"

    # User IDs
    - "telegram:user123"
    - "discord:user456"
    - "signal:user789"

    # Group IDs
    - "whatsapp:group-chat-id"
    - "telegram:-1001234567890"
    - "discord:guild-id:channel-id"

    # Channel-wide
    - "discord:channel-id"
```

### Allowlist Formats

| Platform | Format |
|----------|--------|
| WhatsApp | `+1234567890` or `whatsapp:+1234567890` |
| Telegram | `telegram:user_id` or `telegram:-group_id` |
| Discord | `discord:user_id` or `discord:guild_id:channel_id` |
| Signal | `signal:phone_number` |

---

## Queue Settings

Configure message queue behavior.

```yaml
autoReply:
  queue:
    # Debounce (milliseconds)
    debounceMin: 100      # Minimum debounce window
    debounceMax: 10000    # Maximum debounce window
    debounceDefault: 500  # Default debounce

    # Compaction
    compact: true         # Compact consecutive messages
    compactWindow: 5000   # Compaction time window

    # Limits
    maxSize: 100          # Maximum queue depth
    ttl: 300000           # Message time-to-live (5 min)

    # Adaptive debounce
    adaptive:
      enabled: true
      burstThreshold: 3   # Messages to trigger burst mode
      scaleFactor: 1.5    # Window multiplier per burst
```

---

## Response Settings

Configure how responses are handled.

```yaml
autoReply:
  response:
    # Streaming
    streaming: true       # Stream responses in real-time
    chunkSize: 100        # Stream chunk size (tokens)

    # Typing indicator
    typingIndicator: true    # Show "typing..." status
    typingInterval: 3000     # Typing update interval (ms)

    # Attachments
    handleImages: true    # Process image attachments
    handleAudio: true     # Process audio attachments
    handleFiles: true     # Process file attachments

    # Formatting
    formatCode: true      # Format code blocks
    formatToolOutput: true  # Format tool call results
```

---

## Model Settings

Configure default models for auto-reply.

```yaml
autoReply:
  model:
    # Default model
    provider: claude
    id: opus-4

    # Fallback model
    fallbackProvider: claude
    fallbackId: sonnet-4

    # Per-channel overrides
    channels:
      whatsapp-business:
        provider: claude
        id: sonnet-4      # Faster for WhatsApp
      discord:
        provider: claude
        id: opus-4        # Full quality for Discord
```

---

## Thinking Settings

Configure extended thinking behavior.

```yaml
autoReply:
  thinking:
    # Default thinking level
    default: medium       # off | minimal | low | medium | high

    # Thinking per provider
    providers:
      claude:
        default: medium
        max: high
      gemini:
        default: low
        max: medium
```

---

## Session Settings

Configure session behavior.

```yaml
autoReply:
  session:
    # Session key format
    keyFormat: "channel:{channelId}"   # How to build session keys

    # Session scope
    scope: per-sender    # per-sender | global | per-channel

    # Session lifecycle
    resetOnNewGroup: false    # Reset session when bot joins new group
    maxHistory: 200           # Messages to keep in history
    maxTokens: 100000         # Max tokens in context
```

---

## Channel-Specific Settings

Override settings per channel.

```yaml
channels:
  whatsapp-business:
    autoReply:
      enabled: true
      groupActivation: mention
      model:
        provider: claude
        id: sonnet-4

  telegram:
    autoReply:
      enabled: true
      groupActivation: always
      queue:
        debounceMin: 50
        debounceMax: 2000

  discord:
    autoReply:
      enabled: true
      groupActivation: mention
      response:
        formatCode: true
        streaming: true
```

---

## Command Settings

Configure command availability.

```yaml
commands:
  # Enable config command (dangerous)
  config: false

  # Enable bash command (dangerous)
  bash: false

  # Enable debug commands
  debug: false
```

---

## Error Handling

Configure error behavior.

```yaml
autoReply:
  errors:
    # Error responses
    showError: true     # Send error message to channel
    errorTemplate: "Sorry, I encountered an error: {error}"

    # Retry settings
    retryOnTimeout: true
    maxRetries: 3
    retryDelay: 5000    # Milliseconds

    # Fallback behavior
    fallbackToSafeResponse: true
    logErrors: true
```

---

## Logging

Configure logging for auto-reply.

```yaml
autoReply:
  logging:
    # Log levels
    logLevel: info       # debug | info | warn | error

    # What to log
    logIncoming: true   # Log incoming messages
    logOutgoing: true   # Log outgoing responses
    logQueue: true      # Log queue operations
    logErrors: true     # Log errors

    # Sensitive data
    sanitizeLogs: true   # Remove sensitive info from logs
```

---

## Full Example Configuration

```yaml
autoReply:
  # Core settings
  enabled: true

  # Triggers
  triggers:
    mention: true
    approvedSenders: true
    groupActivation: mention
    reply: true

  # Allowlist
  allowlist:
    - "+1234567890"
    - "telegram:user123"
    - "discord:admin-role-id"

  # Queue
  queue:
    debounceMin: 100
    debounceMax: 10000
    debounceDefault: 500
    compact: true
    maxSize: 100
    ttl: 300000
    adaptive:
      enabled: true
      burstThreshold: 3
      scaleFactor: 1.5

  # Response
  response:
    streaming: true
    typingIndicator: true
    handleImages: true
    handleAudio: true
    handleFiles: true
    formatCode: true
    formatToolOutput: true

  # Model
  model:
    provider: claude
    id: opus-4
    fallbackProvider: claude
    fallbackId: sonnet-4

  # Thinking
  thinking:
    default: medium

  # Session
  session:
    keyFormat: "channel:{channelId}"
    scope: per-sender
    maxHistory: 200
    maxTokens: 100000

  # Errors
  errors:
    showError: true
    retryOnTimeout: true
    maxRetries: 3
    retryDelay: 5000

  # Logging
  logging:
    logLevel: info
    logIncoming: true
    logOutgoing: true
    logQueue: true
    logErrors: true
    sanitizeLogs: true
```

## Per-Agent Override

Configure auto-reply differently per agent:

```yaml
agents:
  # Default agent - full auto-reply
  main:
    autoReply:
      enabled: true
      groupActivation: always

  # Research agent - mention-only
  research:
    autoReply:
      enabled: true
      groupActivation: mention
      thinking: high

  # Code agent - disabled
  coder:
    autoReply:
      enabled: false
```

## See Also

- [**Auto-Reply Overview**](index.md) - Auto-reply system introduction
- [**Commands Reference**](commands.md) - Command documentation
- [**Queue Management**](queue.md) - Queue configuration
- [**Configuration Reference**](/reference/config) - Full config reference
