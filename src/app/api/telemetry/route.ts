/**
 * /api/telemetry
 *
 * POST  – Record a result_selected event.
 *         Body: { event: "result_selected", query: string, docId: string, rank: number }
 *
 * GET   – Retrieve telemetry summary (dev/debug endpoint).
 *         Returns recent searches, top queries, and total counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordResultSelected, getAllEvents, getSummary } from "@/lib/telemetry";

// ---------------------------------------------------------------------------
// POST – client fires this when a user clicks a search result
// ---------------------------------------------------------------------------

const resultSelectedSchema = z.object({
  event: z.literal("result_selected"),
  query: z.string().min(1).max(200),
  docId: z.string().min(1),
  rank: z.number().int().min(0),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = resultSelectedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { query, docId, rank } = parsed.data;
  recordResultSelected(query, docId, rank);

  return NextResponse.json({ ok: true }, { status: 202 });
}

// ---------------------------------------------------------------------------
// GET – return telemetry summary (intended for dev dashboards / monitoring)
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const summary = getSummary();
  return NextResponse.json(summary);
}
