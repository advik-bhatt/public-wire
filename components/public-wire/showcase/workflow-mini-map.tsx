"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";

const SHORT_LABELS: Record<string, string> = {
  monitor: "Watch",
  capture: "Source",
  extract: "Claims",
  assess: "Assess",
  verify: "Verify",
  editorial: "Classify",
  draft: "Draft",
  review: "Check",
  maintain: "Update",
  publish: "Gate",
};

export function WorkflowMiniMap({
  run,
  onSelect,
}: {
  run: ReferenceRun;
  onSelect: (momentKey: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const count = run.story.moments.length;
  const x = (index: number) =>
    count <= 1 ? 50 : 6 + (index / (count - 1)) * 88;
  const edges = run.story.loopEdges.flatMap((edge) => {
    const from = run.story.moments.findIndex(
      (moment) => moment.momentKey === edge.fromMomentKey,
    );
    const to = run.story.moments.findIndex(
      (moment) => moment.momentKey === edge.toMomentKey,
    );
    return from >= 0 && to >= 0 ? [{ ...edge, from, to }] : [];
  });
  const loopMoments = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  return (
    <div className="mt-9 border-t border-black/15 pt-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[.65rem] font-bold uppercase tracking-[.15em] text-neutral-500">
          Follow the handoffs
        </span>
        <span className="text-xs text-neutral-500">Select any step</span>
      </div>
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="relative min-w-[540px] overflow-hidden pb-1">
          <svg
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-16 w-full overflow-visible"
            viewBox="0 0 100 42"
            preserveAspectRatio="none"
          >
            <path d="M6 17H94" className="workflow-mini-base" />
            <motion.path
              d="M6 17H94"
              className="workflow-mini-progress"
              initial={reduceMotion ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
            {edges.map((edge) => (
              <motion.path
                key={`${edge.fromMomentKey}:${edge.toMomentKey}`}
                d={`M${x(edge.from)} 17 C${x(edge.from)} 39, ${x(edge.to)} 39, ${x(edge.to)} 17`}
                className="workflow-mini-loop"
                initial={reduceMotion ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.75,
                  delay: reduceMotion ? 0 : 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </svg>
          <ol className="relative grid grid-flow-col auto-cols-fr gap-1 pt-1">
            {run.story.moments.map((moment, index) => (
              <li key={moment.momentKey} className="min-w-0 text-center">
                <button
                  type="button"
                  onClick={() => onSelect(moment.momentKey)}
                  className="group inline-grid min-h-14 min-w-14 place-items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  aria-label={`Open step ${index + 1}, ${moment.actor}, ${moment.status}: ${moment.headline}`}
                >
                  <span
                    className={`workflow-mini-node ${moment.status === "caught" ? "is-caught" : moment.status === "revised" || moment.status === "ready" || loopMoments.has(index) ? "is-resolved" : ""}`}
                  >
                    <span>{index + 1}</span>
                  </span>
                  <span className="text-[.62rem] font-bold uppercase tracking-[.08em] text-neutral-600 transition group-hover:text-black">
                    {moment.status === "revised"
                      ? "Revise"
                      : SHORT_LABELS[moment.stage]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
