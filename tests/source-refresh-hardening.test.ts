import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captureSourceArtifacts } from "@/lib/adk/public-wire/services/artifact-service";
import { publicInvestigationDetailSchema } from "@/lib/public-wire-view-models/schemas";
import {
  demoInvestigation,
  referenceContradictionInvestigation,
} from "@/lib/public-wire-view-models/fixtures";
import { workflowAttestationEnforced } from "@/lib/investigations/workflow-release";

const worker = readFileSync(
  new URL("../workers/public-wire-investigation.ts", import.meta.url),
  "utf8",
);
const store = readFileSync(
  new URL("../lib/investigations/postgres-store.ts", import.meta.url),
  "utf8",
);
const projections = readFileSync(
  new URL("../lib/investigations/public-projections.ts", import.meta.url),
  "utf8",
);
const dispositionRoute = readFileSync(
  new URL(
    "../app/api/internal/public-wire/dispositions/route.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("source refresh hardening", () => {
  it("has an explicit restart branch and does not exit unchanged after revision advance", () => {
    expect(store).toContain("resumeRevision");
    expect(store).toContain(
      "o.revision=$3 AND r.revision_kind='source_refresh'",
    );
    expect(worker).toMatch(
      /refreshInput\?\.normalized_content_hash\s*===\s*normalizedHash\s*&&\s*!identity\.resumeRevision/,
    );
  });

  it("preserves the prior publication and fails closed on an incomplete multi-source packet", () => {
    expect(worker).toContain("const priorPublication");
    expect(worker).toContain("publication: currentPublication");
    expect(worker).toContain("sourcePacketComplete: refreshPacketComplete");
    expect(worker).toContain("previousProjection.data.claims");
  });

  it("uses assessed/open dissent language rather than claiming resolution", () => {
    expect(worker).toContain('eventCode: "DISSENT_ASSESSED"');
    expect(worker).not.toContain('eventCode: "DISSENT_RESOLVED"');
    expect(worker).toContain("resolved_supported_proposed");
  });

  it("does not substitute fixtures after a live database failure", () => {
    const catchBody = projections.slice(projections.lastIndexOf("} catch {"));
    expect(catchBody).not.toContain("getDemoEdition");
    expect(catchBody).toContain('runtimeMode: "degraded"');
  });

  it("flows restricted watch classification into both artifact versions", async () => {
    const saved: Array<{ metadata: { accessClassification: string } }> = [];
    const artifactService = {
      saveArtifact: async (value: {
        customMetadata: { accessClassification: string };
      }) => {
        saved.push({ metadata: value.customMetadata });
        return 0;
      },
    };
    const result = await captureSourceArtifacts({
      artifactService: artifactService as never,
      investigationId: crypto.randomUUID(),
      userId: "town:test",
      sessionId: "attempt:test",
      sourceId: "restricted",
      sourceUrl: "https://example.gov/notice",
      rawText: "Restricted notice",
      fetchMethod: "upload",
      accessClassification: "internal-restricted",
    });
    expect(result.raw.accessClassification).toBe("internal-restricted");
    expect(result.normalized.accessClassification).toBe("internal-restricted");
    expect(saved.map((item) => item.metadata.accessClassification)).toEqual([
      "internal-restricted",
      "internal-restricted",
    ]);
    expect(store).toContain("a.access_classification='public' AND EXISTS");
    expect(store).toContain("w.access_classification='public'");
  });

  it("keeps legacy V1 strict and requires V2 for change-intelligence fields", () => {
    expect(
      publicInvestigationDetailSchema.parse(demoInvestigation).schemaVersion,
    ).toBe("1");
    expect(
      publicInvestigationDetailSchema.safeParse({
        ...demoInvestigation,
        sourceVersions: [],
      }).success,
    ).toBe(false);
    expect(referenceContradictionInvestigation.schemaVersion).toBe("2");
    expect(
      publicInvestigationDetailSchema.safeParse(
        referenceContradictionInvestigation,
      ).success,
    ).toBe(true);
  });

  it("enforces promotion for canonical ADK even if an opt-out is supplied", () => {
    expect(
      workflowAttestationEnforced({
        NODE_ENV: "production",
        PUBLIC_WIRE_AI_MODE: "adk",
        PUBLIC_WIRE_RELEASE_ATTESTATION_ENFORCED: "false",
      }),
    ).toBe(true);
    expect(
      workflowAttestationEnforced({
        NODE_ENV: "development",
        PUBLIC_WIRE_AI_MODE: "shadow",
        PUBLIC_WIRE_RELEASE_ATTESTATION_ENFORCED: "false",
      }),
    ).toBe(false);
  });

  it("derives disposition actor identity from server authentication and persists a lifecycle projection", () => {
    expect(dispositionRoute).toContain("humanDispositionRequestSchema");
    expect(dispositionRoute).toContain("actor: identity.actor");
    expect(dispositionRoute).not.toContain(
      "humanDispositionCommandSchema.safeParse",
    );
    expect(store).toContain("LIFECYCLE_DISPOSITION");
    expect(store).toContain("approved_projection=$2::jsonb");
    expect(store).toContain(
      "does not assert that the external provider changed its copy",
    );
  });
});
