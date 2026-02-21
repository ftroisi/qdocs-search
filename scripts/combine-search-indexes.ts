/**
 * combine-search-indexes.ts
 *
 * Pipeline script that discovers all Sphinx-generated searchindex.js files
 * under data/<project>/, parses them, remaps document indices to globally
 * unique namespaced IDs, merges terms/titleterms/alltitles across projects,
 * and writes a single data/combined-searchindex.json ready for the Next.js
 * search API.
 *
 * Run with:  npm run build:search-index
 *
 * Output schema (CombinedSearchIndex) is defined below and documented in
 * projects/searchbar.md.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, relative } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw Sphinx searchindex.js structure (after JSON.parse). */
interface SphinxIndex {
  docnames: string[];
  filenames: string[];
  titles: string[];
  terms: Record<string, number | number[]>;
  titleterms: Record<string, number | number[]>;
  alltitles: Record<string, Array<[number, string | null]>>;
  objects: Record<string, unknown>;
  objnames: Record<string, unknown>;
  objtypes: Record<string, string>;
  indexentries: Record<string, unknown>;
  envversion: Record<string, number>;
}

/** Metadata for one indexed project. */
export interface ProjectMeta {
  /** Unique slug, derived from the directory name (e.g. "qiskit-nature"). */
  id: string;
  /**
   * URL base path for this project's docs site, e.g. "/qiskit-nature".
   * All document URLs are relative to this.
   */
  basePath: string;
  /** Number of documents indexed. */
  docCount: number;
  /** ISO-8601 timestamp when the sphinx index was last modified on disk. */
  indexedAt: string;
}

/** A single indexed document. */
export interface DocumentRecord {
  /** Globally unique: "<projectId>:<sphinxDocIndex>" */
  id: string;
  /** The project this document belongs to. */
  project: string;
  /** Original sphinx filename, e.g. "apidocs/qiskit_machine_learning.rst". */
  filename: string;
  /** Page title with HTML markup stripped. */
  title: string;
  /** Absolute URL path to the rendered page, e.g. "/qiskit-nature/index.html". */
  url: string;
}

/** A section-level title entry within a document. */
export interface TitleEntry {
  /** Globally unique document ID. */
  docId: string;
  /**
   * In-page HTML anchor (without "#"), or null for the page title itself.
   */
  anchor: string | null;
}

/**
 * Combined, project-agnostic search index ready for the search API.
 *
 * Schema v1 design rationale:
 *  - `documents` is the source of truth for doc metadata; everything else
 *    references doc IDs so the API can enrich results cheaply.
 *  - `terms` and `titleterms` are inverted indices: term → [docId, …].
 *    Separating them allows the query layer to weight title matches higher.
 *  - `alltitles` preserves sub-page anchors for deep-linking into doc pages.
 *  - All doc IDs are namespaced (`<project>:<index>`) to avoid collisions when
 *    merging N projects, and to allow per-project scoping without a separate
 *    index.
 */
export interface CombinedSearchIndex {
  /** Schema version — bump on breaking changes. */
  version: "1";
  /** ISO-8601 timestamp of when this combined file was generated. */
  generatedAt: string;
  /** One entry per source project. */
  projects: ProjectMeta[];
  /** Flat list of every document across all projects. */
  documents: DocumentRecord[];
  /**
   * Inverted term index: lowercase term → sorted list of document IDs.
   * Source: Sphinx `terms` field (body text tokens).
   */
  terms: Record<string, string[]>;
  /**
   * Inverted title-term index: lowercase term → sorted list of document IDs.
   * Source: Sphinx `titleterms` field (heading tokens).
   */
  titleterms: Record<string, string[]>;
  /**
   * Human-readable section titles → list of {docId, anchor}.
   * Enables the UI to surface exact section matches and deep-link to anchors.
   */
  alltitles: Record<string, TitleEntry[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode common HTML entities from a string. */
function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Convert a Sphinx filename (e.g. "apidocs/foo.rst") to an HTML URL path.
 * If the filename has no extension or is "index", map it to "index.html".
 */
function filenameToUrl(basePath: string, filename: string): string {
  // Replace .rst / .txt / .md extension with .html; keep everything else.
  const htmlPath = filename.replace(/\.(rst|txt|md)$/, ".html");
  return `${basePath}/${htmlPath}`;
}

/**
 * Normalise a Sphinx term-index value to an array of numbers.
 * Sphinx stores single-doc terms as a bare number; multi-doc as an array.
 */
function toDocIndexArray(value: number | number[]): number[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse a Sphinx searchindex.js file.
 * The file contains exactly one call: Search.setIndex({...})
 * We strip the wrapper and JSON.parse the inner object.
 */
function parseSphinxIndex(filePath: string): SphinxIndex {
  const raw = readFileSync(filePath, "utf8").trim();

  // Expected format: Search.setIndex({...})
  const match = raw.match(/^Search\.setIndex\(([\s\S]+)\)$/);
  if (!match) {
    throw new Error(
      `Unexpected searchindex.js format in ${filePath}. ` +
        `Expected: Search.setIndex({...})`
    );
  }

  return JSON.parse(match[1]) as SphinxIndex;
}

/** Merge an inverted index fragment into the accumulator. */
function mergeInvertedIndex(
  acc: Record<string, string[]>,
  fragment: Record<string, number | number[]>,
  projectId: string
): void {
  for (const [term, rawValue] of Object.entries(fragment)) {
    const docIds = toDocIndexArray(rawValue).map(
      (i) => `${projectId}:${i}`
    );
    // Use Object.prototype.hasOwnProperty to guard against prototype-poisoning
    // terms such as "__proto__" or "constructor" that appear in Sphinx indexes.
    if (!Object.prototype.hasOwnProperty.call(acc, term)) {
      acc[term] = docIds;
    } else {
      acc[term].push(...docIds);
    }
  }
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function main(): void {
  const repoRoot = join(__dirname, "..");
  const dataDir = join(repoRoot, "data");
  const outputPath = join(dataDir, "combined-searchindex.json");

  // Use null-prototype objects as inverted-index accumulators to prevent
  // prototype-poisoning from Sphinx term keys like "__proto__" or
  // "constructor" (both appear in the provided searchindex.js files).
  const terms = Object.create(null) as Record<string, string[]>;
  const titleterms = Object.create(null) as Record<string, string[]>;
  const alltitles = Object.create(null) as Record<string, TitleEntry[]>;

  const combined: CombinedSearchIndex = {
    version: "1",
    generatedAt: new Date().toISOString(),
    projects: [],
    documents: [],
    terms,
    titleterms,
    alltitles,
  };

  // Discover projects: any sub-directory of data/ that contains searchindex.js
  const projectDirs = readdirSync(dataDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(); // deterministic ordering

  if (projectDirs.length === 0) {
    console.warn(`⚠️  No project directories found under ${relative(repoRoot, dataDir)}/`);
    process.exit(0);
  }

  for (const projectId of projectDirs) {
    const indexPath = join(dataDir, projectId, "searchindex.js");

    if (!existsSync(indexPath)) {
      console.warn(`  ⚠️  Skipping "${projectId}": no searchindex.js found.`);
      continue;
    }

    console.log(`  📦 Processing "${projectId}"…`);

    const sphinx = parseSphinxIndex(indexPath);
    const basePath = `/${projectId}`;
    const docCount = sphinx.filenames.length;

    // Record project metadata
    const stat = require("fs").statSync(indexPath) as { mtime: Date };
    combined.projects.push({
      id: projectId,
      basePath,
      docCount,
      indexedAt: stat.mtime.toISOString(),
    });

    // Build document records
    for (let i = 0; i < docCount; i++) {
      combined.documents.push({
        id: `${projectId}:${i}`,
        project: projectId,
        filename: sphinx.filenames[i],
        title: stripHtml(sphinx.titles[i] ?? ""),
        url: filenameToUrl(basePath, sphinx.filenames[i]),
      });
    }

    // Merge terms (body text)
    mergeInvertedIndex(combined.terms, sphinx.terms, projectId);

    // Merge titleterms (headings)
    mergeInvertedIndex(combined.titleterms, sphinx.titleterms, projectId);

    // Merge alltitles (section-level titles with anchors)
    for (const [title, entries] of Object.entries(sphinx.alltitles ?? {})) {
      const mapped: TitleEntry[] = entries.map(([docIdx, anchor]) => ({
        docId: `${projectId}:${docIdx}`,
        anchor: anchor || null,
      }));
      if (!Object.prototype.hasOwnProperty.call(combined.alltitles, title)) {
        combined.alltitles[title] = mapped;
      } else {
        combined.alltitles[title].push(...mapped);
      }
    }

    console.log(
      `     ✓ ${docCount} documents, ` +
        `${Object.keys(sphinx.terms).length} term entries, ` +
        `${Object.keys(sphinx.titleterms).length} title-term entries`
    );
  }

  // Sort inverted-index arrays for deterministic output (aids diffing)
  for (const key of Object.keys(combined.terms)) {
    combined.terms[key].sort();
  }
  for (const key of Object.keys(combined.titleterms)) {
    combined.titleterms[key].sort();
  }

  writeFileSync(outputPath, JSON.stringify(combined, null, 2), "utf8");

  const outputRel = relative(repoRoot, outputPath);
  const totalDocs = combined.documents.length;
  const totalTerms = Object.keys(combined.terms).length;
  const totalTitleTerms = Object.keys(combined.titleterms).length;
  const totalTitles = Object.keys(combined.alltitles).length;

  console.log(`
   Combined search index written to ${outputRel}
   Projects : ${combined.projects.length}
   Documents: ${totalDocs}
   Terms    : ${totalTerms}
   Titleterms: ${totalTitleTerms}
   Alltitles : ${totalTitles}
`);
}

main();
