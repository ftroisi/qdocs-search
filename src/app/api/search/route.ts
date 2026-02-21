/**
 * GET /api/search
 *
 * Query parameters:
 *   q        {string}  required  – the search query
 *   project  {string}  optional  – scope results to one project subsite
 *   limit    {number}  optional  – max results to return (1–50, default 20)
 *
 * Response: SearchResponse (see src/lib/types.ts)
 *
 * Example:
 *   GET /api/search?q=quantum+circuits&project=qiskit-nature&limit=10
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { search, DEFAULT_LIMIT } from "@/lib/search-engine";
import { getProject } from "@/lib/search-index";
import { recordSearchPerformed } from "@/lib/telemetry";
import type { SearchResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// Input validation schema
// ---------------------------------------------------------------------------

const querySchema = z.object({
  q: z
    .string()
    .min(1, "Query must not be empty")
    .max(200, "Query too long"),
  project: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(DEFAULT_LIMIT),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  // Parse & validate query parameters
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { q, project, limit } = parsed.data;

  // Validate that the requested project actually exists in the index
  if (project !== undefined && !getProject(project)) {
    return NextResponse.json(
      { error: `Unknown project "${project}"` },
      { status: 404 }
    );
  }

  // Run the search
  const allResults = search(q, { project, limit: 500 }); // over-fetch for total count
  const limited = allResults.slice(0, limit);

  // Log telemetry
  recordSearchPerformed(q, project ?? null, limited.length);

  const durationMs = Date.now() - start;

  const body: SearchResponse = {
    results: limited,
    meta: {
      query: q,
      project: project ?? null,
      count: limited.length,
      total: allResults.length,
      durationMs,
    },
  };

  return NextResponse.json(body, {
    headers: {
      // Allow browsers to cache identical queries briefly (stale-while-revalidate)
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  });
}
