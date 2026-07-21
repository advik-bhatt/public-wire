import "server-only";

import { createHash } from "node:crypto";
import { stringifyContent } from "@google/adk";
import { createUserContent } from "@google/genai";
import type { z } from "zod";
import { extractorOutputSchema } from "@/lib/adk/public-wire/agents/extractor";
import { verifierOutputSchema } from "@/lib/adk/public-wire/agents/claim-verifier";
import { readVerifierPanel } from "@/lib/adk/public-wire/agents/verifier-panel";
import type { PublicWireAdkConfig } from "@/lib/adk/public-wire/config";
import { collectGroundedSourceCandidates } from "@/lib/adk/public-wire/grounded-source-candidates";
import { createGroundedDiscoveryRunner } from "@/lib/adk/public-wire/runner";
import type {
  EventSink,
  InvocationIdentity,
} from "@/lib/adk/public-wire/services/interfaces";
import { normalizeSourceText } from "@/lib/adk/public-wire/services/artifact-service";
import { fetchApprovedSource } from "@/lib/adk/public-wire/tools/source-fetch";
import { runBoundedEvidenceRepair } from "@/lib/adk/public-wire/workflows/evidence-repair";
import type { LocalSource } from "@/lib/public-wire-data";
import { nimbleRunCivicScan } from "@/lib/sponsors/nimble-civic";

type Extraction = z.infer<typeof extractorOutputSchema>;
type Verification = z.infer<typeof verifierOutputSchema>;
type FetchedSource = Awaited<ReturnType<typeof fetchApprovedSource>>;

export type EvidenceGap = {
  claim: string;
  missing?: string;
  issues: string[];
};

export type StagedRepairSource = {
  source: LocalSource;
  fetched: FetchedSource;
  normalizedContentHash: string;
};

/**
 * Produces the smallest source-recovery target that can be disclosed to search.
 * Contradiction resolution remains a separate workflow: this repair loop only
 * targets unsupported material claims and the temporal/authority perspectives.
 */
export function identifyEvidenceGaps(params: {
  extraction: Extraction;
  verification: Verification;
  sessionState: Record<string, unknown>;
}): EvidenceGap[] {
  const verificationByClaim = new Map(
    params.verification.claims.map((claim) => [claim.claimKey, claim]),
  );
  const verifierPanel = readVerifierPanel(params.sessionState);
  const panelIssuesByClaim = new Map<string, string[]>();

  if (verifierPanel.success) {
    for (const perspective of [
      verifierPanel.data.temporal,
      verifierPanel.data.authority,
    ]) {
      for (const claim of perspective.claims) {
        panelIssuesByClaim.set(claim.claimKey, [
          ...(panelIssuesByClaim.get(claim.claimKey) ?? []),
          ...claim.issueCodes,
        ]);
      }
    }
  }

  return params.extraction.claims
    .filter(
      (claim) =>
        claim.importance === "material" &&
        (verificationByClaim.get(claim.claimKey)?.outcome !== "supported" ||
          Boolean(panelIssuesByClaim.get(claim.claimKey)?.length) ||
          !verifierPanel.success),
    )
    .map((claim) => ({
      claim: claim.text,
      missing: claim.missingEvidenceReason,
      issues: [
        ...(verificationByClaim.get(claim.claimKey)?.issueCodes ?? []),
        ...(panelIssuesByClaim.get(claim.claimKey) ?? []),
      ],
    }));
}

export function buildEvidenceRepairQuery(params: {
  areaDisplayName: string;
  topic: string;
  candidateTitle: string;
  gaps: EvidenceGap[];
}) {
  return [
    `Evidence recovery for ${params.areaDisplayName}: ${params.topic}`,
    `Candidate: ${params.candidateTitle}`,
    `Unresolved material claims: ${JSON.stringify(params.gaps)}`,
    "Find an independent official source that directly supports, limits, or contradicts these exact claims.",
  ].join("\n");
}

function normalizedContentHash(text: string) {
  return createHash("sha256").update(normalizeSourceText(text)).digest("hex");
}

function stableSourceSuffix(url: string) {
  return createHash("sha256")
    .update(url)
    .digest("base64url")
    .slice(0, 32)
    .slice(-8);
}

/**
 * Searches for and safely fetches additional evidence without committing it.
 *
 * Google Search grounding and Nimble return discovery leads, never canonical
 * evidence. A lead becomes eligible only after the deterministic HTTPS,
 * hostname, redirect, DNS, and content checks in `fetchApprovedSource` pass.
 * The caller owns the subsequent lease-fenced artifact commit and must re-run
 * deterministic evidence validation before publication can advance.
 *
 * Cancellation after a provider response discards the staged result. ADK trace
 * events may already be durable for audit, but no source artifact is committed
 * by this function.
 */
export async function discoverGroundedEvidenceRepair(params: {
  config: PublicWireAdkConfig;
  identity: InvocationIdentity;
  eventSink: EventSink;
  userId: string;
  sessionId: string;
  areaDisplayName: string;
  allowedSourceHosts: string[];
  officialSourceHosts: string[];
  topic: string;
  candidateTitle: string;
  fallbackCategory: LocalSource["category"];
  gaps: EvidenceGap[];
  existingSources: Array<{ canonicalUrl: string; contentHash: string }>;
  signal?: AbortSignal;
  onAdkEvent?: (eventId: string) => void;
}) {
  const query = buildEvidenceRepairQuery({
    areaDisplayName: params.areaDisplayName,
    topic: params.topic,
    candidateTitle: params.candidateTitle,
    gaps: params.gaps,
  });
  const seenUrls = new Set(
    params.existingSources.map((source) => source.canonicalUrl),
  );
  const stagedSources: StagedRepairSource[] = [];

  const repair = await runBoundedEvidenceRepair({
    existingHashes: new Set(
      params.existingSources.map((source) => source.contentHash),
    ),
    maxIterations: params.config.budgets.evidenceIterations,
    signal: params.signal,
    search: async (iteration, repairSignal) => {
      const scan = await nimbleRunCivicScan({
        area: params.areaDisplayName,
        requestedTopic: query,
        fallbackSources: [],
        fallbackChanges: [],
        signal: repairSignal,
      });
      repairSignal?.throwIfAborted();
      const candidateSources =
        scan.mode === "real-api" ? [...scan.sources] : [];

      let groundedDiscoveryAttempted = false;
      const appendGroundedCandidates = async () => {
        groundedDiscoveryAttempted = true;
        try {
          const discoverySessionId = `${params.sessionId}:discovery:${iteration}`;
          const discovery = await createGroundedDiscoveryRunner({
            config: params.config,
            identity: params.identity,
            userId: params.userId,
            sessionId: discoverySessionId,
            eventSink: params.eventSink,
            allowedSourceHosts: params.allowedSourceHosts,
          });
          const groundedUrls = new Set<string>();
          for await (const event of discovery.runner.runAsync({
            userId: params.userId,
            sessionId: discoverySessionId,
            abortSignal: repairSignal,
            runConfig: { maxLlmCalls: 2 },
            customMetadata: {
              jobAttemptId: params.identity.jobAttemptId,
              evidenceRepairIteration: iteration,
            },
            newMessage: createUserContent(query),
          })) {
            params.onAdkEvent?.(event.id);
            for (const url of collectGroundedSourceCandidates({
              groundingMetadata: event.groundingMetadata,
              renderedText: stringifyContent(event),
            }))
              groundedUrls.add(url);
          }
          for (const [index, url] of [...groundedUrls].entries()) {
            const hostname = new URL(url).hostname;
            candidateSources.push({
              id: `grounded_${iteration}_${index + 1}`,
              name: `Official source discovered on ${hostname}`,
              url,
              category: params.fallbackCategory,
              sourceType: params.officialSourceHosts.includes(
                hostname.toLowerCase(),
              )
                ? "official"
                : "public",
            });
          }
        } catch {
          repairSignal?.throwIfAborted();
          // Search availability never weakens the evidence gate or fails a job.
        }
      };

      const stageFirstCandidate = async (
        candidates: LocalSource[],
      ): Promise<Array<{ contentHash: string; canonicalUrl: string }>> => {
        for (const [index, candidate] of candidates.entries()) {
          if (
            !candidate.url.startsWith("https://") ||
            seenUrls.has(candidate.url)
          )
            continue;
          try {
            const fetched = await fetchApprovedSource({
              url: candidate.url,
              allowedHosts: params.allowedSourceHosts,
              signal: repairSignal,
            });
            const contentHash = normalizedContentHash(fetched.text);
            if (
              seenUrls.has(fetched.canonicalUrl) ||
              params.existingSources.some(
                (source) => source.contentHash === contentHash,
              )
            )
              continue;

            const source = {
              ...candidate,
              id: `repair_${iteration}_${index + 1}_${stableSourceSuffix(
                fetched.canonicalUrl,
              )}`,
              url: fetched.canonicalUrl,
            };
            repairSignal?.throwIfAborted();
            stagedSources.push({
              source,
              fetched,
              normalizedContentHash: contentHash,
            });
            seenUrls.add(fetched.canonicalUrl);
            return [{ contentHash, canonicalUrl: fetched.canonicalUrl }];
          } catch {
            repairSignal?.throwIfAborted();
          }
        }
        return [];
      };

      if (candidateSources.length === 0) await appendGroundedCandidates();
      const staged = await stageFirstCandidate(candidateSources);
      if (staged.length > 0) return staged;
      if (!groundedDiscoveryAttempted) {
        const groundedStart = candidateSources.length;
        await appendGroundedCandidates();
        return stageFirstCandidate(candidateSources.slice(groundedStart));
      }
      return [];
    },
  });

  if (repair.outcome === "cancelled" || params.signal?.aborted)
    return { ...repair, sources: [] as StagedRepairSource[] };

  const sources = repair.added.map((added) => {
    const staged = stagedSources.find(
      (candidate) =>
        candidate.normalizedContentHash === added.contentHash &&
        candidate.fetched.canonicalUrl === added.canonicalUrl,
    );
    if (!staged) throw new Error("EVIDENCE_REPAIR_STAGE_MISSING");
    return staged;
  });
  return { ...repair, sources };
}
