/**
 * docs-projects.ts
 *
 * Server-side module that enriches the raw ProjectMeta entries from the
 * combined search index with human-readable display names, descriptions,
 * and curated quick-link sections.
 *
 * Adding a new project to the index automatically surfaces it on the homepage;
 * you only need to add an entry to KNOWN_PROJECTS to customise its metadata.
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

/**
 * Hand-curated metadata for projects we know about.
 * Keys match the project id (directory name under data/).
 */
const KNOWN_PROJECTS: Record<string, ProjectEnrichment> = {
  "qiskit-nature": {
    displayName: "Qiskit Nature",
    description:
      "An open-source framework for quantum simulation of natural sciences, " +
      "including electronic- and vibrational-structure problems.",
    accentColor: "#6929c4",
    links: [
      {
        title: "Getting Started",
        path: "/getting_started.html",
        subtitle: "Install Qiskit Nature and run your first simulation.",
      },
      {
        title: "Tutorials",
        path: "/tutorials/index.html",
        subtitle: "Step-by-step walkthroughs for common use cases.",
      },
      {
        title: "API Reference",
        path: "/apidocs/qiskit_nature.html",
        subtitle: "Full API documentation for all classes and functions.",
      },
    ],
  },
  "qiskit-machine-learning": {
    displayName: "Qiskit Machine Learning",
    description:
      "A library for quantum machine learning that provides a suite of " +
      "quantum neural networks, classifiers, regressors and kernels.",
    accentColor: "#0f62fe",
    links: [
      {
        title: "Getting Started",
        path: "/getting_started.html",
        subtitle: "Set up and run your first quantum machine learning model.",
      },
      {
        title: "Tutorials",
        path: "/tutorials/index.html",
        subtitle: "Hands-on examples with QNNs, classifiers and kernels.",
      },
      {
        title: "API Reference",
        path: "/apidocs/qiskit_machine_learning.html",
        subtitle: "Full API documentation for all classes and functions.",
      },
    ],
  },
};

/** Fallback enrichment for projects not listed in KNOWN_PROJECTS. */
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
      const enrichment = KNOWN_PROJECTS[project.id] ?? fallbackEnrichment(project);
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
