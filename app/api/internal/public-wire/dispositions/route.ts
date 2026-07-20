import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authenticateInternalCommand } from "@/lib/investigations/internal-auth";
import { humanDispositionRequestSchema } from "@/lib/investigations/change-intelligence";
import { PostgresPublicWireStore } from "@/lib/investigations/postgres-store";

export async function POST(request: NextRequest) {
  const identity = authenticateInternalCommand(request);
  if (!identity)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const parsed = humanDispositionRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST" } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const dispositionId =
      await new PostgresPublicWireStore().applyHumanDisposition({
        ...parsed.data,
        actor: identity.actor,
        actorRole: identity.role,
      });
    return NextResponse.json(
      { dispositionId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "CONFLICT" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
}
