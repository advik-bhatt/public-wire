import { nycReferenceRuns } from "@/lib/public-wire-view-models/nyc-fixtures";
import { ReferenceRunExplorer } from "@/components/public-wire/showcase/reference-run-explorer";

export function AgentSwarm({
  caseFilesEnabled = false,
}: {
  caseFilesEnabled?: boolean;
}) {
  return (
    <section
      id="agents"
      className="relative overflow-hidden border-y border-white/10 bg-black py-24 text-white md:py-32"
    >
      <svg
        aria-hidden="true"
        className="agent-signal-field pointer-events-none absolute inset-x-0 top-0 h-[520px] w-full opacity-70"
        viewBox="0 0 1400 520"
        preserveAspectRatio="none"
      >
        <path d="M-40 380 C260 40 460 480 760 170 S1160 10 1450 260" />
        <path d="M-20 120 C300 420 520 30 830 310 S1190 470 1430 110" />
        <circle cx="288" cy="192" r="4" />
        <circle cx="767" cy="168" r="4" />
        <circle cx="1132" cy="122" r="4" />
      </svg>
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <h3 className="mb-6 text-xs uppercase tracking-[.22em] text-neutral-500 md:text-sm">
              § 01 · Your briefing
            </h3>
            <h2 className="text-balance text-4xl font-bold leading-[.94] tracking-tight md:text-6xl lg:text-7xl">
              Four pages. One answer residents can use.
            </h2>
          </div>
          <div className="self-end">
            <p className="text-balance text-lg font-light leading-snug text-neutral-300 md:text-2xl">
              Start with what changed, what to do, and what remains unknown.
              Then open every source, claim, workflow contribution, and decision
              rule behind it.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-neutral-500">
              Captured June NYC records make every typed evidence transition,
              bounded agent decision, and publication boundary inspectable.
            </p>
          </div>
        </div>
        <ReferenceRunExplorer
          runs={nycReferenceRuns}
          caseFilesEnabled={caseFilesEnabled}
        />
      </div>
    </section>
  );
}
