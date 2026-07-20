"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleDashed,
  CircleX,
  Crosshair,
  ShieldCheck,
} from "lucide-react";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import type { RunIntelligence } from "./run-intelligence-types";
import { IntelligenceDrillLinks } from "./intelligence-drill-links";

type Checkpoint = RunIntelligence["decisionCheckpoints"][number];

const STATUS = {
  pass: {
    label: "Passed",
    Icon: Check,
    tone: "border-emerald-600 bg-emerald-50 text-emerald-900",
  },
  fail: {
    label: "Caught",
    Icon: CircleX,
    tone: "border-amber-600 bg-amber-50 text-amber-950",
  },
  not_run: {
    label: "Not run",
    Icon: CircleDashed,
    tone: "border-neutral-400 bg-neutral-100 text-neutral-700",
  },
} as const;

const OWNER = {
  adk_agent: "ADK agent",
  application_policy: "Application policy",
  human: "Human review",
} as const;

function displayValue(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function DecisionCheckpointInspector({
  run,
  checkpoints = run.intelligence?.decisionCheckpoints ?? [],
  onOpenMoment,
  compact = false,
}: {
  run: ReferenceRun;
  checkpoints?: Checkpoint[];
  onOpenMoment?: (momentKey: string) => void;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const preferred =
    checkpoints.find((checkpoint) => checkpoint.status === "fail") ??
    checkpoints[0];
  const [selectedKey, setSelectedKey] = useState(preferred?.checkpointKey);
  const selected =
    checkpoints.find(
      (checkpoint) => checkpoint.checkpointKey === selectedKey,
    ) ?? preferred;

  if (!selected) return null;

  const selectedStatus = STATUS[selected.status];

  return (
    <section
      aria-label="Decision rules and observed results"
      className="min-w-0"
    >
      {!compact && (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-neutral-500">
              <ShieldCheck aria-hidden="true" className="size-4" />{" "}
              Deterministic checks
            </span>
            <h4 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              Why this result was allowed or stopped
            </h4>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-neutral-600">
            These are inspectable rules and observed values, not a model
            confidence score.
          </p>
        </div>
      )}

      <div
        className={`grid min-w-0 gap-px bg-black/15 ${compact ? "border border-black/15" : "border border-black/15 lg:grid-cols-[minmax(210px,.7fr)_minmax(0,1.3fr)]"}`}
      >
        <div
          className={`min-w-0 bg-neutral-950 p-3 text-white ${compact ? "flex gap-2 overflow-x-auto" : "grid content-start gap-2"}`}
          role="group"
          aria-label="Decision checkpoints"
        >
          {checkpoints.map((checkpoint, index) => {
            const status = STATUS[checkpoint.status];
            const Icon = status.Icon;
            const active = checkpoint.checkpointKey === selected.checkpointKey;
            return (
              <button
                key={checkpoint.checkpointKey}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedKey(checkpoint.checkpointKey)}
                className={`min-h-14 min-w-40 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? "border-white bg-white text-black" : "border-white/15 bg-neutral-950 text-white hover:border-white/50"}`}
              >
                <span className="flex items-center justify-between gap-2 text-[.58rem] font-bold uppercase tracking-[.1em]">
                  <span>
                    {String(index + 1).padStart(2, "0")} · {checkpoint.stage}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={`size-3 ${checkpoint.status === "pass" ? "text-emerald-500" : checkpoint.status === "fail" ? "text-amber-500" : "text-neutral-500"}`}
                  />
                </span>
                <strong className="mt-2 block break-words text-xs leading-tight [overflow-wrap:anywhere]">
                  {checkpoint.label}
                </strong>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={selected.checkpointKey}
            initial={reduceMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="min-w-0 bg-[#f5f2ea] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[.6rem] font-bold uppercase tracking-[.12em] text-neutral-500">
                  {OWNER[selected.owner]} · {selected.stage}
                </span>
                <h5 className="mt-2 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere]">
                  {selected.label}
                </h5>
              </div>
              <span
                className={`inline-flex items-center gap-2 border px-2 py-1 text-[.62rem] font-bold uppercase tracking-[.1em] ${selectedStatus.tone}`}
              >
                <selectedStatus.Icon aria-hidden="true" className="size-3" />
                {selectedStatus.label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 items-stretch gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="min-w-0 border border-black/15 bg-white p-3">
                <span className="block text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
                  Observed
                </span>
                <strong className="mt-2 block break-words text-lg [overflow-wrap:anywhere]">
                  {displayValue(selected.observed.value)}
                </strong>
                <span className="mt-1 block break-words text-xs text-neutral-600 [overflow-wrap:anywhere]">
                  {selected.observed.label}
                </span>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="size-4 rotate-90 justify-self-center text-neutral-400 min-[360px]:mt-7 min-[360px]:rotate-0"
              />
              <div className="min-w-0 border border-black/15 bg-white p-3">
                <span className="block text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
                  Required
                </span>
                <strong className="mt-2 block break-words text-lg [overflow-wrap:anywhere]">
                  {displayValue(selected.required.value)}
                </strong>
                <span className="mt-1 block break-words text-xs text-neutral-600 [overflow-wrap:anywhere]">
                  {selected.required.label}
                </span>
              </div>
            </div>

            <p className="mt-4 border-l-4 border-black bg-white p-3 text-sm leading-relaxed text-neutral-700">
              {selected.consequence}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[.6rem] font-bold uppercase tracking-[.1em] text-neutral-500">
              <span className="break-all">
                Policy · {selected.policyVersion}
              </span>
              {onOpenMoment && (
                <button
                  type="button"
                  onClick={() => onOpenMoment(selected.momentKey)}
                  className="inline-flex min-h-9 items-center gap-2 border border-black bg-white px-3 text-black transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  <Crosshair aria-hidden="true" className="size-3" />
                  Open the exact step
                </button>
              )}
            </div>
            <IntelligenceDrillLinks
              run={run}
              claimKeys={selected.claimKeys}
              receiptKeys={selected.receiptKeys}
              compact={compact}
            />
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}
