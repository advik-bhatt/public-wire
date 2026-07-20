"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { RefObject } from "react";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";

type Moment = ReferenceRun["story"]["moments"][number];
type LoopEdge = ReferenceRun["story"]["loopEdges"][number];

const STATUS_LABELS = {
  complete: "Complete",
  caught: "Issue caught",
  revised: "Revised",
  held: "Stopped",
  ready: "Rechecked",
} as const;
const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

function TimelineButton({
  moment,
  index,
  selected,
  loopLabel,
  onSelect,
}: {
  moment: Moment;
  index: number;
  selected: boolean;
  loopLabel?: string;
  onSelect: () => void;
}) {
  const loop = Boolean(loopLabel);
  return (
    <button
      type="button"
      data-workflow-index={index}
      aria-current={selected ? "step" : undefined}
      onClick={onSelect}
      className={`workflow-timeline-button relative min-h-24 w-full min-w-0 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected ? "border-white bg-white text-black" : loop ? "border-amber-300/60 bg-amber-300/10 text-white hover:bg-white/10" : "border-white/15 text-neutral-300 hover:border-white/40"}`}
    >
      <span className="flex items-center justify-between gap-2 text-[.65rem] font-bold uppercase tracking-[.13em]">
        <span>
          {String(index + 1).padStart(2, "0")} · {moment.stage}
        </span>
        {loopLabel && <span aria-label={loopLabel}>↩</span>}
      </span>
      <strong className="mt-2 block break-words text-sm leading-tight">
        {moment.actor}
      </strong>
      <span
        className={`mt-2 block text-[.65rem] font-semibold uppercase tracking-[.1em] ${selected ? "text-neutral-500" : moment.status === "caught" ? "text-amber-300" : "text-neutral-500"}`}
      >
        {STATUS_LABELS[moment.status]}
      </span>
    </button>
  );
}

export function WorkflowTimeline({
  moments,
  loopEdges,
  index,
  onSelect,
  timelineRef,
}: {
  moments: Moment[];
  loopEdges: LoopEdge[];
  index: number;
  onSelect: (index: number, focus?: boolean) => void;
  timelineRef: RefObject<HTMLDivElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const progress = moments.length > 1 ? index / (moments.length - 1) : 1;
  const edges = loopEdges.flatMap((edge) => {
    const from = moments.findIndex(
      (moment) => moment.momentKey === edge.fromMomentKey,
    );
    const to = moments.findIndex(
      (moment) => moment.momentKey === edge.toMomentKey,
    );
    return from >= 0 && to >= 0 ? [{ ...edge, from, to }] : [];
  });

  function keyNavigate(event: React.KeyboardEvent) {
    if (
      ![
        "ArrowDown",
        "ArrowUp",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === "Home") onSelect(0, true);
    else if (event.key === "End") onSelect(moments.length - 1, true);
    else {
      const focusedIndex = Number(
        (event.target as HTMLElement).closest<HTMLButtonElement>(
          "button[data-workflow-index]",
        )?.dataset.workflowIndex ?? index,
      );
      onSelect(
        focusedIndex +
          (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1),
        true,
      );
    }
  }

  return (
    <div ref={timelineRef} className="relative mt-4">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-2 left-0 hidden h-[calc(100%-1rem)] w-20 overflow-visible lg:block"
        viewBox="0 0 80 100"
        preserveAspectRatio="none"
      >
        <path d="M12 5V95" className="workflow-route-base" />
        <motion.path
          d="M12 5V95"
          className="workflow-route-progress"
          initial={false}
          animate={{ pathLength: progress }}
          transition={{
            duration: reduceMotion ? 0 : 0.42,
            ease: EDITORIAL_EASE,
          }}
        />
        {edges.map((edge) => {
          const fromY = 5 + (edge.from / (moments.length - 1)) * 90;
          const toY = 5 + (edge.to / (moments.length - 1)) * 90;
          return (
            <motion.path
              key={`${edge.fromMomentKey}:${edge.toMomentKey}`}
              d={`M12 ${fromY} C70 ${fromY}, 70 ${toY}, 12 ${toY}`}
              className="workflow-route-loop"
              initial={false}
              animate={{
                pathLength: index >= Math.max(edge.from, edge.to) ? 1 : 0,
                opacity: index >= Math.min(edge.from, edge.to) ? 1 : 0.12,
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.72,
                ease: EDITORIAL_EASE,
              }}
            />
          );
        })}
        <motion.circle
          r="3.4"
          cx="12"
          className="workflow-route-traveler"
          initial={false}
          animate={{ cy: 5 + progress * 90 }}
          transition={{
            duration: reduceMotion ? 0 : 0.42,
            ease: EDITORIAL_EASE,
          }}
        />
      </svg>

      <ol
        className="workflow-timeline-mobile flex gap-3 overflow-x-auto px-1 pb-3 pt-8 lg:hidden"
        aria-label="Workflow moments"
        onKeyDown={keyNavigate}
      >
        {moments.map((moment, momentIndex) => {
          const edge = edges.find((item) => item.from === momentIndex);
          const connected = edges.find(
            (item) => item.from === momentIndex || item.to === momentIndex,
          );
          return (
            <li key={moment.momentKey} className="relative min-w-44">
              <span
                aria-hidden="true"
                className={`workflow-mobile-node ${momentIndex <= index ? "is-reached" : ""} ${momentIndex === index ? "is-current" : ""}`}
              />
              {momentIndex < moments.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`workflow-mobile-segment ${momentIndex < index ? "is-reached" : ""}`}
                />
              )}
              <TimelineButton
                moment={moment}
                index={momentIndex}
                selected={momentIndex === index}
                loopLabel={connected?.label}
                onSelect={() => onSelect(momentIndex)}
              />
              {edge && (
                <span
                  aria-hidden="true"
                  className={`workflow-mobile-loop ${index >= Math.max(edge.from, edge.to) ? "is-reached" : ""}`}
                >
                  ↩ {edge.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <ol
        className="relative hidden gap-3 pl-8 lg:grid"
        aria-label="Workflow moments"
        onKeyDown={keyNavigate}
      >
        {moments.map((moment, momentIndex) => {
          const edge = edges.find((item) => item.from === momentIndex);
          const connected = edges.find(
            (item) => item.from === momentIndex || item.to === momentIndex,
          );
          return (
            <li key={moment.momentKey} className="relative min-w-0">
              <span
                aria-hidden="true"
                className={`workflow-desktop-node ${momentIndex <= index ? "is-reached" : ""} ${momentIndex === index ? "is-current" : ""}`}
              />
              <TimelineButton
                moment={moment}
                index={momentIndex}
                selected={momentIndex === index}
                loopLabel={connected?.label}
                onSelect={() => onSelect(momentIndex)}
              />
              {edge && (
                <span
                  aria-hidden="true"
                  className={`workflow-loop-label ${index >= Math.min(edge.from, edge.to) ? "is-visible" : ""}`}
                >
                  {edge.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
