const CAPABILITIES = [
  {
    n: "01",
    title: "Watch sources",
    body: "Capture approved public notices, agendas, alerts, and source versions for a supported civic area.",
  },
  {
    n: "02",
    title: "Compare changes",
    body: "Separate genuinely new claims from duplicates, routine filings, and source refreshes.",
  },
  {
    n: "03",
    title: "Verify evidence",
    body: "Map every material claim to an approved receipt. Missing support or a contradiction stops the current workflow at a bounded evidence boundary.",
  },
  {
    n: "04",
    title: "Publish, update, correct",
    body: "A deterministic gate controls publication. Later evidence creates an explicit update, clarification, correction, or retraction.",
  },
];

const PROVIDERS = [
  "Google ADK + Gemini API",
  "Nimble",
  "ClickHouse",
  "Senso / cited.md",
  "Datadog",
];

function StageGlyph({ stage }: { stage: string }) {
  if (stage === "01")
    return (
      <svg aria-hidden="true" className="pipeline-glyph" viewBox="0 0 48 48">
        <path
          d="M9 15V9h6M33 9h6v6M39 33v6h-6M15 39H9v-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="24"
          cy="24"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="pipeline-dash"
          d="M24 12v5M24 31v5M12 24h5M31 24h5"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  if (stage === "02")
    return (
      <svg aria-hidden="true" className="pipeline-glyph" viewBox="0 0 48 48">
        <path
          d="M9 16h25M29 10l6 6-6 6M39 32H14M19 26l-6 6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" />
      </svg>
    );
  if (stage === "03")
    return (
      <svg aria-hidden="true" className="pipeline-glyph" viewBox="0 0 48 48">
        <path
          d="M24 7 39 13v10c0 9-6 15-15 19C15 38 9 32 9 23V13Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="m16 24 5 5 11-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
      </svg>
    );
  return (
    <svg aria-hidden="true" className="pipeline-glyph" viewBox="0 0 48 48">
      <circle
        cx="24"
        cy="24"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="24"
        cy="24"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        className="pipeline-dash"
        d="M24 4v8M24 36v8M4 24h8M36 24h8"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how"
      className="relative overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-16 max-w-4xl md:mb-24">
          <h3 className="mb-6 text-xs uppercase tracking-[.22em] text-neutral-400 md:text-sm">
            § 03 · How it works
          </h3>
          <h2 className="mb-6 text-balance text-4xl font-bold leading-[.95] tracking-tight md:text-6xl lg:text-7xl">
            A civic desk built around evidence.
          </h2>
          <p className="max-w-3xl text-balance text-lg font-light leading-snug text-neutral-300 md:text-2xl">
            PublicWire can watch, compare, verify, and maintain a public record.
            Live status appears only when persisted public data supports it.
          </p>
        </div>
        <ol className="relative grid gap-px border border-white/20 bg-white/20 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability) => (
            <li
              key={capability.n}
              className="pipeline-card min-h-[300px] bg-black p-8 md:p-10"
            >
              <span className="text-xs uppercase tracking-[.2em] text-neutral-500">
                Stage {capability.n}
              </span>
              <StageGlyph stage={capability.n} />
              <h3 className="mt-5 text-3xl font-bold md:text-4xl">
                {capability.title}
              </h3>
              <p className="mt-4 leading-relaxed text-neutral-300">
                {capability.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-12 border-y border-white/30 py-5">
          <span className="mr-6 text-[.65rem] uppercase tracking-[.2em] text-neutral-500">
            Implementation colophon
          </span>
          <span className="text-sm text-neutral-300">
            {PROVIDERS.join(" · ")}
          </span>
        </div>
      </div>
    </section>
  );
}
