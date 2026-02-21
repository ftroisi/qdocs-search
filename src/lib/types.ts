/**
 * types.ts
 *
 * Shared type definitions used by the pipeline script, the search engine,
 * and the Next.js API routes.  All search-index types mirror the schema
 * produced by scripts/combine-search-indexes.ts (CombinedSearchIndex v1).
 */

// ---------------------------------------------------------------------------
// Combined search-index schema (produced by the build pipeline)
// ---------------------------------------------------------------------------

/** A quick-link derived from well-known docname patterns in the sphinx index. */
export interface SuggestedLink {
  /** Page title taken directly from the sphinx index. */
  title: string;
  /** Absolute URL to the rendered page. */
  url: string;
  /** Short description of what the page covers. */
  subtitle: string;
}

export interface ProjectMeta {
  id: string;
  /**
   * URL base path for this project's docs site.
   * - Local docs:    "/qiskit-nature"  (relative, served from public/)
   * - External docs: "https://…"       (absolute, from projectInfo.json)
   */
  basePath: string;
  /**
   * True when basePath is an external URL (no local HTML in public/).
   * The UI uses this to open links in a new tab.
   */
  isExternal: boolean;
  docCount: number;
  indexedAt: string;
  /**
   * Quick-links derived from the sphinx index by matching well-known docname
   * patterns (getting_started, tutorials/index, apidocs/, etc.).
   */
  suggestedLinks: SuggestedLink[];
}

export interface DocumentRecord {
  id: string;
  project: string;
  filename: string;
  title: string;
  url: string;
}

export interface TitleEntry {
  docId: string;
  anchor: string | null;
}

export interface CombinedSearchIndex {
  version: "1";
  generatedAt: string;
  projects: ProjectMeta[];
  documents: DocumentRecord[];
  terms: Record<string, string[]>;
  titleterms: Record<string, string[]>;
  alltitles: Record<string, TitleEntry[]>;
}

// ---------------------------------------------------------------------------
// Search API types
// ---------------------------------------------------------------------------

/** A matched section within a document page (enables deep-linking). */
export interface SectionMatch {
  /** The full section heading text. */
  title: string;
  /** In-page anchor (without "#"), or null for the page root. */
  anchor: string | null;
}

/** A single ranked search result returned by the API. */
export interface SearchResult {
  /** Globally unique document ID: "<project>:<sphinxIndex>". */
  docId: string;
  project: string;
  title: string;
  /** Absolute URL to the rendered page. */
  url: string;
  /**
   * Composite relevance score. Higher is better.
   * Combines IDF-weighted body-term and title-term matches, with a bonus
   * for section-level heading matches.
   */
  score: number;
  /** The stemmed tokens from the query that matched this document. */
  matchedTerms: string[];
  /**
   * Matched sub-page sections, sorted by their contribution to the score.
   * Non-empty only when a section heading overlaps with the query.
   */
  sections: SectionMatch[];
}

/** Top-level shape of the GET /api/search response. */
export interface SearchResponse {
  results: SearchResult[];
  meta: {
    query: string;
    /** Project filter applied, if any. */
    project: string | null;
    /** Number of results returned (≤ limit). */
    count: number;
    /** Total number of matching documents before limit is applied. */
    total: number;
    /** Server-side processing time in milliseconds. */
    durationMs: number;
  };
}

// ---------------------------------------------------------------------------
// Telemetry types
// ---------------------------------------------------------------------------

export interface SearchPerformedEvent {
  event: "search_performed";
  timestamp: string;
  query: string;
  project: string | null;
  resultCount: number;
}

export interface ResultSelectedEvent {
  event: "result_selected";
  timestamp: string;
  query: string;
  docId: string;
  /** 0-based rank of the selected result in the result list. */
  rank: number;
}

export type TelemetryEvent = SearchPerformedEvent | ResultSelectedEvent;
