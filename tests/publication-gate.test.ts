import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  evaluateEvidenceGate,
  evaluateFinalGate,
} from "@/lib/investigations/publication-gate";
import type {
  EvidenceMatrix,
  ReviewerResult,
  WorkflowDecision,
} from "@/lib/adk/public-wire/contracts";

const draft = "A supported civic fact.";
const draftHash = createHash("sha256").update(draft).digest("hex");
const investigationId = randomUUID();
const claimId = randomUUID();

function matrix(): EvidenceMatrix {
  return {
    investigationId,
    revision: 1,
    candidateId: randomUUID(),
    claims: [
      {
        claimId,
        investigationId,
        revision: 1,
        normalizedText: "A supported civic fact.",
        claimType: "action",
        importance: "material",
        status: "supported",
        createdByEventId: randomUUID(),
        promptVersion: "p1",
        schemaVersion: "1",
      },
    ],
    evidenceLinks: [
      {
        evidenceLinkId: randomUUID(),
        claimId,
        artifactId: randomUUID(),
        artifactVersion: 0,
        sourceUrl: "https://example.gov/notice",
        supportingExcerpt: "A supported civic fact.",
        startOffset: 0,
        endOffset: 23,
        relation: "supports",
        sourceAuthority: "official",
        extractorEventId: randomUUID(),
        verifierEventId: randomUUID(),
        verifiedAt: "2026-07-18T12:00:00.000Z",
        confidence: 1,
      },
    ],
    contradictions: [],
    missingEvidence: [],
    sourceDiversity: 1,
    officialSourceCount: 1,
    contentFingerprint: createHash("sha256").update("matrix").digest("hex"),
    createdByInvocationId: "invocation-1",
    policyVersion: "policy-1",
  };
}

function decision(): WorkflowDecision {
  return {
    outcome: "publish",
    reasonCodes: ["EVIDENCE_COMPLETE"],
    explanation: "Evidence complete.",
    blockingClaimIds: [],
    suggestedQueries: [],
    eventId: randomUUID(),
    policyVersion: "policy-1",
  };
}

function reviews(): ReviewerResult[] {
  return (["factual", "style", "reliability", "reachability"] as const).map(
    (reviewer) => ({
      reviewer,
      outcome: "pass",
      issueCodes: [],
      reviewedContentHash: draftHash,
    }),
  );
}

describe("publication gates", () => {
  it("passes only a complete real evidence matrix", () => {
    expect(
      evaluateEvidenceGate({
        matrix: matrix(),
        decision: decision(),
        providerMode: "real",
      }).passed,
    ).toBe(true);
  });

  it.each([
    ["demo mode", (value: EvidenceMatrix) => value, "demo" as const],
    [
      "missing evidence",
      (value: EvidenceMatrix) => ({ ...value, evidenceLinks: [] }),
      "real" as const,
    ],
    [
      "blocking contradiction",
      (value: EvidenceMatrix) => ({
        ...value,
        contradictions: [
          {
            claimId,
            evidenceLinkIds: [value.evidenceLinks[0].evidenceLinkId],
            blocking: true,
          },
        ],
      }),
      "real" as const,
    ],
    [
      "no official source",
      (value: EvidenceMatrix) => ({ ...value, officialSourceCount: 0 }),
      "real" as const,
    ],
  ])("blocks %s", (_label, mutate, providerMode) => {
    expect(
      evaluateEvidenceGate({
        matrix: mutate(matrix()) as EvidenceMatrix,
        decision: decision(),
        providerMode,
      }).passed,
    ).toBe(false);
  });

  it("requires every typed review to pass the exact draft hash", () => {
    const evidenceGate = evaluateEvidenceGate({
      matrix: matrix(),
      decision: decision(),
      providerMode: "real",
    });
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
      }).passed,
    ).toBe(true);
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft: `${draft} Changed.`,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
      }).passed,
    ).toBe(false);
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews().filter(
          (review) => review.reviewer !== "reliability",
        ),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
      }).passed,
    ).toBe(false);
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: true,
      }).passed,
    ).toBe(false);
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
        releaseAttestationRequired: true,
        releaseAttestationPassed: false,
      }),
    ).toEqual({
      passed: false,
      reasonCodes: ["WORKFLOW_RELEASE_NOT_ATTESTED"],
    });
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
        releaseAttestationRequired: true,
        releaseAttestationPassed: true,
      }).passed,
    ).toBe(true);
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
        sourcePacketComplete: false,
      }),
    ).toEqual({ passed: false, reasonCodes: ["SOURCE_PACKET_INCOMPLETE"] });
    expect(
      evaluateFinalGate({
        evidenceGate,
        draft,
        reviewedDraftHash: draftHash,
        reviews: reviews(),
        publicationBlocked: false,
        cancelled: false,
        shadowOnly: false,
        changeDispositionRequired: true,
      }),
    ).toEqual({
      passed: false,
      reasonCodes: ["HUMAN_CHANGE_DISPOSITION_REQUIRED"],
    });
  });
});
