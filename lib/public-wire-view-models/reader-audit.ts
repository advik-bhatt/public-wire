import type { PublicInvestigationDetail } from "./schemas";

export const readerAuditQuestions = [
  {
    id: "support",
    label: "What supports this?",
    hint: "Claims, receipts, and independent sources",
  },
  {
    id: "agents",
    label: "What did the agents catch?",
    hint: "Evidence gaps, contradictions, and rewrites",
  },
  {
    id: "change",
    label: "What changed?",
    hint: "Source versions and affected claims",
  },
  {
    id: "impact",
    label: "Why should I care?",
    hint: "Resident impact and affected groups",
  },
] as const;

export type ReaderAuditQuestionId = (typeof readerAuditQuestions)[number]["id"];

export type ReaderAuditAnswer = {
  id: ReaderAuditQuestionId;
  eyebrow: string;
  headline: string;
  answer: string;
  metrics: Array<{ label: string; value: string }>;
  claimKeys: string[];
  sources: Array<{ key: string; title: string; url: string }>;
  activityAnchor?: string;
};

function plural(count: number, singular: string, multiple = `${singular}s`) {
  return `${count} ${count === 1 ? singular : multiple}`;
}

function repairSummary(detail: PublicInvestigationDetail) {
  const started = detail.events.find(
    (event) => event.eventCode === "EVIDENCE_REPAIR_STARTED",
  );
  const completed = detail.events.findLast(
    (event) => event.eventCode === "EVIDENCE_REPAIR_COMPLETED",
  );
  if (started?.eventCode === "EVIDENCE_REPAIR_STARTED") {
    const targetCount = started.safeParams.targetClaimCount;
    if (completed?.eventCode === "EVIDENCE_REPAIR_COMPLETED") {
      if (completed.safeParams.outcome === "new_evidence")
        return `The first verification pass exposed ${plural(targetCount, "material evidence gap")}. The bounded recovery loop captured ${plural(completed.safeParams.newSourceCount, "new source")} before the complete claim set was extracted and checked again.`;
      return `The first verification pass exposed ${plural(targetCount, "material evidence gap")}. The bounded recovery loop captured ${plural(completed.safeParams.newSourceCount, "new source")} and finished ${completed.safeParams.outcome.replaceAll("_", " ")}.`;
    }
    return `The first verification pass exposed ${plural(targetCount, "material evidence gap")}; the record preserves that hold instead of drafting around it.`;
  }
  return undefined;
}

/**
 * Projects only disclosed case data into reader-facing answers. This is not a
 * generative agent: free-form questions select one of these deterministic
 * views and therefore cannot introduce claims absent from the public record.
 */
export function buildReaderAuditAnswers(
  detail: PublicInvestigationDetail,
): Record<ReaderAuditQuestionId, ReaderAuditAnswer> {
  const supported = detail.claims.filter(
    (claim) => claim.status === "supported",
  );
  const disputed = detail.claims.filter((claim) => claim.status === "disputed");
  const checking = detail.claims.filter(
    (claim) => claim.status === "checking" || claim.status === "unsupported",
  );
  const uniqueSources = [
    ...new Map(
      detail.sourceReceipts.map((receipt) => [
        receipt.sourceUrl,
        {
          key: receipt.publicReceiptKey,
          title: receipt.sourceTitle,
          url: receipt.sourceUrl,
        },
      ]),
    ).values(),
  ];
  const repair = repairSummary(detail);
  const completedRepair = detail.events.findLast(
    (event) => event.eventCode === "EVIDENCE_REPAIR_COMPLETED",
  );
  const repairSourceCount =
    completedRepair?.eventCode === "EVIDENCE_REPAIR_COMPLETED"
      ? completedRepair.safeParams.newSourceCount
      : 0;
  const returnedDraftEvents = detail.events.filter(
    (event) =>
      event.eventCode === "DRAFT_REVIEWED" && event.safeParams.returnedToWriter,
  );
  const returnedDrafts = returnedDraftEvents.length;
  const rewrittenClaimKeys = [
    ...new Set(returnedDraftEvents.flatMap((event) => event.claimKeys)),
  ];
  const correctedDraftPassedReview = detail.events.some(
    (event) =>
      event.eventCode === "DRAFT_REVIEWED" &&
      !event.safeParams.returnedToWriter &&
      event.safeParams.blockingIssueCount === 0 &&
      (event.safeParams.draftAttempt ?? 0) > 1,
  );
  const dissentCount = detail.dissentRecords?.length ?? 0;
  const agentFindings = [
    repair,
    disputed.length
      ? `${plural(disputed.length, "claim")} remain disputed because conflicting evidence was not collapsed into a false consensus.`
      : undefined,
    dissentCount
      ? `${plural(dissentCount, "evidence disagreement")} received a separate scope and authority assessment.`
      : undefined,
    returnedDrafts
      ? `${plural(returnedDrafts, "draft")} ${returnedDrafts === 1 ? "was" : "were"} returned to the writer after exact draft review found blocking regressions.`
      : undefined,
  ].filter((value): value is string => Boolean(value));
  const versions = detail.sourceVersions ?? [];
  const hasSourceChange = Boolean(detail.changeSummary || versions.length);
  const changedClaimKeys =
    detail.changeSummary?.deltas.map((delta) => delta.publicClaimKey) ??
    rewrittenClaimKeys;
  const affectedGroups = detail.whoIsAffected.join(", ");

  return {
    support: {
      id: "support",
      eyebrow: "Input to output",
      headline: `${plural(supported.length, "supported claim")} across ${plural(uniqueSources.length, "source")}`,
      answer: detail.sourceReceipts.length
        ? `Every supported statement below points to a bounded excerpt from a captured, versioned source. Open a claim to see the exact receipt, then follow the source link to inspect the original context.`
        : `No public receipt currently supports this finding. The workflow keeps the item out of publication until its material claims have exact captured evidence.`,
      metrics: [
        {
          label: "Exact receipts",
          value: String(detail.sourceReceipts.length),
        },
        { label: "Independent URLs", value: String(uniqueSources.length) },
        { label: "Still checking", value: String(checking.length) },
      ],
      claimKeys: supported.map((claim) => claim.publicClaimKey),
      sources: uniqueSources,
    },
    agents: {
      id: "agents",
      eyebrow: "Verifier impact",
      headline: agentFindings.length
        ? "Where the workflow changed the result"
        : "No blocking regression was surfaced",
      answer: agentFindings.length
        ? agentFindings.join(" ")
        : "The support, time, authority, and contradiction checks completed without a disclosed repair, dissent, or rewrite event in this record.",
      metrics: [
        {
          label: "Repair sources",
          value: String(repairSourceCount),
        },
        {
          label: "Disagreements",
          value: String(dissentCount + disputed.length),
        },
        { label: "Draft returns", value: String(returnedDrafts) },
      ],
      claimKeys: [...disputed, ...checking].map(
        (claim) => claim.publicClaimKey,
      ),
      sources: uniqueSources,
      activityAnchor: "#activity-heading",
    },
    change: {
      id: "change",
      eyebrow: "Living record",
      headline:
        detail.changeSummary?.label ??
        (rewrittenClaimKeys.length
          ? `${plural(rewrittenClaimKeys.length, "material claim")} corrected before application review`
          : `${plural(versions.length, "captured source version")}`),
      answer:
        detail.changeSummary?.summary ??
        (versions.length
          ? "The source timeline preserves the exact packet used by each revision, so a later source update can trigger only the claims that depended on it."
          : returnedDrafts
            ? `Exact draft review returned ${plural(returnedDrafts, "draft")} to the writer after identifying blocking wording in ${plural(rewrittenClaimKeys.length, "material claim")}. ${correctedDraftPassedReview ? "The corrected draft then passed a complete second review." : "The case remains at its review boundary."}`
            : "No public source or draft revision has been recorded for this case."),
      metrics: [
        { label: "Source versions", value: String(versions.length) },
        {
          label: hasSourceChange ? "Case revisions" : "Draft rewrites",
          value: String(
            hasSourceChange ? detail.revisions.length : returnedDrafts,
          ),
        },
        {
          label: "Affected claims",
          value: String(changedClaimKeys.length),
        },
      ],
      claimKeys: changedClaimKeys,
      sources: versions.map((version) => ({
        key: version.publicSourceVersionKey,
        title: version.sourceTitle,
        url: version.sourceUrl,
      })),
      activityAnchor:
        versions.length > 0 || detail.changeSummary
          ? "#change-intelligence-heading"
          : returnedDrafts
            ? "#activity-heading"
            : undefined,
    },
    impact: {
      id: "impact",
      eyebrow: "Resident consequence",
      headline: affectedGroups || "Affected group not established",
      answer:
        detail.whyItMatters ??
        "The current record does not establish a specific resident impact.",
      metrics: [
        {
          label: "Affected groups",
          value: String(detail.whoIsAffected.length),
        },
        {
          label: "Material claims",
          value: String(
            detail.claims.filter((claim) => claim.materiality === "material")
              .length,
          ),
        },
        {
          label: "Publication",
          value: detail.summary.publicationState.replaceAll("_", " "),
        },
      ],
      claimKeys: detail.claims
        .filter((claim) => claim.materiality === "material")
        .map((claim) => claim.publicClaimKey),
      sources: [],
    },
  };
}

/** Routes a free-form prompt without sending reader input to a model. */
export function matchReaderAuditQuestion(value: string): ReaderAuditQuestionId {
  const query = value.toLowerCase();
  if (/change|update|version|before|revision/.test(query)) return "change";
  if (/why|impact|care|affect|resident|matter/.test(query)) return "impact";
  if (
    /agent|catch|verify|repair|loop|regression|contradict|rewrite/.test(query)
  )
    return "agents";
  return "support";
}
