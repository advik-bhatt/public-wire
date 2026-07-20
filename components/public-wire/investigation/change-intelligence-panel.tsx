import {
  ArrowRight,
  ExternalLink,
  GitCompareArrows,
  History,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";
import { absoluteTime } from "@/lib/public-wire-view-models/state-labels";

export function ChangeIntelligencePanel({
  detail,
}: {
  detail: PublicInvestigationDetail;
}) {
  const versions = detail.sourceVersions ?? [];
  const dissents = detail.dissentRecords ?? [];
  const change = detail.changeSummary;
  const dissentLabels = {
    resolved_supported_proposed: "Proposed support resolution",
    scoped_difference_proposed: "Proposed scope distinction",
    unresolved_material: "Material disagreement remains open",
    human_disposition: "Editorial disposition recorded",
  } as const;
  if (
    !versions.length &&
    !dissents.length &&
    !change &&
    !detail.workflowAttestation
  )
    return null;

  return (
    <section
      className="change-intelligence"
      aria-labelledby="change-intelligence-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">Living source record</span>
          <h2 id="change-intelligence-heading">
            What changed and what it affected
          </h2>
        </div>
      </div>
      <p className="lifecycle-notice">
        <History aria-hidden="true" /> PublicWire keeps each captured source
        version and rechecks linked claims when the source changes. A missing
        page alone never becomes a correction or retraction.
      </p>

      {change && (
        <article className="impact-card" data-impact={change.impact}>
          <div>
            <span className="impact-label">{change.label}</span>
            <time dateTime={change.assessedAt}>
              {absoluteTime(change.assessedAt)}
            </time>
          </div>
          <p>{change.summary}</p>
          {change.deltas.length > 0 && (
            <div
              className="claim-diffs"
              aria-label="Claim-relevant source changes"
            >
              {change.deltas.map((delta) => (
                <div
                  key={`${delta.publicClaimKey}:${delta.before}:${delta.now}`}
                  className="claim-diff"
                >
                  <GitCompareArrows aria-hidden="true" />
                  <div>
                    <span>Before</span>
                    <p>{delta.before ?? "Not present in the prior capture."}</p>
                  </div>
                  <ArrowRight aria-hidden="true" />
                  <div>
                    <span>Now</span>
                    <p>
                      {delta.now ?? "No longer present in the current capture."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      )}

      {versions.length > 0 && (
        <div className="source-version-block">
          <h3>Source timeline</h3>
          <ol className="source-version-timeline">
            {versions.map((version) => (
              <li
                key={version.publicSourceVersionKey}
                data-state={version.state}
              >
                <span className="version-node" aria-hidden="true" />
                <div>
                  <span className="version-state">{version.state}</span>
                  <strong>{version.versionLabel}</strong>
                  <time dateTime={version.observedAt}>
                    {absoluteTime(version.observedAt)}
                  </time>
                  <a
                    href={version.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    {version.sourceTitle}
                    <ExternalLink aria-hidden="true" />
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {dissents.length > 0 && (
        <div className="dissent-block">
          <h3>
            <Scale aria-hidden="true" /> Evidence disagreement assessments
          </h3>
          {dissents.map((record) => (
            <details key={record.publicConflictKey} className="dissent-record">
              <summary>
                <span>{record.basisLabel}</span>
                <strong>{dissentLabels[record.outcome]}</strong>
              </summary>
              <p>{record.summary}</p>
              <p className="dissent-links">
                This assessment does not change the claim’s verified status by
                itself. It is linked to {record.evidenceReceiptKeys.length}{" "}
                disclosed source receipts and{" "}
                <a href={`#claim-${record.publicClaimKey}`}>
                  the affected claim
                </a>
                .
              </p>
            </details>
          ))}
        </div>
      )}

      {detail.workflowAttestation && (
        <details className="workflow-attestation">
          <summary>
            <ShieldCheck aria-hidden="true" />
            <span>Deterministic release contract</span>
          </summary>
          <p>
            {detail.workflowAttestation.lockedCaseCount !== undefined
              ? `${detail.workflowAttestation.passedCaseCount ?? 0}/${detail.workflowAttestation.lockedCaseCount} locked fixture trajectories passed; ${detail.workflowAttestation.falsePublishDecisions ?? 0} unexpected-publication outcomes; ${detail.workflowAttestation.safetyViolations ?? 0} safety violations.`
              : "The deployed workflow matches a promoted deterministic trajectory-contract release."}{" "}
            Evaluated {absoluteTime(detail.workflowAttestation.evaluatedAt)}.
            This validates locked fixture traces and release invariants; it does
            not execute live providers or establish article truth.
          </p>
          <dl>
            <div>
              <dt>Release</dt>
              <dd>{detail.workflowAttestation.releaseKey}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{detail.workflowAttestation.model}</dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd>{detail.workflowAttestation.policyVersion}</dd>
            </div>
            <div>
              <dt>Evaluator</dt>
              <dd>{detail.workflowAttestation.evaluatorVersion}</dd>
            </div>
            <div>
              <dt>Workflow digest</dt>
              <dd>{detail.workflowAttestation.workflowDigest}</dd>
            </div>
            <div>
              <dt>Corpus</dt>
              <dd>{detail.workflowAttestation.corpusHash}</dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
