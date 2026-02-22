/**
 * docs-projects.ts
 *
 * Server-side module that enriches the raw ProjectMeta entries from the
 * combined search index with human-readable display names, descriptions,
 * and accent colours.  Quick-links come directly from the `suggestedLinks`
 * field that the pipeline derives from each project's sphinx index, so no
 * hand-curated per-project config is required here.
 */

import { getProjects } from "./search-index";
import type { ProjectMeta } from "./types";

// ---------------------------------------------------------------------------
// Static enrichment config
// ---------------------------------------------------------------------------

interface ProjectEnrichment {
  displayName: string;
  description: string;
  /** Optional hex accent colour used by the logo badge. */
  accentColor?: string;
}

/** Derive a human-readable display name from a kebab-case project id. */
function toDisplayName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Fallback enrichment — used for all projects that don't have a
 * hand-curated entry.  Display name is derived from the project id;
 * description mentions the page count so the card is never completely empty.
 */
function fallbackEnrichment(project: ProjectMeta): ProjectEnrichment {
  return {
    displayName: toDisplayName(project.id),
    description: `Documentation for ${toDisplayName(project.id)} (${project.docCount} pages indexed).`,
  };
}

// ---------------------------------------------------------------------------
// Public shape
// ---------------------------------------------------------------------------

export interface EnrichedProject extends ProjectMeta {
  displayName: string;
  description: string;
  accentColor: string;
  links: Array<{
    title: string;
    /** Full absolute URL for use in <a href>. */
    url: string;
    subtitle: string;
  }>;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns an enriched project list derived from the combined search index.
 * Results are sorted deterministically (alphabetically by id).
 *
 * Links come from `project.suggestedLinks` which the pipeline populates by
 * reading what was the projectInfo metadata.
 *
 * This is safe to call from a Next.js Server Component because it reads
 * from module-level state cached by search-index.ts.
 */
export function getEnrichedProjects(): EnrichedProject[] {
  const raw = getProjects();

  return raw
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((project) => {
      const enrichment = fallbackEnrichment(project);
      return {
        ...project,
        displayName: enrichment.displayName,
        description: enrichment.description,
        accentColor: enrichment.accentColor ?? "#6f6f6f",
        // Use index-derived links; fall back to the project root if the
        // pipeline produced none (e.g. a very minimal sphinx build).
        links:
          project.suggestedLinks.length > 0
            ? project.suggestedLinks
            : [
                {
                  title: "Documentation",
                  url: `${project.basePath}/index.html`,
                  subtitle: `Browse the ${enrichment.displayName} documentation.`,
                },
              ],
      };
    });
}
