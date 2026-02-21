/**
 * search-index.ts
 *
 * Loads public/combined-searchindex.json once at server startup and exposes
 * fast-access data structures used by the search engine.
 *
 * Because Next.js runs server code in a persistent Node.js process between
 * requests, module-level state is an effective and zero-dependency singleton
 * cache.  The index is ~1.9 MB on disk; loading it once is negligible.
 *
 * If the combined file is missing, the module throws at import time so the
 * misconfiguration is loud rather than silently returning no results.
 * Run `npm run build:search-index` to regenerate it.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type {
  CombinedSearchIndex,
  DocumentRecord,
  ProjectMeta,
  TitleEntry,
} from "./types";

// ---------------------------------------------------------------------------
// Load & parse
// ---------------------------------------------------------------------------

const INDEX_PATH = join(process.cwd(), "public", "combined-searchindex.json");

if (!existsSync(INDEX_PATH)) {
  throw new Error(
    `[search-index] Combined search index not found at ${INDEX_PATH}.\n` +
      `Run "npm run build:search-index" to generate it.`
  );
}

const raw = readFileSync(INDEX_PATH, "utf8");
const index = JSON.parse(raw) as CombinedSearchIndex;

if (index.version !== "1") {
  throw new Error(
    `[search-index] Unsupported schema version "${index.version}". ` +
      `Expected "1".`
  );
}

// ---------------------------------------------------------------------------
// Derived data structures for O(1) lookups
// ---------------------------------------------------------------------------

/**
 * O(1) document lookup by namespaced ID ("qiskit-nature:42").
 */
export const docMap = new Map<string, DocumentRecord>(
  index.documents.map((d) => [d.id, d])
);

/**
 * totalDocs is used for IDF calculations.
 */
export const totalDocs = index.documents.length;

// ---------------------------------------------------------------------------
// Public accessors
// ---------------------------------------------------------------------------

export function getProjects(): ProjectMeta[] {
  return index.projects;
}

export function getProject(id: string): ProjectMeta | undefined {
  return index.projects.find((p) => p.id === id);
}

/** Inverted body-text index: term → sorted doc-ID array. */
export function getTermDocs(term: string): string[] {
  return index.terms[term] ?? [];
}

/** Inverted title/heading index: term → sorted doc-ID array. */
export function getTitleTermDocs(term: string): string[] {
  return index.titleterms[term] ?? [];
}

/**
 * All registered section titles.  Returns the raw `alltitles` map so the
 * search engine can iterate it for sub-heading matches.
 */
export function getAllTitles(): Record<string, TitleEntry[]> {
  return index.alltitles;
}

/**
 * All term keys in the body-text index.  Used by the fuzzy matcher to find
 * the closest real term when an exact lookup misses.
 */
export function getAllTermKeys(): string[] {
  return Object.keys(index.terms);
}

/**
 * All term keys in the title index.  Used by the fuzzy matcher.
 */
export function getAllTitleTermKeys(): string[] {
  return Object.keys(index.titleterms);
}
