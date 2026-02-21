"use client";

import { forwardRef, KeyboardEvent } from "react";
import { SearchIcon, Loader2Icon } from "lucide-react";

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
      <div className="relative flex items-center w-full h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden">
        <SearchIcon
          aria-hidden="true"
          className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="w-full h-full pl-12 pr-12 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm"
          placeholder="Search documentation…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          // ARIA combobox pattern
          role="combobox"
          aria-label="Search documentation"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="search-listbox"
          aria-activedescendant={activeDescendant}
        />
        {isLoading && (
          <Loader2Icon
            aria-label="Loading…"
            className="absolute right-4 w-5 h-5 text-slate-400 animate-spin"
          />
        )}
      </div>
    );
  }
);
