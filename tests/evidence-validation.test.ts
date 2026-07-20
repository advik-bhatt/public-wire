import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildValidatedEvidence } from "@/lib/investigations/evidence-validation";
import type { SourceArtifact } from "@/lib/adk/public-wire/contracts";

const normalizedText = "Town hall opens at 9.";
const artifact: SourceArtifact = {
  artifactId: randomUUID(),
  artifactKind: "normalized",
  adkArtifactName: "sources/town/normalized.txt",
  adkArtifactVersion: 0,
  investigationId: randomUUID(),
  sourceId: "town",
  sourceUrl: "https://example.gov/notice",
  canonicalUrl: "https://example.gov/notice",
  mediaType: "text/plain",
  fetchedAt: "2026-07-19T12:00:00.000Z",
  contentHash: "a".repeat(64),
  derivedFromArtifactId: randomUUID(),
  derivedFromArtifactVersion: 0,
  normalizerVersion: "plain-text-v1",
  fetchMethod: "direct",
  accessClassification: "internal-restricted",
  storageUri: "artifact://test/source",
};

function build(
  excerpt = normalizedText,
  sourceUrl = artifact.sourceUrl,
  relation: "supports" | "contradicts" = "supports",
  outcome: "supported" | "disputed" = "supported",
) {
  return buildValidatedEvidence({
    investigationId: artifact.investigationId,
    revision: 1,
    invocationId: "invocation-1",
    extractionEventId: randomUUID(),
    verificationEventId: randomUUID(),
    decisionEventId: randomUUID(),
    normalizedArtifact: artifact,
    normalizedText,
    allowedSourceHosts: ["example.gov"],
    sourceAuthority: "official",
    extraction: {
      candidateTitle: "Town hall hours changed",
      whyItMatters: "Residents need the current opening time.",
      whoIsAffected: ["Residents"],
      claims: [
        {
          claimKey: "claim_hours",
          text: normalizedText,
          claimType: "action",
          importance: "material",
          evidence: [
            {
              artifactName: artifact.adkArtifactName,
              artifactVersion: 0,
              sourceUrl,
              excerpt,
              startOffset: 0,
              endOffset: 21,
              relation,
              authority: "official",
            },
          ],
        },
      ],
    },
    verification: {
      claims: [
        {
          claimKey: "claim_hours",
          outcome,
          issueCodes: outcome === "disputed" ? ["CONTRADICTED" as const] : [],
        },
      ],
      blockingContradiction: outcome === "disputed",
    },
    promptVersion: "p1",
    schemaVersion: "1",
    policyVersion: "policy-1",
    workflowReady: true,
    verifiedAt: "2026-07-19T12:01:00.000Z",
  });
}

describe("deterministic evidence validation", () => {
  it("accepts only an exact captured artifact slice", () => {
    const result = build();
    expect(result.evidenceComplete).toBe(true);
    expect(result.matrix.claims[0].status).toBe("supported");
    expect(result.matrix.evidenceLinks[0].supportingExcerpt).toBe(
      normalizedText,
    );
  });

  it("holds mismatched excerpts and source identities", () => {
    const excerptMismatch = build("Town hall opens at 8.");
    expect(excerptMismatch.allReferencesValid).toBe(false);
    expect(excerptMismatch.evidenceComplete).toBe(false);
    expect(excerptMismatch.matrix.claims[0].status).toBe("unsupported");

    const sourceMismatch = build(normalizedText, "https://other.gov/notice");
    expect(sourceMismatch.allReferencesValid).toBe(false);
    expect(sourceMismatch.matrix.evidenceLinks).toHaveLength(0);
  });

  it("preserves a blocking contradiction as a typed decision", () => {
    const result = build(
      normalizedText,
      artifact.sourceUrl,
      "contradicts",
      "disputed",
    );
    expect(result.evidenceVerified).toBe(false);
    expect(result.matrix.contradictions).toHaveLength(1);
    expect(result.decision.reasonCodes).toEqual(["BLOCKING_CONTRADICTION"]);
  });
});
