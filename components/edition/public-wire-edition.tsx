import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicEditionView } from "@/lib/public-wire-view-models/schemas";
import {
  absoluteTime,
  eventCopy,
} from "@/lib/public-wire-view-models/state-labels";
import { CoverageForm } from "@/components/public-wire/edition/coverage-form";
import { DegradedBanner } from "@/components/public-wire/shared/degraded-banner";
import { StatusStamp } from "@/components/public-wire/shared/status-stamp";
import {
  BriefListItem,
  PublishedLeadBrief,
  ReferenceLeadBrief,
} from "@/components/edition/lead-brief";
import type { ReferenceRun } from "@/lib/public-wire-view-models/fixtures";

export function PublicWireEdition({
  edition,
  referenceRuns = [],
  caseFilesEnabled = false,
  caseRequestsEnabled = false,
}: {
  edition: PublicEditionView;
  referenceRuns?: ReferenceRun[];
  caseFilesEnabled?: boolean;
  caseRequestsEnabled?: boolean;
}) {
  const allBriefs = edition.leadBrief
    ? [edition.leadBrief, ...edition.briefs]
    : edition.briefs;
  const referenceOutputRun = referenceRuns.find((run) => run.output);
  return (
    <div className="bg-white text-black">
      <header className="edition-header">
        <div className="edition-shell">
          <div className="edition-dateline">
            <span>PublicWire · {edition.areaDisplayName}</span>
            <span>
              {edition.deskState === "demo"
                ? "Evidence-backed edition"
                : "Civic edition"}
            </span>
          </div>
          <h1>
            {edition.runtimeMode === "demo"
              ? `${edition.areaDisplayName.split(",")[0]} Civic Briefing Desk`
              : "Today’s Civic Briefing"}
          </h1>
          <p className="edition-status">
            {edition.runtimeMode === "demo"
              ? `${edition.metrics.publicActiveInvestigations} auditable case record${edition.metrics.publicActiveInvestigations === 1 ? "" : "s"} show joined sources, caught overclaims, source rechecks, and unresolved contradictions.`
              : `${edition.lastSuccessfulCheckAt ? `Last successful public check ${absoluteTime(edition.lastSuccessfulCheckAt)}.` : "No successful live check is represented."} ${edition.metrics.confirmedUpdates} confirmed update${edition.metrics.confirmedUpdates === 1 ? "" : "s"}; ${edition.metrics.publicActiveInvestigations} disclosed active case${edition.metrics.publicActiveInvestigations === 1 ? "" : "s"}.`}
          </p>
          {edition.degradedNotice && (
            <DegradedBanner
              message={edition.degradedNotice.message}
              reference={edition.runtimeMode === "demo"}
            />
          )}
          {caseRequestsEnabled && <CoverageForm areaKey={edition.areaKey} />}
        </div>
      </header>

      <section className="metric-band" aria-label="Edition totals">
        <div className="edition-shell metric-grid">
          <Metric
            value={edition.metrics.confirmedUpdates}
            label="Confirmed updates"
          />
          <Metric
            value={edition.metrics.publicActiveInvestigations}
            label={
              edition.runtimeMode === "demo"
                ? "Auditable cases"
                : "Public active cases"
            }
          />
          <Metric
            value={edition.metrics.sourceReceipts}
            label={
              edition.runtimeMode === "demo"
                ? "Source receipts"
                : "Public source receipts"
            }
          />
          <Metric
            value={
              edition.runtimeMode === "demo"
                ? "validated"
                : edition.freshnessState
            }
            label={
              edition.runtimeMode === "demo" ? "Evidence state" : "Freshness"
            }
          />
        </div>
      </section>

      <main>
        <section className="edition-section edition-shell">
          <SectionHeading
            eyebrow="Edition"
            title={
              edition.leadBrief
                ? "Top story"
                : referenceOutputRun
                  ? "Resident briefing"
                  : "No confirmed brief right now"
            }
          />
          {edition.leadBrief ? (
            <PublishedLeadBrief
              brief={edition.leadBrief}
              areaKey={edition.areaKey}
              caseFilesEnabled={caseFilesEnabled}
            />
          ) : referenceOutputRun ? (
            <ReferenceLeadBrief
              run={referenceOutputRun}
              caseFilesEnabled={caseFilesEnabled}
            />
          ) : (
            <div className="empty-state">
              <strong>Nothing is being presented as published.</strong>
              <p>
                Cases can remain in evidence gathering or hold without becoming
                news. That is a valid desk outcome.
              </p>
            </div>
          )}
        </section>

        <section className="edition-section paper-section">
          <div className="edition-shell">
            <SectionHeading
              eyebrow="On the desk"
              title={
                edition.runtimeMode === "demo"
                  ? "Auditable investigations"
                  : "Disclosed investigations"
              }
            />
            <div className="desk-grid">
              {edition.publicInvestigations.map((investigation) => (
                <article
                  key={investigation.publicCaseKey}
                  className="desk-card"
                >
                  <StatusStamp summary={investigation} />
                  <h3>{investigation.topic}</h3>
                  <p>{investigation.currentDetermination}</p>
                  <div className="desk-card-meta">
                    <span>{investigation.sourceReceiptCount} receipts</span>
                    <span>Updated {absoluteTime(investigation.updatedAt)}</span>
                  </div>
                  {caseFilesEnabled && (
                    <Link
                      href={`/local/${edition.areaKey}/investigations/${investigation.publicCaseKey}`}
                    >
                      Open case file <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </article>
              ))}
              {!edition.publicInvestigations.length && (
                <div className="empty-state">
                  <strong>No publicly disclosed active cases.</strong>
                  <p>Private and held work is not counted or listed here.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {allBriefs.length > 1 && (
          <section className="edition-section edition-shell">
            <SectionHeading eyebrow="Also today" title="Confirmed briefs" />
            <div className="story-list">
              {allBriefs.slice(1).map((brief) => (
                <BriefListItem key={brief.publicBriefKey} brief={brief} />
              ))}
            </div>
          </section>
        )}

        <section className="edition-section edition-shell activity-routine-grid">
          <div>
            <SectionHeading
              eyebrow={
                edition.runtimeMode === "demo"
                  ? "Agent activity"
                  : "Desk activity"
              }
              title={
                edition.runtimeMode === "demo"
                  ? "Verified event trail"
                  : "Latest public record"
              }
            />
            <ol className="compact-events">
              {edition.publicEvents.slice(0, 5).map((event) => (
                <li key={event.publicEventKey}>
                  <time dateTime={event.occurredAt}>
                    {absoluteTime(event.occurredAt)}
                  </time>
                  <p>{eventCopy(event)}</p>
                </li>
              ))}
            </ol>
          </div>
          <aside>
            <SectionHeading
              eyebrow="Routine filters"
              title="Kept out of the edition"
            />
            {edition.routineFilters.map((item) => (
              <div className="routine-filter" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.reasonCode.toLowerCase()}</span>
              </div>
            ))}
          </aside>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}
function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
