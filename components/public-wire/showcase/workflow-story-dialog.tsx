"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CirclePause,
  CirclePlay,
  Gauge,
  RotateCcw,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowMomentVisual } from "./workflow-moment-visual";
import { WorkflowTimeline } from "./workflow-timeline";
import { DecisionCheckpointInspector } from "./decision-checkpoint-inspector";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { createReferenceRunIndex } from "@/lib/public-wire-view-models/reference-run-selectors";

const STATUS_LABELS = {
  complete: "Complete",
  caught: "Issue caught",
  revised: "Revised",
  held: "Stopped",
  ready: "Rechecked",
} as const;

function initialIndex(run: ReferenceRun, momentKey?: string) {
  return Math.max(
    0,
    run.story.moments.findIndex(
      (moment) =>
        moment.momentKey === (momentKey ?? run.story.pivotalMomentKey),
    ),
  );
}

function revealTimelineMoment(
  root: HTMLDivElement | null,
  index: number,
  focus = false,
) {
  const buttons = [
    ...(root?.querySelectorAll<HTMLButtonElement>("button") ?? []),
  ].filter((button) => button.offsetParent !== null);
  const button = buttons[index];
  button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (focus) button?.focus();
}

export function WorkflowStoryDialog({
  run,
  open,
  onOpenChange,
  caseFilesEnabled,
  initialMomentKey,
  initialPlaying = false,
}: {
  run: ReferenceRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseFilesEnabled: boolean;
  initialMomentKey?: string;
  initialPlaying?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(() => initialIndex(run, initialMomentKey));
  const [playing, setPlaying] = useState(() =>
    Boolean(initialPlaying && !reduceMotion),
  );
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(index);
  const moment = run.story.moments[index] ?? run.story.moments[0];
  const runIndex = useMemo(() => createReferenceRunIndex(run), [run]);
  const phaseLabel =
    index === 0
      ? "Input"
      : index === run.story.moments.length - 1
        ? "Output"
        : "Agent work";
  const proofLabel =
    phaseLabel === "Input"
      ? "Input sources"
      : phaseLabel === "Output"
        ? "Output and evidence"
        : "Evidence used here";
  const contribution = moment.contribution;
  const checkpoints =
    run.intelligence?.decisionCheckpoints.filter((checkpoint) =>
      contribution?.decisionCheckpointKeys.includes(checkpoint.checkpointKey),
    ) ?? [];

  useEffect(() => {
    if (!playing || reduceMotion) return;
    if (index >= run.story.moments.length - 1) {
      const done = window.setTimeout(() => setPlaying(false), 0);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(
      () => setIndex((value) => value + 1),
      4200 / playbackSpeed,
    );
    return () => window.clearTimeout(timer);
  }, [index, playbackSpeed, playing, reduceMotion, run.story.moments.length]);

  useEffect(() => {
    selectedIndexRef.current = index;
    const frame = window.requestAnimationFrame(() =>
      revealTimelineMoment(timelineRef.current, index),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [index]);

  useEffect(() => {
    let frame: number | undefined;
    const handleResize = () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() =>
        revealTimelineMoment(timelineRef.current, selectedIndexRef.current),
      );
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const resolved = useMemo(
    () => ({
      claims: runIndex.claimKeys(moment.claimKeys),
      receipts: runIndex.receiptKeys(moment.receiptKeys),
    }),
    [moment, runIndex],
  );

  function select(nextIndex: number, focus = false) {
    const bounded = Math.max(
      0,
      Math.min(run.story.moments.length - 1, nextIndex),
    );
    setIndex(bounded);
    setPlaying(false);
    if (focus)
      window.requestAnimationFrame(() =>
        revealTimelineMoment(timelineRef.current, bounded, true),
      );
  }

  function replay() {
    setIndex(0);
    setPlaying(!reduceMotion);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setPlaying(false);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        data-lenis-prevent=""
        showCloseButton={false}
        className="h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-[1220px] sm:max-w-[1220px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none border-0 bg-[#f5f2ea] p-0 text-black shadow-2xl"
      >
        <header className="flex items-start justify-between gap-6 border-b border-black/15 bg-white px-5 py-4 md:px-7">
          <div className="min-w-0">
            <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
              <span className="hidden min-[420px]:inline">
                Investigation trail · {index + 1} of {run.story.moments.length}
              </span>
              <span className="min-[420px]:hidden">
                Step {index + 1} of {run.story.moments.length}
              </span>
            </span>
            <DialogTitle className="mt-2 break-words text-xl leading-tight md:text-2xl">
              {run.detail.summary.topic}
            </DialogTitle>
            <DialogDescription className="sr-only">
              An interactive, reader-safe walkthrough of the selected reference
              workflow.
            </DialogDescription>
          </div>
          <DialogClose className="grid size-10 shrink-0 place-items-center border border-black/25 transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close investigation trail</span>
          </DialogClose>
        </header>

        <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="border-b border-black/15 bg-neutral-950 p-4 text-white lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[.65rem] font-bold uppercase tracking-[.16em] text-neutral-500">
                What happened
              </span>
              <div className="flex items-center gap-2">
                {!reduceMotion && (
                  <button
                    type="button"
                    aria-label={`Playback speed ${playbackSpeed} times. Change speed.`}
                    onClick={() =>
                      setPlaybackSpeed((speed) =>
                        speed === 0.75 ? 1 : speed === 1 ? 1.5 : 0.75,
                      )
                    }
                    className="inline-flex min-h-8 items-center gap-1 border border-white/25 px-2 text-[.62rem] font-bold uppercase tracking-[.08em] hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Gauge aria-hidden="true" className="size-3" />
                    {playbackSpeed}×
                  </button>
                )}
                <button
                  type="button"
                  onClick={replay}
                  className="inline-flex min-h-8 items-center gap-2 border border-white/25 px-2 text-[.62rem] font-bold uppercase tracking-[.08em] hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <RotateCcw aria-hidden="true" className="size-3" /> From
                  source
                </button>
              </div>
            </div>
            <WorkflowTimeline
              moments={run.story.moments}
              loopEdges={run.story.loopEdges}
              index={index}
              onSelect={select}
              timelineRef={timelineRef}
            />
          </aside>

          <section
            className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-5 md:p-8 lg:p-10"
            onPointerDown={() => setPlaying(false)}
            onFocus={() => setPlaying(false)}
          >
            <p className="sr-only" aria-live="polite">
              {moment.headline}. {moment.narrative}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moment.momentKey}
                initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.24,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.78fr)]"
              >
                <section className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-black bg-white px-2 py-1 text-[.65rem] font-bold uppercase tracking-[.14em] text-black">
                      {phaseLabel}
                    </span>
                    <span className="bg-black px-2 py-1 text-[.65rem] font-bold uppercase tracking-[.14em] text-white">
                      {moment.actor}
                    </span>
                    <span className="border border-black/20 px-2 py-1 text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-600">
                      {STATUS_LABELS[moment.status]}
                    </span>
                  </div>
                  <h2 className="mt-5 max-w-2xl break-words text-balance text-3xl font-bold leading-[.98] md:text-5xl">
                    {moment.headline}
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-700 md:text-lg">
                    {moment.narrative}
                  </p>
                  {contribution && (
                    <section
                      className="mt-7 border border-black/15 bg-white"
                      aria-label="Value added at this step"
                    >
                      <div className="border-b border-black/15 bg-black px-4 py-3 text-white">
                        <span className="text-[.62rem] font-bold uppercase tracking-[.14em] text-neutral-400">
                          What this step added
                        </span>
                        <p className="mt-1 text-sm font-semibold leading-relaxed">
                          {contribution.addedValue}
                        </p>
                      </div>
                      <div className="grid gap-px bg-black/15 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
                        <div className="min-w-0 bg-[#f5f2ea] p-3">
                          <span className="text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
                            Input
                          </span>
                          <strong className="mt-2 block break-words text-sm [overflow-wrap:anywhere]">
                            {contribution.inputLabel}
                          </strong>
                        </div>
                        <div className="hidden place-items-center bg-white px-2 sm:grid">
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 text-neutral-400"
                          />
                        </div>
                        <div className="min-w-0 bg-emerald-50 p-3">
                          <span className="text-[.58rem] font-bold uppercase tracking-[.1em] text-emerald-800">
                            Output
                          </span>
                          <strong className="mt-2 block break-words text-sm [overflow-wrap:anywhere]">
                            {contribution.outputLabel}
                          </strong>
                        </div>
                      </div>
                      <div className="grid gap-px border-t border-black/15 bg-black/15 sm:grid-cols-2">
                        <p className="bg-white p-3 text-xs leading-relaxed text-neutral-700">
                          <strong className="mb-1 block text-black">
                            Operation
                          </strong>
                          {contribution.operation}
                        </p>
                        <p className="bg-emerald-50 p-3 text-xs leading-relaxed text-neutral-700">
                          <strong className="mb-1 block text-emerald-900">
                            Resident impact
                          </strong>
                          {contribution.residentImpact}
                        </p>
                      </div>
                    </section>
                  )}
                  {checkpoints.length > 0 && (
                    <div className="mt-7">
                      <span className="mb-3 block text-[.62rem] font-bold uppercase tracking-[.14em] text-neutral-500">
                        Decision at this step
                      </span>
                      <DecisionCheckpointInspector
                        run={run}
                        checkpoints={checkpoints}
                        compact
                      />
                    </div>
                  )}
                  {(resolved.claims.length > 0 ||
                    resolved.receipts.length > 0) && (
                    <div className="mt-7 flex flex-wrap gap-2 text-[.65rem] font-bold uppercase tracking-[.12em] text-neutral-600">
                      <span className="border border-black/20 px-2 py-1">
                        {resolved.claims.length} linked claim
                        {resolved.claims.length === 1 ? "" : "s"}
                      </span>
                      <span className="border border-black/20 px-2 py-1">
                        {resolved.receipts.length} linked receipt
                        {resolved.receipts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                  <details className="mt-8 border-t border-black/15 pt-4 text-sm">
                    <summary className="cursor-pointer font-bold">
                      Technical record
                    </summary>
                    <dl className="mt-4 grid gap-3 text-xs text-neutral-600 sm:grid-cols-2">
                      <div className="min-w-0">
                        <dt className="font-bold text-black">
                          Execution record
                        </dt>
                        <dd className="[overflow-wrap:anywhere]">
                          {run.execution?.kind === "recorded_adk_trace"
                            ? `Google ADK ${run.execution.frameworkVersion} · ${run.execution.model}`
                            : `Deterministic reference trajectory · ${run.execution?.contractVersion ?? "contract fixture"}`}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-black">
                          {run.execution?.kind === "recorded_adk_trace"
                            ? "Recorded executor"
                            : "Modeled executor"}
                        </dt>
                        <dd className="[overflow-wrap:anywhere]">
                          {moment.system.agentKind}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-black">
                          {moment.system.recordLabel ?? "Public event"}
                        </dt>
                        <dd className="break-all font-mono">
                          {moment.system.eventCode}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-black">Bounded state</dt>
                        <dd className="break-all font-mono">
                          {moment.system.stateKey ?? "application boundary"}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                      Reference trajectories validate the public contract and
                      interaction model; they do not assert live Gemini calls. A
                      live provider identity appears only with a recorded ADK
                      trace.
                    </p>
                  </details>
                  <details className="mt-4 border-t border-black/15 pt-4 text-sm">
                    <summary className="cursor-pointer font-bold">
                      Full run
                    </summary>
                    <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                      {run.agents.map((agent) => (
                        <li
                          key={agent.key}
                          className="min-w-0 border border-black/15 bg-white p-3 [overflow-wrap:anywhere]"
                        >
                          <span className="text-[.65rem] font-bold uppercase tracking-[.12em] text-neutral-500">
                            {agent.kind} · {agent.status}
                          </span>
                          <strong className="mt-1 block text-sm">
                            {agent.name}
                          </strong>
                          <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                            {agent.output}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </details>
                </section>
                <aside className="min-w-0">
                  <span className="mb-3 block text-[.65rem] font-bold uppercase tracking-[.16em] text-neutral-500">
                    {proofLabel}
                  </span>
                  <WorkflowMomentVisual run={run} moment={moment} />
                </aside>
              </motion.div>
            </AnimatePresence>
          </section>
        </div>

        <footer className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-black/15 bg-white px-3 py-3 md:px-6">
          <button
            type="button"
            aria-label="Previous step"
            onClick={() => select(index - 1)}
            disabled={index === 0}
            className="inline-flex min-w-0 items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-[.08em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-30"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span className="hidden min-[390px]:inline">Previous</span>
          </button>
          <button
            type="button"
            onClick={() =>
              index === run.story.moments.length - 1
                ? replay()
                : reduceMotion
                  ? select(index + 1)
                  : setPlaying((value) => !value)
            }
            className="inline-flex min-w-0 items-center justify-self-center gap-2 bg-black px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {index === run.story.moments.length - 1 ? (
              <RotateCcw aria-hidden="true" className="size-4" />
            ) : playing ? (
              <CirclePause aria-hidden="true" className="size-4" />
            ) : (
              <CirclePlay aria-hidden="true" className="size-4" />
            )}
            {index === run.story.moments.length - 1
              ? "Replay"
              : reduceMotion
                ? "Next"
                : playing
                  ? "Pause"
                  : "Play"}
          </button>
          {index < run.story.moments.length - 1 ? (
            <button
              type="button"
              aria-label="Next step"
              onClick={() => select(index + 1)}
              className="inline-flex min-w-0 items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-[.08em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <span className="hidden min-[390px]:inline">Next</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          ) : caseFilesEnabled ? (
            <Link
              aria-label="Open case file"
              href={`/local/${run.detail.summary.areaKey}/investigations/${run.detail.summary.publicCaseKey}`}
              className="inline-flex min-w-0 items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-[.08em]"
            >
              <span className="hidden min-[390px]:inline">Case file</span>
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-[.08em]">
              <Check aria-hidden="true" className="size-4" />
              <span className="hidden min-[390px]:inline">Complete</span>
              <span className="sr-only min-[390px]:hidden">Complete</span>
            </span>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
