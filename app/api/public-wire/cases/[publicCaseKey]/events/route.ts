import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PostgresPublicWireStore } from "@/lib/investigations/postgres-store";
import { readRequesterScope } from "@/lib/investigations/requester-scope";
import { liveCaseEventsEnabled } from "@/lib/public-wire-ui-flags";

const encoder = new TextEncoder();

function encodeEvent(event: { cursor: number; publicEventKey: string }) {
  return encoder.encode(
    `id: ${event.cursor}\nevent: investigation\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicCaseKey: string }> },
) {
  const { publicCaseKey } = await context.params;
  if (!liveCaseEventsEnabled())
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Case not found." } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  const url = new URL(request.url);
  const after = Number(
    request.headers.get("last-event-id") || url.searchParams.get("after") || 0,
  );
  const epoch = url.searchParams.get("epoch") || "";
  if (!Number.isSafeInteger(after) || after < 0 || !epoch)
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CURSOR",
          message: "Refresh the case snapshot.",
        },
      },
      { status: 400 },
    );
  const store = new PostgresPublicWireStore();
  const scopeHash = readRequesterScope(request)?.scopeHash;
  try {
    const initial = await store.getEvents(
      publicCaseKey,
      scopeHash,
      after,
      epoch,
    );
    if (!initial || initial.snapshot.summary.runtimeMode === "shadow")
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Case not found." } },
        { status: 404, headers: { "Cache-Control": "private, no-store" } },
      );
    if (initial.reset || after > initial.snapshot.snapshotCursor)
      return NextResponse.json(
        {
          error: {
            code: "STREAM_RESET",
            message: "Refresh the case snapshot.",
          },
        },
        { status: 409, headers: { "Cache-Control": "private, no-store" } },
      );
    if (url.searchParams.get("transport") === "poll")
      return NextResponse.json(
        {
          events: initial.events,
          projectionRevision: initial.snapshot.projectionRevision,
          snapshotCursor: initial.snapshot.snapshotCursor,
          streamEpoch: initial.snapshot.streamEpoch,
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let cursor = after;
        let batch = initial;
        const deadline = Date.now() + 25_000;
        try {
          while (!request.signal.aborted && Date.now() < deadline) {
            if (batch.reset) break;
            for (const event of batch.events) {
              controller.enqueue(encodeEvent(event));
              cursor = Math.max(cursor, event.cursor);
            }
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
            await new Promise((resolve) => setTimeout(resolve, 2_000));
            const next = await store.getEvents(
              publicCaseKey,
              scopeHash,
              cursor,
              epoch,
            );
            if (
              !next ||
              next.reset ||
              next.snapshot.summary.runtimeMode === "shadow"
            ) {
              controller.enqueue(encoder.encode("event: reset\ndata: {}\n\n"));
              break;
            }
            batch = next;
          }
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Activity is unavailable.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
