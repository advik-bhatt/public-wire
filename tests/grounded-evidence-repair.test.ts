import { describe, expect, it } from "vitest";
import { extractorOutputSchema } from "@/lib/adk/public-wire/agents/extractor";
import { verifierOutputSchema } from "@/lib/adk/public-wire/agents/claim-verifier";
import {
  buildEvidenceRepairQuery,
  identifyEvidenceGaps,
} from "@/lib/investigations/grounded-evidence-repair";

const extraction = extractorOutputSchema.parse({
  candidateTitle: "A local rule changed",
  whyItMatters: "Residents need the effective date.",
  whoIsAffected: ["Residents"],
  claims: [
    {
      claimKey: "claim_effective_date",
      text: "The rule takes effect Monday.",
      claimType: "date",
      importance: "material",
      evidence: [],
      missingEvidenceReason: "The effective date needs an official source.",
    },
    {
      claimKey: "claim_context",
      text: "The rule was discussed publicly.",
      claimType: "other",
      importance: "contextual",
      evidence: [],
    },
  ],
});

const verification = verifierOutputSchema.parse({
  claims: [
    {
      claimKey: "claim_effective_date",
      outcome: "supported",
      issueCodes: [],
    },
    {
      claimKey: "claim_context",
      outcome: "unsupported",
      issueCodes: ["MISSING_SOURCE"],
    },
  ],
  blockingContradiction: false,
});

function panelState(params?: { temporalIssue?: boolean }) {
  const temporalIssue = params?.temporalIssue ?? false;
  const result = (claimKey: string) => ({
    claimKey,
    outcome: "pass" as const,
    issueCodes: [] as const,
  });
  return {
    pw_temporal_verification: {
      perspective: "temporal",
      claims: [
        temporalIssue
          ? {
              claimKey: "claim_effective_date",
              outcome: "fail",
              issueCodes: ["DATE_SCOPE_UNCLEAR"],
            }
          : result("claim_effective_date"),
        result("claim_context"),
      ],
    },
    pw_authority_verification: {
      perspective: "authority",
      claims: [result("claim_effective_date"), result("claim_context")],
    },
    pw_contradiction_verification: {
      perspective: "contradiction",
      claims: [result("claim_effective_date"), result("claim_context")],
    },
  };
}

describe("grounded evidence repair planning", () => {
  it("targets only material claims that fail support, time, or authority checks", () => {
    expect(
      identifyEvidenceGaps({
        extraction,
        verification,
        sessionState: panelState({ temporalIssue: true }),
      }),
    ).toEqual([
      {
        claim: "The rule takes effect Monday.",
        missing: "The effective date needs an official source.",
        issues: ["DATE_SCOPE_UNCLEAR"],
      },
    ]);
  });

  it("does not recover already supported claims after a complete panel passes", () => {
    expect(
      identifyEvidenceGaps({
        extraction,
        verification,
        sessionState: panelState(),
      }),
    ).toEqual([]);
  });

  it("fails closed when the independent panel record is incomplete", () => {
    const gaps = identifyEvidenceGaps({
      extraction,
      verification,
      sessionState: {},
    });
    expect(gaps.map((gap) => gap.claim)).toEqual([
      "The rule takes effect Monday.",
    ]);
  });

  it("builds a scoped and deterministic provider query", () => {
    const query = buildEvidenceRepairQuery({
      areaDisplayName: "New York City",
      topic: "curbside collection",
      candidateTitle: "A local rule changed",
      gaps: [
        {
          claim: "The rule takes effect Monday.",
          missing: "Effective date missing.",
          issues: ["DATE_SCOPE_UNCLEAR"],
        },
      ],
    });
    expect(query).toContain("Evidence recovery for New York City");
    expect(query).toContain('"issues":["DATE_SCOPE_UNCLEAR"]');
    expect(query).toContain("independent official source");
  });
});
