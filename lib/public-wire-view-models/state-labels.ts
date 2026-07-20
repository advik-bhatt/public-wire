import type {
  PublicInvestigationEvent,
  PublicInvestigationSummary,
} from "./schemas";

const WORKFLOW_LABELS: Record<
  PublicInvestigationSummary["workflowState"],
  string
> = {
  discovered: "Discovered",
  gathering: "Gathering sources",
  verifying: "Checking claims",
  needs_evidence: "Needs evidence",
  held: "Held",
  drafting: "Drafting",
  reviewing: "Reviewing",
  publish_ready: "Ready for final gate",
  complete: "Complete",
  failed: "Check unavailable",
  cancelled: "Cancelled",
};

export function investigationStatusLabel(summary: PublicInvestigationSummary) {
  if (summary.runtimeMode === "demo") return "Reference run";
  if (
    summary.publicationState === "confirmed" &&
    summary.visibility === "public"
  )
    return "Published";
  if (summary.publicationState === "unknown")
    return "Publication status unavailable";
  if (summary.publicationState === "pending") return "Publication pending";
  return WORKFLOW_LABELS[summary.workflowState];
}

export function eventCopy(event: PublicInvestigationEvent) {
  switch (event.eventCode) {
    case "SOURCE_CAPTURED":
      return `${event.safeParams.sourceCount} source${event.safeParams.sourceCount === 1 ? "" : "s"} captured, including ${event.safeParams.sourceTitle}.`;
    case "CLAIMS_EXTRACTED":
      return `${event.safeParams.claimCount} material claim${event.safeParams.claimCount === 1 ? "" : "s"} identified for checking.`;
    case "VERIFICATION_COMPLETED":
      return `${event.safeParams.supportedCount} supported; ${event.safeParams.disputedCount} disputed.`;
    case "SOURCE_CHANGED":
      return `A captured source changed; ${event.safeParams.affectedClaimCount} linked claim${event.safeParams.affectedClaimCount === 1 ? " is" : "s are"} being checked.`;
    case "DISSENT_ASSESSED":
      return `The evidence disagreement remains open after assessment: ${event.safeParams.outcome.replaceAll("_", " ")}.`;
    case "REVISION_VERIFIED":
      return `Revision ${event.safeParams.revision} rechecked ${event.safeParams.affectedClaimCount} affected claim${event.safeParams.affectedClaimCount === 1 ? "" : "s"}.`;
    case "LIFECYCLE_DISPOSITION":
      return `PublicWire recorded a local ${event.safeParams.type}; this does not claim the external provider changed its copy.`;
    case "EVIDENCE_REPAIR_STARTED":
      return `Evidence repair ${event.safeParams.iteration} started for ${event.safeParams.targetClaimCount} claim${event.safeParams.targetClaimCount === 1 ? "" : "s"}.`;
    case "EVIDENCE_REPAIR_COMPLETED":
      return `Evidence repair ${event.safeParams.iteration} captured ${event.safeParams.newSourceCount} new source${event.safeParams.newSourceCount === 1 ? "" : "s"}; outcome: ${event.safeParams.outcome.replaceAll("_", " ")}.`;
    case "DRAFT_CREATED":
      return `${event.safeParams.revision ? "Revised draft" : "Draft"} ${event.safeParams.attempt} created from ${event.safeParams.materialClaimCount} material claim${event.safeParams.materialClaimCount === 1 ? "" : "s"}.`;
    case "EDITORIAL_HELD":
      return `The item was held: ${event.safeParams.reasonCode.replaceAll("_", " ").toLowerCase()}.`;
    case "WORKFLOW_HELD":
      return `The ${event.safeParams.boundary} boundary held the item: ${event.safeParams.reasonCode.replaceAll("_", " ").toLowerCase()}.`;
    case "DRAFT_REVIEWED":
      return event.safeParams.returnedToWriter
        ? `Draft review ${event.safeParams.draftAttempt ?? ""} found ${event.safeParams.blockingIssueCount} blocking issue${event.safeParams.blockingIssueCount === 1 ? "" : "s"} and returned the draft to the writer.`
        : `Draft review${event.safeParams.draftAttempt ? ` ${event.safeParams.draftAttempt}` : ""} found ${event.safeParams.blockingIssueCount} blocking issue${event.safeParams.blockingIssueCount === 1 ? "" : "s"}.`;
    case "PUBLICATION_CONFIRMED":
      return `Publication confirmed with ${event.safeParams.materialClaimCount} material claim${event.safeParams.materialClaimCount === 1 ? "" : "s"} and ${event.safeParams.sourceCount} source${event.safeParams.sourceCount === 1 ? "" : "s"}.`;
    case "WORKFLOW_COMPLETED":
      return `Desk check completed: ${event.safeParams.outcome.replaceAll("_", " ")}.`;
    case "WORKFLOW_FAILED":
      return `The check stopped safely: ${event.safeParams.errorCode.replaceAll("_", " ").toLowerCase()}.`;
  }
}

export function absoluteTime(value: string, timeZone = "America/New_York") {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(value));
}
