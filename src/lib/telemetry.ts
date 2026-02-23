/**
 * telemetry.ts
 *
 * Simple in-memory telemetry store for the docs search MVP.
 *
 * Events are kept in two circular buffers (one per event type) so memory
 * usage is bounded regardless of traffic.  On server restart all history is
 * lost — this is intentional for a prototype; a production implementation
 * would persist to a database or streaming pipeline.
 *
 * Exported functions are called by the API route handlers, not by the
 * client directly.
 */

import type {
  ResultSelectedEvent,
  SearchPerformedEvent,
  TelemetryEvent,
} from "./types";

// ---------------------------------------------------------------------------
// Circular buffer
// ---------------------------------------------------------------------------

/**
 * Fixed-capacity ring buffer that overwrites the oldest entry when full.
 *
 * Guarantees O(1) push and O(N) iteration.  Memory usage is bounded by
 * `capacity` regardless of total event volume, making it suitable for a
 * long-running server process.
 */
class CircularBuffer<T> {
  private buf: T[] = [];
  private head = 0;

  constructor(private readonly capacity: number) {}

  /**
   * Insert `item` into the buffer.
   * If the buffer is at capacity, the oldest item is silently overwritten.
   */
  push(item: T): void {
    if (this.buf.length < this.capacity) {
      this.buf.push(item);
    } else {
      this.buf[this.head] = item;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /** Return all items in insertion order (oldest first). */
  toArray(): T[] {
    if (this.buf.length < this.capacity) return [...this.buf];
    return [
      ...this.buf.slice(this.head),
      ...this.buf.slice(0, this.head),
    ];
  }

  get size(): number {
    return this.buf.length;
  }
}

// ---------------------------------------------------------------------------
// Module-level stores
// ---------------------------------------------------------------------------

const MAX_EVENTS = 1_000;

const searchEvents = new CircularBuffer<SearchPerformedEvent>(MAX_EVENTS);
const selectEvents = new CircularBuffer<ResultSelectedEvent>(MAX_EVENTS);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Record a search_performed event. */
export function recordSearchPerformed(
  query: string,
  project: string | null,
  resultCount: number
): void {
  searchEvents.push({
    event: "search_performed",
    timestamp: new Date().toISOString(),
    query,
    project,
    resultCount,
  });
}

/** Record a result_selected event. */
export function recordResultSelected(
  query: string,
  docId: string,
  rank: number
): void {
  selectEvents.push({
    event: "result_selected",
    timestamp: new Date().toISOString(),
    query,
    docId,
    rank,
  });
}

/** Return all telemetry events in chronological order. */
export function getAllEvents(): TelemetryEvent[] {
  const all: TelemetryEvent[] = [
    ...searchEvents.toArray(),
    ...selectEvents.toArray(),
  ];
  all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return all;
}

/** Return summary counts for monitoring. */
export function getSummary(): {
  totalSearches: number;
  totalSelections: number;
  recentSearches: SearchPerformedEvent[];
  selectEvents: ResultSelectedEvent[];
  topQueries: Array<{ query: string; count: number }>;
} {
  const searches = searchEvents.toArray();
  const queryCounts = new Map<string, number>();
  for (const e of searches) {
    queryCounts.set(e.query, (queryCounts.get(e.query) ?? 0) + 1);
  }
  const topQueries = [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  return {
    totalSearches: searchEvents.size,
    totalSelections: selectEvents.size,
    recentSearches: searches.slice(-10),
    selectEvents: selectEvents.toArray().map((e) => ({
      ...e,
      rank: e.rank + 1, // convert to 1-based rank for easier reading
    })),
    topQueries,
  };
}
