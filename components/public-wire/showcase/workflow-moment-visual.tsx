import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  FileCheck2,
  GitCompareArrows,
  History,
  RotateCcw,
  Scale,
  ShieldX,
} from "lucide-react";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { SourceLinkList } from "@/components/public-wire/shared/source-link-list";

type Moment = ReferenceRun["story"]["moments"][number];

function ReceiptCard({
  run,
  receiptKey,
  label,
}: {
  run: ReferenceRun;
  receiptKey: string;
  label?: string;
}) {
  const receipt = run.detail.sourceReceipts.find(
    (item) => item.publicReceiptKey === receiptKey,
  );
  if (!receipt) return null;
  return (
    <article className="border border-black/15 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
        <span>{label ?? receipt.sourceAuthority}</span>
        <span>{receipt.artifactRevisionLabel}</span>
      </div>
      <blockquote className="mt-4 border-l-2 border-black pl-4 text-sm leading-relaxed text-neutral-700">
        {receipt.boundedExcerpt}
      </blockquote>
      <p className="mt-4 text-xs font-semibold text-neutral-500">
        {receipt.sourceTitle}
      </p>
      <a
        href={receipt.sourceUrl}
        target="_blank"
        rel="noreferrer"
        referrerPolicy="no-referrer"
        className="mt-4 inline-flex items-center gap-2 text-xs font-bold underline underline-offset-4"
      >
        Open source <ArrowUpRight aria-hidden="true" className="size-3" />
      </a>
    </article>
  );
}

function HighlightedDraft({
  text,
  flaggedText,
}: {
  text: string;
  flaggedText: string;
}) {
  const index = text.indexOf(flaggedText);
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-amber-200 px-1 text-black">{flaggedText}</mark>
      {text.slice(index + flaggedText.length)}
    </>
  );
}

function MomentVisualBody({
  run,
  moment,
}: {
  run: ReferenceRun;
  moment: Moment;
}) {
  const visual = moment.visual;
  if (visual.kind === "receipt")
    return <ReceiptCard run={run} receiptKey={visual.receiptKey} />;

  if (visual.kind === "claim-counts") {
    const counts = [
      ["Supported", visual.supported, "text-emerald-800"],
      ["Disputed", visual.disputed, "text-rose-800"],
      ["Missing", visual.missing, "text-amber-800"],
    ] as const;
    return (
      <div className="grid grid-cols-3 gap-px border border-black/15 bg-black/15">
        {counts.map(([label, value, tone]) => (
          <div key={label} className="bg-white p-4">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
              {label}
            </span>
            <strong className={`mt-3 block text-4xl ${tone}`}>{value}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (visual.kind === "draft-change") {
    if (visual.phase === "draft")
      return (
        <article className="border border-black/20 bg-white p-4">
          <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
            Draft attempt 1
          </span>
          <p className="mt-4 text-sm leading-relaxed text-neutral-800">
            {visual.before}
          </p>
        </article>
      );
    if (visual.phase === "caught")
      return (
        <article className="border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-amber-900">
              Returned to writer
            </span>
            <span className="break-all border border-amber-500 px-2 py-1 font-mono text-[.65rem] text-amber-900">
              {visual.issueCode}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-800">
            <HighlightedDraft
              text={visual.before}
              flaggedText={visual.flaggedText}
            />
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-900">
            <RotateCcw aria-hidden="true" className="size-4" /> One revision
            available
          </div>
        </article>
      );
    return (
      <div className="grid gap-3">
        <article className="border border-amber-300 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-amber-900">
              Before
            </span>
            <span className="break-all border border-amber-500 px-2 py-1 font-mono text-[.65rem] text-amber-900">
              {visual.issueCode}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-800">
            <HighlightedDraft
              text={visual.before}
              flaggedText={visual.flaggedText}
            />
          </p>
        </article>
        <ArrowDown
          aria-hidden="true"
          className="mx-auto size-5 text-neutral-400"
        />
        <article className="border border-emerald-300 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-emerald-900">
            <Check aria-hidden="true" className="size-4" /> Revised wording
          </div>
          <p className="mt-4 text-sm leading-relaxed text-neutral-800">
            {visual.after}
          </p>
        </article>
      </div>
    );
  }

  if (visual.kind === "source-diff") {
    const impactLabel =
      visual.impact === "no_change"
        ? "No claim impact"
        : visual.impact.replaceAll("_", " ");
    return (
      <div className="border border-black/20 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-600">
            <GitCompareArrows aria-hidden="true" className="size-4" />{" "}
            Claim-relevant excerpt
          </span>
          <span className="border border-black/20 px-2 py-1 text-[.62rem] font-bold uppercase tracking-[.1em]">
            {impactLabel}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start">
          <div className="min-w-0 bg-neutral-100 p-3">
            <strong className="text-[.65rem] uppercase tracking-[.12em]">
              {visual.beforeLabel}
            </strong>
            <p className="mt-2 break-words text-sm leading-relaxed text-neutral-700">
              {visual.before}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="mx-auto hidden size-4 text-neutral-400 md:mt-4 md:block"
          />
          <div className="min-w-0 bg-emerald-50 p-3">
            <strong className="text-[.65rem] uppercase tracking-[.12em] text-emerald-900">
              {visual.afterLabel}
            </strong>
            <p className="mt-2 break-words text-sm leading-relaxed text-neutral-700">
              {visual.after}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (visual.kind === "dissent-assessment") {
    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-2 border border-amber-400 bg-amber-50 p-4 text-sm font-bold text-amber-950">
          <Scale aria-hidden="true" className="size-5" /> {visual.outcomeLabel}
        </div>
        <ReceiptCard
          run={run}
          receiptKey={visual.supportReceiptKey}
          label="Supporting excerpt"
        />
        <ReceiptCard
          run={run}
          receiptKey={visual.contradictionReceiptKey}
          label="Limiting excerpt"
        />
        <p className="border-l-4 border-black bg-white p-4 text-sm leading-relaxed text-neutral-700">
          {visual.explanation}
        </p>
      </div>
    );
  }

  if (visual.kind === "record-revision") {
    return (
      <div className="border border-black bg-white p-5">
        <div className="flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.14em]">
          <History aria-hidden="true" className="size-4" />{" "}
          {visual.revisionType}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="border border-black/20 px-3 py-2 text-sm">
            {visual.beforeLabel}
          </span>
          <ArrowRight aria-hidden="true" className="size-4 text-neutral-400" />
          <span className="bg-black px-3 py-2 text-sm text-white">
            {visual.afterLabel}
          </span>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-neutral-700">
          {visual.detail}
        </p>
      </div>
    );
  }

  if (visual.kind === "evidence-conflict") {
    return (
      <div className="grid gap-3">
        <ReceiptCard
          run={run}
          receiptKey={visual.supportReceiptKey}
          label="Supporting excerpt"
        />
        <ReceiptCard
          run={run}
          receiptKey={visual.contradictionReceiptKey}
          label="Contradicting excerpt"
        />
      </div>
    );
  }

  return (
    <div className="border border-black bg-black p-5 text-white">
      <div className="flex items-center gap-3">
        {moment.status === "held" ? (
          <ShieldX aria-hidden="true" className="size-6 text-amber-300" />
        ) : (
          <FileCheck2 aria-hidden="true" className="size-6 text-emerald-300" />
        )}
        <strong className="text-xl">{visual.label}</strong>
      </div>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-300">
        {visual.detail}
      </p>
      {moment.status === "held" && (
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-amber-300">
          <CircleAlert aria-hidden="true" className="size-4" /> No downstream
          call
        </div>
      )}
    </div>
  );
}

export function WorkflowMomentVisual({
  run,
  moment,
}: {
  run: ReferenceRun;
  moment: Moment;
}) {
  const receipts = moment.receiptKeys
    .map((key) =>
      run.detail.sourceReceipts.find(
        (receipt) => receipt.publicReceiptKey === key,
      ),
    )
    .filter((receipt): receipt is NonNullable<typeof receipt> =>
      Boolean(receipt),
    );
  const sourcePageCount = new Set(receipts.map((receipt) => receipt.sourceUrl))
    .size;
  const isFinalMoment =
    run.story.moments.at(-1)?.momentKey === moment.momentKey;

  return (
    <div className="grid min-w-0 gap-3">
      {isFinalMoment && run.output && (
        <article className="border border-emerald-400 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-emerald-900">
              ADK brief candidate
            </span>
            <span className="border border-emerald-600 px-2 py-1 text-[.6rem] font-bold uppercase tracking-[.1em] text-emerald-800">
              Not published
            </span>
          </div>
          <h3 className="mt-4 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">
            {run.output.headline}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            {run.output.summary}
          </p>
          <p className="mt-4 border-t border-emerald-300 pt-3 text-xs font-semibold text-emerald-900">
            {run.output.disposition}
          </p>
        </article>
      )}
      <MomentVisualBody run={run} moment={moment} />
      {sourcePageCount > 1 && (
        <div className="border border-black/15 bg-white/60 p-4">
          <SourceLinkList
            receipts={receipts}
            label="Linked input sources"
            compact
          />
        </div>
      )}
    </div>
  );
}
