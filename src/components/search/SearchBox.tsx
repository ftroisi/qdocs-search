"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
} from "react";

import Box from "@mui/material/Box";
import { ThemeProvider } from "@mui/material/styles";
import type { SearchResult } from "@/lib/types";
import { useSearch } from "@/hooks/useSearch";
import { useClickOutside } from "@/hooks/useClickOutside";
import { quantinuumTheme } from "@/lib/muiTheme";
import { SearchInput } from "./SearchInput";
import { SearchResultList } from "./SearchResultList";
import { useRouter } from "next/navigation";

/**
 * SearchBox
 *
 * Orchestrates the input, dropdown, keyboard navigation, and telemetry.
 * All data-fetching lives in useSearch; all presentation lives in the
 * two sub-components.
 *
 * Architecture:
 *   SearchBox (state + logic)
 *   ├── SearchInput    (input row + ARIA attributes)
 *   └── SearchResultList
 *       └── SearchResultItem × N  (individual result rows)
 */
export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { results, isLoading, meta, reportSelection } = useSearch(query);

  // Refs for scroll-into-view behaviour
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close dropdown when clicking outside
  useClickOutside(containerRef, () => setIsOpen(false));

  // Open dropdown whenever new results arrive
  useEffect(() => {
    if (results.length > 0) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else if (!isLoading && query.trim()) {
      setIsOpen(true); // show "no results" state
    } else if (!query.trim()) {
      setIsOpen(false);
    }
  }, [results, isLoading, query]);

  // Scroll the highlighted item into view on keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (results.length > 0) {
            const target =
              selectedIndex >= 0 ? results[selectedIndex] : results[0];
            const rank = selectedIndex >= 0 ? selectedIndex : 0;
            handleSelect(target, rank);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex]
  );

  const handleSelect = useCallback(
    (result: SearchResult, rank: number) => {
      setIsOpen(false);
      setQuery("");
      reportSelection(result, rank);
      // External URLs (e.g. docs hosted online rather than in public/) open in
      // a new tab so the user doesn't lose their place on this site.
      if (result.url.startsWith("http")) {
        window.open(result.url, "_blank", "noreferrer");
      } else {
        router.push(result.url);
      }
    },
    [reportSelection]
  );

  const handleHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Derive raw query words for title highlighting (no stemming needed here)
  const queryWords = useMemo(
    () =>
      query
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 2),
    [query]
  );

  // Ref callback factory – keeps itemRefs array in sync with results list
  const itemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const activeDescendant =
    isOpen && selectedIndex >= 0
      ? `search-result-${selectedIndex}`
      : undefined;

  return (
    <ThemeProvider theme={quantinuumTheme}>
      <Box ref={containerRef} sx={{ position: "relative", width: "100%", maxWidth: 672 }}>
        <SearchInput
          ref={inputRef}
          value={query}
          isLoading={isLoading}
          isOpen={isOpen}
          activeDescendant={activeDescendant}
          onChange={setQuery}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />

        {isOpen && query.trim() && (
          <SearchResultList
            results={results}
            selectedIndex={selectedIndex}
            query={query}
            queryWords={queryWords}
            total={meta?.total ?? results.length}
            onSelect={handleSelect}
            onHover={handleHover}
            itemRef={itemRef}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}
