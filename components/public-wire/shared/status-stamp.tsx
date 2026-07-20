import type { PublicInvestigationSummary } from "@/lib/public-wire-view-models/schemas";
import { investigationStatusLabel } from "@/lib/public-wire-view-models/state-labels";

export function StatusStamp({
  summary,
}: {
  summary: PublicInvestigationSummary;
}) {
  const tone =
    summary.correctionState === "retracted" ||
    summary.workflowState === "failed"
      ? "status-danger"
      : summary.publicationState === "confirmed"
        ? "status-success"
        : summary.workflowState === "held" ||
            summary.workflowState === "needs_evidence"
          ? "status-warning"
          : "status-active";
  return (
    <span className="status-stamp-group">
      {summary.runtimeMode === "demo" && (
        <span className="status-stamp status-neutral">Reference run</span>
      )}
      <span className={`status-stamp ${tone}`}>
        {summary.runtimeMode === "demo"
          ? investigationStatusLabel({ ...summary, runtimeMode: "real" })
          : investigationStatusLabel(summary)}
      </span>
      {summary.correctionState !== "none" && (
        <span
          className={`status-stamp ${summary.correctionState === "retracted" ? "status-danger" : "status-warning"}`}
        >
          {summary.correctionState}
        </span>
      )}
      {summary.lifecycleState === "resolved" && (
        <span className="status-stamp status-neutral">Resolved</span>
      )}
      {summary.freshnessState === "stale" && (
        <span className="status-stamp status-warning">Stale</span>
      )}
    </span>
  );
}
