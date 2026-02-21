import { useState, useEffect } from "react";
import type { SearchResponse, SearchResult } from "@/lib/types";

const DEBOUNCE_MS = 300;

export interface UseSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  meta: SearchResponse["meta"] | null;
  /** Call when the user selects a result; fires result_selected telemetry. */
  reportSelection: (result: SearchResult, rank: number) => void;
}

/**
 * Debounced search hook.
 *
 * Fires a GET /api/search request 300 ms after the query stops changing.
 * Clears results immediately when the query is emptied so the dropdown
 * closes without waiting for the debounce.
 */
export function useSearch(query: string): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [meta, setMeta] = useState<SearchResponse["meta"] | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data: SearchResponse = await res.json();
        setResults(data.results ?? []);
        setMeta(data.meta);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[useSearch]", err);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function reportSelection(result: SearchResult, rank: number) {
    // fire-and-forget — failures must not affect navigation
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "result_selected",
        query: query.trim(),
        docId: result.docId,
        rank,
      }),
    }).catch(console.error);
  }

  return { results, isLoading, meta, reportSelection };
}
