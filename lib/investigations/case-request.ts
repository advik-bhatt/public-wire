import "server-only";

import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveArea } from "@/lib/areas/registry";
import { PostgresPublicWireStore } from "./postgres-store";
import {
  attachRequesterScope,
  getOrCreateRequesterScope,
} from "./requester-scope";
import { publicCaseFilesEnabled } from "@/lib/public-wire-ui-flags";
import { PostgresRuntimeControlService } from "./runtime-controls";
import type { PublicJobView } from "@/lib/public-wire-view-models/schemas";

const caseRequestSchema = z
  .object({
    areaKey: z.string().regex(/^[a-z0-9-]{2,80}$/),
    topic: z.string().trim().min(8).max(240),
    sourceHint: z.string().trim().min(2).max(240).optional(),
    idempotencyKey: z.string().trim().min(16).max(160),
  })
  .strict();

export async function handleCaseRequest(
  request: NextRequest,
  legacyBody = false,
) {
  if (!publicCaseFilesEnabled()) {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Case requests are not enabled for this rollout.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  try {
    const controls = await new PostgresRuntimeControlService().get(true);
    if (controls.mode !== "adk") {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message:
              "Public case requests are not enabled in the current runtime mode.",
          },
        },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const raw = await request.json();
    const body = caseRequestSchema.safeParse(
      legacyBody
        ? {
            areaKey: raw.slug,
            topic: raw.topic,
            sourceHint: raw.sourceHint || undefined,
            idempotencyKey:
              raw.idempotencyKey || request.headers.get("idempotency-key"),
          }
        : raw,
    );
    if (!body.success || !resolveArea(body.data.areaKey)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Choose a supported area and provide a specific topic.",
          },
        },
        { status: 400 },
      );
    }
    const scope = getOrCreateRequesterScope(request);
    if (!scope) {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Private status receipts are not configured.",
          },
        },
        { status: 503 },
      );
    }
    const store = new PostgresPublicWireStore();
    let job: PublicJobView;
    try {
      job = await store.createOrReuse({
        ...body.data,
        requesterScopeHash: scope.scopeHash,
        runtimeMode: "real",
        admissionLimit: 8,
        areaAdmissionLimit: 200,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PUBLIC_WIRE_ADMISSION_REJECTED"
      ) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message:
                "This desk has received several recent requests. Try again later.",
              retryAfterSeconds: 3600,
            },
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
      throw error;
    }
    const response = NextResponse.json(
      { job },
      { status: 202, headers: { "Cache-Control": "private, no-store" } },
    );
    return attachRequesterScope(response, scope);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "The desk could not queue this check right now.",
        },
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
