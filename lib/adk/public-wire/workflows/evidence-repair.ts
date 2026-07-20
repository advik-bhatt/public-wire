import { z } from "zod";

const repairArtifactSchema = z
  .object({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    canonicalUrl: z.string().url(),
  })
  .strict();

export async function runBoundedEvidenceRepair(params: {
  existingHashes: Set<string>;
  maxIterations: number;
  signal?: AbortSignal;
  search: (
    iteration: number,
    signal?: AbortSignal,
  ) => Promise<z.infer<typeof repairArtifactSchema>[]>;
}) {
  const limit = Math.max(0, Math.min(2, params.maxIterations));
  const added: z.infer<typeof repairArtifactSchema>[] = [];
  for (let iteration = 1; iteration <= limit; iteration += 1) {
    if (params.signal?.aborted)
      return {
        outcome: "cancelled" as const,
        iterations: iteration - 1,
        added,
      };
    const candidates = z
      .array(repairArtifactSchema)
      .max(20)
      .parse(await params.search(iteration, params.signal));
    const novel = candidates.filter(
      (artifact) => !params.existingHashes.has(artifact.contentHash),
    );
    if (novel.length === 0)
      return {
        outcome: "no_new_evidence" as const,
        iterations: iteration,
        added,
      };
    for (const artifact of novel) {
      params.existingHashes.add(artifact.contentHash);
      added.push(artifact);
    }
  }
  return {
    outcome:
      added.length > 0
        ? ("new_evidence" as const)
        : ("no_new_evidence" as const),
    iterations: limit,
    added,
  };
}
