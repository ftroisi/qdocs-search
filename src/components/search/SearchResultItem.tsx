"use client";

import React, { memo } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <ListItemButton
      ref={itemRef}
      id={`search-result-${index}`}
      role="option"
      aria-selected={isSelected}
      selected={isSelected}
      onClick={() => onSelect(result, index)}
      onMouseMove={() => onHover(index)}
      sx={{
        px: 2,
        py: 1.25,
        display: "block",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: isSelected ? "action.hover" : "background.paper",
        "&:last-child": { borderBottom: "none" }
      }}
    >
      {/* Top row: project badge + score */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Chip
          label={result.project}
          size="small"
          variant="outlined"
          sx={{
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: "999px",
            color: "text.secondary",
            borderColor: "divider",
          }}
        />
        <Typography
          component="span"
          sx={{ fontSize: "0.6rem", color: "text.disabled", fontVariantNumeric: "tabular-nums" }}
        >
          {result.score.toFixed(1)}
        </Typography>
      </Stack>

      {/* Title with highlighted tokens */}
      <Typography
        component="p"
        sx={{ fontSize: "0.8125rem", fontWeight: 500, lineHeight: 1.4, color: "text.primary" }}
      >
        {segments.map((seg, i) =>
          seg.highlighted ? (
            <Box
              component="mark"
              key={i}
              sx={{ bgcolor: "transparent", color: "primary.main", fontWeight: 700 }}
            >
              {seg.text}
            </Box>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </Typography>

      {/* Matched terms snippet */}
      {result.matchedTerms.length > 0 && (
        <Typography
          noWrap
          sx={{ mt: 0.5, fontSize: "0.6875rem", color: "text.secondary" }}
        >
          Matches:{" "}
          <Box component="span" sx={{ color: "text.primary" }}>
            {result.matchedTerms.join(", ")}
          </Box>
        </Typography>
      )}

      {/* Section deep-links (up to 2).
          Each chip links directly to the matched anchor within the page so
          the user can jump straight to the relevant section. We stop event
          propagation so that clicking a chip does not also trigger the
          parent ListItemButton's onClick (which would navigate to the root). */}
      {result.sections.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.75}>
          {result.sections.slice(0, 2).map((section) => {
            const href = section.anchor
              ? `${result.url}#${section.anchor}`
              : result.url;
            return (
              <Chip
                key={section.title}
                component="a"
                href={href}
                label={`§ ${section.title}`}
                size="small"
                clickable
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  maxWidth: 200,
                  color: "text.secondary",
                  bgcolor: "action.hover",
                  textDecoration: "none",
                  "& .MuiChip-label": { px: 1 },
                  "&:hover": { bgcolor: "action.selected" },
                }}
                title={section.title}
              />
            );
          })}
        </Stack>
      )}
    </ListItemButton>
  );
});
