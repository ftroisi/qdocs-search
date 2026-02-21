import {
  DocsFooter,
  DocsNavBar,
  DocsHeaderWrapper,
  DocsHeaderLeft,
  DocsHeaderRight,
  DocsHeaderSubtitle,
  DocsPageLayout,
  Card,
  CardHeader,
  CardDescription,
  DocsHelpCard
} from "@quantinuum/quantinuum-ui";
import { LifeBuoyIcon, BookIcon } from "lucide-react";
import { QuantinuumLogo } from "./QuantinuumLogo";
import { QLogo } from "./Q";
import { SearchBox } from "@/components/search/SearchBox";
import { getEnrichedProjects } from "@/lib/docs-projects";

// ---------------------------------------------------------------------------
// Project logo badge
// Renders a styled text badge using the project's accent colour so that no
// SVG assets are required. New projects get a sensible default automatically.
// ---------------------------------------------------------------------------

function ProjectLogo({
  name,
  accentColor,
}: {
  name: string;
  accentColor: string;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        borderRadius: "0.375rem",
        background: accentColor,
        color: "#fff",
        fontFamily: "monospace",
        fontWeight: 700,
        fontSize: "1.125rem",
        letterSpacing: "0.04em",
      }}
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Help section config
// ---------------------------------------------------------------------------

const helpSectionConfig = {
  columns: [
    {
      title: "Get in touch for support",
      icon_description: "Support Icon",
      icon: LifeBuoyIcon,
      link: "https://www.quantinuum.com/contact/docs",
      description: "Need help? Fill out our support form here",
    },
    {
      title: "Publications",
      icon_description: "Publications Icon",
      icon: BookIcon,
      link: "https://www.quantinuum.com/research/research-areas#publications",
      description: "Find our latest research publications here",
    },
  ],
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Home page — Server Component.
 *
 * Projects are driven by the combined search index so that running
 * `npm run build:search-index` after adding a new sphinx output is enough
 * to surface it here. Descriptions and quick-links live in
 * lib/docs-projects.ts.
 */
export default function Home() {
  // Reads from the module-level singleton in search-index.ts — no I/O per
  // request.
  const projects = getEnrichedProjects();

  return (
    <>
      <DocsNavBar activePath="/" />
      <DocsPageLayout>
        <DocsHeaderWrapper>
          <DocsHeaderLeft>
            <QuantinuumLogo className="-mb-1 w-[18rem] md:w-[32rem] h-10 md:h-16 dark:invert" />
            <DocsHeaderSubtitle className="mb-4">
              Technical Documentation
            </DocsHeaderSubtitle>
            <p className="text-muted-foreground">
              Explore the documentation, tutorials, and knowledge articles for
              our products and opensource toolkits at the links below.
            </p>
            <div className="mt-6">
              <SearchBox />
            </div>
          </DocsHeaderLeft>
          <DocsHeaderRight className="hidden md:flex">
            <QLogo className="w-64 h-64 ml-48" />
          </DocsHeaderRight>
        </DocsHeaderWrapper>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project) => (
            <Card className="px-0 md:px-4 py-4" key={project.id}>
              <CardHeader>
                {/* Logo badge links to the project index page */}
                <a
                  href={`${project.basePath}/index.html`}
                  className="transition hover:opacity-70"
                  aria-label={`${project.displayName} documentation home`}
                  target={project.isExternal ? "_blank" : undefined}
                  rel={project.isExternal ? "noreferrer" : undefined}
                >
                  <ProjectLogo
                    name={project.displayName}
                    accentColor={project.accentColor}
                  />
                </a>

                <div className="h-1" />
                <CardDescription>{project.description}</CardDescription>
                <div className="h-5" />

                <ul className="flex flex-col gap-6">
                  {project.links.map(({ url, subtitle, title }) => (
                    <li key={title}>
                      <a
                        className="font-semibold tracking-tight text-blue-600 dark:text-blue-300"
                        href={url}
                        target={project.isExternal ? "_blank" : undefined}
                        rel={project.isExternal ? "noreferrer" : undefined}
                      >
                        {title}
                      </a>
                      <p>{subtitle}</p>
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          ))}
        </section>

        <DocsHelpCard {...helpSectionConfig} />
        <DocsFooter />
      </DocsPageLayout>
    </>
  );
}
