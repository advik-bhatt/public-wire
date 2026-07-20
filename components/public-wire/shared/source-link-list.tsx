import { ArrowUpRight } from "lucide-react";
import type { PublicEvidenceReceipt } from "@/lib/public-wire-view-models/schemas";

type Props = {
  receipts: PublicEvidenceReceipt[];
  label?: string;
  compact?: boolean;
};

function uniqueSourcePages(receipts: PublicEvidenceReceipt[]) {
  const seen = new Set<string>();
  return receipts.filter((receipt) => {
    if (seen.has(receipt.sourceUrl)) return false;
    seen.add(receipt.sourceUrl);
    return true;
  });
}

export function SourceLinkList({
  receipts,
  label = "Source packet",
  compact = false,
}: Props) {
  const sources = uniqueSourcePages(receipts);
  if (!sources.length) return null;

  return (
    <div
      className={compact ? "mt-4" : "mt-6"}
      data-source-count={sources.length}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[.65rem] font-bold uppercase tracking-[.14em] text-neutral-500">
          {label}
        </span>
        <span className="text-[.65rem] font-semibold uppercase tracking-[.12em] text-neutral-500">
          {sources.length} source page{sources.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {sources.map((source, index) => (
          <li key={source.sourceUrl} className="min-w-0">
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              referrerPolicy="no-referrer"
              className="group flex min-w-0 items-start justify-between gap-3 border border-black/15 bg-white p-3 text-left transition hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <span className="min-w-0">
                <span className="block text-[.6rem] font-bold uppercase tracking-[.13em] text-neutral-500">
                  Source {index + 1} · {source.sourceAuthority}
                </span>
                <strong className="mt-1 block break-words text-xs leading-snug [overflow-wrap:anywhere]">
                  {source.sourceTitle}
                </strong>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
