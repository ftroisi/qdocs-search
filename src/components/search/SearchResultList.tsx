"use client";

import type { SearchResult } from "@/lib/types";
import { SearchResultItem } from "./SearchResultItem";

interface SearchResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  query: string;
  /** Raw (unstemmed) query words for title highlighting. */
  queryWords: string[];
  /** Total number of matches before limiting (for the footer line). */
  total: number;
  onSelect: (result: SearchResult, index: number) => void;
  onHover: (index: number) => void;
  /** Ref callback so items can be scroll-tracked by the parent. */
  itemRef: (index: number) => (el: HTMLDivElement | null) => void;
}

/**
 * The dropdown listbox that appears beneath the search input.
 * Handles empty state, result rows, and a subtle footer with hit count.
 */
export function SearchResultList({
  results,
  selectedIndex,
  query,
  queryWords,
  total,
  onSelect,
  onHover,
  itemRef,
}: SearchResultListProps) {
  return (
    <div
      id="search-listbox"
      role="listbox"
      aria-label="Search results"
      className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
    >
      {results.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          No results for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            &ldquo;{query}&rdquo;
          </span>
          .
        </p>
      ) : (
        <>
          {/* Scrollable results area — max-height caps the dropdown height */}
          <div className="max-h-[22rem] overflow-y-auto">
            {results.map((result, index) => (
              <SearchResultItem
                key={result.docId}
                result={result}
                index={index}
                isSelected={selectedIndex === index}
                queryWords={queryWords}
                onSelect={onSelect}
                onHover={onHover}
                itemRef={itemRef(index)}
              />
            ))}
          </div>

          {/* Footer: hit count + keyboard hint */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {results.length} of {total} result{total !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block">
              ↑↓ navigate &nbsp;·&nbsp; ↵ open &nbsp;·&nbsp; Esc close
            </span>
          </div>
        </>
      )}
    </div>
  );
}
