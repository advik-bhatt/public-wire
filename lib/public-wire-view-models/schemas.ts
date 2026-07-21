import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });
const opaqueKey = z
  .string()
  .min(20)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+$/, "Public keys must be opaque URL-safe values");
const boundedText = (max: number) => z.string().trim().min(1).max(max);
const publicUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "Public links must use HTTPS",
  });

export const workflowStateSchema = z.enum([
  "discovered",
  "gathering",
  "verifying",
  "needs_evidence",
  "held",
  "drafting",
  "reviewing",
  "publish_ready",
  "complete",
  "failed",
  "cancelled",
]);
export const publicationStateSchema = z.enum([
  "none",
  "pending",
  "confirmed",
  "unknown",
  "failed",
  "withdrawn",
]);
export const lifecycleStateSchema = z.enum(["open", "resolved"]);
export const correctionStateSchema = z.enum([
  "none",
  "clarified",
  "corrected",
  "retracted",
]);
export const visibilitySchema = z.enum(["private", "unlisted", "public"]);
export const freshnessStateSchema = z.enum(["current", "stale", "unknown"]);
export const runtimeModeSchema = z.enum(["real", "demo", "degraded", "shadow"]);

export const publicEvidenceReceiptSchema = z
  .object({
    publicReceiptKey: opaqueKey,
    sourceTitle: boundedText(180),
    sourceUrl: publicUrl,
    sourceAuthority: z.enum([
      "official",
      "first-party",
      "public-secondary",
      "unknown",
    ]),
    capturedAt: isoDateTime,
    effectiveAt: isoDateTime.optional(),
    relation: z.enum(["supports", "contradicts", "contextualizes"]),
    boundedExcerpt: boundedText(600),
    pageNumber: z.number().int().positive().max(100_000).optional(),
    artifactRevisionLabel: boundedText(80),
  })
  .strict();

export const publicSourceVersionSchema = z
  .object({
    publicSourceVersionKey: opaqueKey,
    sourceTitle: boundedText(180),
    sourceUrl: publicUrl,
    versionLabel: boundedText(100),
    observedAt: isoDateTime,
    state: z.enum(["captured", "changed", "unchanged", "unreachable"]),
    contentHashPrefix: z
      .string()
      .regex(/^[a-f0-9]{10,16}$/)
      .optional(),
  })
  .strict();

export const publicDissentRecordSchema = z
  .object({
    publicConflictKey: opaqueKey,
    publicClaimKey: opaqueKey,
    outcome: z.enum([
      "resolved_supported_proposed",
      "scoped_difference_proposed",
      "unresolved_material",
      "human_disposition",
    ]),
    basisLabel: z.enum([
      "Different scope",
      "Newer source version",
      "Stronger source authority",
      "Equal-authority conflict",
      "Needs editorial judgment",
    ]),
    summary: boundedText(600),
    evidenceReceiptKeys: z.array(opaqueKey).min(2).max(20),
    assessedAt: isoDateTime.optional(),
  })
  .strict();

export const publicChangeSummarySchema = z
  .object({
    impact: z.enum([
      "no_change",
      "clarification",
      "material_update",
      "checking",
      "correction",
      "retraction",
    ]),
    label: boundedText(80),
    summary: boundedText(600),
    assessedAt: isoDateTime,
    sourceVersionKeys: z.array(opaqueKey).min(1).max(20),
    deltas: z
      .array(
        z
          .object({
            publicClaimKey: opaqueKey,
            before: boundedText(600).optional(),
            now: boundedText(600).optional(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

export const publicWorkflowAttestationSchema = z
  .object({
    releaseKey: boundedText(120),
    workflowDigest: z.string().regex(/^[a-f0-9]{64}$/),
    buildDigest: z.string().regex(/^[a-f0-9]{64}$/),
    model: boundedText(120),
    promptVersion: boundedText(80),
    schemaVersion: boundedText(40),
    policyVersion: boundedText(80),
    evaluatorVersion: boundedText(80),
    corpusHash: z.string().regex(/^[a-f0-9]{64}$/),
    evaluatedAt: isoDateTime,
    evaluationKind: z
      .literal("deterministic_trajectory_contract")
      .default("deterministic_trajectory_contract"),
    lockedCaseCount: z.number().int().positive().optional(),
    passedCaseCount: z.number().int().nonnegative().optional(),
    falsePublishDecisions: z.number().int().nonnegative().optional(),
    safetyViolations: z.number().int().nonnegative().optional(),
    scope: z.literal("workflow_not_article_truth"),
  })
  .strict();

export const publicClaimReceiptSchema = z
  .object({
    publicClaimKey: opaqueKey,
    text: boundedText(600),
    materiality: z.enum(["material", "contextual"]),
    status: z.enum([
      "supported",
      "disputed",
      "unsupported",
      "superseded",
      "checking",
    ]),
    evidence: z.array(publicEvidenceReceiptSchema).max(12),
    contradictions: z.array(publicEvidenceReceiptSchema).max(12),
    missingReason: boundedText(240).optional(),
    lastVerifiedAt: isoDateTime.optional(),
  })
  .strict()
  .superRefine((claim, ctx) => {
    if (claim.status === "supported" && claim.evidence.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A supported claim requires evidence",
      });
    }
    if (claim.status === "disputed" && claim.contradictions.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "A disputed claim requires contradictory evidence",
      });
    }
    if (
      (claim.status === "unsupported" || claim.status === "checking") &&
      !claim.missingReason
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Missing evidence must be explained",
      });
    }
  });

export const publicStageSchema = z
  .object({
    stage: z.enum([
      "capture",
      "extract",
      "verify",
      "repair",
      "editorial",
      "draft",
      "review",
      "publish",
    ]),
    label: boundedText(80),
    state: z.enum(["pending", "current", "complete", "blocked", "skipped"]),
  })
  .strict();

const eventBase = {
  cursor: z.number().int().nonnegative(),
  publicEventKey: opaqueKey,
  occurredAt: isoDateTime,
  stage: publicStageSchema.shape.stage,
  status: z.enum(["started", "completed", "held", "failed"]),
  sourceReceiptKeys: z.array(opaqueKey).max(20),
  claimKeys: z.array(opaqueKey).max(20),
};

export const publicInvestigationEventSchema = z.discriminatedUnion(
  "eventCode",
  [
    z
      .object({
        ...eventBase,
        eventCode: z.literal("SOURCE_CAPTURED"),
        safeParams: z
          .object({
            sourceTitle: boundedText(180),
            sourceCount: z.number().int().positive().max(100),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("CLAIMS_EXTRACTED"),
        safeParams: z
          .object({ claimCount: z.number().int().nonnegative().max(200) })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("VERIFICATION_COMPLETED"),
        safeParams: z
          .object({
            supportedCount: z.number().int().nonnegative(),
            disputedCount: z.number().int().nonnegative(),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("SOURCE_CHANGED"),
        safeParams: z
          .object({
            affectedClaimCount: z.number().int().nonnegative().max(200),
            impact: z.enum([
              "checking",
              "no_change",
              "clarification",
              "material_update",
            ]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("DISSENT_ASSESSED"),
        safeParams: z
          .object({
            outcome: z.enum([
              "resolved_supported_proposed",
              "scoped_difference_proposed",
              "unresolved_material",
              "human_disposition",
            ]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("REVISION_VERIFIED"),
        safeParams: z
          .object({
            revision: z.number().int().positive(),
            affectedClaimCount: z.number().int().nonnegative().max(200),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("LIFECYCLE_DISPOSITION"),
        safeParams: z
          .object({
            type: z.enum(["clarification", "correction", "retraction"]),
            localRecordOnly: z.literal(true),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("EVIDENCE_REPAIR_STARTED"),
        safeParams: z
          .object({
            iteration: z.number().int().min(1).max(2),
            targetClaimCount: z.number().int().positive().max(50),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("EVIDENCE_REPAIR_COMPLETED"),
        safeParams: z
          .object({
            iteration: z.number().int().min(1).max(2),
            newSourceCount: z.number().int().nonnegative().max(50),
            outcome: z.enum([
              "new_evidence",
              "supported",
              "unsupported",
              "contradicted",
              "no_new_evidence",
              "budget_exhausted",
            ]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("DRAFT_CREATED"),
        safeParams: z
          .object({
            attempt: z.number().int().min(1).max(2),
            revision: z.boolean(),
            materialClaimCount: z.number().int().positive().max(200),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("EDITORIAL_HELD"),
        safeParams: z
          .object({
            reasonCode: z.enum([
              "MISSING_EVIDENCE",
              "CONTRADICTION",
              "ROUTINE",
              "NOT_LOCAL",
              "PROVIDER_UNAVAILABLE",
              "POLICY_BLOCK",
            ]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("WORKFLOW_HELD"),
        safeParams: z
          .object({
            reasonCode: z.enum([
              "MISSING_EVIDENCE",
              "CONTRADICTION",
              "ROUTINE",
              "NOT_LOCAL",
              "PROVIDER_UNAVAILABLE",
              "POLICY_BLOCK",
              "INVALID_DRAFT",
              "FACTUAL_REVIEW_FAILED",
            ]),
            boundary: publicStageSchema.shape.stage,
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("DRAFT_REVIEWED"),
        safeParams: z
          .object({
            blockingIssueCount: z.number().int().nonnegative().max(100),
            draftAttempt: z.number().int().min(1).max(2).optional(),
            returnedToWriter: z.boolean().optional(),
            issueCodes: z
              .array(
                z.enum([
                  "ADDED_FACT",
                  "NUMERIC_MISMATCH",
                  "DATE_MISMATCH",
                  "LOCATION_MISMATCH",
                  "STATUS_MISMATCH",
                  "ATTRIBUTION_MISMATCH",
                  "OVERSTATED",
                ]),
              )
              .max(100)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("PUBLICATION_CONFIRMED"),
        safeParams: z
          .object({
            sourceCount: z.number().int().positive().max(100),
            materialClaimCount: z.number().int().positive().max(200),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("WORKFLOW_COMPLETED"),
        safeParams: z
          .object({
            outcome: z.enum(["published", "held", "rejected", "no_change"]),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...eventBase,
        eventCode: z.literal("WORKFLOW_FAILED"),
        safeParams: z
          .object({
            errorCode: z.enum([
              "PROVIDER_UNAVAILABLE",
              "INVALID_OUTPUT",
              "TIMEOUT",
              "BUDGET_EXHAUSTED",
              "PERSISTENCE_UNAVAILABLE",
            ]),
          })
          .strict(),
      })
      .strict(),
  ],
);

export const publicInvestigationSummarySchema = z
  .object({
    publicCaseKey: opaqueKey,
    areaKey: z.string().regex(/^[a-z0-9-]{2,80}$/),
    areaDisplayName: boundedText(120),
    topic: boundedText(240),
    workflowState: workflowStateSchema,
    publicationState: publicationStateSchema,
    lifecycleState: lifecycleStateSchema,
    correctionState: correctionStateSchema,
    visibility: visibilitySchema,
    freshnessState: freshnessStateSchema,
    runtimeMode: runtimeModeSchema,
    currentDetermination: boundedText(600),
    materialClaimCounts: z
      .object({
        supported: z.number().int().nonnegative(),
        disputed: z.number().int().nonnegative(),
        missing: z.number().int().nonnegative(),
      })
      .strict(),
    sourceReceiptCount: z.number().int().nonnegative(),
    openedAt: isoDateTime,
    updatedAt: isoDateTime,
    revision: z.number().int().positive(),
  })
  .strict();

export const publicDecisionSchema = z
  .object({
    outcome: z.enum([
      "publish",
      "hold",
      "reject",
      "needs_evidence",
      "needs_revision",
    ]),
    reasonCodes: z
      .array(
        z.enum([
          "EVIDENCE_COMPLETE",
          "MISSING_EVIDENCE",
          "CONTRADICTION",
          "ROUTINE",
          "NOT_LOCAL",
          "PROVIDER_UNAVAILABLE",
          "POLICY_BLOCK",
        ]),
      )
      .min(1)
      .max(8),
  })
  .strict();

export const publicRevisionSummarySchema = z
  .object({
    publicRevisionKey: opaqueKey,
    revisionNumber: z.number().int().positive(),
    type: z.enum(["update", "clarification", "correction", "retraction"]),
    rationaleCode: z.enum([
      "SOURCE_REFRESH",
      "NEW_EVIDENCE",
      "WORDING_CLARIFIED",
      "FACT_CORRECTED",
      "PUBLICATION_RETRACTED",
    ]),
    affectedClaimKeys: z.array(opaqueKey).max(100),
    effectiveAt: isoDateTime,
    priorPublicUrl: publicUrl.optional(),
    currentPublicUrl: publicUrl.optional(),
  })
  .strict();

export const publicCorrectionNoticeSchema = z
  .object({
    type: z.enum(["clarification", "correction", "retraction"]),
    rationaleCode: publicRevisionSummarySchema.shape.rationaleCode,
    affectedClaimKeys: z.array(opaqueKey).max(100),
    effectiveAt: isoDateTime,
    confirmedReplacementUrl: publicUrl.optional(),
    priorVersionUrl: publicUrl.optional(),
  })
  .strict();

export const publicPublicationSchema = z
  .object({
    publicBriefKey: opaqueKey,
    slug: z.string().regex(/^[a-z0-9-]{3,160}$/),
    headline: boundedText(240),
    summary: boundedText(1200),
    whyItMatters: boundedText(1200),
    whoIsAffected: z.array(boundedText(100)).max(20),
    category: boundedText(80),
    publishedAt: isoDateTime,
    updatedAt: isoDateTime,
    sourceReceiptCount: z.number().int().positive(),
    materialClaimCount: z.number().int().positive(),
    externalUrl: publicUrl.optional(),
  })
  .strict();

const publicInvestigationDetailBaseShape = {
  summary: publicInvestigationSummarySchema,
  projectionRevision: z.number().int().positive(),
  snapshotCursor: z.number().int().nonnegative(),
  streamEpoch: opaqueKey,
  whyItMatters: boundedText(1200).optional(),
  whoIsAffected: z.array(boundedText(100)).max(20),
  stageRail: z.array(publicStageSchema).min(1).max(12),
  claims: z.array(publicClaimReceiptSchema).max(200),
  sourceReceipts: z.array(publicEvidenceReceiptSchema).max(200),
  currentDecision: publicDecisionSchema,
  publication: publicPublicationSchema.optional(),
  events: z.array(publicInvestigationEventSchema).max(200),
  revisions: z.array(publicRevisionSummarySchema).max(100),
  correctionNotice: publicCorrectionNoticeSchema.optional(),
} as const;

function validatePublicInvestigationDetail(
  detail: {
    summary: z.infer<typeof publicInvestigationSummarySchema>;
    publication?: z.infer<typeof publicPublicationSchema>;
    sourceReceipts: z.infer<typeof publicEvidenceReceiptSchema>[];
    claims: z.infer<typeof publicClaimReceiptSchema>[];
    events: z.infer<typeof publicInvestigationEventSchema>[];
    snapshotCursor: number;
    sourceVersions?: z.infer<typeof publicSourceVersionSchema>[];
    dissentRecords?: z.infer<typeof publicDissentRecordSchema>[];
    changeSummary?: z.infer<typeof publicChangeSummarySchema>;
  },
  ctx: z.RefinementCtx,
) {
  const { publicationState, visibility, runtimeMode } = detail.summary;
  if (publicationState === "confirmed" && !detail.publication) {
    ctx.addIssue({
      code: "custom",
      message: "Confirmed publication requires a publication record",
    });
  }
  if (
    detail.publication &&
    (publicationState !== "confirmed" ||
      visibility !== "public" ||
      runtimeMode !== "real")
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Only confirmed, public, real-mode cases expose publication records",
    });
  }
  const receiptByKey = new Map(
    detail.sourceReceipts.map((receipt) => [receipt.publicReceiptKey, receipt]),
  );
  const claimByKey = new Map(
    detail.claims.map((claim) => [claim.publicClaimKey, claim]),
  );
  if (receiptByKey.size !== detail.sourceReceipts.length) {
    ctx.addIssue({
      code: "custom",
      path: ["sourceReceipts"],
      message: "Public source receipt keys must be unique",
    });
  }
  if (claimByKey.size !== detail.claims.length) {
    ctx.addIssue({
      code: "custom",
      path: ["claims"],
      message: "Public claim keys must be unique",
    });
  }
  if (detail.summary.sourceReceiptCount !== detail.sourceReceipts.length) {
    ctx.addIssue({
      code: "custom",
      path: ["summary", "sourceReceiptCount"],
      message: "Source receipt count must match the public receipt set",
    });
  }
  const materialCounts = detail.claims.reduce(
    (counts, claim) => {
      if (claim.materiality !== "material") return counts;
      if (claim.status === "supported") counts.supported += 1;
      else if (claim.status === "disputed") counts.disputed += 1;
      else if (claim.status === "unsupported" || claim.status === "checking")
        counts.missing += 1;
      return counts;
    },
    { supported: 0, disputed: 0, missing: 0 },
  );
  if (
    JSON.stringify(materialCounts) !==
    JSON.stringify(detail.summary.materialClaimCounts)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["summary", "materialClaimCounts"],
      message: "Material claim counts must match the public claim ledger",
    });
  }
  detail.claims.forEach((claim, claimIndex) => {
    [...claim.evidence, ...claim.contradictions].forEach((receipt) => {
      const canonical = receiptByKey.get(receipt.publicReceiptKey);
      if (!canonical) {
        ctx.addIssue({
          code: "custom",
          path: ["claims", claimIndex],
          message: "Claim receipts must exist in the public source packet",
        });
      } else if (JSON.stringify(canonical) !== JSON.stringify(receipt)) {
        ctx.addIssue({
          code: "custom",
          path: ["claims", claimIndex],
          message: "Claim receipt data must match its canonical public receipt",
        });
      }
    });
  });
  const eventKeys = new Set<string>();
  const cursors = new Set<number>();
  for (const [eventIndex, event] of detail.events.entries()) {
    if (eventKeys.has(event.publicEventKey) || cursors.has(event.cursor)) {
      ctx.addIssue({
        code: "custom",
        path: ["events", eventIndex],
        message: "Public events require unique keys and cursors",
      });
    }
    eventKeys.add(event.publicEventKey);
    cursors.add(event.cursor);
    if (
      event.sourceReceiptKeys.some((key) => !receiptByKey.has(key)) ||
      event.claimKeys.some((key) => !claimByKey.has(key))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["events", eventIndex],
        message:
          "Public event references must resolve inside the case projection",
      });
    }
  }
  const maxCursor = detail.events.length
    ? Math.max(...detail.events.map((event) => event.cursor))
    : 0;
  if (detail.snapshotCursor !== maxCursor) {
    ctx.addIssue({
      code: "custom",
      path: ["snapshotCursor"],
      message: "Snapshot cursor must match the latest public event",
    });
  }
  const sourceVersionKeys = new Set(
    (detail.sourceVersions ?? []).map(
      (version) => version.publicSourceVersionKey,
    ),
  );
  if (sourceVersionKeys.size !== (detail.sourceVersions ?? []).length)
    ctx.addIssue({
      code: "custom",
      path: ["sourceVersions"],
      message: "Source version keys must be unique",
    });
  if (
    detail.changeSummary?.sourceVersionKeys.some(
      (key) => !sourceVersionKeys.has(key),
    )
  )
    ctx.addIssue({
      code: "custom",
      path: ["changeSummary"],
      message: "Change summary source versions must resolve",
    });
  if (
    (detail.dissentRecords ?? []).some(
      (record) =>
        !claimByKey.has(record.publicClaimKey) ||
        record.evidenceReceiptKeys.some((key) => !receiptByKey.has(key)),
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["dissentRecords"],
      message: "Dissent records must reference disclosed claims and receipts",
    });
  }
}

export const publicInvestigationDetailV1Schema = z
  .object({
    schemaVersion: z.literal("1"),
    ...publicInvestigationDetailBaseShape,
  })
  .strict()
  .superRefine(validatePublicInvestigationDetail);

export const publicInvestigationDetailV2Schema = z
  .object({
    schemaVersion: z.literal("2"),
    ...publicInvestigationDetailBaseShape,
    sourceVersions: z.array(publicSourceVersionSchema).max(100).optional(),
    dissentRecords: z.array(publicDissentRecordSchema).max(100).optional(),
    changeSummary: publicChangeSummarySchema.optional(),
    workflowAttestation: publicWorkflowAttestationSchema.optional(),
  })
  .strict()
  .superRefine(validatePublicInvestigationDetail);

export const publicInvestigationDetailSchema = z.discriminatedUnion(
  "schemaVersion",
  [publicInvestigationDetailV1Schema, publicInvestigationDetailV2Schema],
);

const publicEditionBriefBaseShape = {
  publicBriefKey: opaqueKey,
  slug: z.string().regex(/^[a-z0-9-]{3,160}$/),
  publicCaseKey: opaqueKey,
  headline: boundedText(240),
  summary: boundedText(900),
  whyItMatters: boundedText(900),
  whoIsAffected: z.array(boundedText(100)).max(20),
  category: boundedText(80),
  publicationState: z.literal("confirmed"),
  lifecycleState: lifecycleStateSchema,
  correctionState: correctionStateSchema,
  freshnessState: freshnessStateSchema,
  publishedAt: isoDateTime,
  updatedAt: isoDateTime,
  sourceReceiptCount: z.number().int().positive(),
  materialClaimCount: z.number().int().positive(),
};

export const publicEditionBriefV1Schema = z
  .object(publicEditionBriefBaseShape)
  .strict();

export const publicEditionBriefV2Schema = z
  .object({
    ...publicEditionBriefBaseShape,
    changeImpact: publicChangeSummarySchema.shape.impact.optional(),
    changeLabel: boundedText(80).optional(),
  })
  .strict();

export const publicEditionBriefSchema = z.union([
  publicEditionBriefV1Schema,
  publicEditionBriefV2Schema,
]);

const publicEditionViewBaseShape = {
  areaKey: z.string().regex(/^[a-z0-9-]{2,80}$/),
  areaDisplayName: boundedText(120),
  generatedAt: isoDateTime,
  lastSuccessfulCheckAt: isoDateTime.optional(),
  freshnessState: freshnessStateSchema,
  deskState: z.enum(["current", "checking", "degraded", "demo"]),
  runtimeMode: runtimeModeSchema,
  metrics: z
    .object({
      confirmedUpdates: z.number().int().nonnegative(),
      publicActiveInvestigations: z.number().int().nonnegative(),
      sourceReceipts: z.number().int().nonnegative(),
    })
    .strict(),
  publicInvestigations: z.array(publicInvestigationSummarySchema).max(100),
  routineFilters: z
    .array(
      z
        .object({
          label: boundedText(180),
          reasonCode: z.enum(["ROUTINE", "DUPLICATE", "STALE"]),
        })
        .strict(),
    )
    .max(100),
  publicEvents: z.array(publicInvestigationEventSchema).max(12),
  degradedNotice: z
    .object({
      code: z.enum(["NO_LIVE_DATA", "PROVIDER_UNAVAILABLE", "STALE_DATA"]),
      message: boundedText(300),
    })
    .strict()
    .optional(),
};

export const publicEditionViewV1Schema = z
  .object({
    schemaVersion: z.literal("1"),
    ...publicEditionViewBaseShape,
    leadBrief: publicEditionBriefV1Schema.optional(),
    briefs: z.array(publicEditionBriefV1Schema).max(100),
  })
  .strict();

export const publicEditionViewV2Schema = z
  .object({
    schemaVersion: z.literal("2"),
    ...publicEditionViewBaseShape,
    leadBrief: publicEditionBriefV2Schema.optional(),
    briefs: z.array(publicEditionBriefV2Schema).max(100),
  })
  .strict();

export const publicEditionViewSchema = z.discriminatedUnion("schemaVersion", [
  publicEditionViewV1Schema,
  publicEditionViewV2Schema,
]);

export const publicJobViewSchema = z
  .object({
    jobReceiptKey: opaqueKey,
    publicCaseKey: opaqueKey.optional(),
    state: z.enum(["queued", "running", "complete", "failed", "cancelled"]),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
    retryable: z.boolean(),
    safeErrorCode: z
      .enum([
        "RATE_LIMITED",
        "INVALID_REQUEST",
        "SERVICE_UNAVAILABLE",
        "POLICY_REJECTED",
      ])
      .optional(),
    safeErrorParams: z
      .object({
        retryAfterSeconds: z.number().int().positive().max(86_400).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type WorkflowState = z.infer<typeof workflowStateSchema>;
export type PublicationState = z.infer<typeof publicationStateSchema>;
export type PublicEvidenceReceipt = z.infer<typeof publicEvidenceReceiptSchema>;
export type PublicSourceVersion = z.infer<typeof publicSourceVersionSchema>;
export type PublicDissentRecord = z.infer<typeof publicDissentRecordSchema>;
export type PublicInvestigationEvent = z.infer<
  typeof publicInvestigationEventSchema
>;
export type PublicInvestigationSummary = z.infer<
  typeof publicInvestigationSummarySchema
>;
export type PublicInvestigationDetail = z.infer<
  typeof publicInvestigationDetailSchema
> & {
  sourceVersions?: z.infer<typeof publicSourceVersionSchema>[];
  dissentRecords?: z.infer<typeof publicDissentRecordSchema>[];
  changeSummary?: z.infer<typeof publicChangeSummarySchema>;
  workflowAttestation?: z.infer<typeof publicWorkflowAttestationSchema>;
};
export type PublicEditionView = z.infer<typeof publicEditionViewSchema>;
export type PublicEditionBrief = z.infer<typeof publicEditionBriefSchema>;
export type PublicEditionBriefV2 = z.infer<typeof publicEditionBriefV2Schema>;
export type PublicJobView = z.infer<typeof publicJobViewSchema>;
