import "server-only";

import { query } from "@/lib/db/postgres";
import { resolveArea } from "@/lib/areas/registry";
import {
  getDemoCase,
  getDemoEdition,
} from "@/lib/public-wire-view-models/fixtures";
import {
  publicEditionViewSchema,
  publicInvestigationDetailSchema,
  type PublicEditionBriefV2,
} from "@/lib/public-wire-view-models/schemas";
import { PostgresPublicWireStore } from "./postgres-store";
import { publicCaseFilesEnabled } from "@/lib/public-wire-ui-flags";

export async function getCaseProjection(
  publicCaseKey: string,
  requesterScopeHash?: string,
) {
  if (!publicCaseFilesEnabled()) return undefined;
  const fixture = getDemoCase(publicCaseKey);
  if (fixture) return fixture;
  if (!process.env.DATABASE_URL) return undefined;
  const projection = await new PostgresPublicWireStore().getPublicProjection(
    publicCaseKey,
    requesterScopeHash,
  );
  return projection?.summary.runtimeMode === "shadow" ? undefined : projection;
}

export async function getPublishedBriefBySlug(slug: string) {
  if (!process.env.DATABASE_URL || !/^[a-z0-9-]{3,160}$/.test(slug))
    return undefined;
  try {
    const result = await query<{ payload: unknown }>(
      `SELECT d.approved_projection AS payload
      FROM investigation_disclosures d
      JOIN investigations i ON i.investigation_id=d.investigation_id
      JOIN public_projection_snapshots s ON s.investigation_id=d.investigation_id
      JOIN public_case_keys k ON k.investigation_id=d.investigation_id
      WHERE d.visibility='public' AND d.revoked_at IS NULL AND s.visibility='public' AND k.revoked_at IS NULL
        AND d.approved_projection->'summary'->>'runtimeMode'='real'
        AND d.approved_projection->'publication'->>'slug'=$1
      ORDER BY s.updated_at DESC LIMIT 1`,
      [slug],
    );
    if (!result.rowCount) return undefined;
    const detail = publicInvestigationDetailSchema.safeParse(
      result.rows[0].payload,
    );
    if (
      !detail.success ||
      !detail.data.publication ||
      detail.data.publication.slug !== slug
    )
      return undefined;
    return detail.data;
  } catch {
    return undefined;
  }
}

export async function getEditionProjection(areaKey: string) {
  const area = resolveArea(areaKey);
  if (!area) return undefined;
  if (!process.env.DATABASE_URL) return getDemoEdition(areaKey);
  try {
    const result = await query<{ payload: unknown }>(
      `SELECT d.approved_projection AS payload FROM public_projection_snapshots s
      JOIN investigations i ON i.investigation_id=s.investigation_id
      JOIN investigation_disclosures d ON d.investigation_id=s.investigation_id
      JOIN public_case_keys k ON k.investigation_id=s.investigation_id
      WHERE i.area_key=$1 AND d.visibility='public' AND d.revoked_at IS NULL
        AND k.revoked_at IS NULL AND s.visibility='public'
        AND i.freshness_state='current' AND i.correction_state <> 'retracted'
        AND d.approved_projection->'summary'->>'runtimeMode'='real'
      ORDER BY s.updated_at DESC LIMIT 50`,
      [areaKey],
    );
    const cases = result.rows.map((row) =>
      publicInvestigationDetailSchema.parse(row.payload),
    );
    const briefs = cases.flatMap((detail): PublicEditionBriefV2[] =>
      detail.publication
        ? [
            {
              publicBriefKey: detail.publication.publicBriefKey,
              slug: detail.publication.slug,
              publicCaseKey: detail.summary.publicCaseKey,
              headline: detail.publication.headline,
              summary: detail.publication.summary,
              whyItMatters: detail.publication.whyItMatters,
              whoIsAffected: detail.publication.whoIsAffected,
              category: detail.publication.category,
              publicationState: "confirmed",
              lifecycleState: detail.summary.lifecycleState,
              correctionState: detail.summary.correctionState,
              freshnessState: detail.summary.freshnessState,
              publishedAt: detail.publication.publishedAt,
              updatedAt: detail.publication.updatedAt,
              sourceReceiptCount: detail.publication.sourceReceiptCount,
              materialClaimCount: detail.publication.materialClaimCount,
              changeImpact:
                detail.schemaVersion === "2"
                  ? detail.changeSummary?.impact
                  : undefined,
              changeLabel:
                detail.schemaVersion === "2"
                  ? detail.changeSummary?.label
                  : undefined,
            },
          ]
        : [],
    );
    const generatedAt = new Date().toISOString();
    return publicEditionViewSchema.parse({
      schemaVersion: "2",
      areaKey,
      areaDisplayName: area.displayName,
      generatedAt,
      lastSuccessfulCheckAt: cases.find(
        (detail) => detail.summary.workflowState === "complete",
      )?.summary.updatedAt,
      freshnessState: cases.some(
        (detail) => detail.summary.freshnessState === "stale",
      )
        ? "stale"
        : cases.every(
              (detail) => detail.summary.freshnessState === "current",
            ) && cases.length
          ? "current"
          : "unknown",
      deskState:
        cases.length &&
        cases.every((detail) => detail.summary.freshnessState === "current")
          ? "current"
          : "degraded",
      runtimeMode: "real",
      metrics: {
        confirmedUpdates: briefs.length,
        publicActiveInvestigations: cases.filter(
          (detail) =>
            !["complete", "failed", "cancelled"].includes(
              detail.summary.workflowState,
            ),
        ).length,
        sourceReceipts: cases.reduce(
          (total, detail) => total + detail.summary.sourceReceiptCount,
          0,
        ),
      },
      leadBrief: briefs[0],
      briefs: briefs.slice(1),
      publicInvestigations: cases.map((detail) => detail.summary),
      routineFilters: [],
      publicEvents: cases
        .flatMap((detail) => detail.events)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 6),
      degradedNotice: cases.length
        ? undefined
        : {
            code: "NO_LIVE_DATA",
            message: "No current public desk projection is available.",
          },
    });
  } catch {
    const generatedAt = new Date().toISOString();
    return publicEditionViewSchema.parse({
      schemaVersion: "1",
      areaKey,
      areaDisplayName: area.displayName,
      generatedAt,
      freshnessState: "unknown",
      deskState: "degraded",
      runtimeMode: "degraded",
      metrics: {
        confirmedUpdates: 0,
        publicActiveInvestigations: 0,
        sourceReceipts: 0,
      },
      briefs: [],
      publicInvestigations: [],
      routineFilters: [],
      publicEvents: [],
      degradedNotice: {
        code: "PROVIDER_UNAVAILABLE",
        message:
          "The live edition record is temporarily unavailable. No reference fixtures were substituted for live data.",
      },
    });
  }
}
