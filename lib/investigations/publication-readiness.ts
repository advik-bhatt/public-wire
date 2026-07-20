import type { z } from "zod";
import type { ReviewerResult } from "@/lib/adk/public-wire/contracts";
import type { factualReviewerOutputSchema } from "@/lib/adk/public-wire/agents/factual-reviewer";
import type { writerOutputSchema } from "@/lib/adk/public-wire/agents/writer";
import type { extractorOutputSchema } from "@/lib/adk/public-wire/agents/extractor";
import type { CivicBrief } from "@/lib/public-wire-data";
import type { MentorResult } from "@/lib/sponsors/mentor-agent";
import type { LapdogReview } from "@/lib/sponsors/lapdog-review";

type Draft = z.infer<typeof writerOutputSchema>;
type Extraction = z.infer<typeof extractorOutputSchema>;
type FactualReview = z.infer<typeof factualReviewerOutputSchema>;

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function bounded(value: string, maximum: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maximum) return trimmed;
  const candidate = trimmed.slice(0, maximum + 1);
  const boundary = candidate.lastIndexOf(" ");
  return candidate
    .slice(0, boundary > maximum * 0.7 ? boundary : maximum)
    .trim();
}

export function buildCanonicalCivicBrief(params: {
  investigationId: string;
  revision: number;
  area: string;
  category: string;
  draft: Draft;
  extraction: Extraction;
  source: { title: string; url: string };
}): CivicBrief {
  return {
    id: `brief-${params.investigationId}-${params.revision}`,
    headline: params.draft.headline,
    area: params.area,
    category: titleCase(params.category) || "Civic Update",
    confidence: "high",
    status: "active",
    summary: bounded(params.draft.prose, 900),
    whyItMatters: bounded(params.extraction.whyItMatters, 900),
    whoIsAffected: params.extraction.whoIsAffected,
    sources: [
      {
        title: bounded(params.source.title, 180),
        url: params.source.url,
        role: "Primary captured source supporting the verified material claims.",
      },
    ],
    agentTrace: [
      "Captured and versioned the source artifact.",
      "Extracted atomic claims with exact evidence offsets.",
      "Verified complete claim coverage and reviewed the canonical brief.",
    ],
  };
}

function review(
  reviewer: ReviewerResult["reviewer"],
  outcome: ReviewerResult["outcome"],
  contentHash: string,
  issueCodes: string[] = [],
): ReviewerResult {
  return {
    reviewer,
    outcome,
    reviewedContentHash: contentHash,
    issueCodes: [...new Set(issueCodes)].slice(0, 50),
  };
}

function mappedOutcome(
  outcome: MentorResult["outcome"] | LapdogReview["outcome"],
): ReviewerResult["outcome"] {
  return outcome;
}

export function buildCanonicalPublicationReviews(params: {
  contentHash: string;
  factual: FactualReview;
  style: MentorResult;
  reliability: LapdogReview;
}): ReviewerResult[] {
  const reliabilityPassed =
    params.reliability.outcome === "pass" && params.reliability.passed;
  const factualPassed =
    params.factual.outcome === "pass" &&
    params.factual.issues.length === 0 &&
    reliabilityPassed &&
    params.reliability.adversarialReview?.overallVerdict === "clean";
  const stylePassed =
    params.style.outcome === "pass" &&
    params.style.approved &&
    params.factual.styleWarnings.length === 0;
  const reachabilityPassed =
    params.reliability.sourceReachability.length > 0 &&
    params.reliability.sourceReachability.every((source) => source.reachable);

  return [
    review("factual", factualPassed ? "pass" : "fail", params.contentHash, [
      ...params.factual.issues.map((issue) => issue.code),
      ...(!factualPassed && params.factual.issues.length === 0
        ? ["CANONICAL_FACTUAL_REVIEW_FAILED"]
        : []),
    ]),
    review(
      "style",
      stylePassed
        ? "pass"
        : params.style.outcome === "pass"
          ? "fail"
          : mappedOutcome(params.style.outcome),
      params.contentHash,
      [
        ...params.factual.styleWarnings,
        ...(params.style.errorCode ? [params.style.errorCode] : []),
        ...(!params.style.approved && !params.style.errorCode
          ? ["STYLE_REVIEW_REJECTED"]
          : []),
      ],
    ),
    review(
      "reliability",
      reliabilityPassed
        ? "pass"
        : params.reliability.outcome === "pass"
          ? "fail"
          : mappedOutcome(params.reliability.outcome),
      params.contentHash,
      reliabilityPassed
        ? []
        : params.reliability.errorCode
          ? [params.reliability.errorCode]
          : ["RELIABILITY_REVIEW_REJECTED"],
    ),
    review(
      "reachability",
      reachabilityPassed ? "pass" : "fail",
      params.contentHash,
      params.reliability.sourceReachability
        .filter((source) => !source.reachable)
        .map(() => "SOURCE_UNREACHABLE"),
    ),
  ];
}

export function requiredPublicationReviewsPass(
  reviews: ReviewerResult[],
  contentHash: string,
) {
  const required = new Set<ReviewerResult["reviewer"]>([
    "factual",
    "style",
    "reliability",
    "reachability",
  ]);
  return (
    reviews.length === required.size &&
    reviews.every((item) => {
      required.delete(item.reviewer);
      return (
        item.outcome === "pass" && item.reviewedContentHash === contentHash
      );
    }) &&
    required.size === 0
  );
}
