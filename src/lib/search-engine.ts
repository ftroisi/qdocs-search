/**
 * search-engine.ts
 *
 * Core search logic for the docs search MVP.
 *
 * Scoring heuristics (see README for full rationale):
 *
 *  1. **Tokenisation** – query is lowercased and split on \W+.
 *  2. **Stop-word removal** – common English stop words are dropped.
 *  3. **Stemming** – Porter stemmer (via `natural`) so "circuits" matches
 *     "circuit", "classification" matches "classify", etc.
 *  4. **Inverted-index lookup** – each stemmed token is looked up in both
 *     `terms` (body text, weight 1.0) and `titleterms` (headings, weight 3.0).
 *  5. **IDF weighting** – terms that appear in fewer documents receive a
 *     higher score: `idf = log(totalDocs / docsWithTerm + 1)`.
 *  6. **Fuzzy fallback** – if no exact match is found, Jaro-Winkler distance
 *     against all index keys finds near-misses; the similarity score scales
 *     the match weight (typo tolerance).
 *  7. **Section bonus** – section titles in `alltitles` that contain a query
 *     token add +2.0 per token and surface a deep-link anchor.
 *  8. **All-tokens bonus** – documents that match every non-trivial query
 *     token get a ×1.25 multiplier.
 *  9. **Project scoping** – optional `project` filter restricts results to
 *     one subsite without needing a separate index.
 */

import { PorterStemmer, JaroWinklerDistance } from "natural";
import {
  docMap,
  totalDocs,
  getTermDocs,
  getTitleTermDocs,
  getAllTitles,
  getAllTermKeys,
  getAllTitleTermKeys,
} from "./search-index";
import type { SearchResult, SectionMatch } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum Jaro-Winkler similarity to accept a fuzzy term match. */
const FUZZY_THRESHOLD = 0.88;

/** Score weight for a body-text (terms) match. */
const BODY_WEIGHT = 1.0;

/** Score weight for a title/heading (titleterms) match. */
const TITLE_WEIGHT = 3.0;

/** Score weight for an alltitles section match. */
const SECTION_WEIGHT = 2.0;

/** Multiplier applied when a doc matches ALL query tokens. */
const ALL_TOKENS_BONUS = 1.25;

/** Maximum number of results returned when no limit is specified. */
export const DEFAULT_LIMIT = 20;

/** English stop words to strip before stemming. */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "this", "that", "these", "those",
  "it", "its", "from", "by", "about", "as", "into", "through",
  "during", "before", "after", "above", "below", "up", "down",
  "out", "off", "over", "under", "again", "then", "once", "not",
  "no", "nor", "so", "yet", "both", "either", "each", "all", "more",
  "most", "other", "such", "own", "than", "too", "very", "just",
  "how", "what", "when", "where", "which", "who", "why", "if",
]);

// ---------------------------------------------------------------------------
// Tokenisation helpers
// ---------------------------------------------------------------------------

/**
 * Split a raw query into cleaned, stop-word-filtered, Porter-stemmed tokens.
 *
 * Use this when you only need stems (e.g. index building).
 * Use {@link tokeniseWithRaw} instead when you also need the original
 * surface form for highlighting or display purposes.
 */
export function tokenise(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    .map((t) => PorterStemmer.stem(t));
}

/** Like {@link tokenise} but also return the raw (unstemmed) tokens for display. */
export function tokeniseWithRaw(query: string): Array<{ raw: string; stem: string }> {
  return query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    .map((t) => ({ raw: t, stem: PorterStemmer.stem(t) }));
}

// ---------------------------------------------------------------------------
// IDF helper
// ---------------------------------------------------------------------------

function idf(docCount: number): number {
  // Smooth IDF: log((totalDocs + 1) / (docCount + 1)) + 1
  return Math.log((totalDocs + 1) / (docCount + 1)) + 1;
}

// ---------------------------------------------------------------------------
// Fuzzy lookup
// ---------------------------------------------------------------------------

/**
 * Find the best approximate match for `token` in the given key list.
 * Returns `{ key, similarity }` if similarity >= FUZZY_THRESHOLD,
 * otherwise null.
 *
 * Performance note: this is O(N) over the key list.  With ~6400 body terms
 * and ~600 title terms that's negligible (<1ms per token on modern hardware).
 */
function fuzzyMatch(
  token: string,
  keys: string[]
): { key: string; similarity: number } | null {
  let best: { key: string; similarity: number } | null = null;
  for (const key of keys) {
    // Quick length-difference gate to avoid expensive JW for obviously far keys
    if (Math.abs(key.length - token.length) > 4) continue;
    const sim = JaroWinklerDistance(token, key);
    if (sim >= FUZZY_THRESHOLD && (best === null || sim > best.similarity)) {
      best = { key, similarity: sim };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** Restrict results to a single project subsite. */
  project?: string;
  /** Maximum number of results to return (default: DEFAULT_LIMIT). */
  limit?: number;
}

/**
 * Search the combined index and return ranked results.
 *
 * @param query   - Raw user query string (e.g. "quantun circuits").
 * @param options - Optional project scope and result limit.
 * @returns Array of SearchResult, sorted by score descending then title ascending
 * for stable ordering.  Empty array if the query produces no tokens after stop-word removal.
 *
 * @example
 *   const results = search("hamiltonian simulation", { project: "tket", limit: 10 });
 */
export function search(query: string, options: SearchOptions = {}): SearchResult[] {
  const { project, limit = DEFAULT_LIMIT } = options;

  const tokens = tokeniseWithRaw(query);
  if (tokens.length === 0) return [];

  const termKeys = getAllTermKeys();
  const titleTermKeys = getAllTitleTermKeys();

  // Per-document accumulated score map: docId -> score
  const scores = new Map<string, number>();
  // Per-document set of matched stems (for result annotation)
  const matchedMap = new Map<string, Set<string>>();
  // Tracks which stems each doc matched (for all-tokens bonus)
  const tokenMatchSets = new Map<string, Set<string>>();

  // Helper: add weight to a doc's score
  function addScore(docId: string, weight: number, stem: string) {
    if (project) {
      // Fast project filter on the namespaced ID prefix
      if (!docId.startsWith(`${project}:`)) return;
    }
    scores.set(docId, (scores.get(docId) ?? 0) + weight);
    if (!matchedMap.has(docId)) matchedMap.set(docId, new Set());
    matchedMap.get(docId)!.add(stem);
    if (!tokenMatchSets.has(docId)) tokenMatchSets.set(docId, new Set());
    tokenMatchSets.get(docId)!.add(stem);
  }

  const uniqueStems = new Set(tokens.map((t) => t.stem));

  for (const { stem } of tokens) {
    // --- Title-term lookup (exact) ---
    const exactTitleDocs = getTitleTermDocs(stem);
    if (exactTitleDocs.length > 0) {
      const w = TITLE_WEIGHT * idf(exactTitleDocs.length);
      for (const docId of exactTitleDocs) addScore(docId, w, stem);
    }

    // --- Body-term lookup (exact) ---
    const exactBodyDocs = getTermDocs(stem);
    if (exactBodyDocs.length > 0) {
      const w = BODY_WEIGHT * idf(exactBodyDocs.length);
      for (const docId of exactBodyDocs) addScore(docId, w, stem);
    }

    // --- Fuzzy fallback (if neither exact lookup hit anything) ---
    if (exactTitleDocs.length === 0 && exactBodyDocs.length === 0) {
      const fuzzyTitle = fuzzyMatch(stem, titleTermKeys);
      if (fuzzyTitle) {
        const fuzzyDocs = getTitleTermDocs(fuzzyTitle.key);
        const w = TITLE_WEIGHT * idf(fuzzyDocs.length) * fuzzyTitle.similarity;
        for (const docId of fuzzyDocs) addScore(docId, w, stem);
      }

      const fuzzyBody = fuzzyMatch(stem, termKeys);
      if (fuzzyBody) {
        const fuzzyDocs = getTermDocs(fuzzyBody.key);
        const w = BODY_WEIGHT * idf(fuzzyDocs.length) * fuzzyBody.similarity;
        for (const docId of fuzzyDocs) addScore(docId, w, stem);
      }
    }
  }

  // --- Section title bonus ---
  // Maps docId → list of matching section info
  const sectionBonus = new Map<string, SectionMatch[]>();
  const allTitles = getAllTitles();

  for (const [sectionTitle, entries] of Object.entries(allTitles)) {
    const titleLower = sectionTitle.toLowerCase();
    let matchCount = 0;
    const matchedStem = new Set<string>();

    for (const { stem } of tokens) {
      // Check if the section title contains the stem OR its unstemmed form
      if (titleLower.includes(stem)) {
        matchCount++;
        matchedStem.add(stem);
      }
    }

    if (matchCount === 0) continue;

    const bonus = SECTION_WEIGHT * matchCount;
    for (const { docId, anchor } of entries) {
      if (project && !docId.startsWith(`${project}:`)) continue;
      // Only add section bonus if the doc already has some score or has a
      // direct section match (keeps noise low for pure section hits)
      addScore(docId, bonus, [...matchedStem][0]);
      if (!sectionBonus.has(docId)) sectionBonus.set(docId, []);
      sectionBonus.get(docId)!.push({ title: sectionTitle, anchor });
    }
  }

  // --- Apply all-tokens bonus ---
  for (const [docId, matchedStems] of tokenMatchSets) {
    // Doc matches all unique query stems
    // Only apply the bonus for multi-token queries; a single-token query trivially
    // "matches all tokens" so the bonus would be noise rather than signal.
    if (uniqueStems.size > 1 && matchedStems.size === uniqueStems.size) {
      scores.set(docId, (scores.get(docId) ?? 0) * ALL_TOKENS_BONUS);
    }
  }

  // --- Build result list ---
  const results: SearchResult[] = [];

  for (const [docId, score] of scores) {
    const doc = docMap.get(docId);
    if (!doc) continue; // shouldn't happen, but guard anyway

    results.push({
      docId,
      project: doc.project,
      title: doc.title,
      url: doc.url,
      score,
      matchedTerms: [...(matchedMap.get(docId) ?? [])],
      sections: sectionBonus.get(docId) ?? [],
    });
  }

  // Sort by score descending, then alphabetically by title for stable ordering
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return results.slice(0, limit);
}
