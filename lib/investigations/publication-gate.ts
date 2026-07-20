import { createHash } from "node:crypto";
import type {
  EvidenceMatrix,
  ReviewerResult,
  WorkflowDecision,
} from "@/lib/adk/public-wire/contracts";

export type GateResult =
  | { passed: true; contentHash: string }
  | { passed: false; reasonCodes: string[] };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function evaluateEvidenceGate(params: {
  matrix: EvidenceMatrix;
  decision: WorkflowDecision;
  providerMode: "real" | "demo" | "degraded" | "shadow";
}): GateResult {
  const reasons = new Set<string>();
  const materialClaims = params.matrix.claims.filter(
    (claim) => claim.importance === "material",
  );
  const evidenceByClaim = new Map<string, number>();
  for (const link of params.matrix.evidenceLinks) {
    if (link.relation === "supports" && link.verifiedAt) {
      evidenceByClaim.set(
        link.claimId,
        (evidenceByClaim.get(link.claimId) ?? 0) + 1,
      );
    }
  }
  if (params.providerMode !== "real") reasons.add("NON_REAL_PROVIDER_MODE");
  if (params.decision.outcome !== "publish")
    reasons.add("EDITORIAL_DECISION_NOT_PUBLISH");
  if (materialClaims.length === 0) reasons.add("NO_MATERIAL_CLAIMS");
  if (
    materialClaims.some(
      (claim) =>
        claim.status !== "supported" || !evidenceByClaim.get(claim.claimId),
    )
  )
    reasons.add("MISSING_MATERIAL_EVIDENCE");
  if (params.matrix.contradictions.some((item) => item.blocking))
    reasons.add("BLOCKING_CONTRADICTION");
  if (params.matrix.missingEvidence.length > 0) reasons.add("MISSING_EVIDENCE");
  if (params.matrix.officialSourceCount < 1) reasons.add("NO_OFFICIAL_SOURCE");

  return reasons.size > 0
    ? { passed: false, reasonCodes: [...reasons] }
    : { passed: true, contentHash: params.matrix.contentFingerprint };
}

export function evaluateFinalGate(params: {
  evidenceGate: GateResult;
  draft: string;
  reviewedDraftHash: string;
  reviews: ReviewerResult[];
  publicationBlocked: boolean;
  cancelled: boolean;
  shadowOnly: boolean;
  requiredReviewers?: ReviewerResult["reviewer"][];
  releaseAttestationRequired?: boolean;
  releaseAttestationPassed?: boolean;
  sourcePacketComplete?: boolean;
  changeDispositionRequired?: boolean;
}): GateResult {
  const reasons = new Set<string>();
  const draftHash = hash(params.draft);
  const required = params.requiredReviewers ?? [
    "factual",
    "style",
    "reliability",
    "reachability",
  ];

  if (!params.evidenceGate.passed) reasons.add("EVIDENCE_GATE_FAILED");
  if (!params.draft.trim()) reasons.add("EMPTY_DRAFT");
  if (draftHash !== params.reviewedDraftHash)
    reasons.add("DRAFT_CHANGED_AFTER_REVIEW");
  for (const reviewer of required) {
    const result = params.reviews.find(
      (review) => review.reviewer === reviewer,
    );
    if (
      !result ||
      result.outcome !== "pass" ||
      result.reviewedContentHash !== draftHash
    ) {
      reasons.add(`REVIEW_${reviewer.toUpperCase()}_NOT_PASS`);
    }
  }
  if (params.publicationBlocked) reasons.add("PUBLICATION_BLOCKED");
  if (params.cancelled) reasons.add("JOB_CANCELLED");
  if (params.shadowOnly) reasons.add("SHADOW_ONLY");
  if (params.releaseAttestationRequired && !params.releaseAttestationPassed)
    reasons.add("WORKFLOW_RELEASE_NOT_ATTESTED");
  if (params.sourcePacketComplete === false)
    reasons.add("SOURCE_PACKET_INCOMPLETE");
  if (params.changeDispositionRequired)
    reasons.add("HUMAN_CHANGE_DISPOSITION_REQUIRED");

  return reasons.size > 0
    ? { passed: false, reasonCodes: [...reasons] }
    : { passed: true, contentHash: draftHash };
}
