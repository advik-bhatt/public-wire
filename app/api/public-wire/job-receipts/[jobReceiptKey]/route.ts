import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PostgresPublicWireStore } from "@/lib/investigations/postgres-store";
import { readRequesterScope } from "@/lib/investigations/requester-scope";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobReceiptKey: string }> },
) {
  const { jobReceiptKey } = await context.params;
  const scope = readRequesterScope(request);
  if (!scope)
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Receipt not found." } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  try {
    const job = await new PostgresPublicWireStore().getJobByReceipt(
      jobReceiptKey,
      scope.scopeHash,
    );
    if (!job)
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Receipt not found." } },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    return NextResponse.json(
      { job },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Receipt status is unavailable.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
