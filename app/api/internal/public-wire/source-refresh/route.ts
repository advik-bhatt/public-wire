import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { authenticateInternalCommand } from "@/lib/investigations/internal-auth";
import { sourceRefreshRequestSchema } from "@/lib/investigations/change-intelligence";
import { PostgresPublicWireStore } from "@/lib/investigations/postgres-store";

export async function POST(request: NextRequest) {
  if (!authenticateInternalCommand(request))
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const parsed = sourceRefreshRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST" } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const requesterScopeHash = createHash("sha256")
      .update(`internal-source-refresh:${parsed.data.investigationId}`)
      .digest("hex");
    const job = await new PostgresPublicWireStore().enqueueSourceRefresh({
      ...parsed.data,
      requesterScopeHash,
    });
    return NextResponse.json(
      { job },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "CONFLICT" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
}
