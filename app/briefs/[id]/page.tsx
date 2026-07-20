import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Colophon } from "@/components/landing/colophon";
import { Masthead } from "@/components/landing/masthead";
import { ArticleLifecycle } from "@/components/public-wire/brief/article-lifecycle";
import { getBriefById } from "@/content/public-wire-content";
import {
  DEMO_PUBLIC_CASE_KEY,
  referenceRuns,
} from "@/lib/public-wire-view-models/fixtures";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { referenceSourcePages } from "@/lib/public-wire-view-models/reference-run-selectors";
import { ReferenceRunExplorer } from "@/components/public-wire/showcase/reference-run-explorer";
import {
  briefProvenanceEnabled,
  publicCaseFilesEnabled,
} from "@/lib/public-wire-ui-flags";
import { getPublishedBriefBySlug } from "@/lib/investigations/public-projections";

type Props = { params: Promise<{ id: string }> };

const loadBrief = cache(async function loadBrief(id: string) {
  const detail = await getPublishedBriefBySlug(id);
  if (detail?.publication) {
    return {
      kind: "published" as const,
      headline: detail.publication.headline,
      summary: detail.publication.summary,
      whyItMatters: detail.publication.whyItMatters,
      whoIsAffected: detail.publication.whoIsAffected,
      whatChanged:
        detail.schemaVersion === "2"
          ? detail.changeSummary?.summary
          : undefined,
      category: detail.publication.category,
      areaKey: detail.summary.areaKey,
      areaDisplayName: detail.summary.areaDisplayName,
      publicCaseKey: detail.summary.publicCaseKey,
      externalUrl: detail.publication.externalUrl,
      publishedAt: detail.publication.publishedAt,
      sourceReceiptCount: detail.publication.sourceReceiptCount,
      materialClaimCount: detail.publication.materialClaimCount,
      sources: detail.sourceReceipts.map((source) => ({
        key: source.publicReceiptKey,
        title: source.sourceTitle,
        url: source.sourceUrl,
        role: `${source.relation === "supports" ? "Supports" : source.relation === "contradicts" ? "Contradicts" : "Contextualizes"} a verified claim · ${source.artifactRevisionLabel}`,
      })),
      correctionNotice: detail.correctionNotice,
      lifecycleDetail: detail,
      correctionState: detail.summary.correctionState,
      freshnessState: detail.summary.freshnessState,
      referenceRun: undefined,
    };
  }

  const preview = getBriefById(id);
  const referenceRun = referenceRuns.find(
    (run) => run.output?.briefSlug === id,
  );
  if (referenceRun?.output) {
    return {
      kind: "reference" as const,
      headline: referenceRun.output.headline,
      summary: referenceRun.output.summary,
      whyItMatters:
        referenceRun.detail.whyItMatters ??
        referenceRun.intelligence?.residentAnswer.bottomLine ??
        referenceRun.output.summary,
      whoIsAffected: referenceRun.detail.whoIsAffected,
      whatChanged: referenceRun.intelligence?.aggregation.explanation,
      category: "Sanitation",
      areaKey: referenceRun.detail.summary.areaKey,
      areaDisplayName: referenceRun.detail.summary.areaDisplayName,
      publicCaseKey: referenceRun.detail.summary.publicCaseKey,
      externalUrl: undefined,
      publishedAt: undefined,
      sourceReceiptCount:
        referenceRun.intelligence?.aggregation.uniqueSourceCount ??
        new Set(
          referenceRun.detail.sourceReceipts.map(
            (receipt) => receipt.sourceUrl,
          ),
        ).size,
      materialClaimCount:
        referenceRun.detail.summary.materialClaimCounts.supported +
        referenceRun.detail.summary.materialClaimCounts.disputed +
        referenceRun.detail.summary.materialClaimCounts.missing,
      sources: referenceSourcePages(referenceRun).map((source) => ({
        key: source.key,
        title: source.title,
        url: source.url,
        role: `${source.receiptCount} linked evidence receipt${source.receiptCount === 1 ? "" : "s"} · ${source.revisionLabels.join(" · ")}`,
      })),
      correctionNotice: undefined,
      lifecycleDetail: undefined,
      correctionState: "none" as const,
      freshnessState: referenceRun.detail.summary.freshnessState,
      referenceRun,
    };
  }
  if (!preview) return undefined;
  return {
    kind: "preview" as const,
    headline: preview.headline,
    summary: preview.summary,
    whyItMatters: preview.whyItMatters,
    whoIsAffected: preview.whoIsAffected,
    whatChanged: preview.whatChanged,
    category: preview.category,
    areaKey: "new-brunswick",
    areaDisplayName: preview.area,
    publicCaseKey: DEMO_PUBLIC_CASE_KEY,
    externalUrl: undefined,
    publishedAt: undefined,
    sourceReceiptCount: preview.sources.length,
    materialClaimCount: undefined,
    sources: preview.sources.map((source) => ({ key: source.url, ...source })),
    correctionNotice: undefined,
    lifecycleDetail: undefined,
    correctionState: "none" as const,
    freshnessState: "unknown" as const,
    referenceRun: undefined,
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const brief = await loadBrief(id);
  if (!brief)
    return { title: "Brief not found · PublicWire", robots: { index: false } };
  const indexable =
    brief.kind === "published" &&
    brief.correctionState !== "retracted" &&
    brief.freshnessState === "current";
  return {
    title: `${brief.headline} · PublicWire`,
    description: brief.summary,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: indexable
      ? { title: brief.headline, description: brief.summary, type: "article" }
      : undefined,
  };
}

export default async function BriefPage({ params }: Props) {
  const { id } = await params;
  const brief = await loadBrief(id);
  if (!brief) notFound();
  const published = brief.kind === "published";
  const showProvenance =
    published || brief.kind === "reference" || briefProvenanceEnabled();
  const showCaseFile = publicCaseFilesEnabled();
  const lifecycleLabel =
    brief.kind === "reference"
      ? "Captured briefing"
      : brief.correctionState === "retracted"
        ? "Retracted"
        : brief.correctionState === "corrected"
          ? "Corrected"
          : brief.correctionState === "clarified"
            ? "Clarified"
            : brief.freshnessState === "stale"
              ? "Source change under review"
              : published
                ? "Published"
                : "Reference output";
  const publishedLabel = brief.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/New_York",
      }).format(new Date(brief.publishedAt))
    : undefined;

  return (
    <>
      <Masthead variant="solid" />
      <main className="bg-white text-black">
        <header className="border-b border-black/10">
          <div className="mx-auto max-w-[1100px] px-6 pb-12 pt-14 md:px-10 md:pt-20">
            <Link href={`/local/${brief.areaKey}`} className="back-link">
              <ArrowLeft className="size-4" /> Back to edition
            </Link>
            <div className="mt-10 flex flex-wrap gap-2">
              <span
                className={`status-stamp ${brief.correctionState === "retracted" ? "status-danger" : brief.freshnessState === "stale" || brief.correctionState !== "none" ? "status-warning" : "status-neutral"}`}
              >
                {lifecycleLabel}
              </span>
              <span className="status-stamp status-neutral">
                {published
                  ? `${brief.sourceReceiptCount} source receipt${brief.sourceReceiptCount === 1 ? "" : "s"}`
                  : "Not a confirmed publication"}
              </span>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-[.96] tracking-tight md:text-6xl lg:text-7xl">
              {brief.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-neutral-600">
              {brief.kind === "reference"
                ? "This captured briefing joins multiple official source pages and exposes the exact evidence and decision path. It is not represented as a provider-confirmed publication."
                : brief.correctionState === "retracted"
                  ? `PublicWire retained this historical route after retracting its local record. The linked external record is not represented as changed unless provider confirmation exists.`
                  : brief.freshnessState === "stale"
                    ? `A monitored source changed. The last verified record remains readable while affected claims are rechecked, but it is not being presented as current.`
                    : published
                      ? `Confirmed for ${brief.areaDisplayName}${publishedLabel ? ` on ${publishedLabel}` : ""} after claim-level evidence and final publication review.`
                      : "This reference output exercises the production reading and provenance surface. Confirmed external records are linked only after provider confirmation."}
            </p>
            {brief.externalUrl && (
              <a
                href={brief.externalUrl}
                target="_blank"
                rel="noreferrer"
                referrerPolicy="no-referrer"
                className="mt-6 inline-flex items-center gap-2 border-b border-black text-xs font-bold uppercase tracking-[.14em]"
              >
                Open cited publication <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </header>

        {brief.lifecycleDetail && (
          <ArticleLifecycle
            detail={brief.lifecycleDetail}
            showCaseFile={showCaseFile}
          />
        )}

        {brief.referenceRun?.intelligence && (
          <ResidentAnswerSection run={brief.referenceRun} />
        )}

        {brief.referenceRun && (
          <section
            id="audit-run"
            className="border-b border-black/10 bg-black px-4 py-12 text-white md:px-8"
          >
            <div className="mx-auto max-w-[1240px]">
              <span className="eyebrow text-neutral-400">
                Audit this answer
              </span>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-5xl">
                See what PublicWire combined, caught, and allowed.
              </h2>
              <ReferenceRunExplorer
                runs={[brief.referenceRun]}
                caseFilesEnabled={showCaseFile}
                variant="case"
                auditDefaultView="sources"
              />
            </div>
          </section>
        )}

        <section className="border-b border-black/10">
          <div className="mx-auto grid max-w-[1100px] gap-12 px-6 py-14 md:px-10 lg:grid-cols-[1fr_320px]">
            <article className="space-y-10">
              <BriefSection title="Summary">
                <p>{brief.summary}</p>
              </BriefSection>
              <BriefSection title="Why it matters">
                <p>{brief.whyItMatters}</p>
              </BriefSection>
              <BriefSection title="Who may be affected">
                <div className="flex flex-wrap gap-2">
                  {brief.whoIsAffected.map((group) => (
                    <span
                      key={group}
                      className="border border-black/20 px-2 py-1 text-xs uppercase tracking-[.14em]"
                    >
                      {group}
                    </span>
                  ))}
                </div>
              </BriefSection>
              {brief.whatChanged && (
                <BriefSection title="What changed">
                  <p>{brief.whatChanged}</p>
                </BriefSection>
              )}
              {showProvenance && (
                <BriefSection
                  title={
                    published
                      ? "Verified sources"
                      : brief.kind === "reference"
                        ? "Official sources"
                        : "Source examples"
                  }
                >
                  <div className="space-y-4">
                    {brief.sources.map((source) => (
                      <article
                        key={source.key}
                        className="border border-black/10 p-4"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          referrerPolicy="no-referrer"
                          className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
                        >
                          {source.title} <ExternalLink className="size-4" />
                        </a>
                        <p className="mt-2 text-sm text-neutral-600">
                          {source.role}
                        </p>
                      </article>
                    ))}
                  </div>
                </BriefSection>
              )}
            </article>

            {showProvenance && (
              <aside className="space-y-4">
                <div className="bg-black p-6 text-white">
                  <span className="eyebrow">Claims and sources</span>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-200">
                    The brief links to a claim/evidence ledger with stable
                    public keys, bounded excerpts, artifact revisions, and
                    correction history.
                  </p>
                  {showCaseFile && (
                    <Link
                      href={`/local/${brief.areaKey}/investigations/${brief.publicCaseKey}`}
                      className="mt-5 inline-flex items-center gap-2 border-b border-white text-xs uppercase tracking-[.14em]"
                    >
                      Open evidence ledger <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </div>
                <div className="border border-black/10 p-6">
                  <span className="eyebrow">Provenance state</span>
                  <strong className="mt-3 block text-2xl">
                    {published
                      ? "Confirmed"
                      : brief.kind === "reference"
                        ? "Captured briefing"
                        : "Reference output"}
                  </strong>
                  <p className="mt-2 text-sm text-neutral-600">
                    Publication state: {published ? "confirmed" : "none"}
                  </p>
                  {brief.materialClaimCount !== undefined && (
                    <p className="mt-1 text-sm text-neutral-600">
                      {brief.materialClaimCount} verified material claim
                      {brief.materialClaimCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>

        {showProvenance && (
          <section className="bg-black text-white">
            <div className="mx-auto max-w-[1100px] px-6 py-16 md:px-10">
              <span className="eyebrow">Verification path</span>
              <h2 className="mt-3 max-w-4xl text-3xl font-bold leading-none tracking-tight md:text-5xl">
                {published
                  ? "Evidence to confirmed publication."
                  : "A stage summary, not a prompt viewer."}
              </h2>
              <ol className="mt-10 grid gap-px border border-white/15 bg-white/15">
                <VerificationStage
                  n="01"
                  title="Capture"
                  body="Approved public source versions are stored before claim extraction."
                />
                <VerificationStage
                  n="02"
                  title="Verify"
                  body="Material claims map to exact artifact excerpts and offsets; missing or contradictory support stops progress."
                />
                <VerificationStage
                  n="03"
                  title="Review"
                  body="Factual, style, reliability, and reachability checks bind to the exact canonical brief hash."
                />
                <VerificationStage
                  n="04"
                  title="Publish"
                  body={
                    published
                      ? "A durable final gate created an idempotent publication intent and the provider returned a verified identity."
                      : "Only a durable deterministic final gate may create a publication intent."
                  }
                />
              </ol>
            </div>
          </section>
        )}

        <section className="bg-neutral-50">
          <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10">
            <BriefSection title="Clarifications, corrections, and retractions">
              {brief.correctionNotice ? (
                <div className="border border-black/15 p-5">
                  <strong className="capitalize">
                    {brief.correctionNotice.type}
                  </strong>
                  <p className="mt-2 text-neutral-600">
                    {brief.correctionNotice.rationaleCode
                      .replaceAll("_", " ")
                      .toLowerCase()}
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <strong>
                    No formal notice for this{" "}
                    {published
                      ? "publication"
                      : brief.kind === "reference"
                        ? "captured briefing"
                        : "reference output"}
                    .
                  </strong>
                  <p>
                    Confirmed changes surface here and in the linked case file.
                  </p>
                </div>
              )}
            </BriefSection>
          </div>
        </section>
      </main>
      <Colophon />
    </>
  );
}

function ResidentAnswerSection({ run }: { run: ReferenceRun }) {
  const answer = run.intelligence?.residentAnswer;
  if (!answer) return null;

  return (
    <section
      className="border-b border-black/10 bg-[#f5f2ea]"
      aria-labelledby="resident-answer-heading"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-12 md:px-10">
        <span className="eyebrow">Resident answer</span>
        <h2
          id="resident-answer-heading"
          className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl"
        >
          {answer.bottomLine}
        </h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[.14em]">
              What is new
            </h3>
            <ul className="mt-4 grid gap-3">
              {answer.whatIsNew.map((item) => (
                <li
                  key={item}
                  className="border-l-2 border-black pl-4 text-sm leading-relaxed"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[.14em]">
              What to do
            </h3>
            <ul className="mt-4 grid gap-3">
              {answer.actions.map((action) => (
                <li
                  key={action.label}
                  className="border border-black/15 bg-white p-4"
                >
                  <strong className="block">{action.label}</strong>
                  {action.deadline && (
                    <span className="mt-2 block text-xs font-bold uppercase tracking-[.12em] text-neutral-500">
                      {action.deadline}
                    </span>
                  )}
                  <span className="mt-2 block text-xs text-neutral-600">
                    {action.affectedGroups.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {answer.knownUnknowns.length > 0 && (
          <div className="mt-8 border border-amber-400 bg-amber-50 p-5">
            <h3 className="text-sm font-bold uppercase tracking-[.14em] text-amber-950">
              Still unknown
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-neutral-700">
              {answer.knownUnknowns.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function BriefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs uppercase tracking-[.22em] text-neutral-500">
        {title}
      </h2>
      <div className="text-base leading-relaxed text-neutral-800 md:text-lg">
        {children}
      </div>
    </section>
  );
}

function VerificationStage({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li className="grid gap-4 bg-black p-5 md:grid-cols-[60px_160px_1fr]">
      <span className="font-mono text-xs text-neutral-500">{n}</span>
      <strong>{title}</strong>
      <p className="text-sm leading-relaxed text-neutral-300">{body}</p>
    </li>
  );
}
