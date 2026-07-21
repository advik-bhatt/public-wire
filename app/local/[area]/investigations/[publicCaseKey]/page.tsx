import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Masthead } from "@/components/landing/masthead";
import { Colophon } from "@/components/landing/colophon";
import { ClaimLedger } from "@/components/public-wire/investigation/claim-ledger";
import { StageRail } from "@/components/public-wire/investigation/stage-rail";
import { ActivityStream } from "@/components/public-wire/investigation/activity-stream";
import { ChangeIntelligencePanel } from "@/components/public-wire/investigation/change-intelligence-panel";
import { ReaderAuditPanel } from "@/components/public-wire/investigation/reader-audit-panel";
import { StatusStamp } from "@/components/public-wire/shared/status-stamp";
import { Timestamp } from "@/components/public-wire/shared/timestamp";
import { DegradedBanner } from "@/components/public-wire/shared/degraded-banner";
import { ReferenceRunExplorer } from "@/components/public-wire/showcase/reference-run-explorer";
import { resolveArea } from "@/lib/areas/registry";
import { getCaseProjection } from "@/lib/investigations/public-projections";
import {
  requesterScopeCookieName,
  verifyRequesterScopeCookie,
} from "@/lib/investigations/requester-scope";
import {
  claimReceiptsEnabled,
  liveCaseEventsEnabled,
} from "@/lib/public-wire-ui-flags";
import { getReferenceRun } from "@/lib/public-wire-view-models/fixtures";

type Props = { params: Promise<{ area: string; publicCaseKey: string }> };

async function loadAuthorized(params: Props["params"]) {
  const { area, publicCaseKey } = await params;
  if (!resolveArea(area)) return undefined;
  const cookieStore = await cookies();
  const scope = verifyRequesterScopeCookie(
    cookieStore.get(requesterScopeCookieName)?.value,
  );
  const detail = await getCaseProjection(publicCaseKey, scope?.scopeHash);
  return detail?.summary.areaKey === area ? detail : undefined;
}

export async function generateMetadata({ params }: Props) {
  const detail = await loadAuthorized(params);
  if (!detail)
    return {
      title: "Case not found · PublicWire",
      robots: { index: false, follow: false },
    };
  const indexable =
    detail.summary.runtimeMode === "real" &&
    detail.summary.visibility === "public" &&
    detail.summary.publicationState === "confirmed" &&
    detail.summary.correctionState !== "retracted" &&
    detail.summary.freshnessState === "current";
  return {
    title: `${detail.summary.topic} · PublicWire case file`,
    description: detail.summary.currentDetermination,
    robots: { index: indexable, follow: indexable },
  };
}

export default async function InvestigationPage({ params }: Props) {
  const detail = await loadAuthorized(params);
  if (!detail) notFound();
  const endpoint =
    detail.summary.runtimeMode === "demo" || !liveCaseEventsEnabled()
      ? undefined
      : `/api/public-wire/cases/${detail.summary.publicCaseKey}/events`;
  const showClaimReceipts = claimReceiptsEnabled();
  const referenceRun = getReferenceRun(detail.summary.publicCaseKey);
  const decisionLabel =
    detail.summary.runtimeMode === "demo" &&
    detail.currentDecision.outcome === "publish"
      ? "eligible for application review"
      : detail.currentDecision.outcome.replaceAll("_", " ");
  return (
    <>
      <Masthead variant="solid" />
      <main className="case-file">
        <header className="case-header">
          <div className="case-shell">
            <Link
              href={`/local/${detail.summary.areaKey}`}
              className="back-link"
            >
              <ArrowLeft className="size-4" /> Back to edition
            </Link>
            <div className="case-header-meta">
              <StatusStamp summary={detail.summary} />
              <span>Revision {detail.summary.revision}</span>
            </div>
            <h1>{detail.summary.topic}</h1>
            <p className="case-determination">
              {detail.summary.currentDetermination}
            </p>
            <p className="case-time">
              <Timestamp value={detail.summary.openedAt} label="Opened" /> ·{" "}
              <Timestamp value={detail.summary.updatedAt} label="Updated" />
            </p>
            {detail.summary.runtimeMode === "demo" && (
              <DegradedBanner
                reference
                message="This reference run uses the production case, evidence, event, and gate contracts. Live publication state appears only after provider confirmation."
              />
            )}
            <StageRail stages={detail.stageRail} />
          </div>
        </header>
        <div className="case-shell case-body">
          <section className="case-overview" aria-labelledby="finding-heading">
            <div>
              <span className="eyebrow">
                {detail.summary.runtimeMode === "demo"
                  ? "Finding at capture"
                  : "Current finding"}
              </span>
              <h2 id="finding-heading">
                {detail.summary.runtimeMode === "demo"
                  ? "What the run established"
                  : "What is known"}
              </h2>
              <p>{detail.summary.currentDetermination}</p>
              {detail.whyItMatters && (
                <>
                  <h3>Why it matters</h3>
                  <p>{detail.whyItMatters}</p>
                </>
              )}
              <h3>Who may be affected</h3>
              <p>
                {detail.whoIsAffected.length
                  ? detail.whoIsAffected.join(" · ")
                  : "No affected group has been established."}
              </p>
            </div>
            <aside>
              <span className="eyebrow">
                {detail.summary.runtimeMode === "demo"
                  ? "ADK recommendation"
                  : "Current gate"}
              </span>
              <strong>{decisionLabel}</strong>
              <p>
                {detail.currentDecision.reasonCodes
                  .map((reason) => reason.replaceAll("_", " ").toLowerCase())
                  .join(" · ")}
              </p>
              <dl>
                <div>
                  <dt>Supported material claims</dt>
                  <dd>{detail.summary.materialClaimCounts.supported}</dd>
                </div>
                <div>
                  <dt>Missing</dt>
                  <dd>{detail.summary.materialClaimCounts.missing}</dd>
                </div>
                <div>
                  <dt>Source receipts</dt>
                  <dd>{detail.summary.sourceReceiptCount}</dd>
                </div>
              </dl>
            </aside>
          </section>
          <ReaderAuditPanel detail={detail} />
          {referenceRun && (
            <section aria-labelledby="trail-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Inside the check</span>
                  <h2 id="trail-heading">Follow the pivotal decisions</h2>
                </div>
              </div>
              <ReferenceRunExplorer
                runs={[referenceRun]}
                caseFilesEnabled={false}
                variant="case"
              />
            </section>
          )}
          {showClaimReceipts && (
            <section aria-labelledby="ledger-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Claim and evidence ledger</span>
                  <h2 id="ledger-heading">Receipts, not a confidence score</h2>
                </div>
              </div>
              <ClaimLedger
                claims={detail.claims}
                sourceReceipts={detail.sourceReceipts}
              />
            </section>
          )}
          <ChangeIntelligencePanel detail={detail} />
          <ActivityStream detail={detail} endpoint={endpoint} />
          {detail.publication && (
            <section aria-labelledby="publication-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Confirmed record</span>
                  <h2 id="publication-heading">Publication</h2>
                </div>
              </div>
              <div className="empty-state">
                <strong>{detail.publication.headline}</strong>
                <p>
                  Confirmed {detail.publication.publishedAt}; updated{" "}
                  {detail.publication.updatedAt}.
                </p>
                {detail.publication.externalUrl && (
                  <a
                    href={detail.publication.externalUrl}
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                  >
                    Open confirmed external record
                  </a>
                )}
              </div>
            </section>
          )}
          <section aria-labelledby="updates-heading">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Immutable record</span>
                <h2 id="updates-heading">Updates and corrections</h2>
              </div>
            </div>
            {detail.correctionNotice && (
              <div className="correction-notice" role="note">
                <strong>{detail.correctionNotice.type}</strong>
                <p>
                  {detail.correctionNotice.rationaleCode
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </p>
                <Timestamp value={detail.correctionNotice.effectiveAt} />
                <ul>
                  {detail.correctionNotice.affectedClaimKeys.map((claimKey) => {
                    const claim = detail.claims.find(
                      (item) => item.publicClaimKey === claimKey,
                    );
                    return (
                      <li key={claimKey}>
                        {showClaimReceipts ? (
                          <a href={`#claim-${claimKey}`}>
                            {claim?.text ?? "Affected claim"}
                          </a>
                        ) : (
                          (claim?.text ?? "Affected claim")
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <ol className="revision-list">
              {[...detail.revisions].reverse().map((revision) => (
                <li key={revision.publicRevisionKey}>
                  <strong>
                    Revision {revision.revisionNumber} · {revision.type}
                  </strong>
                  <span>
                    {revision.rationaleCode.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <Timestamp value={revision.effectiveAt} />
                </li>
              ))}
            </ol>
            {!detail.revisions.length && (
              <div className="empty-state">
                <strong>No revision history yet.</strong>
                <p>
                  Corrections and source refreshes will remain visible here.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Colophon />
    </>
  );
}
