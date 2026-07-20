import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PostgresPublicWireStore } from "@/lib/investigations/postgres-store";
import { readRequesterScope } from "@/lib/investigations/requester-scope";
import { getDemoCase } from "@/lib/public-wire-view-models/fixtures";
import { publicCaseFilesEnabled } from "@/lib/public-wire-ui-flags";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicCaseKey: string }> },
) {
  const { publicCaseKey } = await context.params;
  if (!publicCaseFilesEnabled())
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Case not found." } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  const fixture = getDemoCase(publicCaseKey);
  if (fixture)
    return NextResponse.json(
      { case: fixture },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
          ETag: `\"pw-demo-${fixture.projectionRevision}\"`,
        },
      },
    );
  try {
    const projection = await new PostgresPublicWireStore().getPublicProjection(
      publicCaseKey,
      readRequesterScope(request)?.scopeHash,
    );
    if (!projection || projection.summary.runtimeMode === "shadow")
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Case not found." } },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    return NextResponse.json(
      { case: projection },
      {
        headers: {
          "Cache-Control": "private, no-store",
          ETag: `\"pw-${projection.projectionRevision}-${projection.snapshotCursor}\"`,
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Case status is unavailable.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
