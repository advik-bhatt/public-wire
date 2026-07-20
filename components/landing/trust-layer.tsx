import { ClaimLedger } from "@/components/public-wire/investigation/claim-ledger";
import { nycBinsInvestigation } from "@/lib/public-wire-view-models/nyc-fixtures";

const PRINCIPLES = [
  {
    title: "Source before prose",
    body: "Material claims are linked to captured source versions before drafting can begin.",
  },
  {
    title: "Missing is visible",
    body: "Unsupported, contradictory, or stale evidence produces an explicit hold rather than an empty confidence score.",
  },
  {
    title: "Events are facts",
    body: "Public activity is projected from allowlisted persisted event codes. Prompts and hidden reasoning are never provenance.",
  },
  {
    title: "Corrections persist",
    body: "Updates, clarifications, corrections, and retractions retain an immutable public history.",
  },
];

export function TrustLayer() {
  return (
    <section
      id="trust"
      className="border-t border-white/10 bg-black py-24 text-white md:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="mb-16 max-w-4xl">
          <h3 className="mb-6 text-xs uppercase tracking-[.22em] text-neutral-400 md:text-sm">
            § 04 · Trust layer
          </h3>
          <h2 className="text-balance text-4xl font-bold leading-[.92] tracking-tight md:text-6xl lg:text-7xl">
            Every material claim needs a receipt.
          </h2>
          <p className="mt-6 max-w-3xl text-balance text-lg font-light leading-snug text-neutral-300 md:text-2xl">
            Select a claim to see the exact source excerpt, plus anything
            missing or in conflict.
          </p>
        </div>
        <div className="bg-white p-3 text-black md:p-6">
          <ClaimLedger
            claims={nycBinsInvestigation.claims}
            sourceReceipts={nycBinsInvestigation.sourceReceipts}
          />
        </div>
        <div className="mt-16 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle, index) => (
            <article
              key={principle.title}
              className="trust-principle bg-black p-6 md:p-7"
            >
              <span aria-hidden="true" className="trust-principle-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-2xl font-bold">{principle.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                {principle.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
