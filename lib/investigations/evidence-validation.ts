import "server-only";

import { createHash } from "node:crypto";
import type { z } from "zod";
import {
  evidenceMatrixSchema,
  workflowDecisionSchema,
} from "@/lib/adk/public-wire/contracts";
import type { SourceArtifact } from "@/lib/adk/public-wire/contracts";
import type { extractorOutputSchema } from "@/lib/adk/public-wire/agents/extractor";
import type { verifierOutputSchema } from "@/lib/adk/public-wire/agents/claim-verifier";
import { assertSafePublicUrl } from "@/lib/adk/public-wire/plugins/source-safety";

type Extraction = z.infer<typeof extractorOutputSchema>;
type Verification = z.infer<typeof verifierOutputSchema>;

function stableUuid(value: string) {
  const bytes = createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildValidatedEvidence(params: {
  investigationId: string;
  revision: number;
  invocationId: string;
  extractionEventId: string;
  verificationEventId: string;
  decisionEventId: string;
  normalizedArtifact: SourceArtifact;
  normalizedText: string;
  allowedSourceHosts: string[];
  sourceAuthority: "official" | "first-party" | "public-secondary" | "unknown";
  extraction: Extraction;
  verification: Verification;
  promptVersion: string;
  schemaVersion: string;
  policyVersion: string;
  workflowReady: boolean;
  verifiedAt: string;
}) {
  const verificationByKey = new Map(
    params.verification.claims.map((claim) => [claim.claimKey, claim]),
  );
  const expectedKeys = new Set(
    params.extraction.claims.map((claim) => claim.claimKey),
  );
  const verificationKeys = params.verification.claims.map(
    (claim) => claim.claimKey,
  );
  const verificationComplete =
    new Set(verificationKeys).size === verificationKeys.length &&
    verificationKeys.length === expectedKeys.size &&
    verificationKeys.every((key) => expectedKeys.has(key));
  let allReferencesValid = true;
  const evidenceByClaimKey = new Map<
    string,
    Array<{
      evidenceLinkId: string;
      claimId: string;
      artifactId: string;
      artifactVersion: number;
      sourceUrl: string;
      supportingExcerpt: string;
      startOffset: number;
      endOffset: number;
      relation: "supports" | "contradicts" | "contextualizes";
      sourceAuthority:
        | "official"
        | "first-party"
        | "public-secondary"
        | "unknown";
      extractorEventId: string;
      verifierEventId: string;
      verifiedAt: string;
      confidence: number;
    }>
  >();

  const claims = params.extraction.claims.map((claim) => {
    const claimId = stableUuid(
      `${params.investigationId}:${params.revision}:claim:${claim.claimKey}`,
    );
    const validLinks = claim.evidence.flatMap((reference, index) => {
      let safeUrl = false;
      try {
        assertSafePublicUrl(reference.sourceUrl, params.allowedSourceHosts);
        safeUrl = true;
      } catch {
        safeUrl = false;
      }
      const exactArtifact =
        reference.artifactName === params.normalizedArtifact.adkArtifactName &&
        reference.artifactVersion ===
          params.normalizedArtifact.adkArtifactVersion &&
        reference.sourceUrl === params.normalizedArtifact.sourceUrl;
      const exactExcerpt =
        reference.endOffset <= params.normalizedText.length &&
        params.normalizedText.slice(
          reference.startOffset,
          reference.endOffset,
        ) === reference.excerpt;
      if (!safeUrl || !exactArtifact || !exactExcerpt) {
        allReferencesValid = false;
        return [];
      }
      return [
        {
          evidenceLinkId: stableUuid(
            `${params.investigationId}:${params.revision}:evidence:${claim.claimKey}:${index}:${fingerprint(reference)}`,
          ),
          claimId,
          artifactId: params.normalizedArtifact.artifactId,
          artifactVersion: params.normalizedArtifact.adkArtifactVersion,
          sourceUrl: params.normalizedArtifact.sourceUrl,
          supportingExcerpt: reference.excerpt,
          startOffset: reference.startOffset,
          endOffset: reference.endOffset,
          relation: reference.relation,
          sourceAuthority: params.sourceAuthority,
          extractorEventId: params.extractionEventId,
          verifierEventId: params.verificationEventId,
          verifiedAt: params.verifiedAt,
          confidence: 1,
        },
      ];
    });
    evidenceByClaimKey.set(claim.claimKey, validLinks);
    const verification = verificationByKey.get(claim.claimKey);
    const supports = validLinks.some((link) => link.relation === "supports");
    const contradicts = validLinks.some(
      (link) => link.relation === "contradicts",
    );
    const status =
      verificationComplete && verification?.outcome === "supported" && supports
        ? "supported"
        : verification?.outcome === "disputed" && contradicts
          ? "disputed"
          : "unsupported";
    return {
      claimId,
      investigationId: params.investigationId,
      revision: params.revision,
      normalizedText: claim.text,
      claimType: claim.claimType,
      importance: claim.importance,
      status,
      createdByEventId: params.extractionEventId,
      promptVersion: params.promptVersion,
      schemaVersion: params.schemaVersion,
      claimLineageId: claim.priorClaimLineageId,
    } as const;
  });
  const evidenceLinks = [...evidenceByClaimKey.values()].flat();
  const claimKeyById = new Map(
    claims.map((claim, index) => [
      claim.claimId,
      params.extraction.claims[index].claimKey,
    ]),
  );
  const contradictions = claims.flatMap((claim) => {
    const links =
      evidenceByClaimKey
        .get(claimKeyById.get(claim.claimId)!)
        ?.filter((link) => link.relation === "contradicts") ?? [];
    return links.length
      ? [
          {
            claimId: claim.claimId,
            evidenceLinkIds: links.map((link) => link.evidenceLinkId),
            blocking: claim.importance === "material",
          },
        ]
      : [];
  });
  const missingEvidence = claims.flatMap((claim) =>
    claim.status === "supported"
      ? []
      : [
          {
            claimId: claim.claimId,
            reasonCode: "NO_SOURCE" as const,
            suggestedQueries: [],
          },
        ],
  );
  const evidenceVerified =
    verificationComplete &&
    allReferencesValid &&
    claims.some((claim) => claim.importance === "material") &&
    claims
      .filter((claim) => claim.importance === "material")
      .every((claim) => claim.status === "supported") &&
    contradictions.every((item) => !item.blocking) &&
    evidenceLinks.some((link) => link.sourceAuthority === "official");
  const evidenceComplete = params.workflowReady && evidenceVerified;
  const hasBlockingContradiction = contradictions.some((item) => item.blocking);
  const matrixBody = {
    investigationId: params.investigationId,
    revision: params.revision,
    candidateId: stableUuid(
      `${params.investigationId}:${params.revision}:candidate`,
    ),
    claims,
    evidenceLinks,
    contradictions,
    missingEvidence,
    sourceDiversity: new Set(evidenceLinks.map((link) => link.sourceUrl)).size,
    officialSourceCount: new Set(
      evidenceLinks
        .filter((link) => link.sourceAuthority === "official")
        .map((link) => link.sourceUrl),
    ).size,
    createdByInvocationId: params.invocationId,
    policyVersion: params.policyVersion,
  };
  const matrix = evidenceMatrixSchema.parse({
    ...matrixBody,
    contentFingerprint: fingerprint(matrixBody),
  });
  const decisionReason = evidenceVerified
    ? ("EVIDENCE_COMPLETE" as const)
    : !allReferencesValid
      ? ("INVALID_MODEL_OUTPUT" as const)
      : hasBlockingContradiction
        ? ("BLOCKING_CONTRADICTION" as const)
        : ("MISSING_EVIDENCE" as const);
  const decision = workflowDecisionSchema.parse({
    outcome: evidenceVerified ? "publish" : "hold",
    reasonCodes: [decisionReason],
    explanation: evidenceVerified
      ? "Every material claim has exact, validated artifact-backed evidence."
      : hasBlockingContradiction
        ? "The deterministic evidence gate found a blocking contradiction."
        : "The deterministic evidence gate held this revision.",
    blockingClaimIds: claims
      .filter(
        (claim) =>
          claim.importance === "material" && claim.status !== "supported",
      )
      .map((claim) => claim.claimId),
    suggestedQueries: [],
    eventId: params.decisionEventId,
    policyVersion: params.policyVersion,
  });
  return {
    matrix,
    decision,
    evidenceByClaimKey,
    verificationComplete,
    allReferencesValid,
    evidenceVerified,
    evidenceComplete,
  };
}
