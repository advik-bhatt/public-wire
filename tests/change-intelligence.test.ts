import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assessClaimLineageChanges,
  changeAssessmentSchema,
  dispositionEffect,
  normalizedTextHash,
  sourceRefreshDisposition,
} from "@/lib/investigations/change-intelligence";
import {
  conflictFingerprint,
  publicDissentEvidence,
  validateDissentProposal,
  type PersistedConflict,
} from "@/lib/investigations/dissent-policy";

function conflict(
  overrides: Partial<PersistedConflict["evidence"][number]> = {},
): PersistedConflict {
  const claimLineageId = randomUUID();
  const evidence: PersistedConflict["evidence"] = [
    {
      evidenceLinkId: randomUUID(),
      relation: "supports",
      authority: "official",
      effectiveAt: "2026-07-20T12:00:00.000Z",
      scopeKey: "same",
      artifactContentHash: "a".repeat(64),
      accessClassification: "public",
      ...overrides,
    },
    {
      evidenceLinkId: randomUUID(),
      relation: "contradicts",
      authority: "official",
      effectiveAt: "2026-07-20T12:00:00.000Z",
      scopeKey: "same",
      artifactContentHash: "b".repeat(64),
      accessClassification: "public",
      ...overrides,
    },
  ];
  const body = { claimLineageId, evidence };
  return { ...body, conflictFingerprint: conflictFingerprint(body) };
}

describe("change intelligence policies", () => {
  it("stops an unchanged source before revisions or model calls", () => {
    const hash = normalizedTextHash("Same civic notice");
    expect(
      sourceRefreshDisposition({ priorHash: hash, currentHash: hash }),
    ).toEqual({
      outcome: "unchanged",
      createRevision: false,
      callModel: false,
      mayRetract: false,
    });
  });

  it("never turns an unreachable source into a retraction", () => {
    expect(
      sourceRefreshDisposition({ priorHash: "a".repeat(64), httpStatus: 404 }),
    ).toEqual({
      outcome: "unreachable",
      createRevision: false,
      callModel: false,
      mayRetract: false,
    });
    expect(
      changeAssessmentSchema.safeParse({
        outcome: "unreachable",
        requiresHumanDisposition: false,
        normalizedDiffHash: "a".repeat(64),
        affectedLineageIds: [],
        deltas: [
          { claimLineageId: randomUUID(), kind: "removed", publicSafe: true },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires authenticated human correction/retraction decisions without changing evidence support", () => {
    expect(dispositionEffect("retract")).toEqual({
      permitsEvidenceSupport: false,
      keepsRouteHistory: true,
      removesFromCurrentEdition: true,
      requiresNewRevision: true,
    });
    expect(dispositionEffect("keep_held").permitsEvidenceSupport).toBe(false);
  });

  it("classifies persisted claim-lineage changes without a hardcoded material outcome", () => {
    const lineage = randomUUID();
    const base = {
      claimLineageId: lineage,
      text: "The route is open.",
      status: "supported" as const,
      importance: "material" as const,
      publicSafe: true,
    };
    expect(
      assessClaimLineageChanges({ prior: [base], current: [base] }).outcome,
    ).toBe("no_editorial_impact");
    expect(
      assessClaimLineageChanges({
        prior: [base],
        current: [
          { ...base, text: "The route may be open.", status: "disputed" },
        ],
      }),
    ).toMatchObject({
      outcome: "possible_correction",
      requiresHumanDisposition: true,
    });
    expect(
      assessClaimLineageChanges({ prior: [base], current: [] }),
    ).toMatchObject({
      outcome: "possible_retraction",
      requiresHumanDisposition: true,
    });
    expect(
      assessClaimLineageChanges({
        prior: [{ ...base, importance: "contextual", text: "Background A" }],
        current: [{ ...base, importance: "contextual", text: "Background B" }],
      }).outcome,
    ).toBe("clarification");
  });

  it("does not let an agent vote away an equal-authority same-scope conflict", () => {
    const value = conflict();
    expect(() =>
      validateDissentProposal(value, {
        conflictFingerprint: value.conflictFingerprint,
        proposedOutcome: "resolved_supported",
        basisCode: "UNEQUAL_AUTHORITY",
        supportingEvidenceLinkIds: [value.evidence[0].evidenceLinkId],
        limitingEvidenceLinkIds: [value.evidence[1].evidenceLinkId],
        scopeNote: "One side won a vote.",
      }),
    ).toThrow("DISSENT_CANNOT_VOTE_AWAY_EQUAL_AUTHORITY_CONFLICT");
  });

  it("accepts a bounded unresolved decision and filters restricted evidence from public projection", () => {
    const value = conflict();
    expect(
      validateDissentProposal(value, {
        conflictFingerprint: value.conflictFingerprint,
        proposedOutcome: "unresolved_material",
        basisCode: "EQUAL_AUTHORITY_CONFLICT",
        supportingEvidenceLinkIds: [value.evidence[0].evidenceLinkId],
        limitingEvidenceLinkIds: [value.evidence[1].evidenceLinkId],
        scopeNote: "The same-scope official evidence remains in conflict.",
      }).proposedOutcome,
    ).toBe("unresolved_material");
    const restricted = {
      ...value,
      evidence: [
        {
          ...value.evidence[0],
          accessClassification: "internal-restricted" as const,
        },
        value.evidence[1],
      ],
    };
    expect(publicDissentEvidence(restricted)).toEqual([value.evidence[1]]);
  });
});
