import { createHash } from "node:crypto";
import { z } from "zod";

const uuid = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const isoDateTime = z.string().datetime({ offset: true });

export const sourceRefreshRequestSchema = z
  .object({
    investigationId: uuid,
    sourceWatchId: uuid,
    expectedRevision: z.number().int().positive(),
    idempotencyKey: z.string().min(8).max(200),
  })
  .strict();

export const sourceObservationSchema = z
  .object({
    sourceObservationId: uuid,
    sourceWatchId: uuid,
    investigationId: uuid,
    revision: z.number().int().positive(),
    priorObservationId: uuid.optional(),
    normalizedContentHash: digest.optional(),
    artifactId: uuid.optional(),
    artifactVersion: z.number().int().nonnegative().optional(),
    observedAt: isoDateTime,
    httpStatus: z.number().int().min(100).max(599).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.artifactId === undefined) !==
      (value.artifactVersion === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Observation artifact identity must be complete",
      });
    }
  });

export const claimChangeDeltaSchema = z
  .object({
    claimLineageId: uuid,
    kind: z.enum([
      "added",
      "removed",
      "changed",
      "status_changed",
      "unaffected",
    ]),
    beforeExcerpt: z.string().trim().max(600).optional(),
    afterExcerpt: z.string().trim().max(600).optional(),
    publicSafe: z.boolean(),
  })
  .strict();

export const changeAssessmentSchema = z
  .object({
    outcome: z.enum([
      "no_editorial_impact",
      "clarification",
      "material_update",
      "possible_correction",
      "possible_retraction",
      "unreachable",
    ]),
    requiresHumanDisposition: z.boolean(),
    normalizedDiffHash: digest,
    affectedLineageIds: z.array(uuid).max(200),
    deltas: z.array(claimChangeDeltaSchema).max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      ["possible_correction", "possible_retraction"].includes(value.outcome) &&
      !value.requiresHumanDisposition
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Corrections and retractions require human disposition",
      });
    }
    if (
      value.outcome === "unreachable" &&
      value.deltas.some((delta) => delta.kind === "removed")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Unreachability alone cannot establish a retraction",
      });
    }
  });

export type SourceRefreshRequest = z.infer<typeof sourceRefreshRequestSchema>;
export type SourceObservation = z.infer<typeof sourceObservationSchema>;
export type ChangeAssessment = z.infer<typeof changeAssessmentSchema>;

const lineageSnapshotSchema = z
  .object({
    claimLineageId: uuid,
    text: z.string().trim().min(1).max(1000),
    status: z.enum([
      "proposed",
      "supported",
      "disputed",
      "unsupported",
      "superseded",
    ]),
    importance: z.enum(["material", "contextual"]),
    publicSafe: z.boolean(),
  })
  .strict();

export function assessClaimLineageChanges(input: {
  prior: unknown[];
  current: unknown[];
}) {
  const prior = z.array(lineageSnapshotSchema).max(200).parse(input.prior);
  const current = z.array(lineageSnapshotSchema).max(200).parse(input.current);
  const priorByLineage = new Map(
    prior.map((claim) => [claim.claimLineageId, claim]),
  );
  const currentByLineage = new Map(
    current.map((claim) => [claim.claimLineageId, claim]),
  );
  const lineageIds = [
    ...new Set([...priorByLineage.keys(), ...currentByLineage.keys()]),
  ].sort();
  const deltas = lineageIds.flatMap((claimLineageId) => {
    const before = priorByLineage.get(claimLineageId);
    const after = currentByLineage.get(claimLineageId);
    if (
      before &&
      after &&
      before.text === after.text &&
      before.status === after.status
    )
      return [];
    const kind = !before
      ? ("added" as const)
      : !after
        ? ("removed" as const)
        : before.status !== after.status
          ? ("status_changed" as const)
          : ("changed" as const);
    return [
      {
        claimLineageId,
        kind,
        beforeExcerpt: before?.publicSafe ? before.text : undefined,
        afterExcerpt: after?.publicSafe ? after.text : undefined,
        publicSafe: Boolean(
          (before?.publicSafe ?? true) && (after?.publicSafe ?? true),
        ),
      },
    ];
  });
  const hasMaterialRemoval = deltas.some(
    (delta) =>
      delta.kind === "removed" &&
      priorByLineage.get(delta.claimLineageId)?.importance === "material",
  );
  const hasSupportedRegression = deltas.some(
    (delta) =>
      delta.kind === "status_changed" &&
      priorByLineage.get(delta.claimLineageId)?.status === "supported" &&
      currentByLineage.get(delta.claimLineageId)?.status !== "supported",
  );
  const onlyContextualWording =
    deltas.length > 0 &&
    deltas.every(
      (delta) =>
        delta.kind === "changed" &&
        (
          currentByLineage.get(delta.claimLineageId) ??
          priorByLineage.get(delta.claimLineageId)
        )?.importance === "contextual",
    );
  const outcome = hasMaterialRemoval
    ? ("possible_retraction" as const)
    : hasSupportedRegression
      ? ("possible_correction" as const)
      : deltas.length === 0
        ? ("no_editorial_impact" as const)
        : onlyContextualWording
          ? ("clarification" as const)
          : ("material_update" as const);
  const normalizedDiffHash = createHash("sha256")
    .update(JSON.stringify(deltas))
    .digest("hex");
  return changeAssessmentSchema.parse({
    outcome,
    requiresHumanDisposition:
      outcome === "possible_correction" || outcome === "possible_retraction",
    normalizedDiffHash,
    affectedLineageIds: deltas.map((delta) => delta.claimLineageId),
    deltas,
  });
}

export function normalizedTextHash(text: string) {
  const normalized = text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export function sourceRefreshDisposition(params: {
  priorHash?: string;
  currentHash?: string;
  httpStatus?: number;
}) {
  if (!params.currentHash) {
    return {
      outcome: "unreachable" as const,
      createRevision: false,
      callModel: false,
      mayRetract: false,
    };
  }
  if (params.priorHash === params.currentHash) {
    return {
      outcome: "unchanged" as const,
      createRevision: false,
      callModel: false,
      mayRetract: false,
    };
  }
  return {
    outcome: "changed" as const,
    createRevision: true,
    callModel: true,
    mayRetract: false,
  };
}

export const humanDispositionCommandSchema = z
  .object({
    investigationId: uuid,
    expectedRevision: z.number().int().positive(),
    conflictFingerprint: digest,
    decision: z.enum([
      "narrow",
      "attribute",
      "keep_held",
      "correct",
      "retract",
    ]),
    actor: z.string().trim().min(3).max(160),
    actorRole: z.enum(["editor", "administrator", "publisher"]),
    rationale: z.string().trim().min(8).max(1200),
    idempotencyKey: z.string().trim().min(8).max(200),
  })
  .strict();

export type HumanDispositionCommand = z.infer<
  typeof humanDispositionCommandSchema
>;

export const humanDispositionRequestSchema = humanDispositionCommandSchema.omit(
  { actor: true, actorRole: true },
);

export function dispositionEffect(
  decision: HumanDispositionCommand["decision"],
) {
  return {
    permitsEvidenceSupport: false as const,
    keepsRouteHistory: true as const,
    removesFromCurrentEdition: decision === "retract",
    requiresNewRevision: decision !== "keep_held",
  };
}
