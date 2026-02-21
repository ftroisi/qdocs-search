"use client";

import { forwardRef, KeyboardEvent } from "react";
import InputBase from "@mui/material/InputBase";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import SearchIcon from "@mui/icons-material/Search";

interface SearchInputProps {
  value: string;
  isLoading: boolean;
  isOpen: boolean;
  activeDescendant: string | undefined;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
}

/**
 * The text input + icon row.  Kept as a pure presentational component so
 * it can be tested or reused without the surrounding dropdown logic.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value, isLoading, isOpen, activeDescendant, onChange, onKeyDown, onFocus },
    ref
  ) {
    return (
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          height: 48,
          borderRadius: "var(--radius, 0.5rem)",
          border: "1px solid",
          borderColor: "divider",
          px: 1.5,
          transition: "box-shadow 150ms, border-color 150ms",
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: "0 0 0 2px rgba(24,24,27,0.12)",
          },
        }}
      >
        <InputAdornment position="start" sx={{ pointerEvents: "none" }}>
          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
        </InputAdornment>

        <InputBase
          inputRef={ref}
          fullWidth
          autoComplete="off"
          inputProps={{
            spellCheck: false,
            role: "combobox",
            "aria-label": "Search documentation",
            "aria-autocomplete": "list",
            "aria-expanded": isOpen,
            "aria-controls": "search-listbox",
            "aria-activedescendant": activeDescendant,
          }}
          placeholder="Search documentation…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          sx={{ fontSize: 14, ml: 0.5 }}
        />

        {isLoading && (
          <InputAdornment position="end">
            <CircularProgress
              size={16}
              aria-label="Loading…"
              sx={{ color: "text.secondary" }}
            />
          </InputAdornment>
        )}
      </Paper>
    );
  }
);
