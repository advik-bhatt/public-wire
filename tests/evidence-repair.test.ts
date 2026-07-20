import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { runBoundedEvidenceRepair } from "@/lib/adk/public-wire/workflows/evidence-repair";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

describe("bounded evidence repair", () => {
  it("stops immediately when a search adds no content hash", async () => {
    const search = vi
      .fn()
      .mockResolvedValue([
        {
          contentHash: hash("known"),
          canonicalUrl: "https://example.gov/known",
        },
      ]);
    const result = await runBoundedEvidenceRepair({
      existingHashes: new Set([hash("known")]),
      maxIterations: 2,
      search,
    });
    expect(result.outcome).toBe("no_new_evidence");
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("never exceeds two iterations", async () => {
    const search = vi.fn(async (iteration: number) => [
      {
        contentHash: hash(String(iteration)),
        canonicalUrl: `https://example.gov/${iteration}`,
      },
    ]);
    const result = await runBoundedEvidenceRepair({
      existingHashes: new Set(),
      maxIterations: 99,
      search,
    });
    expect(result.iterations).toBe(2);
    expect(search).toHaveBeenCalledTimes(2);
  });
});
