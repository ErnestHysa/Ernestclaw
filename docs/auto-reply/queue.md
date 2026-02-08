# Queue Management

The Auto-Reply queue manages incoming messages and ensures orderly processing by the agent.

## Overview

The queue handles message bursts, debounces rapid messages, and ensures the agent processes requests efficiently.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Incoming   │ -> │  Queue      │ -> │  Agent      │
│  Messages   │    │  (Debounce) │    │  Runner     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Queue States

| State | Description |
|-------|-------------|
| **queued** | Message waiting in queue |
| **processing** | Agent is running |
| **delivered** | Response sent to channel |
| **error** | Processing failed |
| **aborted** | Cancelled by user |

## Adaptive Debouncing

The queue uses adaptive debouncing to handle message bursts efficiently:

### How It Works

1. **Burst Detection**: Rapid messages (within 100ms) are grouped
2. **Adaptive Window**: Debounce time scales with activity
   - Minimum: 100ms
   - Maximum: 10 seconds
3. **Compaction**: Consecutive messages from the same user are combined

### Debounce Behavior

| Scenario | Behavior |
|----------|----------|
| Single message | Process immediately |
| Quick burst (2-5 messages) | Group and process together |
| Rapid stream (10+ messages) | Extend debounce window |
| During active run | Extend debounce until completion |

## Queue Commands

### `/queue`

Show current queue status.

```
/queue
```

**Output:**
```
Queue Status:
- Pending: 3 messages
- Processing: 1 message
- Last processed: 2 seconds ago
- Debounce window: 500ms
```

---

### `/queue-info`

Show detailed queue statistics.

```
/queue-info
```

**Output:**
```
Queue Statistics:
- Total queued: 1,234
- Total processed: 1,200
- Total errors: 12
- Average wait: 850ms
- Processing rate: 12.5 msg/min
```

---

### `/abort`

Abort the currently active run and clear the queue.

```
/abort
```

**Effects:**
- Stops the current agent run
- Clears pending messages
- Resets debounce window

**Warning:** Cannot be undone - queued messages are lost.

## Queue Monitoring

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| `🟤 idle` | No active processing |
| `🟡 processing` | Agent is running |
| `🔴 error` | Processing failed |
| `⚪ queued` | Messages waiting |

### Queue Depth

Monitor queue depth to detect issues:

| Depth | Status | Action |
|-------|--------|--------|
| 0-5 | Normal | None |
| 5-20 | Busy | Monitor |
| 20-50 | Backed up | Consider scaling |
| 50+ | Critical | Investigate immediately |

## Message Compaction

Consecutive messages from the same user are compacted:

```
User: Hello
User: How are you?
User: I have a question

[Compacted to]

User: Hello
User: How are you?
User: I have a question
```

This reduces token usage and improves context coherence.

### Compaction Triggers

- Same sender
- Within debounce window
- No response from agent
- No tool calls between messages

## Configuration

### Queue Settings

```yaml
autoReply:
  queue:
    # Debounce settings
    debounceMin: 100      # Minimum debounce (ms)
    debounceMax: 10000    # Maximum debounce (ms)
    debounceDefault: 500  # Default debounce (ms)

    # Compaction settings
    compact: true         # Enable compaction
    compactWindow: 5000   # Compaction window (ms)

    # Queue limits
    maxSize: 100          # Maximum queue depth
    ttl: 300000           # Message TTL (ms, 5 min)
```

### Adaptive Debounce Config

```yaml
autoReply:
  queue:
    adaptive:
      enabled: true
      burstThreshold: 3   # Messages to trigger burst mode
      scaleFactor: 1.5    # Debounce multiplier per burst
      maxExtensions: 5     # Maximum debounce extensions
```

## Troubleshooting

### Queue Not Processing

**Symptoms:** Messages queued but not processed

**Solutions:**
1. Check agent status: `/status`
2. Verify auto-reply enabled
3. Check for errors in logs
4. Try `/abort` to clear stuck state

### Slow Processing

**Symptoms:** Long wait times, backed-up queue

**Solutions:**
1. Check queue depth: `/queue-info`
2. Review agent performance
3. Consider faster model
4. Reduce message complexity

### Messages Lost

**Symptoms:** Messages not appearing in responses

**Solutions:**
1. Check compaction settings
2. Verify message filters
3. Review allowlist
4. Check channel logs

### Debounce Too Long

**Symptoms:** Delayed responses to messages

**Solutions:**
1. Reduce `debounceMax`
2. Lower `burstThreshold`
3. Disable adaptive debounce
4. Use `/abort` to force immediate processing

## Performance Tuning

### For High-Volume Channels

```yaml
autoReply:
  queue:
    debounceMin: 50       # Faster initial response
    debounceMax: 2000     # Shorter max window
    compact: true         # Always compact
    maxSize: 500          # Larger queue
```

### For Interactive Chats

```yaml
autoReply:
  queue:
    debounceMin: 100      # Standard debounce
    debounceMax: 500      # Short max for responsiveness
    compact: false        # Preserve message boundaries
```

### For Background Processing

```yaml
autoReply:
  queue:
    debounceMin: 500      # Longer debounce
    debounceMax: 30000    # Much longer max
    compact: true         # Aggressive compaction
    maxSize: 1000         # Large batch processing
```

## See Also

- [**Auto-Reply Overview**](index.md) - Auto-reply system introduction
- [**Commands Reference**](commands.md) - Queue-related commands
- [**Configuration**](config.md) - Full configuration options
