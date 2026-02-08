// src/infra/token-tracker.ts
/** Token pricing (approximate, in USD per 1M tokens) */
const TOKEN_PRICING: Record<string, { prompt: number; completion: number }> = {
  "openai/gpt-4": { prompt: 30, completion: 60 },
  "openai/gpt-4-turbo": { prompt: 10, completion: 30 },
  "openai/gpt-3.5-turbo": { prompt: 0.5, completion: 1.5 },
  "anthropic/claude-3-opus": { prompt: 15, completion: 75 },
  "anthropic/claude-3-sonnet": { prompt: 3, completion: 15 },
  "google/gemini-pro": { prompt: 0.5, completion: 1.5 },
};

export type TokenUsageRecord = {
  runId: string;
  sessionKey?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  provider: string;
  timestamp: number;
  costUsd?: number;
};

/** Internal type that tracks insertion order for stable sorting */
type InternalTokenUsageRecord = TokenUsageRecord & { _insertionOrder: number };

export type UsageSummary = {
  totalTokens: number;
  totalCost: number;
  runCount: number;
};

export type TokenTracker = {
  recordUsage: (usage: Omit<TokenUsageRecord, "timestamp">) => void;
  getUsageForRun: (runId: string) => TokenUsageRecord | undefined;
  getUsageByProvider: () => Record<string, UsageSummary>;
  getTotalCost: () => number;
  getRecentUsage: (limit: number) => TokenUsageRecord[];
  clear: () => void;
};

function calculateCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const key = `${provider}/${model}`;
  const pricing = TOKEN_PRICING[key] || TOKEN_PRICING[provider];

  if (!pricing) {
    // Default to generic pricing
    return (promptTokens * 0.001 + completionTokens * 0.002) / 1_000_000;
  }

  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1_000_000;
}

export function createTokenTracker(): TokenTracker {
  const records = new Map<string, InternalTokenUsageRecord>();
  // Track insertion order for stable sorting when timestamps are equal
  let insertionCounter = 0;

  const recordUsage: TokenTracker["recordUsage"] = (usage) => {
    const totalTokens = usage.totalTokens ?? usage.promptTokens + usage.completionTokens;
    const internalRecord: InternalTokenUsageRecord = {
      ...usage,
      totalTokens,
      timestamp: Date.now(),
      costUsd: usage.costUsd ?? calculateCost(
        usage.provider,
        usage.model,
        usage.promptTokens,
        usage.completionTokens
      ),
      _insertionOrder: insertionCounter++,
    };

    records.set(internalRecord.runId, internalRecord);
  };

  const getUsageForRun: TokenTracker["getUsageForRun"] = (runId) => {
    const internalRecord = records.get(runId);
    if (!internalRecord) return undefined;
    // Return a clean TokenUsageRecord without the internal _insertionOrder property
    const { _insertionOrder, ...record } = internalRecord;
    return record;
  };

  const getUsageByProvider: TokenTracker["getUsageByProvider"] = () => {
    const byProvider: Record<string, UsageSummary> = {};

    for (const record of records.values()) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = {
          totalTokens: 0,
          totalCost: 0,
          runCount: 0,
        };
      }
      const summary = byProvider[record.provider];
      summary.totalTokens += record.totalTokens;
      summary.totalCost += record.costUsd ?? 0;
      summary.runCount += 1;
    }

    return byProvider;
  };

  const getTotalCost: TokenTracker["getTotalCost"] = () => {
    let total = 0;
    for (const record of records.values()) {
      total += record.costUsd ?? 0;
    }
    return total;
  };

  const getRecentUsage: TokenTracker["getRecentUsage"] = (limit) => {
    return Array.from(records.entries())
      .sort(([, a], [, b]) => {
        // First sort by timestamp descending
        const timeDiff = b.timestamp - a.timestamp;
        if (timeDiff !== 0) return timeDiff;
        // Then by insertion order descending (most recent first)
        return b._insertionOrder - a._insertionOrder;
      })
      .slice(0, limit)
      .map(([, internalRecord]) => {
        // Return clean TokenUsageRecord without the internal _insertionOrder property
        const { _insertionOrder, ...record } = internalRecord;
        return record;
      });
  };

  const clear: TokenTracker["clear"] = () => {
    records.clear();
    insertionCounter = 0;
  };

  return {
    recordUsage,
    getUsageForRun,
    getUsageByProvider,
    getTotalCost,
    getRecentUsage,
    clear,
  };
}

let globalTracker: TokenTracker | null = null;

export function getGlobalTokenTracker(): TokenTracker | null {
  return globalTracker;
}

export function initGlobalTokenTracker(): TokenTracker {
  if (!globalTracker) {
    globalTracker = createTokenTracker();
  }
  return globalTracker;
}

export function resetGlobalTokenTracker(): void {
  globalTracker = null;
}
