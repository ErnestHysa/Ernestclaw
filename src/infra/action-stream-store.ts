// src/infra/action-stream-store.ts
import type { ActionStreamEvent, ActionStreamFilter } from "./action-stream-types.js";

export type ActionStreamStoreOpts = {
  /** Maximum number of events to keep in memory (circular buffer) */
  maxSize?: number;
};

export type ActionStreamStore = {
  /** Add an event to the store */
  add: (evt: ActionStreamEvent) => void;
  /** Get an event by ID */
  get: (id: string) => ActionStreamEvent | undefined;
  /** Get all events in the store */
  getAll: () => ActionStreamEvent[];
  /** Query events with filter */
  query: (filter: ActionStreamFilter) => ActionStreamEvent[];
  /** Get recent events (newest first) */
  getRecent: (limit: number) => ActionStreamEvent[];
  /** Get all events for a specific run ID */
  getByRunId: (runId: string) => ActionStreamEvent[];
  /** Clear all events */
  clear: () => void;
  /** Subscribe to new events */
  onEvent: (listener: (evt: ActionStreamEvent) => void) => () => void;
  /** Get current size */
  size: () => number;
};

/** Create an in-memory action stream store with circular buffer behavior */
export function createActionStreamStore(opts: ActionStreamStoreOpts = {}): ActionStreamStore {
  const maxSize = opts.maxSize ?? 500;
  const events = new Map<string, ActionStreamEvent>();
  const insertionOrder: string[] = [];
  const listeners = new Set<(evt: ActionStreamEvent) => void>();

  const add: ActionStreamStore["add"] = (evt) => {
    const isNewEvent = !events.has(evt.id);

    // If we're at max size and this is a new event, remove oldest
    if (isNewEvent && events.size >= maxSize) {
      const oldestId = insertionOrder.shift();
      if (oldestId) {
        events.delete(oldestId);
      }
    }

    // Update or add the event
    if (isNewEvent) {
      events.set(evt.id, evt);
      insertionOrder.push(evt.id);
    } else {
      // Update existing event in place
      events.set(evt.id, evt);
    }

    // Notify listeners
    for (const listener of listeners) {
      try {
        listener(evt);
      } catch (err) {
        console.error(`[action-stream] listener error:`, err);
      }
    }
  };

  const get: ActionStreamStore["get"] = (id) => {
    return events.get(id);
  };

  const getAll: ActionStreamStore["getAll"] = () => {
    return Array.from(events.values());
  };

  const query: ActionStreamStore["query"] = (filter) => {
    let result = getAll();

    if (filter.types && filter.types.length > 0) {
      const typeSet = new Set(filter.types);
      result = result.filter((e) => typeSet.has(e.type));
    }

    if (filter.runId) {
      result = result.filter((e) => e.runId === filter.runId);
    }

    if (filter.sessionKey) {
      result = result.filter((e) => e.sessionKey === filter.sessionKey);
    }

    if (filter.afterMs) {
      result = result.filter((e) => e.timestamp >= filter.afterMs!);
    }

    if (filter.beforeMs) {
      result = result.filter((e) => e.timestamp <= filter.beforeMs!);
    }

    // Sort by timestamp descending
    result.sort((a, b) => b.timestamp - a.timestamp);

    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  };

  const getRecent: ActionStreamStore["getRecent"] = (limit) => {
    return getAll()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  };

  const getByRunId: ActionStreamStore["getByRunId"] = (runId) => {
    return getAll().filter((e) => e.runId === runId);
  };

  const clear: ActionStreamStore["clear"] = () => {
    events.clear();
    insertionOrder.length = 0;
  };

  const onEvent: ActionStreamStore["onEvent"] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const size: ActionStreamStore["size"] = () => events.size;

  return {
    add,
    get,
    getAll,
    query,
    getRecent,
    getByRunId,
    clear,
    onEvent,
    size,
  };
}

/** Global singleton instance (initialized in gateway) */
let globalStore: ActionStreamStore | null = null;

export function getGlobalActionStreamStore(): ActionStreamStore | null {
  return globalStore;
}

export function initGlobalActionStreamStore(opts?: ActionStreamStoreOpts): ActionStreamStore {
  if (!globalStore) {
    globalStore = createActionStreamStore(opts);
  }
  return globalStore;
}

export function resetGlobalActionStreamStoreForTest(): void {
  globalStore = null;
}
