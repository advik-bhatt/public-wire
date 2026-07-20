import { z } from "zod";
import {
  correctionStateSchema,
  freshnessStateSchema,
  lifecycleStateSchema,
  publicationStateSchema,
  visibilitySchema,
  workflowStateSchema,
} from "@/lib/public-wire-view-models/schemas";

const internalId = z.string().uuid();
const isoDateTime = z.string().datetime({ offset: true });
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const sourceArtifactSchema = z
  .object({
    artifactId: internalId,
    artifactKind: z.enum([
      "raw",
      "normalized",
      "evidence-matrix",
      "draft",
      "other",
    ]),
    adkArtifactName: z.string().min(1).max(240),
    adkArtifactVersion: z.number().int().nonnegative(),
    investigationId: internalId,
    sourceId: z.string().min(1).max(160),
    sourceUrl: z.string().url(),
    canonicalUrl: z.string().url(),
    mediaType: z.string().min(3).max(120),
    fetchedAt: isoDateTime,
    effectiveAt: isoDateTime.optional(),
    contentHash: sha256,
    derivedFromArtifactId: internalId.optional(),
    derivedFromArtifactVersion: z.number().int().nonnegative().optional(),
    normalizerVersion: z.string().min(1).max(80).optional(),
    fetchMethod: z.enum(["nimble", "direct", "mcp", "upload"]),
    httpStatus: z.number().int().min(100).max(599).optional(),
    accessClassification: z.enum(["public", "internal-restricted"]),
    storageUri: z.string().min(1).max(1000),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (
      artifact.artifactKind === "normalized" &&
      (!artifact.derivedFromArtifactId || !artifact.normalizerVersion)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Normalized artifacts require derivation lineage and normalizer version",
      });
    }
  });

export const claimSchema = z
  .object({
    claimId: internalId,
    investigationId: internalId,
    revision: z.number().int().positive(),
    normalizedText: z.string().min(1).max(1000),
    claimType: z.enum([
      "date",
      "location",
      "action",
      "impact",
      "attribution",
      "other",
    ]),
    importance: z.enum(["material", "contextual"]),
    status: z.enum([
      "proposed",
      "supported",
      "disputed",
      "unsupported",
      "superseded",
    ]),
    createdByEventId: internalId,
    promptVersion: z.string().min(1).max(80),
    schemaVersion: z.string().min(1).max(40),
    claimLineageId: internalId.optional(),
  })
  .strict();

export const evidenceLinkSchema = z
  .object({
    evidenceLinkId: internalId,
    claimId: internalId,
    artifactId: internalId,
    artifactVersion: z.number().int().nonnegative(),
    sourceUrl: z.string().url(),
    supportingExcerpt: z.string().min(1).max(2000),
    startOffset: z.number().int().nonnegative().optional(),
    endOffset: z.number().int().positive().optional(),
    pageNumber: z.number().int().positive().optional(),
    relation: z.enum(["supports", "contradicts", "contextualizes"]),
    sourceAuthority: z.enum([
      "official",
      "first-party",
      "public-secondary",
      "unknown",
    ]),
    extractorEventId: internalId,
    verifierEventId: internalId.optional(),
    verifiedAt: isoDateTime.optional(),
    confidence: z.number().min(0).max(1),
  })
  .strict()
  .superRefine((link, ctx) => {
    if ((link.startOffset === undefined) !== (link.endOffset === undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "Evidence offsets must be supplied together",
      });
    }
    if (link.startOffset !== undefined && link.endOffset! <= link.startOffset) {
      ctx.addIssue({
        code: "custom",
        message: "Evidence end offset must follow its start offset",
      });
    }
  });

export const evidenceMatrixSchema = z
  .object({
    investigationId: internalId,
    revision: z.number().int().positive(),
    candidateId: internalId,
    claims: z.array(claimSchema).max(200),
    evidenceLinks: z.array(evidenceLinkSchema).max(500),
    contradictions: z
      .array(
        z
          .object({
            claimId: internalId,
            evidenceLinkIds: z.array(internalId).min(1),
            blocking: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    missingEvidence: z
      .array(
        z
          .object({
            claimId: internalId,
            reasonCode: z.enum([
              "NO_SOURCE",
              "WEAK_AUTHORITY",
              "STALE",
              "UNREACHABLE",
            ]),
            suggestedQueries: z.array(z.string().max(240)).max(5),
          })
          .strict(),
      )
      .max(100),
    sourceDiversity: z.number().int().nonnegative(),
    officialSourceCount: z.number().int().nonnegative(),
    contentFingerprint: sha256,
    createdByInvocationId: z.string().min(1).max(160),
    policyVersion: z.string().min(1).max(80),
  })
  .strict();

export const decisionReasonSchema = z.enum([
  "EVIDENCE_COMPLETE",
  "MISSING_EVIDENCE",
  "BLOCKING_CONTRADICTION",
  "SOURCE_POLICY_FAILED",
  "NOT_NOVEL",
  "NOT_RESIDENT_RELEVANT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_MODEL_OUTPUT",
  "BUDGET_EXHAUSTED",
  "POLICY_BLOCK",
]);

export const workflowDecisionSchema = z
  .object({
    outcome: z.enum([
      "publish",
      "hold",
      "reject",
      "needs_evidence",
      "needs_revision",
    ]),
    reasonCodes: z.array(decisionReasonSchema).min(1).max(10),
    explanation: z.string().min(1).max(1200),
    blockingClaimIds: z.array(internalId).max(200),
    suggestedQueries: z.array(z.string().max(240)).max(10),
    eventId: internalId,
    policyVersion: z.string().min(1).max(80),
  })
  .strict();

export const reviewerResultSchema = z
  .object({
    reviewer: z.enum([
      "editorial",
      "factual",
      "style",
      "reliability",
      "reachability",
    ]),
    outcome: z.enum([
      "pass",
      "fail",
      "skipped",
      "unavailable",
      "malformed",
      "timed_out",
      "error",
    ]),
    issueCodes: z.array(z.string().min(1).max(80)).max(50),
    reviewedContentHash: sha256,
  })
  .strict();

export const publicWireEventEnvelopeSchema = z
  .object({
    eventId: internalId,
    origin: z.enum(["adk", "application"]),
    adkEventId: z.string().min(1).max(160).optional(),
    invocationId: z.string().min(1).max(160).optional(),
    jobId: internalId,
    jobAttemptId: internalId,
    investigationId: internalId,
    appName: z.string().min(1).max(120),
    userId: z.string().min(1).max(160),
    sessionId: z.string().min(1).max(200),
    author: z.string().max(160).optional(),
    branch: z.string().max(240).optional(),
    eventType: z.string().min(1).max(120),
    occurredAt: isoDateTime,
    persistedAt: isoDateTime,
    toolName: z.string().max(120).optional(),
    toolCallId: z.string().max(160).optional(),
    model: z.string().max(120).optional(),
    promptVersion: z.string().max(80).optional(),
    finishReason: z.string().max(80).optional(),
    errorCode: z.string().max(80).optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    contentHash: sha256.optional(),
    parentEventId: internalId.optional(),
    visibility: z.enum(["internal", "sponsor", "public"]),
    payload: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    ),
  })
  .strict()
  .superRefine((event, ctx) => {
    if (event.origin === "adk" && !event.adkEventId) {
      ctx.addIssue({
        code: "custom",
        message: "ADK events require an ADK event id",
      });
    }
  });

export const investigationStateSchema = z
  .object({
    workflowState: workflowStateSchema,
    publicationState: publicationStateSchema,
    lifecycleState: lifecycleStateSchema,
    correctionState: correctionStateSchema,
    visibility: visibilitySchema,
    freshnessState: freshnessStateSchema,
  })
  .strict();

export type SourceArtifact = z.infer<typeof sourceArtifactSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>;
export type EvidenceMatrix = z.infer<typeof evidenceMatrixSchema>;
export type WorkflowDecision = z.infer<typeof workflowDecisionSchema>;
export type ReviewerResult = z.infer<typeof reviewerResultSchema>;
export type PublicWireEventEnvelope = z.infer<
  typeof publicWireEventEnvelopeSchema
>;
