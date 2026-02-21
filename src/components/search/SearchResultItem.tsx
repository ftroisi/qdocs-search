"use client";

import { memo } from "react";
import type { SearchResult } from "@/lib/types";
import { highlight } from "@/lib/highlight";

interface SearchResultItemProps {
  result: SearchResult;
  /** 0-based position in the list; used for ARIA and scroll-into-view. */
  index: number;
  isSelected: boolean;
  /** Raw (unstemmed) query words used to highlight the title. */
  queryWords: string[];
  onSelect: (result: SearchResult, index: number) => void;
  onHover: (index: number) => void;
  /** Ref callback so the parent can scroll this item into view. */
  itemRef: (el: HTMLDivElement | null) => void;
}

/**
 * A single row in the search results dropdown.
 *
 * Displays:
 *  - Project badge  (e.g. "qiskit-nature")
 *  - Relevance score  (small, helps reviewers see ranking in action)
 *  - Title with matched query words highlighted
 *  - Matched stemmed terms (shows the search engine actually worked)
 *  - Up to 2 matched section headings for deep-link context
 */
export const SearchResultItem = memo(function SearchResultItem({
  result,
  index,
  isSelected,
  queryWords,
  onSelect,
  onHover,
  itemRef,
}: SearchResultItemProps) {
  const segments = highlight(result.title, queryWords);

  return (
    <div
      ref={itemRef}
      id={`search-result-${index}`}
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(result, index)}
      onMouseMove={() => onHover(index)}
      className={[
        "px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0",
        "transition-colors",
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
      ].join(" ")}
    >
      {/* Top row: project badge + score */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {result.project}
        </span>
        <span className="text-[10px] tabular-nums text-slate-300 dark:text-slate-600">
          {result.score.toFixed(1)}
        </span>
      </div>

      {/* Title with highlighted tokens */}
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
        {segments.map((seg, i) =>
          seg.highlighted ? (
            <mark
              key={i}
              className="bg-transparent text-blue-600 dark:text-blue-400 font-semibold not-italic"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>

      {/* Matched terms snippet */}
      {result.matchedTerms.length > 0 && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate">
          Matches:{" "}
          <span className="text-slate-500 dark:text-slate-400">
            {result.matchedTerms.join(", ")}
          </span>
        </p>
      )}

      {/* Section deep-links (up to 2) */}
      {result.sections.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {result.sections.slice(0, 2).map((section) => (
            <span
              key={section.title}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate max-w-[180px]"
              title={section.title}
            >
              § {section.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
