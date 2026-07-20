import { afterEach, describe, expect, it, vi } from "vitest";
import { civicBriefSlug, publishCivicBrief } from "@/lib/sponsors/senso-civic";
import { runLapdogReliabilityReview } from "@/lib/sponsors/lapdog-review";
import type { CivicBrief } from "@/lib/public-wire-data";

const brief: CivicBrief = {
  id: "brief-test",
  headline: "A supported local notice changed",
  area: "Test Town, NJ",
  category: "Civic",
  confidence: "high",
  status: "active",
  summary: "An official local notice changed its stated public hours.",
  whyItMatters: "Residents may need to adjust a visit.",
  whoIsAffected: ["Residents"],
  sources: [
    {
      title: "Official notice",
      url: "https://example.gov/notice",
      role: "Supports the stated hours.",
    },
  ],
  agentTrace: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider failures close", () => {
  it("never calls Senso while either kill switch blocks publication", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await publishCivicBrief({ brief });
    expect(result.state).toBe("blocked");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats a success response without a verifiable remote identity as unknown", async () => {
    vi.stubEnv("PUBLIC_WIRE_PUBLICATION_ENABLED", "true");
    vi.stubEnv("PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH", "false");
    vi.stubEnv("SENSO_API_KEY", "test");
    vi.stubEnv("SENSO_HANDLE", "public-wire");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ slug: "local-only" }), { status: 200 }),
        ),
    );
    const result = await publishCivicBrief({ brief });
    expect(result.state).toBe("unknown");
    expect(result.providerId).toBeUndefined();
  });

  it("confirms only a provider-returned id and matching cited.md URL", async () => {
    vi.stubEnv("PUBLIC_WIRE_PUBLICATION_ENABLED", "true");
    vi.stubEnv("PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH", "false");
    vi.stubEnv("SENSO_API_KEY", "test");
    vi.stubEnv("SENSO_HANDLE", "public-wire");
    const slug = civicBriefSlug(brief.headline, brief.id);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "remote-42",
            url: `https://cited.md/public-wire/${slug}`,
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await publishCivicBrief({
      brief,
      idempotencyKey: "stable-publication-key",
    });
    expect(result).toMatchObject({
      state: "confirmed",
      providerId: "remote-42",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": "stable-publication-key",
        }),
      }),
    );
  });

  it("rejects an invalid Senso handle before making a provider request", async () => {
    vi.stubEnv("PUBLIC_WIRE_PUBLICATION_ENABLED", "true");
    vi.stubEnv("PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH", "false");
    vi.stubEnv("SENSO_API_KEY", "test");
    vi.stubEnv("SENSO_HANDLE", "../other-account");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await publishCivicBrief({ brief });
    expect(result).toMatchObject({
      state: "blocked",
      errorCode: "MISSING_CONFIGURATION",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("classifies throttling and server errors as retryable unknown outcomes", async () => {
    vi.stubEnv("PUBLIC_WIRE_PUBLICATION_ENABLED", "true");
    vi.stubEnv("PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH", "false");
    vi.stubEnv("SENSO_API_KEY", "test");
    vi.stubEnv("SENSO_HANDLE", "public-wire");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("busy", { status: 503 })),
    );
    const result = await publishCivicBrief({ brief });
    expect(result).toMatchObject({ state: "unknown", errorCode: "HTTP_503" });
  });

  it("blocks reliability when sources or captured evidence are missing", async () => {
    const review = await runLapdogReliabilityReview({
      headline: brief.headline,
      summary: brief.summary,
      sources: [],
      agentTrace: [],
      geminiDecision: {
        publishable: true,
        classification: "resident-relevant",
        reason: "Approved",
      },
      events: [],
    });
    expect(review.passed).toBe(false);
    expect(review.outcome).toBe("unavailable");
    expect(
      review.checks.some(
        (check) => check.name === "Source grounding" && check.status === "fail",
      ),
    ).toBe(true);
  });

  it("accepts a reachability result produced by the policy-enforced source fetcher without a second network request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const review = await runLapdogReliabilityReview({
      headline: brief.headline,
      summary: brief.summary,
      sources: brief.sources,
      agentTrace: [],
      geminiDecision: {
        publishable: true,
        classification: "resident-relevant",
        reason: "Approved",
      },
      events: [],
      prevalidatedSourceReachability: [
        { url: brief.sources[0].url, reachable: true, status: 200 },
      ],
    });
    expect(review.sourceReachability[0]).toMatchObject({
      reachable: true,
      status: 200,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
