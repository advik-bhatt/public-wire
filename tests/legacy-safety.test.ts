import { describe, expect, it, vi } from "vitest";
import {
  runPublicWireScan,
  type PublicWireScanDependencies,
} from "@/lib/public-wire-agent";
import type { LocalChange, LocalSource } from "@/lib/public-wire-data";

const source: LocalSource = {
  id: "official",
  name: "Official notice",
  url: "https://example.gov/notice",
  category: "city",
  sourceType: "official",
};
const lead: LocalChange = {
  id: "lead",
  sourceId: source.id,
  title: "A specific local service change",
  category: "city-agenda",
  status: "new",
  importance: "resident-relevant",
  whatChanged: "A local service changed its public hours.",
  whyItMatters: "Residents may need to adjust a visit.",
  whoIsAffected: ["Residents"],
  evidence: ["Captured official notice"],
};
const tail: LocalChange = {
  ...lead,
  id: "tail",
  title: "A second unreviewed candidate",
};

function dependencies(
  overrides: Partial<PublicWireScanDependencies> = {},
): PublicWireScanDependencies {
  return {
    scan: vi
      .fn()
      .mockResolvedValue({
        provider: "Nimble",
        mode: "real-api",
        purpose: "test",
        sources: [source],
        changes: [lead, tail],
        raw: { sourceText: "A local service changed its public hours." },
      }),
    queryPriorEvents: vi.fn().mockResolvedValue({ count: 0, lastSeen: null }),
    filterSeenHashes: vi.fn().mockResolvedValue(new Set<string>()),
    editorialDecision: vi
      .fn()
      .mockResolvedValue({
        provider: "Google Gemini",
        mode: "real-api",
        purpose: "test",
        reviewOutcome: "pass",
        decision: {
          publishable: true,
          classification: "resident-relevant",
          reason: "Supported.",
        },
      }),
    writer: vi
      .fn()
      .mockResolvedValue({
        provider: "Google Gemini (Writer)",
        mode: "real-api",
        purpose: "test",
        outcome: "pass",
        prose: "A local service changed its public hours.",
      }),
    mentor: vi
      .fn()
      .mockResolvedValue({
        provider: "Google Gemini (Mentor)",
        mode: "real-api",
        purpose: "test",
        outcome: "pass",
        approved: true,
        notes: "Pass.",
      }),
    reliability: vi
      .fn()
      .mockResolvedValue({
        provider: "Datadog Lapdog",
        mode: "local-audit",
        outcome: "pass",
        passed: true,
        score: 100,
        verdict: "Pass.",
        checks: [],
        traceSummary: [],
        sourceReachability: [{ url: source.url, reachable: true, status: 200 }],
        adversarialReview: {
          claims: [
            {
              claim: lead.whatChanged,
              supported: true,
              sourceEvidence: lead.whatChanged,
              verdict: "supported",
            },
          ],
          overallVerdict: "clean",
          unsupportedCount: 0,
        },
      }),
    recordChangeHashes: vi.fn().mockResolvedValue(undefined),
    logRun: vi.fn().mockResolvedValue({ enabled: false, message: "test" }),
    ...overrides,
  } as PublicWireScanDependencies;
}

describe("legacy fail-closed containment", () => {
  it("does not publish an editorial hold and explicitly excludes the tail", async () => {
    const deps = dependencies({
      editorialDecision: vi
        .fn()
        .mockResolvedValue({
          provider: "Google Gemini",
          mode: "provider-error",
          purpose: "test",
          reviewOutcome: "malformed",
          decision: {
            publishable: false,
            classification: "unsupported",
            reason: "Invalid output.",
          },
        }),
    });
    const result = await runPublicWireScan(undefined, deps);
    expect(result.publishing.state).toBe("blocked");
    expect(result.published).toHaveLength(0);
    expect(
      result.rejected.some(
        (item) =>
          item.id === "tail" &&
          item.rejectionReason?.includes("no publication decision"),
      ),
    ).toBe(true);
  });

  it("does not publish when mentor or reliability fails", async () => {
    const mentorDeps = dependencies({
      mentor: vi
        .fn()
        .mockResolvedValue({
          provider: "Google Gemini (Mentor)",
          mode: "provider-error",
          purpose: "test",
          outcome: "malformed",
          approved: false,
          notes: "Invalid.",
        }),
    });
    expect(
      (await runPublicWireScan(undefined, mentorDeps)).publishing.state,
    ).toBe("blocked");

    const reliabilityDeps = dependencies({
      reliability: vi
        .fn()
        .mockResolvedValue({
          provider: "Datadog Lapdog",
          mode: "provider-error",
          outcome: "unavailable",
          passed: false,
          score: 0,
          verdict: "Hold.",
          checks: [],
          traceSummary: [],
          sourceReachability: [],
        }),
    });
    expect(
      (await runPublicWireScan(undefined, reliabilityDeps)).publishing.state,
    ).toBe("blocked");
  });

  it("keeps a fully passing legacy run read/hold-only", async () => {
    const recordChangeHashes = vi.fn().mockResolvedValue(undefined);
    const result = await runPublicWireScan(
      undefined,
      dependencies({ recordChangeHashes }),
    );
    expect(result.metrics.briefsPublished).toBe(0);
    expect(result.metrics.publicationAttempts).toBe(0);
    expect(result.published).toHaveLength(0);
    expect(result.publishing.state).toBe("blocked");
    expect(recordChangeHashes).not.toHaveBeenCalled();
  });
});
