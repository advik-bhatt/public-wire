import { useMemo } from "react";
import { ArrowUpRight, FileText, Quote } from "lucide-react";
import Link from "next/link";
import type { ReferenceRun } from "@/lib/public-wire-view-models/reference-run-schema";
import { createReferenceRunIndex } from "@/lib/public-wire-view-models/reference-run-selectors";

export function IntelligenceDrillLinks({
  run,
  claimKeys,
  receiptKeys,
  compact = false,
}: {
  run: ReferenceRun;
  claimKeys: string[];
  receiptKeys: string[];
  compact?: boolean;
}) {
  const index = useMemo(() => createReferenceRunIndex(run), [run]);
  const claims = index.claimKeys(claimKeys);
  const receipts = index.receiptKeys(receiptKeys);

  if (!claims.length && !receipts.length) return null;

  return (
    <div
      className={`grid min-w-0 gap-3 ${compact ? "mt-3" : "mt-5 sm:grid-cols-2"}`}
    >
      {claims.length > 0 && (
        <section
          className="min-w-0 border border-black/15 bg-white p-3"
          aria-label="Claims checked here"
        >
          <span className="inline-flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.12em] text-neutral-500">
            <Quote aria-hidden="true" className="size-3" />
            {claims.length} linked claim{claims.length === 1 ? "" : "s"}
          </span>
          <ul className="mt-2 grid gap-2">
            {claims.map((claim) => (
              <li
                key={claim.publicClaimKey}
                className="break-words text-xs leading-relaxed text-neutral-700 [overflow-wrap:anywhere]"
              >
                <Link
                  href={`/local/${run.detail.summary.areaKey}/investigations/${run.detail.summary.publicCaseKey}#claim-${claim.publicClaimKey}`}
                  className="inline-flex min-h-11 items-center underline decoration-black/30 underline-offset-4 hover:decoration-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  {claim.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {receipts.length > 0 && (
        <section
          className="min-w-0 border border-black/15 bg-white p-3"
          aria-label="Source receipts checked here"
        >
          <span className="inline-flex items-center gap-2 text-[.62rem] font-bold uppercase tracking-[.12em] text-neutral-500">
            <FileText aria-hidden="true" className="size-3" />
            {receipts.length} source receipt{receipts.length === 1 ? "" : "s"}
          </span>
          <ul className="mt-2 grid gap-2">
            {receipts.map((receipt) => (
              <li key={receipt.publicReceiptKey} className="min-w-0">
                <a
                  href={receipt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-flex min-h-11 max-w-full items-center gap-2 break-words text-xs font-semibold underline decoration-black/30 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  <span>{receipt.sourceTitle}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3 shrink-0"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
