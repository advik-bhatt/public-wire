import type { ReferenceRun } from "./reference-run-schema";

type Claim = ReferenceRun["detail"]["claims"][number];
type Receipt = ReferenceRun["detail"]["sourceReceipts"][number];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function createReferenceRunIndex(run: ReferenceRun) {
  const claims = new Map(
    run.detail.claims.map((claim) => [claim.publicClaimKey, claim]),
  );
  const receipts = new Map(
    run.detail.sourceReceipts.map((receipt) => [
      receipt.publicReceiptKey,
      receipt,
    ]),
  );

  return {
    claimKeys(keys: string[]): Claim[] {
      return unique(keys).flatMap((key) => {
        const claim = claims.get(key);
        return claim ? [claim] : [];
      });
    },
    receiptKeys(keys: string[]): Receipt[] {
      return unique(keys).flatMap((key) => {
        const receipt = receipts.get(key);
        return receipt ? [receipt] : [];
      });
    },
  };
}

export function referenceOutputReceiptKeys(run: ReferenceRun) {
  const aggregationKeys =
    run.intelligence?.aggregation.sourceLayers.flatMap(
      (layer) => layer.receiptKeys,
    ) ?? [];
  return unique(
    aggregationKeys.length > 0 ? aggregationKeys : run.input.receiptKeys,
  );
}

export function referenceOutputReceipts(run: ReferenceRun) {
  return createReferenceRunIndex(run).receiptKeys(
    referenceOutputReceiptKeys(run),
  );
}

export function referenceSourcePages(run: ReferenceRun) {
  const pages = new Map<
    string,
    {
      key: string;
      title: string;
      url: string;
      receiptCount: number;
      revisionLabels: string[];
    }
  >();

  for (const receipt of referenceOutputReceipts(run)) {
    const page = pages.get(receipt.sourceUrl);
    if (page) {
      page.receiptCount += 1;
      page.revisionLabels = unique([
        ...page.revisionLabels,
        receipt.artifactRevisionLabel,
      ]);
      continue;
    }
    pages.set(receipt.sourceUrl, {
      key: receipt.sourceUrl,
      title: receipt.sourceTitle,
      url: receipt.sourceUrl,
      receiptCount: 1,
      revisionLabels: [receipt.artifactRevisionLabel],
    });
  }

  return [...pages.values()];
}
