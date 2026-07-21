import { describe, expect, it } from "vitest";
import {
  perspectiveCoversExtraction,
  verifierPanelSchema,
  verifierPerspectiveSchema,
} from "@/lib/adk/public-wire/agents/verifier-panel";

const extraction = {
  candidateTitle: "Service notice",
  whyItMatters: "Residents need current service information.",
  whoIsAffected: ["Residents"],
  claims: [
    {
      claimKey: "claim_service",
      text: "Service changes Monday.",
      claimType: "action" as const,
      importance: "material" as const,
      evidence: [],
      missingEvidenceReason: "Timing needs confirmation.",
    },
  ],
};

describe("independent verifier panel", () => {
  it("requires every perspective to cover every extracted claim", () => {
    expect(
      perspectiveCoversExtraction(extraction, {
        perspective: "temporal",
        claims: [
          { claimKey: "claim_service", outcome: "pass", issueCodes: [] },
        ],
      }),
    ).toBe(true);
    expect(
      perspectiveCoversExtraction(extraction, {
        perspective: "temporal",
        claims: [],
      }),
    ).toBe(false);
  });

  it("rejects pass results with issues and fail results without issues", () => {
    expect(
      verifierPerspectiveSchema.safeParse({
        perspective: "authority",
        claims: [
          {
            claimKey: "claim_service",
            outcome: "pass",
            issueCodes: ["WEAK_AUTHORITY"],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      verifierPerspectiveSchema.safeParse({
        perspective: "authority",
        claims: [
          { claimKey: "claim_service", outcome: "fail", issueCodes: [] },
        ],
      }).success,
    ).toBe(false);
  });

  it("prevents a verifier response from being substituted for another perspective", () => {
    const claim = {
      claimKey: "claim_service",
      outcome: "pass" as const,
      issueCodes: [] as const,
    };
    expect(
      verifierPanelSchema.safeParse({
        temporal: { perspective: "temporal", claims: [claim] },
        authority: { perspective: "temporal", claims: [claim] },
        contradiction: { perspective: "contradiction", claims: [claim] },
      }).success,
    ).toBe(false);
  });
});
