import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  History,
  ShieldCheck,
} from "lucide-react";
import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";
import { absoluteTime } from "@/lib/public-wire-view-models/state-labels";

type LifecycleDetail = Pick<
  PublicInvestigationDetail,
  "summary" | "correctionNotice" | "revisions"
> &
  Partial<
    Pick<
      Extract<PublicInvestigationDetail, { schemaVersion: "2" }>,
      "sourceVersions" | "changeSummary" | "workflowAttestation"
    >
  >;

function lifecycleTitle(detail: LifecycleDetail) {
  if (detail.summary.correctionState === "retracted")
    return "PublicWire retracted this record";
  if (detail.summary.correctionState === "corrected")
    return "This PublicWire record was corrected";
  if (detail.summary.correctionState === "clarified")
    return "This PublicWire record was clarified";
  if (detail.summary.freshnessState === "stale")
    return "A monitored source changed; the facts are being rechecked";
  return detail.changeSummary?.label;
}

export function ArticleLifecycle({
  detail,
  showCaseFile,
}: {
  detail: LifecycleDetail;
  showCaseFile: boolean;
}) {
  const title = lifecycleTitle(detail);
  const versions = detail.sourceVersions ?? [];
  const change = detail.changeSummary;
  const attestation = detail.workflowAttestation;
  if (!title && !versions.length && !detail.revisions.length && !attestation)
    return null;

  return (
    <section
      aria-labelledby="article-lifecycle-heading"
      className="border-b border-black/10 bg-[#f5f2ea]"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-10">
        {title && (
          <div
            className={`border-l-4 p-5 ${detail.summary.correctionState === "retracted" ? "border-red-800 bg-red-50" : "border-black bg-white"}`}
            role="note"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <div>
                <span className="text-[.65rem] font-bold uppercase tracking-[.16em] text-neutral-500">
                  Article lifecycle
                </span>
                <h2
                  id="article-lifecycle-heading"
                  className="mt-2 text-xl font-bold"
                >
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-700">
                  {detail.correctionNotice
                    ? `${detail.correctionNotice.rationaleCode.replaceAll("_", " ").toLowerCase()}. This notice describes PublicWire’s local record; it does not assert that the external publisher changed its copy.`
                    : (change?.summary ??
                      "The last verified record remains available here while the changed evidence is assessed. It is not being presented as a current edition story.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {change?.deltas.length ? (
          <div className="mt-8">
            <span className="text-[.65rem] font-bold uppercase tracking-[.16em] text-neutral-500">
              Claim-relevant excerpt changes
            </span>
            <div className="mt-3 grid gap-3">
              {change.deltas.map((delta) => (
                <article
                  key={`${delta.publicClaimKey}:${delta.before}:${delta.now}`}
                  className="grid gap-3 border border-black/15 bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start"
                >
                  <div className="min-w-0">
                    <strong className="text-xs uppercase tracking-[.12em]">
                      Before
                    </strong>
                    <p className="mt-2 break-words text-sm leading-relaxed text-neutral-700">
                      {delta.before ??
                        "Not present in the prior verified record."}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="hidden size-4 text-neutral-400 md:mt-1 md:block"
                  />
                  <div className="min-w-0">
                    <strong className="text-xs uppercase tracking-[.12em]">
                      Now
                    </strong>
                    <p className="mt-2 break-words text-sm leading-relaxed text-neutral-700">
                      {delta.now ??
                        "No longer present in the current source packet."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {versions.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2">
              <History aria-hidden="true" className="size-4" />
              <h2 className="font-bold">Captured source versions</h2>
            </div>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {versions.map((version) => (
                <li
                  key={version.publicSourceVersionKey}
                  className="min-w-0 border border-black/15 bg-white p-4"
                >
                  <span className="text-[.62rem] font-bold uppercase tracking-[.12em] text-neutral-500">
                    {version.state} · {absoluteTime(version.observedAt)}
                  </span>
                  <strong className="mt-2 block break-words">
                    {version.versionLabel}
                  </strong>
                  <a
                    href={version.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 break-words text-sm underline underline-offset-4"
                  >
                    {version.sourceTitle}
                    <ExternalLink
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {detail.revisions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-bold">Immutable version history</h2>
            <ol className="mt-3 divide-y divide-black/15 border-y border-black/15">
              {[...detail.revisions].reverse().map((revision) => (
                <li
                  key={revision.publicRevisionKey}
                  className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_auto]"
                >
                  <strong>
                    Revision {revision.revisionNumber} · {revision.type}
                  </strong>
                  <time
                    dateTime={revision.effectiveAt}
                    className="text-neutral-500"
                  >
                    {absoluteTime(revision.effectiveAt)}
                  </time>
                  <span className="text-neutral-600">
                    {revision.rationaleCode.replaceAll("_", " ").toLowerCase()}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {attestation && (
          <details className="mt-8 border border-black bg-black text-white">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 p-4 font-bold">
              <ShieldCheck aria-hidden="true" className="size-4" />{" "}
              Deterministic release contract
            </summary>
            <div className="border-t border-white/20 p-4 text-sm leading-relaxed text-neutral-200">
              <p>
                {attestation.lockedCaseCount !== undefined
                  ? `${attestation.passedCaseCount ?? 0}/${attestation.lockedCaseCount} locked fixture trajectories passed; ${attestation.falsePublishDecisions ?? 0} unexpected-publication outcomes; ${attestation.safetyViolations ?? 0} safety violations.`
                  : "The deployed workflow matches a promoted deterministic trajectory-contract release."}
              </p>
              <p className="mt-2">
                Evaluated {absoluteTime(attestation.evaluatedAt)}. This
                validates locked fixture traces and release invariants; it does
                not execute live providers or establish this article’s truth.
              </p>
              <p className="mt-3 font-mono text-xs text-neutral-400">
                Release {attestation.releaseKey} · {attestation.model} · policy{" "}
                {attestation.policyVersion}
              </p>
            </div>
          </details>
        )}

        {showCaseFile && (
          <Link
            href={`/local/${detail.summary.areaKey}/investigations/${detail.summary.publicCaseKey}`}
            className="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-black text-xs font-bold uppercase tracking-[.12em]"
          >
            Inspect the complete case record{" "}
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        )}
      </div>
    </section>
  );
}
