"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PublicInvestigationDetail } from "@/lib/public-wire-view-models/schemas";
import { absoluteTime } from "@/lib/public-wire-view-models/state-labels";

type Props = Pick<PublicInvestigationDetail, "claims" | "sourceReceipts">;

export function ClaimLedger({ claims, sourceReceipts }: Props) {
  const reduceMotion = useReducedMotion();
  const [selectedKey, setSelectedKey] = useState(claims[0]?.publicClaimKey);
  const selected =
    claims.find((claim) => claim.publicClaimKey === selectedKey) ?? claims[0];
  const relatedKeys = useMemo(
    () =>
      new Set(
        [
          ...(selected?.evidence ?? []),
          ...(selected?.contradictions ?? []),
        ].map((receipt) => receipt.publicReceiptKey),
      ),
    [selected],
  );
  const selectedReceipts = useMemo(
    () =>
      sourceReceipts.filter((receipt) =>
        relatedKeys.has(receipt.publicReceiptKey),
      ),
    [relatedKeys, sourceReceipts],
  );

  useEffect(() => {
    const syncSelectionFromHash = () => {
      const claimKey = decodeURIComponent(window.location.hash).replace(
        /^#claim-/,
        "",
      );
      if (claims.some((claim) => claim.publicClaimKey === claimKey))
        setSelectedKey(claimKey);
    };
    const handleClaimAnchor = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a[href^="#claim-"]'))
        window.queueMicrotask(syncSelectionFromHash);
    };
    syncSelectionFromHash();
    window.addEventListener("hashchange", syncSelectionFromHash);
    document.addEventListener("click", handleClaimAnchor);
    return () => {
      window.removeEventListener("hashchange", syncSelectionFromHash);
      document.removeEventListener("click", handleClaimAnchor);
    };
  }, [claims]);

  if (!claims.length) {
    return (
      <div className="empty-state">
        <strong>No public claims yet.</strong>
        <p>The desk has not disclosed a claim/evidence ledger for this case.</p>
      </div>
    );
  }

  return (
    <div className="claim-ledger">
      <div className="claim-list" aria-label="Material claims">
        {claims.map((claim) => (
          <button
            key={claim.publicClaimKey}
            id={`claim-${claim.publicClaimKey}`}
            type="button"
            aria-pressed={claim.publicClaimKey === selected?.publicClaimKey}
            aria-controls="selected-claim-receipts"
            className="claim-row"
            data-status={claim.status}
            onClick={() => setSelectedKey(claim.publicClaimKey)}
          >
            <span className="claim-status">{claim.status}</span>
            <span className="claim-text">{claim.text}</span>
            <span className="claim-count">
              {claim.evidence.length} supporting · {claim.contradictions.length}{" "}
              contradicting
            </span>
            {claim.missingReason && (
              <span className="claim-missing">{claim.missingReason}</span>
            )}
          </button>
        ))}
      </div>

      <aside
        id="selected-claim-receipts"
        className="receipt-list"
        aria-label={
          selected ? `Evidence for: ${selected.text}` : "Evidence receipts"
        }
        aria-live="polite"
      >
        <div className="eyebrow">Source packet</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected?.publicClaimKey ?? "empty"}
            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {selectedReceipts.map((receipt) => (
              <article
                key={receipt.publicReceiptKey}
                className="evidence-receipt"
                data-related="true"
              >
                <div className="receipt-meta">
                  <span>{receipt.sourceAuthority}</span>
                  <span>{receipt.relation}</span>
                </div>
                <h3>{receipt.sourceTitle}</h3>
                <blockquote>{receipt.boundedExcerpt}</blockquote>
                <details>
                  <summary>Receipt details</summary>
                  <p>
                    {receipt.artifactRevisionLabel} · captured{" "}
                    {absoluteTime(receipt.capturedAt)}
                  </p>
                </details>
                <a
                  href={receipt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  referrerPolicy="no-referrer"
                >
                  Open source URL{" "}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              </article>
            ))}
            {!selectedReceipts.length && (
              <div className="empty-state">
                <strong>No approved receipt for this claim.</strong>
                <p>
                  {selected?.missingReason ??
                    "The case may contain other source packets, but none is linked to the selected claim."}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </aside>
    </div>
  );
}
