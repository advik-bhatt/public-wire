import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SourceLinkList } from "@/components/public-wire/shared/source-link-list";
import type { PublicEditionView } from "@/lib/public-wire-view-models/schemas";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { referenceOutputReceipts } from "@/lib/public-wire-view-models/reference-run-selectors";
import { absoluteTime } from "@/lib/public-wire-view-models/state-labels";

type PublishedBrief = NonNullable<PublicEditionView["leadBrief"]>;

function changeImpact(brief: PublishedBrief) {
  return "changeImpact" in brief && typeof brief.changeImpact === "string"
    ? brief.changeImpact
    : undefined;
}

function changeLabel(brief: PublishedBrief) {
  return "changeLabel" in brief && typeof brief.changeLabel === "string"
    ? brief.changeLabel
    : undefined;
}

function lifecycleLabel(brief: PublishedBrief) {
  if (brief.correctionState === "corrected") return "Correction";
  if (brief.correctionState === "clarified") return "Clarified";
  if (changeImpact(brief) === "material_update")
    return changeLabel(brief) ?? "Updated";
  if (changeImpact(brief) === "no_change") return "Source rechecked";
  return "Published";
}

export function PublishedLeadBrief({
  brief,
  areaKey,
  caseFilesEnabled,
}: {
  brief: PublishedBrief;
  areaKey: string;
  caseFilesEnabled: boolean;
}) {
  const updateLabel = changeLabel(brief);

  return (
    <article className="lead-brief">
      <div>
        <div className="brief-meta">
          <span>{lifecycleLabel(brief)}</span>
          <span>{brief.category}</span>
          <span>{brief.lifecycleState}</span>
        </div>
        {updateLabel && (
          <p className="mb-4 border-l-4 border-black bg-[#f1eee6] px-4 py-3 text-sm font-semibold">
            {updateLabel}
          </p>
        )}
        <h2>{brief.headline}</h2>
        <p>{brief.summary}</p>
        <div className="detail-grid">
          <div>
            <strong>Why it matters</strong>
            <p>{brief.whyItMatters}</p>
          </div>
          <div>
            <strong>Who may be affected</strong>
            <p>{brief.whoIsAffected.join(" · ")}</p>
          </div>
        </div>
        <div className="button-row">
          <Link href={`/briefs/${brief.slug}`} className="btn-solid-dark">
            Read brief <ArrowUpRight className="size-4" />
          </Link>
          {caseFilesEnabled && (
            <Link
              href={`/local/${areaKey}/investigations/${brief.publicCaseKey}`}
              className="btn-outline-dark"
            >
              Inspect receipts
            </Link>
          )}
        </div>
      </div>
      <aside>
        <div className="eyebrow">Provenance</div>
        <strong>{brief.materialClaimCount} material claims</strong>
        <p>
          {brief.sourceReceiptCount} public source receipts · updated{" "}
          {absoluteTime(brief.updatedAt)}
        </p>
      </aside>
    </article>
  );
}

export function ReferenceLeadBrief({
  run,
  caseFilesEnabled,
}: {
  run: ReferenceRun;
  caseFilesEnabled: boolean;
}) {
  const output = run.output;
  if (!output) return null;

  const intelligence = run.intelligence;
  const outputReceipts = referenceOutputReceipts(run);

  return (
    <article className="lead-brief">
      <div>
        <div className="brief-meta">
          <span>Captured briefing</span>
          <span>Application review next</span>
          <span>
            {intelligence?.aggregation.requiresMultipleSources
              ? "Multi source answer"
              : "Source backed answer"}
          </span>
        </div>
        <h2>{output.headline}</h2>
        <p>{intelligence?.residentAnswer.bottomLine ?? output.summary}</p>
        {intelligence && (
          <div className="my-6 grid gap-px bg-black/15 sm:grid-cols-3">
            <ReferenceMetric
              label="Source pages"
              value={intelligence.aggregation.uniqueSourceCount}
            />
            <ReferenceMetric
              label="Publishers"
              value={intelligence.aggregation.uniquePublisherCount}
            />
            <ReferenceMetric
              label="Material claims"
              value={intelligence.aggregation.materialClaimCount}
            />
          </div>
        )}
        <SourceLinkList
          receipts={outputReceipts}
          label="Official pages behind this briefing"
        />
        <div className="detail-grid">
          <div>
            <strong>What PublicWire added</strong>
            <p>
              {intelligence?.aggregation.explanation ?? run.detail.whyItMatters}
            </p>
          </div>
          <div>
            <strong>Who may be affected</strong>
            <p>{run.detail.whoIsAffected.join(" · ")}</p>
          </div>
        </div>
        <div className="button-row">
          {output.briefSlug && (
            <>
              <Link
                href={`/briefs/${output.briefSlug}`}
                className="btn-solid-dark"
              >
                Read the briefing <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href={`/briefs/${output.briefSlug}#audit-run`}
                className="btn-outline-dark"
              >
                Audit this answer
              </Link>
            </>
          )}
          {caseFilesEnabled && (
            <Link
              href={`/local/${run.detail.summary.areaKey}/investigations/${run.detail.summary.publicCaseKey}`}
              className="btn-outline-dark"
            >
              Open the full case
            </Link>
          )}
        </div>
      </div>
      <aside>
        <div className="eyebrow text-neutral-400">Why this is different</div>
        <strong>
          {intelligence?.aggregation.requiresMultipleSources
            ? "No single captured page contains the full answer."
            : output.disposition}
        </strong>
        <p>
          {intelligence
            ? `${intelligence.addedValue.length} traceable agent contributions · ${intelligence.decisionCheckpoints.length} inspectable decision checks`
            : `${run.detail.summary.materialClaimCounts.supported} supported material claims · ${run.detail.summary.sourceReceiptCount} source receipts`}
        </p>
      </aside>
    </article>
  );
}

export function BriefListItem({ brief }: { brief: PublishedBrief }) {
  const updateLabel = changeLabel(brief);

  return (
    <article>
      <div className="brief-meta">
        <span>{lifecycleLabel(brief)}</span>
        <span>{brief.category}</span>
        <span>{absoluteTime(brief.updatedAt)}</span>
      </div>
      <h3>
        <Link href={`/briefs/${brief.slug}`}>{brief.headline}</Link>
      </h3>
      <p>{brief.summary}</p>
      {updateLabel && (
        <p className="mt-3 border-l-2 border-black pl-3 text-sm font-semibold">
          {updateLabel}
        </p>
      )}
    </article>
  );
}

function ReferenceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#f5f2ea] p-3">
      <span className="text-[.62rem] font-bold uppercase tracking-[.12em] text-neutral-500">
        {label}
      </span>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}
