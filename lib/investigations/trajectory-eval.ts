import { createHash } from "node:crypto";
import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const trajectoryEventSchema = z
  .object({
    eventKey: z.string().min(1).max(160),
    kind: z.string().min(1).max(120),
    claimKeys: z.array(z.string()).default([]),
    sourceKeys: z.array(z.string()).default([]),
    contentHash: digest.optional(),
    visibility: z.enum(["internal", "public"]).default("internal"),
    safetyViolation: z.boolean().default(false),
  })
  .strict();

export const lockedEvalCaseSchema = z
  .object({
    caseKey: z.string().min(1).max(120),
    events: z.array(trajectoryEventSchema).min(1).max(500),
    requiredKinds: z.array(z.string()).max(100),
    forbiddenKinds: z.array(z.string()).max(100).default([]),
    partialOrder: z.array(z.tuple([z.string(), z.string()])).max(200),
    expectedPublication: z.boolean(),
  })
  .strict();

export type LockedEvalCase = z.infer<typeof lockedEvalCaseSchema>;

function positions(events: LockedEvalCase["events"]) {
  const map = new Map<string, number[]>();
  events.forEach((event, index) =>
    map.set(event.kind, [...(map.get(event.kind) ?? []), index]),
  );
  return map;
}

export function evaluateTrajectory(input: unknown) {
  const evalCase = lockedEvalCaseSchema.parse(input);
  const indexes = positions(evalCase.events);
  const failures: string[] = [];
  for (const required of evalCase.requiredKinds)
    if (!indexes.has(required)) failures.push(`MISSING:${required}`);
  for (const forbidden of evalCase.forbiddenKinds)
    if (indexes.has(forbidden)) failures.push(`FORBIDDEN:${forbidden}`);
  for (const [before, after] of evalCase.partialOrder) {
    const beforePositions = indexes.get(before) ?? [];
    const afterPositions = indexes.get(after) ?? [];
    if (
      !beforePositions.length ||
      !afterPositions.length ||
      Math.max(...beforePositions) >= Math.min(...afterPositions)
    ) {
      failures.push(`ORDER:${before}->${after}`);
    }
  }
  const published = indexes.has("publication.confirmed");
  if (published !== evalCase.expectedPublication)
    failures.push("PUBLICATION_OUTCOME");
  const safetyViolations = evalCase.events
    .filter((event) => event.safetyViolation)
    .map((event) => event.eventKey);
  if (safetyViolations.length) failures.push("SAFETY_VIOLATION");
  if (published && !indexes.has("workflow.release_attested"))
    failures.push("PUBLISH_WITHOUT_ATTESTATION");
  if (published && !indexes.has("trace.reconciled"))
    failures.push("PUBLISH_WITHOUT_TRACE_RECONCILIATION");
  const falsePublish = published && !evalCase.expectedPublication;
  const traceDigest = createHash("sha256")
    .update(JSON.stringify(evalCase.events))
    .digest("hex");
  return {
    caseKey: evalCase.caseKey,
    passed: failures.length === 0,
    failures,
    safetyViolations,
    falsePublish,
    traceDigest,
  };
}

export function evaluateSuite(cases: unknown[]) {
  const results = cases.map(evaluateTrajectory);
  return {
    passed: results.every((result) => result.passed),
    falsePublishCount: results.filter((result) => result.falsePublish).length,
    safetyViolationCount: results.reduce(
      (sum, result) => sum + result.safetyViolations.length,
      0,
    ),
    results,
  };
}

export const releaseDescriptorSchema = z
  .object({
    workflowDigest: digest,
    buildDigest: digest,
    model: z.string().min(1).max(120),
    promptVersion: z.string().min(1).max(80),
    schemaVersion: z.string().min(1).max(40),
    policyVersion: z.string().min(1).max(80),
    evaluatorVersion: z.string().min(1).max(80),
    corpusHash: digest,
  })
  .strict();

export type ReleaseDescriptor = z.infer<typeof releaseDescriptorSchema>;

export function releaseMatches(
  active: ReleaseDescriptor | undefined,
  current: ReleaseDescriptor,
) {
  if (!active) return false;
  const expected = releaseDescriptorSchema.parse(current);
  const promoted = releaseDescriptorSchema.parse(active);
  return (Object.keys(expected) as Array<keyof ReleaseDescriptor>).every(
    (key) => expected[key] === promoted[key],
  );
}
