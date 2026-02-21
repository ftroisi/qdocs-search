/**
 * docs-projects.ts
 *
 * Server-side module that enriches the raw ProjectMeta entries from the
 * combined search index with human-readable display names, descriptions,
 * and curated quick-link sections.
 */

import { getProjects } from "./search-index";
import type { ProjectMeta } from "./types";

// ---------------------------------------------------------------------------
// Static enrichment config
// ---------------------------------------------------------------------------

interface ProjectLinks {
  title: string;
  /** Absolute path (relative to project basePath). */
  path: string;
  subtitle: string;
}

interface ProjectEnrichment {
  displayName: string;
  description: string;
  links: ProjectLinks[];
  /** Optional hex accent colour used by the logo badge. */
  accentColor?: string;
}

/** Enrichment for projects. */
function fallbackEnrichment(project: ProjectMeta): ProjectEnrichment {
  const displayName = project.id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    displayName,
    description: `Documentation for ${displayName} (${project.docCount} pages indexed).`,
    links: [
      {
        title: "Documentation",
        path: "/index.html",
        subtitle: `Browse the ${displayName} documentation.`,
      },
    ],
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
        links: enrichment.links.map((l) => ({
          title: l.title,
          url: `${project.basePath}${l.path}`,
          subtitle: l.subtitle,
        })),
      };
    });
}
