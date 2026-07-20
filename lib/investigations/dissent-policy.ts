import { createHash } from "node:crypto";
import { z } from "zod";
import { dissentResolverOutputSchema } from "@/lib/adk/public-wire/agents/dissent-resolver";

const authoritySchema = z.enum([
  "official",
  "first-party",
  "public-secondary",
  "unknown",
]);
const evidenceFactSchema = z
  .object({
    evidenceLinkId: z.string().uuid(),
    relation: z.enum(["supports", "contradicts", "contextualizes"]),
    authority: authoritySchema,
    effectiveAt: z.string().datetime({ offset: true }).optional(),
    scopeKey: z.string().min(1).max(160),
    artifactContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    accessClassification: z.enum(["public", "internal-restricted"]),
  })
  .strict();

export const persistedConflictSchema = z
  .object({
    conflictFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    claimLineageId: z.string().uuid(),
    evidence: z.array(evidenceFactSchema).min(2).max(100),
  })
  .strict();

export type PersistedConflict = z.infer<typeof persistedConflictSchema>;

const authorityRank = {
  unknown: 0,
  "public-secondary": 1,
  "first-party": 2,
  official: 3,
} as const;

export function conflictFingerprint(
  input: Omit<PersistedConflict, "conflictFingerprint">,
) {
  const stable = {
    claimLineageId: input.claimLineageId,
    evidence: [...input.evidence].sort((a, b) =>
      a.evidenceLinkId.localeCompare(b.evidenceLinkId),
    ),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function validateDissentProposal(
  conflictInput: PersistedConflict,
  proposalInput: unknown,
) {
  const conflict = persistedConflictSchema.parse(conflictInput);
  const proposal = dissentResolverOutputSchema.parse(proposalInput);
  if (proposal.conflictFingerprint !== conflict.conflictFingerprint)
    throw new Error("DISSENT_CONFLICT_FINGERPRINT_MISMATCH");
  if (
    conflictFingerprint({
      claimLineageId: conflict.claimLineageId,
      evidence: conflict.evidence,
    }) !== conflict.conflictFingerprint
  ) {
    throw new Error("DISSENT_PERSISTED_CONFLICT_TAMPERED");
  }
  const evidenceById = new Map(
    conflict.evidence.map((item) => [item.evidenceLinkId, item]),
  );
  const referenced = [
    ...proposal.supportingEvidenceLinkIds,
    ...proposal.limitingEvidenceLinkIds,
  ];
  if (
    new Set(referenced).size !== referenced.length ||
    referenced.some((id) => !evidenceById.has(id))
  ) {
    throw new Error("DISSENT_UNKNOWN_OR_DUPLICATE_EVIDENCE");
  }
  const limiting = proposal.limitingEvidenceLinkIds.map(
    (id) => evidenceById.get(id)!,
  );
  const supporting = proposal.supportingEvidenceLinkIds.map(
    (id) => evidenceById.get(id)!,
  );
  if (!limiting.some((item) => item.relation === "contradicts"))
    throw new Error("DISSENT_REQUIRES_CONTRADICTORY_EVIDENCE");

  const sameScope =
    new Set([...supporting, ...limiting].map((item) => item.scopeKey)).size ===
    1;
  const effectiveDates = new Set(
    [...supporting, ...limiting].map((item) => item.effectiveAt ?? "unknown"),
  );
  const maxSupport = Math.max(
    -1,
    ...supporting.map((item) => authorityRank[item.authority]),
  );
  const maxLimit = Math.max(
    ...limiting.map((item) => authorityRank[item.authority]),
  );

  if (proposal.proposedOutcome === "resolved_supported") {
    if (!supporting.length || maxSupport <= maxLimit)
      throw new Error("DISSENT_CANNOT_VOTE_AWAY_EQUAL_AUTHORITY_CONFLICT");
    if (
      !["UNEQUAL_AUTHORITY", "SUPERSEDED_SOURCE_VERSION"].includes(
        proposal.basisCode,
      )
    )
      throw new Error("DISSENT_INVALID_SUPPORTED_BASIS");
  }
  if (proposal.proposedOutcome === "scoped_difference") {
    if (sameScope && effectiveDates.size <= 1)
      throw new Error("DISSENT_SCOPE_DIFFERENCE_NOT_ESTABLISHED");
    if (proposal.basisCode !== "SAME_FACT_DIFFERENT_SCOPE")
      throw new Error("DISSENT_INVALID_SCOPE_BASIS");
  }
  if (
    sameScope &&
    effectiveDates.size <= 1 &&
    maxSupport === maxLimit &&
    proposal.proposedOutcome !== "unresolved_material"
  ) {
    throw new Error("DISSENT_EQUAL_AUTHORITY_MUST_REMAIN_UNRESOLVED");
  }
  return proposal;
}

export function publicDissentEvidence(conflict: PersistedConflict) {
  return conflict.evidence.filter(
    (item) => item.accessClassification === "public",
  );
}
