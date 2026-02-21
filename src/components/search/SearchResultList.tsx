"use client";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Paper
      id="search-listbox"
      component="div"
      role="listbox"
      aria-label="Search results"
      elevation={4}
      sx={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        right: 0,
        zIndex: 1300,
        overflow: "hidden",
        borderRadius: "var(--radius, 0.5rem)",
      }}
    >
      {results.length === 0 ? (
        <Typography
          sx={{ px: 3, py: 4, textAlign: "center", fontSize: "0.875rem", color: "text.secondary" }}
        >
          No results for{" "}
          <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
            &ldquo;{query}&rdquo;
          </Box>
          .
        </Typography>
      ) : (
        <>
          {/* Scrollable results area */}
          <List
            disablePadding
            sx={{ maxHeight: 352, overflowY: "auto" }}
          >
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
          </List>

          {/* Footer: hit count + keyboard hint */}
          <Divider />
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ px: 2, py: 0.75, bgcolor: "action.hover" }}
          >
            <Typography sx={{ fontSize: "0.6rem", color: "text.disabled" }}>
              {results.length} of {total} result{total !== 1 ? "s" : ""}
            </Typography>
            <Typography sx={{ fontSize: "0.6rem", color: "text.disabled", display: { xs: "none", sm: "block" } }}>
              ↑↓ navigate &nbsp;·&nbsp; ↵ open &nbsp;·&nbsp; Esc close
            </Typography>
          </Stack>
        </>
      )}
    </Paper>
  );
}
