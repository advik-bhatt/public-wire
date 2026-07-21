import { describe, expect, it } from "vitest";
import { collectGroundedSourceCandidates } from "@/lib/adk/public-wire/grounded-source-candidates";

describe("grounded source candidates", () => {
  it("combines citation metadata and rendered official URLs", () => {
    expect(
      collectGroundedSourceCandidates({
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://search.example/redirect" } },
          ],
        },
        renderedText:
          "Official page: [notice](https://city.gov/notices/service).",
      }),
    ).toEqual([
      "https://search.example/redirect",
      "https://city.gov/notices/service",
    ]);
  });

  it("deduplicates, rejects non-HTTPS values, and applies its bound", () => {
    expect(
      collectGroundedSourceCandidates({
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "http://city.gov/insecure" } },
            { web: { uri: "https://city.gov/a" } },
          ],
        },
        renderedText: "https://city.gov/a https://city.gov/b",
        limit: 1,
      }),
    ).toEqual(["https://city.gov/a"]);
  });
});
