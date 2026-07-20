"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Play,
  ShieldX,
} from "lucide-react";
import { WorkflowMiniMap } from "./workflow-mini-map";
import { ValueAuditWorkbench } from "./value-audit-workbench";
import { SourceLinkList } from "@/components/public-wire/shared/source-link-list";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { createReferenceRunIndex } from "@/lib/public-wire-view-models/reference-run-selectors";

const WorkflowStoryDialog = dynamic(() =>
  import("./workflow-story-dialog").then(
    (module) => module.WorkflowStoryDialog,
  ),
);

type ExplorerVariant = "landing" | "case";

type ReferenceRunExplorerProps = {
  runs: ReferenceRun[];
  caseFilesEnabled: boolean;
  variant?: ExplorerVariant;
  auditDefaultView?: "answer" | "sources" | "rules";
};

function OutcomeIcon({ tone }: { tone: ReferenceRun["story"]["outcomeTone"] }) {
  if (tone === "positive") {
    return (
      <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-600" />
    );
  }
  if (tone === "caution") {
    return <CircleAlert aria-hidden="true" className="size-5 text-amber-600" />;
  }
  return <ShieldX aria-hidden="true" className="size-5 text-rose-700" />;
}

function ScenarioSelector({
  runs,
  selectedKey,
  onSelect,
}: {
  runs: ReferenceRun[];
  selectedKey: ReferenceRun["scenarioKey"];
  onSelect: (key: ReferenceRun["scenarioKey"]) => void;
}) {
  if (runs.length <= 1) return null;

  return (
    <div
      className="grid gap-px bg-white/15 md:grid-cols-2 xl:grid-cols-4"
      role="group"
      aria-label="Choose a reference story"
    >
      {runs.map((run) => {
        const selected = run.scenarioKey === selectedKey;
        return (
          <button
            key={run.scenarioKey}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(run.scenarioKey)}
            className={`min-h-32 p-5 text-left transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              selected
                ? "bg-white text-black focus-visible:outline-white"
                : "bg-neutral-950 text-white hover:bg-neutral-900 focus-visible:outline-white"
            }`}
          >
            <span className="flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
              <OutcomeIcon tone={run.story.outcomeTone} />
              {run.story.outcomeLabel}
            </span>
            <strong className="mt-4 block min-w-0 break-words text-lg leading-tight [overflow-wrap:anywhere]">
              {run.detail.summary.topic}
            </strong>
          </button>
        );
      })}
    </div>
  );
}

const INPUT_ORIGIN_LABELS = {
  "official-source-packet": "Official source packet",
  "coverage-request-and-sources": "Coverage claim + sources",
  "single-source-artifact": "Captured source artifact",
} as const;

function RunContract({ run }: { run: ReferenceRun }) {
  const inputReceipts = createReferenceRunIndex(run).receiptKeys(
    run.input.receiptKeys,
  );
  const holdReason = run.detail.currentDecision.reasonCodes
    .map((reason) => reason.replaceAll("_", " ").toLowerCase())
    .join(" · ");
  const changeSummary =
    run.detail.schemaVersion === "2" ? run.detail.changeSummary : undefined;
  const noArticleImpact = changeSummary?.impact === "no_change";

  return (
    <section
      className="mt-9 border border-black/15"
      aria-label="Run input, agent impact, and output"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/15 bg-white/70 px-4 py-3">
        <span className="text-[.65rem] font-bold uppercase tracking-[.15em] text-neutral-600">
          Run contract
        </span>
        <span className="text-xs text-neutral-500">
          Input → agent checks → output
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-px bg-black/15 xl:grid-cols-3">
        <article className="min-w-0 bg-white p-5">
          <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
            01 · Input · {INPUT_ORIGIN_LABELS[run.input.origin]}
          </span>
          <h4 className="mt-3 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">
            {run.input.label}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {run.input.summary}
          </p>
          <SourceLinkList
            receipts={inputReceipts}
            label="Open input sources"
            compact
          />
        </article>

        <article className="min-w-0 bg-neutral-950 p-5 text-white">
          <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-400">
            02 · Agent impact
          </span>
          <h4 className="mt-3 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">
            {run.story.outcomeLabel}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">
            {run.story.hook}
          </p>
          <dl className="mt-5 grid gap-px bg-white/15">
            {run.story.metrics.map((metric) => (
              <div
                key={metric.label}
                className="flex min-w-0 items-end justify-between gap-3 bg-neutral-950 p-3"
              >
                <dt className="text-[.62rem] font-bold uppercase tracking-[.07em] text-neutral-400">
                  {metric.label}
                </dt>
                <dd className="text-2xl font-bold">{metric.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article
          className={`min-w-0 p-5 ${run.output || noArticleImpact ? "bg-emerald-50" : "bg-amber-50"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-600">
              03 · Output
            </span>
            <span
              className={`border px-2 py-1 text-[.6rem] font-bold uppercase tracking-[.1em] ${run.output || noArticleImpact ? "border-emerald-600 text-emerald-800" : "border-amber-600 text-amber-900"}`}
            >
              {run.output
                ? "Brief candidate · not published"
                : noArticleImpact
                  ? "No article change"
                  : "No article emitted"}
            </span>
          </div>
          <h4 className="mt-3 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">
            {run.output?.headline ??
              (noArticleImpact
                ? "The verified result is retained"
                : "The workflow stopped before prose")}
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">
            {run.output?.summary ??
              (noArticleImpact
                ? changeSummary?.summary
                : `The public result is a typed hold: ${holdReason}. Unsupported material never becomes an article.`)}
          </p>
          <p className="mt-4 border-t border-black/15 pt-3 text-xs font-semibold text-neutral-600">
            {run.output?.disposition ??
              (noArticleImpact
                ? "The source revision is recorded; no provider publication is created or changed."
                : "Downstream writer and publication calls were not invoked.")}
          </p>
        </article>
      </div>
    </section>
  );
}

function TurningPoint({
  run,
  variant,
  onOpen,
}: {
  run: ReferenceRun;
  variant: ExplorerVariant;
  onOpen: () => void;
}) {
  const pivotal =
    run.story.moments.find(
      (moment) => moment.momentKey === run.story.pivotalMomentKey,
    ) ?? run.story.moments[0];
  if (!pivotal) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${variant === "case" ? "bg-neutral-950" : "bg-black"} group min-w-0 p-6 text-left text-white transition hover:bg-neutral-900 md:p-9 lg:p-12`}
      aria-label={`Open the investigation trail at: ${pivotal.headline}`}
    >
      <span className="text-[.65rem] font-bold uppercase tracking-[.17em] text-neutral-500">
        Turning point · {pivotal.actor}
      </span>
      <strong className="mt-5 block min-w-0 break-words text-balance text-3xl leading-[.98] [overflow-wrap:anywhere] md:text-4xl">
        {pivotal.headline}
      </strong>
      <p className="mt-5 max-w-xl break-words text-sm leading-relaxed text-neutral-300 [overflow-wrap:anywhere]">
        {pivotal.narrative}
      </p>
      {pivotal.visual.kind === "draft-change" && (
        <div className="mt-7 border-l-2 border-amber-300 pl-4">
          <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-amber-300">
            Flagged wording
          </span>
          <p className="mt-2 text-sm text-white">
            “{pivotal.visual.flaggedText}”
          </p>
        </div>
      )}
      <span className="mt-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em]">
        Step through what happened
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition group-hover:translate-x-1"
        />
      </span>
    </button>
  );
}

export function ReferenceRunExplorer({
  runs,
  caseFilesEnabled,
  variant = "landing",
  auditDefaultView = "answer",
}: ReferenceRunExplorerProps) {
  const [selectedKey, setSelectedKey] = useState<
    ReferenceRun["scenarioKey"] | undefined
  >(runs[0]?.scenarioKey);
  const [open, setOpen] = useState(false);
  const [initialMomentKey, setInitialMomentKey] = useState<
    string | undefined
  >();
  const [initialPlaying, setInitialPlaying] = useState(false);
  const [dialogSession, setDialogSession] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);
  const focusReturnTimerRef = useRef<number | undefined>(undefined);
  const run = runs.find((item) => item.scenarioKey === selectedKey) ?? runs[0];

  useEffect(
    () => () => {
      if (focusReturnTimerRef.current !== undefined)
        window.clearTimeout(focusReturnTimerRef.current);
    },
    [],
  );

  if (!run) return null;

  const isCase = variant === "case";
  const openStory = (momentKey = run.story.pivotalMomentKey, play = false) => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setInitialMomentKey(momentKey);
    setInitialPlaying(play);
    setDialogSession((session) => session + 1);
    setOpen(true);
  };
  const setStoryOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (focusReturnTimerRef.current !== undefined)
      window.clearTimeout(focusReturnTimerRef.current);
    if (!nextOpen) {
      focusReturnTimerRef.current = window.setTimeout(
        () => openerRef.current?.focus(),
        250,
      );
    }
  };
  const selectRun = (key: ReferenceRun["scenarioKey"]) => {
    if (focusReturnTimerRef.current !== undefined)
      window.clearTimeout(focusReturnTimerRef.current);
    setSelectedKey(key);
    setInitialMomentKey(undefined);
    setInitialPlaying(false);
    setOpen(false);
  };

  return (
    <div className={isCase ? "border border-black/15" : "mt-12"}>
      <ScenarioSelector
        runs={runs}
        selectedKey={run.scenarioKey}
        onSelect={selectRun}
      />

      <article
        className={`grid grid-cols-[minmax(0,1fr)] gap-px ${
          isCase
            ? "bg-black/15 lg:grid-cols-[1.1fr_.9fr]"
            : "bg-white/15 lg:grid-cols-[1.18fr_.82fr]"
        }`}
      >
        <div
          className={`${isCase ? "bg-white" : "bg-[#f5f2ea]"} min-w-0 p-6 text-black md:p-9 lg:p-12`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.16em] text-neutral-600">
              <OutcomeIcon tone={run.story.outcomeTone} />
              {run.story.outcomeLabel}
            </span>
            <span className="text-[.65rem] font-semibold uppercase tracking-[.13em] text-neutral-600">
              Bounded reference run
            </span>
          </div>
          <h3 className="mt-6 max-w-3xl break-words text-balance text-4xl font-bold leading-[.94] [overflow-wrap:anywhere] md:text-6xl">
            {run.detail.summary.topic}
          </h3>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-700">
            {run.story.hook}
          </p>
          {run.intelligence ? (
            <ValueAuditWorkbench
              run={run}
              onOpenMoment={openStory}
              defaultView={auditDefaultView}
            />
          ) : (
            <RunContract run={run} />
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            {run.output?.briefSlug && (
              <Link
                href={`/briefs/${run.output.briefSlug}`}
                className="inline-flex items-center gap-2 bg-black px-5 py-3 text-xs font-bold uppercase tracking-[.14em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Read the briefing
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => openStory(run.story.moments[0]?.momentKey, true)}
              className={`${run.output?.briefSlug ? "border border-black bg-white text-black hover:bg-black hover:text-white" : "bg-black text-white hover:bg-neutral-800"} inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-[.14em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black`}
            >
              <Play aria-hidden="true" className="size-4" />
              Watch the check
            </button>
            {caseFilesEnabled && !isCase && (
              <Link
                href={`/local/${run.detail.summary.areaKey}/investigations/${run.detail.summary.publicCaseKey}`}
                className="inline-flex items-center gap-2 border border-black px-5 py-3 text-xs font-bold uppercase tracking-[.14em] transition hover:bg-black hover:text-white"
              >
                Open the case
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
          <WorkflowMiniMap run={run} onSelect={openStory} />
        </div>

        <TurningPoint run={run} variant={variant} onOpen={() => openStory()} />
      </article>

      {dialogSession > 0 && (
        <WorkflowStoryDialog
          key={`${run.scenarioKey}:${dialogSession}`}
          run={run}
          open={open}
          onOpenChange={setStoryOpen}
          caseFilesEnabled={caseFilesEnabled}
          initialMomentKey={initialMomentKey}
          initialPlaying={initialPlaying}
        />
      )}
    </div>
  );
}
