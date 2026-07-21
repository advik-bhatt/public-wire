import { describe, expect, it } from "vitest";
import {
  buildCanonicalCivicBrief,
  buildCanonicalPublicationReviews,
  requiredPublicationReviewsPass,
} from "@/lib/investigations/publication-readiness";
import {
  civicBriefPublicationHash,
  civicBriefSlug,
} from "@/lib/sponsors/senso-civic";
import type { MentorResult } from "@/lib/sponsors/mentor-agent";
import type { LapdogReview } from "@/lib/sponsors/lapdog-review";

const style: MentorResult = {
  provider: "Google Gemini (Mentor)",
  mode: "real-api",
  purpose: "review",
  outcome: "pass",
  approved: true,
  notes: "Clean.",
};

const reliability: LapdogReview = {
  provider: "Datadog Lapdog",
  mode: "local-audit",
  outcome: "pass",
  passed: true,
  score: 100,
  verdict: "Pass.",
  checks: [],
  traceSummary: [],
  sourceReachability: [
    { url: "https://example.gov/notice", reachable: true, status: 200 },
  ],
  adversarialReview: {
    claims: [
      {
        claim: "Town hall hours changed.",
        supported: true,
        sourceEvidence: "Hours changed.",
        verdict: "supported",
      },
    ],
    overallVerdict: "clean",
    unsupportedCount: 0,
  },
};

function brief() {
  return buildCanonicalCivicBrief({
    investigationId: "11111111-1111-4111-8111-111111111111",
    revision: 1,
    area: "Test Town, NJ",
    category: "city-agenda",
    draft: {
      headline: "Town hall hours changed",
      prose: "The official notice changes public hours.",
      usedClaimKeys: ["claim_hours"],
    },
    extraction: {
      candidateTitle: "Town hall notice",
      whyItMatters: "Residents can plan visits around the new public hours.",
      whoIsAffected: ["Residents"],
      claims: [
        {
          claimKey: "claim_hours",
          text: "Hours changed.",
          claimType: "action",
          importance: "material",
          evidence: [],
        },
      ],
    },
    sources: [{ title: "Official notice", url: "https://example.gov/notice" }],
  });
}

describe("canonical publication readiness", () => {
  it("binds all required reviews to the exact canonical brief hash", () => {
    const contentHash = civicBriefPublicationHash(brief());
    const reviews = buildCanonicalPublicationReviews({
      contentHash,
      factual: { outcome: "pass", issues: [], styleWarnings: [] },
      style,
      reliability,
    });

    expect(reviews.map((review) => review.reviewer)).toEqual([
      "factual",
      "style",
      "reliability",
      "reachability",
    ]);
    expect(
      reviews.every((review) => review.reviewedContentHash === contentHash),
    ).toBe(true);
    expect(requiredPublicationReviewsPass(reviews, contentHash)).toBe(true);
  });

  it("fails style and readiness when the factual reviewer reports a style warning", () => {
    const contentHash = civicBriefPublicationHash(brief());
    const reviews = buildCanonicalPublicationReviews({
      contentHash,
      factual: {
        outcome: "pass",
        issues: [],
        styleWarnings: ["EDITORIALIZING"],
      },
      style,
      reliability,
    });

    expect(reviews.find((review) => review.reviewer === "style")?.outcome).toBe(
      "fail",
    );
    expect(requiredPublicationReviewsPass(reviews, contentHash)).toBe(false);
  });

  it("creates a collision-resistant provider and public slug", () => {
    expect(civicBriefSlug("Town hall hours changed", "brief-a")).not.toBe(
      civicBriefSlug("Town hall hours changed", "brief-b"),
    );
    expect(civicBriefSlug("!!!", "brief-a")).toMatch(
      /^public-wire-brief-[a-f0-9]{8}$/,
    );
  });

  it("requires a captured source and deduplicates repeated URLs", () => {
    const base = brief();
    expect(() =>
      buildCanonicalCivicBrief({
        investigationId: "11111111-1111-4111-8111-111111111111",
        revision: 1,
        area: base.area,
        category: base.category,
        draft: {
          headline: base.headline,
          prose: base.summary,
          usedClaimKeys: ["claim_hours"],
        },
        extraction: {
          candidateTitle: base.headline,
          whyItMatters: base.whyItMatters,
          whoIsAffected: base.whoIsAffected,
          claims: [],
        },
        sources: [],
      }),
    ).toThrow("PUBLIC_WIRE_BRIEF_SOURCE_REQUIRED");

    const duplicated = buildCanonicalCivicBrief({
      investigationId: "11111111-1111-4111-8111-111111111111",
      revision: 1,
      area: base.area,
      category: base.category,
      draft: {
        headline: base.headline,
        prose: base.summary,
        usedClaimKeys: ["claim_hours"],
      },
      extraction: {
        candidateTitle: base.headline,
        whyItMatters: base.whyItMatters,
        whoIsAffected: base.whoIsAffected,
        claims: [],
      },
      sources: [base.sources[0], base.sources[0]],
    });
    expect(duplicated.sources).toHaveLength(1);
  });
});
