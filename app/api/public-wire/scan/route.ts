import { NextResponse } from "next/server";
import { runPublicWireScan } from "@/lib/public-wire-agent";
import { requireAdmin } from "@/lib/public-wire-request-guard";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await runPublicWireScan();
    return NextResponse.json(
      {
        result: {
          area: result.area,
          checkedAt: result.lastChecked,
          runtimeMode: result.runtimeMode,
          metrics: result.metrics,
          publicationState: result.publishing.state,
          editorialOutcome: result.googleEditorial.reviewOutcome,
          reliabilityOutcome: result.lapdogReview.outcome,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "SCAN_FAILED", message: "The scan did not complete." } },
      { status: 500 },
    );
  }
}
