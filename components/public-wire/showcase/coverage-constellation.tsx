"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Layers3, Network } from "lucide-react";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import type { RunIntelligence } from "./run-intelligence-types";
import { IntelligenceDrillLinks } from "./intelligence-drill-links";

function layerY(index: number, total: number) {
  if (total <= 1) return 50;
  return 10 + (index / (total - 1)) * 80;
}

export function CoverageConstellation({
  run,
  aggregation,
}: {
  run: ReferenceRun;
  aggregation: RunIntelligence["aggregation"];
}) {
  const reduceMotion = useReducedMotion();
  const [selectedKey, setSelectedKey] = useState(
    aggregation.sourceLayers[0]?.layerKey,
  );
  const selected =
    aggregation.sourceLayers.find((layer) => layer.layerKey === selectedKey) ??
    aggregation.sourceLayers[0];
  const total = aggregation.sourceLayers.length;

  if (!selected) return null;

  return (
    <section aria-labelledby={`coverage-map-${run.scenarioKey}`}>
      <div className="grid gap-4 border border-black/15 bg-[#f5f2ea] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <span className="inline-flex items-center gap-2 text-[.65rem] font-bold uppercase tracking-[.15em] text-neutral-500">
            <Network aria-hidden="true" className="size-4" /> Multi-source
            synthesis
          </span>
          <h4
            id={`coverage-map-${run.scenarioKey}`}
            className="mt-3 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl"
          >
            What PublicWire connected
          </h4>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-700">
            {aggregation.explanation}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-px bg-black/15 text-center">
          <div className="bg-white px-3 py-3">
            <dt className="text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
              Sources
            </dt>
            <dd className="mt-1 text-xl font-bold">
              {aggregation.uniqueSourceCount}
            </dd>
          </div>
          <div className="bg-white px-3 py-3">
            <dt className="text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
              Publishers
            </dt>
            <dd className="mt-1 text-xl font-bold">
              {aggregation.uniquePublisherCount}
            </dd>
          </div>
          <div className="bg-white px-3 py-3">
            <dt className="text-[.58rem] font-bold uppercase tracking-[.1em] text-neutral-500">
              Claims
            </dt>
            <dd className="mt-1 text-xl font-bold">
              {aggregation.materialClaimCount}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-x border-b border-black/15 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[.62rem] font-bold uppercase tracking-[.13em] text-neutral-500">
            Select a source layer
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600">
            <Layers3 aria-hidden="true" className="size-3" />
            {aggregation.requiresMultipleSources
              ? "No single source covers the full finding"
              : "One source covers the current finding"}
          </span>
        </div>

        <div
          className="relative min-h-[23rem] sm:min-h-[25rem]"
          role="group"
          aria-label="Source layers connected to the resident answer"
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {aggregation.sourceLayers.map((layer, index) => {
              const active = layer.layerKey === selected.layerKey;
              const y = layerY(index, total);
              return (
                <g key={layer.layerKey}>
                  <path
                    d={`M38 ${y} C43 ${y}, 45 50, 50 50`}
                    fill="none"
                    stroke={active ? "#111" : "#d4d4d4"}
                    strokeWidth={active ? 1.4 : 0.7}
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={active ? "5 5" : undefined}
                  />
                  {active && !reduceMotion && (
                    <motion.path
                      d={`M38 ${y} C43 ${y}, 45 50, 50 50`}
                      fill="none"
                      stroke="#111"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </g>
              );
            })}
            <path
              d="M68 50H77"
              fill="none"
              stroke="#047857"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol className="absolute inset-0" aria-label="Source layers">
            {aggregation.sourceLayers.map((layer, index) => {
              const active = layer.layerKey === selected.layerKey;
              return (
                <li
                  key={layer.layerKey}
                  className="absolute left-0 w-[38%] -translate-y-1/2"
                  style={{ top: `${layerY(index, total)}%` }}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedKey(layer.layerKey)}
                    className={`min-h-16 w-full min-w-0 border p-2.5 text-left transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:p-3 ${active ? "border-black bg-black text-white shadow-[5px_5px_0_#d6d3d1]" : "border-black/20 bg-white text-black hover:border-black"}`}
                  >
                    <span
                      className={`block break-words text-[.56rem] font-bold uppercase tracking-[.09em] [overflow-wrap:anywhere] ${active ? "text-neutral-400" : "text-neutral-500"}`}
                    >
                      {layer.jurisdiction}
                    </span>
                    <strong className="mt-1 block break-words text-xs leading-tight [overflow-wrap:anywhere] sm:text-sm">
                      {layer.label}
                    </strong>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="absolute left-1/2 top-1/2 w-[18%] -translate-y-1/2 border border-black bg-[#f5f2ea] p-2 text-center shadow-[4px_4px_0_#e7e5e4] sm:p-3">
            <span className="text-[.52rem] font-bold uppercase tracking-[.08em] text-neutral-500">
              Verified claims
            </span>
            <strong className="mt-1 block text-lg leading-none sm:text-2xl">
              {aggregation.materialClaimCount}
            </strong>
          </div>

          <div className="absolute right-0 top-1/2 w-[23%] -translate-y-1/2 border border-emerald-700 bg-emerald-50 p-2 text-center shadow-[5px_5px_0_#d1fae5] sm:p-4">
            <span className="text-[.56rem] font-bold uppercase tracking-[.1em] text-emerald-800">
              Resident answer
            </span>
            <strong className="mt-2 block break-words text-xs leading-tight [overflow-wrap:anywhere] sm:text-sm">
              Combined finding
            </strong>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={selected.layerKey}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
            className="border border-black bg-[#f5f2ea] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[.6rem] font-bold uppercase tracking-[.12em] text-neutral-500">
                  {selected.publisher} · {selected.jurisdiction}
                </span>
                <h5 className="mt-2 break-words text-lg font-bold [overflow-wrap:anywhere]">
                  {selected.label}
                </h5>
              </div>
              <span className="inline-flex items-center gap-2 border border-black/20 bg-white px-2 py-1 text-[.6rem] font-bold uppercase tracking-[.1em]">
                <ArrowRight aria-hidden="true" className="size-3" />
                Contribution
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-700">
              {selected.contribution}
            </p>
            <IntelligenceDrillLinks
              run={run}
              claimKeys={[]}
              receiptKeys={selected.receiptKeys}
              compact
            />
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}
