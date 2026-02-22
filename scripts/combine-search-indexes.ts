/**
 * combine-search-indexes.ts
 *
 * Pipeline script that discovers all Sphinx-generated searchindex.js files
 * under public/<project>/, parses them, remaps document indices to globally
 * unique namespaced IDs, merges terms/titleterms/alltitles across projects,
 * and writes a single public/combined-searchindex.json ready for the Next.js
 * search API.
 *
 * Run with:  npm run build:search-index
 *
 * Base-path resolution per project (in priority order):
 *  1. If public/<project>/index.html exists  →  local path "/<project>"
 *  2. If public/<project>/projectInfo.json has `externalBaseUrl`  ->  that URL
 *  3. Otherwise a warning is emitted and the local path is used as-is.
 *
 * projectInfo.json schema (all fields optional):
 *  {
 *    "externalBaseUrl": "https://qiskit-extensions.github.io/qiskit-nature",
 *    "suggestedLinks": [
 *      {
 *        "title": "Getting Started",
 *        "path": "/getting_started.html",
 *        "subtitle": "Install Qiskit Nature and run your first simulation."
 *      }
 *    ]
 *  }
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

/** A quick-link derived from well-known docname patterns in the sphinx index. */
export interface SuggestedLink {
  /** Page title taken directly from the sphinx index. */
  title: string;
  /** Absolute URL to the rendered page. */
  url: string;
  /** Short description of what the page covers. */
  subtitle: string;
}

/** Metadata for one indexed project. */
export interface ProjectMeta {
  /** Unique slug, derived from the directory name (e.g. "qiskit-nature"). */
  id: string;
  /**
   * URL base path for this project's docs site.
   * - Local docs:    "/qiskit-nature"  (relative, served from public/)
   * - External docs: "https://…"       (absolute, from projectInfo.json)
   * All document URLs are resolved against this.
   */
  basePath: string;
  /**
   * The docs may be located in a subdomain of the external site (e.g. "https://docs.quantinuum.com/tket/user-guide")
   * - Local docs: This path is the same as basePath (e.g. "/qiskit-nature") since local HTML is always served from public/.
   * - External docs: Can be either the same as basePath or different if projectInfo.json specifies an externalDocsPath (e.g. "https://docs.quantinuum.com/tket/user-guide").
   * This URL is used for directing users to the docs from search results and project cards
   */
  docsPath: string;
  /**
   * True when basePath is an external URL (no local HTML in public/).
   * The UI uses this to open links in a new tab.
   */
  isExternal: boolean;
  /** Number of documents indexed. */
  docCount: number;
  /** ISO-8601 timestamp when the sphinx index was last modified on disk. */
  indexedAt: string;
  /**
   * Quick-links extracted from the sphinx index by matching well-known
   * docname patterns.  These are stored so downstream consumers
   * (e.g. the homepage) can render project cards without hand-curated config.
   */
  suggestedLinks: SuggestedLink[];
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
   * Inverted term index: lowercase term -> sorted list of document IDs.
   * Source: Sphinx `terms` field (body text tokens).
   */
  terms: Record<string, string[]>;
  /**
   * Inverted title-term index: lowercase term -> sorted list of document IDs.
   * Source: Sphinx `titleterms` field (heading tokens).
   */
  titleterms: Record<string, string[]>;
  /**
   * Human-readable section titles -> list of {docId, anchor}.
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
// projectInfo.json helpers
// ---------------------------------------------------------------------------

/**
 * Shape of each entry in projectInfo.json `suggestedLinks` array.
 * `path` is relative to the project basePath (e.g. "/getting_started.html").
 */
interface ProjectInfoLink {
  title: string;
  path: string;
  subtitle: string;
}

interface ProjectInfo {
  /** External docs URL used when local HTML is absent, e.g. "https://…". */
  externalBaseUrl?: string;
  /** The externalDocsPath is the subdirectory within the externalBaseUrl where docs are hosted. */
  externalDocsPath?: string;
  /**
   * Curated list of quick-links shown on the homepage project card.
   * Each `path` is relative to the project basePath.
   */
  suggestedLinks?: ProjectInfoLink[];
}

/**
 * Resolve the basePath, isExternal flag, and suggestedLinks for a project.
 *
 * basePath resolution priority:
 *  1. Local HTML present (index.html alongside searchindex.js)  ->  local path
 *  2. projectInfo.json with externalBaseUrl                     ->  external URL
 *  3. Fallback                                                  ->  local path + warning
 *
 * suggestedLinks come from projectInfo.json `suggestedLinks`.
 * Paths are joined with basePath to form absolute URLs.
 * If none are defined, an empty array is returned and the consumer should fall
 * back to a sensible default.
 */
function resolveBasePath(
  projectDir: string,
  projectId: string
): { basePath: string; docsPath: string; isExternal: boolean; suggestedLinks: SuggestedLink[] } {
  // Read projectInfo.json once; used for both basePath and suggestedLinks.
  let info: ProjectInfo = {};
  const infoPath = join(projectDir, "projectInfo.json");
  if (existsSync(infoPath)) {
    try {
      info = JSON.parse(readFileSync(infoPath, "utf8")) as ProjectInfo;
    } catch (err) {
      console.warn(`  ⚠️  Failed to parse projectInfo.json for "${projectId}": ${err}`);
    }
  }

  // --- Resolve basePath ---
  let basePath: string;
  let docsPath: string;
  let isExternal: boolean;
  const localIndexHtml = join(projectDir, "index.html");
  if (existsSync(localIndexHtml)) {
    basePath = `/${projectId}`;
    docsPath = basePath;
    isExternal = false;
  } else if (info.externalBaseUrl) {
    basePath = info.externalBaseUrl.replace(/\/$/, "");
    docsPath = info.externalDocsPath ? join(basePath, info.externalDocsPath) : basePath;
    isExternal = true;
    console.log(`     📍  No local HTML — using external base URL: ${basePath}`);
  } else {
    console.warn(
        `     ⚠️  "${projectId}" has no local index.html and no externalBaseUrl in projectInfo.json.\n` +
        `         Search results will link to /${projectId}/... which may 404.\n` +
        `         Add a projectInfo.json with { "externalBaseUrl": "https://…" } to fix this.`
    );
    basePath = `/${projectId}`;
    docsPath = basePath;
    isExternal = false;
  }

  // --- Resolve suggestedLinks ---
  const suggestedLinks: SuggestedLink[] = (info.suggestedLinks ?? []).map((l) => ({
    title: l.title,
    url: `${basePath}${l.path}`,
    subtitle: l.subtitle,
  }));

  return { basePath, docsPath, isExternal, suggestedLinks };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

function main(): void {
  const repoRoot = join(__dirname, "..");
  const publicDir = join(repoRoot, "public");
  const outputPath = join(publicDir, "combined-searchindex.json");

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

  // Discover projects: any sub-directory of public/ that contains searchindex.js
  const projectDirs = readdirSync(publicDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(); // deterministic ordering

  const projectsWithIndex = projectDirs.filter((name) =>
    existsSync(join(publicDir, name, "searchindex.js"))
  );

  if (projectsWithIndex.length === 0) {
    console.warn(`⚠️  No project directories with searchindex.js found under ${relative(repoRoot, publicDir)}/`);
    process.exit(0);
  }

  for (const projectId of projectsWithIndex) {
    const projectDir = join(publicDir, projectId);
    const indexPath = join(projectDir, "searchindex.js");

    console.log(`  📦 Processing "${projectId}"...`);

    const sphinx = parseSphinxIndex(indexPath);
    const { basePath, docsPath, isExternal, suggestedLinks } = resolveBasePath(projectDir, projectId);
    const docCount = sphinx.filenames.length;

    // Record project metadata
    const stat = require("fs").statSync(indexPath) as { mtime: Date };
    combined.projects.push({
      id: projectId,
      basePath,
      docsPath,
      isExternal,
      docCount,
      indexedAt: stat.mtime.toISOString(),
      suggestedLinks,
    });

    if (suggestedLinks.length > 0) {
      console.log(
        `     🔗 ${suggestedLinks.length} suggested link(s): ${suggestedLinks.map((l) => l.title).join(" · ")}`
      );
    } else {
      console.warn(`     ⚠️  No suggestedLinks defined in projectInfo.json`);
    }

    // Build document records
    for (let i = 0; i < docCount; i++) {
      combined.documents.push({
        id: `${projectId}:${i}`,
        project: projectId,
        filename: sphinx.filenames[i],
        title: stripHtml(sphinx.titles[i] ?? ""),
        url: filenameToUrl(docsPath, sphinx.filenames[i]),
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
      `     📄 ${docCount} documents, ` +
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
  const externalCount = combined.projects.filter((p) => p.isExternal).length;
  const totalDocs = combined.documents.length;
  const totalTerms = Object.keys(combined.terms).length;
  const totalTitleTerms = Object.keys(combined.titleterms).length;
  const totalTitles = Object.keys(combined.alltitles).length;

  console.log(`
   Combined search index written to ${outputRel}
   Projects : ${combined.projects.length} (${externalCount} external, ${combined.projects.length - externalCount} local)
   Documents: ${totalDocs}
   Terms    : ${totalTerms}
   Titleterms: ${totalTitleTerms}
   Alltitles : ${totalTitles}
`);
}

main();
