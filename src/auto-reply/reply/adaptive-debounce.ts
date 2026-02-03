export interface MessagePattern {
  avgInterval: number;
  count: number;
  startTime: number;
  isPasting: boolean;
}

export interface AdaptiveDebounceConfig {
  pasteDetectionMs: number;
  typingThresholdMs: number;
  learningEnabled: boolean;
  historySize: number;
}

const DEFAULT_CONFIG: AdaptiveDebounceConfig = {
  pasteDetectionMs: 300, // Messages <300ms apart = pasting
  typingThresholdMs: 1500, // Messages >1500ms apart = typing
  learningEnabled: true,
  historySize: 10, // Track last 10 messages
};

const patternHistory = new Map<string, MessagePattern[]>();

export function recordMessage(chatId: string, timestamp: number): void {
  let patterns = patternHistory.get(chatId);

  if (!patterns) {
    patterns = [];
    patternHistory.set(chatId, patterns);
  }

  // Use the provided timestamp instead of Date.now() for accurate timing
  const now = timestamp;

  // Add new pattern entry
  const lastPattern = patterns[patterns.length - 1];

  if (lastPattern) {
    // Calculate interval from last message
    const elapsed = now - lastPattern.startTime;
    const newCount = lastPattern.count + 1;
    const newAvgInterval = ((lastPattern.avgInterval * (lastPattern.count - 1)) + elapsed) / newCount;

    patterns.push({
      avgInterval: newAvgInterval,
      count: newCount,
      startTime: lastPattern.startTime,
      isPasting: detectPasting(elapsed, newAvgInterval),
    });
  } else {
    // First message in sequence
    patterns.push({
      avgInterval: 0,
      count: 1,
      startTime: now,
      isPasting: false,
    });
  }

  // Keep only recent patterns
  if (patterns.length > DEFAULT_CONFIG.historySize) {
    patterns.splice(0, patterns.length - DEFAULT_CONFIG.historySize);
  }
}

function detectPasting(elapsed: number, avgInterval: number): boolean {
  // Pasting: very fast messages (<300ms gap)
  return elapsed < DEFAULT_CONFIG.pasteDetectionMs;
}

export function analyzePattern(chatId: string): {
  isPasting: boolean;
  suggestedDebounceMs: number;
  messageCount: number;
} {
  const patterns = patternHistory.get(chatId) || [];

  if (patterns.length === 0) {
    return { isPasting: false, suggestedDebounceMs: 500, messageCount: 0 };
  }

  const latest = patterns[patterns.length - 1];
  const isPasting = latest.isPasting;

  // Suggested debounce: slightly longer than paste duration
  let suggestedMs = DEFAULT_CONFIG.typingThresholdMs; // Default for typing
  if (isPasting) {
    suggestedMs = Math.max(latest.avgInterval * latest.count + 500, DEFAULT_CONFIG.typingThresholdMs);
  }

  return {
    isPasting,
    suggestedDebounceMs: suggestedMs,
    messageCount: latest.count,
  };
}

export function getAdaptiveDebounceMs(
  chatId: string,
  defaultDebounceMs: number,
  config?: Partial<AdaptiveDebounceConfig>,
): number {
  const analysis = analyzePattern(chatId);
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.learningEnabled) {
    return defaultDebounceMs;
  }

  // If we detect pasting, use extended debounce
  if (analysis.isPasting && analysis.messageCount >= 2) {
    // Use longer debounce for pasting (merge more messages)
    return Math.max(analysis.suggestedDebounceMs, defaultDebounceMs);
  }

  // Otherwise use default
  return defaultDebounceMs;
}

export function resetPattern(chatId: string): void {
  patternHistory.delete(chatId);
}

export function clearAllPatterns(): void {
  patternHistory.clear();
}
