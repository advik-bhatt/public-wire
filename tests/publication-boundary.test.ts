import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { civicBriefPublicationHash } from "@/lib/sponsors/senso-civic";
import type { CivicBrief } from "@/lib/public-wire-data";

const brief: CivicBrief = {
  id: "brief-1",
  headline: "A supported civic update",
  area: "New Brunswick, NJ",
  category: "City",
  confidence: "high",
  status: "active",
  summary: "Town hall opens at 9.",
  whyItMatters: "Residents can plan a visit.",
  whoIsAffected: ["Residents"],
  sources: [
    {
      title: "Official notice",
      url: "https://example.gov/notice",
      role: "Primary source",
    },
  ],
  agentTrace: [],
};

describe("publication dependency boundary", () => {
  it("does not import or call Senso from legacy orchestration", () => {
    const source = readFileSync(
      new URL("../lib/public-wire-agent.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/import\s+\{[^}]*publishCivicBrief/);
    expect(source).not.toContain("await publishCivicBrief(");
  });

  it("routes canonical worker publication through the fenced service and final gate", () => {
    const source = readFileSync(
      new URL("../workers/public-wire-investigation.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("persistFinalGate");
    expect(source).toContain("new PostgresPublicationService().publish");
    expect(source).toContain("publishProjection");
    expect(source).not.toContain("publishCivicBrief(");
  });

  it("binds every provider-visible brief field into the publication hash", () => {
    const original = civicBriefPublicationHash(brief);
    expect(
      civicBriefPublicationHash({ ...brief, headline: "Substituted headline" }),
    ).not.toBe(original);
    expect(
      civicBriefPublicationHash({ ...brief, summary: "Substituted summary" }),
    ).not.toBe(original);
    expect(
      civicBriefPublicationHash({
        ...brief,
        whoIsAffected: ["Different group"],
      }),
    ).not.toBe(original);
    expect(
      civicBriefPublicationHash({
        ...brief,
        sources: [{ ...brief.sources[0], url: "https://example.gov/other" }],
      }),
    ).not.toBe(original);
  });
});
