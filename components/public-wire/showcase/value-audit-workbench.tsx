"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CircleHelp,
  Network,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoverageConstellation } from "./coverage-constellation";
import { DecisionCheckpointInspector } from "./decision-checkpoint-inspector";
import { IntelligenceDrillLinks } from "./intelligence-drill-links";

const VALUE_KIND_LABELS = {
  joined_sources: "Joined sources",
  closed_evidence_gap: "Closed a gap",
  caught_regression: "Caught a regression",
  preserved_conflict: "Preserved a conflict",
  detected_source_change: "Detected a change",
  prevented_overclaim: "Prevented an overclaim",
} as const;

export function ValueAuditWorkbench({
  run,
  onOpenMoment,
  defaultView = "answer",
}: {
  run: ReferenceRun;
  onOpenMoment: (momentKey: string) => void;
  defaultView?: "answer" | "sources" | "rules";
}) {
  const intelligence = run.intelligence;
  const reduceMotion = useReducedMotion();
  const [selectedValueKey, setSelectedValueKey] = useState(
    intelligence?.addedValue[0]?.valueKey,
  );

  if (!intelligence) return null;
  const selectedValue =
    intelligence.addedValue.find(
      (value) => value.valueKey === selectedValueKey,
    ) ?? intelligence.addedValue[0];

  return (
    <section
      className="mt-8 min-w-0 border border-black/15 bg-white"
      aria-labelledby={`audit-workbench-${run.scenarioKey}`}
    >
      <div className="border-b border-black/15 bg-black p-4 text-white sm:p-5">
        <span className="inline-flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.15em] text-neutral-400">
          <ScanSearch aria-hidden="true" className="size-4" /> Reader audit
        </span>
        <h4
          id={`audit-workbench-${run.scenarioKey}`}
          className="mt-2 text-xl font-bold sm:text-2xl"
        >
          Answer first. Receipts and rules one click away.
        </h4>
      </div>

      <Tabs defaultValue={defaultView} className="gap-0">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-none border-b border-black/15 bg-white p-0 text-black">
          <TabsTrigger
            value="answer"
            className="min-h-12 min-w-0 whitespace-normal rounded-none border-r border-black/15 px-2 text-[.62rem] font-bold uppercase leading-tight tracking-[.09em] data-[state=active]:bg-[#f5f2ea] data-[state=active]:shadow-none sm:text-xs"
          >
            <Sparkles aria-hidden="true" className="hidden size-4 sm:block" />
            Resident answer
          </TabsTrigger>
          <TabsTrigger
            value="sources"
            className="min-h-12 min-w-0 whitespace-normal rounded-none border-r border-black/15 px-2 text-[.62rem] font-bold uppercase leading-tight tracking-[.09em] data-[state=active]:bg-[#f5f2ea] data-[state=active]:shadow-none sm:text-xs"
          >
            <Network aria-hidden="true" className="hidden size-4 sm:block" />
            Source network
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="min-h-12 min-w-0 whitespace-normal rounded-none px-2 text-[.62rem] font-bold uppercase leading-tight tracking-[.09em] data-[state=active]:bg-[#f5f2ea] data-[state=active]:shadow-none sm:text-xs"
          >
            <ScanSearch aria-hidden="true" className="hidden size-4 sm:block" />
            Decision rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="answer" className="m-0 min-w-0 p-4 sm:p-6">
          <div className="border-l-4 border-black pl-4 sm:pl-5">
            <span className="text-[.62rem] font-bold uppercase tracking-[.14em] text-neutral-500">
              Bottom line
            </span>
            <p className="mt-3 max-w-4xl text-balance text-xl font-bold leading-snug sm:text-2xl">
              {intelligence.residentAnswer.bottomLine}
            </p>
            {run.output?.briefSlug && (
              <Link
                href={`/briefs/${run.output.briefSlug}`}
                className="mt-4 inline-flex min-h-10 items-center gap-2 bg-black px-4 text-xs font-bold uppercase tracking-[.1em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Read the briefing{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>

          <div className="mt-7 grid gap-px bg-black/15 lg:grid-cols-2">
            <section className="min-w-0 bg-[#f5f2ea] p-4 sm:p-5">
              <h5 className="text-[.65rem] font-bold uppercase tracking-[.13em] text-neutral-500">
                What is new
              </h5>
              <ul className="mt-4 grid gap-3">
                {intelligence.residentAnswer.whatIsNew.map((item) => (
                  <li
                    key={item}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 text-sm leading-relaxed"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[.45rem] size-1.5 rounded-full bg-black"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="min-w-0 bg-white p-4 sm:p-5">
              <h5 className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.13em] text-neutral-500">
                <CalendarClock aria-hidden="true" className="size-4" /> What
                residents can do
              </h5>
              <ol className="mt-4 grid gap-3">
                {intelligence.residentAnswer.actions.map((action, index) => (
                  <li
                    key={`${action.label}:${index}`}
                    className="border border-black/15 p-3"
                  >
                    <span className="text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
                      {action.deadline ?? "Action"}
                    </span>
                    <p className="mt-2 text-sm font-semibold leading-relaxed">
                      {action.label}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {action.affectedGroups.join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
              {!intelligence.residentAnswer.actions.length && (
                <p className="mt-4 text-sm text-neutral-600">
                  No resident action is established by this packet.
                </p>
              )}
            </section>
          </div>

          <section
            className="mt-7"
            aria-labelledby={`agent-value-${run.scenarioKey}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[.62rem] font-bold uppercase tracking-[.14em] text-neutral-500">
                  Beyond aggregation
                </span>
                <h5
                  id={`agent-value-${run.scenarioKey}`}
                  className="mt-2 text-2xl font-bold"
                >
                  What the workflow added
                </h5>
              </div>
              <span className="text-xs text-neutral-500">
                Select an outcome to audit it
              </span>
            </div>
            <div className="mt-4 grid gap-px bg-black/15 lg:grid-cols-[minmax(190px,.68fr)_minmax(0,1.32fr)]">
              <div className="flex min-w-0 gap-2 overflow-x-auto bg-neutral-950 p-3 lg:grid lg:content-start">
                {intelligence.addedValue.map((value) => {
                  const active = value.valueKey === selectedValue?.valueKey;
                  return (
                    <button
                      key={value.valueKey}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedValueKey(value.valueKey)}
                      className={`min-h-20 min-w-48 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:min-w-0 ${active ? "border-white bg-white text-black" : "border-white/15 bg-neutral-950 text-white hover:border-white/50"}`}
                    >
                      <span className="text-[.56rem] font-bold uppercase tracking-[.1em] text-neutral-500">
                        {VALUE_KIND_LABELS[value.kind]}
                      </span>
                      <strong className="mt-2 block break-words text-sm leading-tight [overflow-wrap:anywhere]">
                        {value.headline}
                      </strong>
                    </button>
                  );
                })}
              </div>
              {selectedValue && (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={selectedValue.valueKey}
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.22 }}
                    className="min-w-0 bg-[#f5f2ea] p-4 sm:p-5"
                  >
                    <span className="text-[.6rem] font-bold uppercase tracking-[.12em] text-neutral-500">
                      Resident consequence
                    </span>
                    <h6 className="mt-2 break-words text-xl font-bold [overflow-wrap:anywhere]">
                      {selectedValue.headline}
                    </h6>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-700">
                      {selectedValue.residentConsequence}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenMoment(selectedValue.momentKey)}
                      className="mt-4 inline-flex min-h-10 items-center gap-2 bg-black px-4 text-xs font-bold uppercase tracking-[.1em] text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                      Watch where this happened{" "}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                    <IntelligenceDrillLinks
                      run={run}
                      claimKeys={[
                        ...new Set([
                          ...selectedValue.inputClaimKeys,
                          ...selectedValue.outputClaimKeys,
                        ]),
                      ]}
                      receiptKeys={selectedValue.inputReceiptKeys}
                    />
                  </motion.article>
                </AnimatePresence>
              )}
            </div>
          </section>

          {intelligence.residentAnswer.knownUnknowns.length > 0 && (
            <aside className="mt-7 border border-amber-300 bg-amber-50 p-4">
              <h5 className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.13em] text-amber-950">
                <CircleHelp aria-hidden="true" className="size-4" /> Still
                unknown
              </h5>
              <ul className="mt-3 grid gap-2">
                {intelligence.residentAnswer.knownUnknowns.map((unknown) => (
                  <li
                    key={unknown}
                    className="text-sm leading-relaxed text-neutral-700"
                  >
                    {unknown}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </TabsContent>

        <TabsContent value="sources" className="m-0 min-w-0 p-3 sm:p-5">
          <CoverageConstellation
            run={run}
            aggregation={intelligence.aggregation}
          />
        </TabsContent>
        <TabsContent value="rules" className="m-0 min-w-0 p-4 sm:p-6">
          <DecisionCheckpointInspector
            run={run}
            checkpoints={intelligence.decisionCheckpoints}
            onOpenMoment={onOpenMoment}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
