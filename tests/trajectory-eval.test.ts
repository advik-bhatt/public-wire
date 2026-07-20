import { describe, expect, it } from "vitest";
import {
  evaluateSuite,
  evaluateTrajectory,
  releaseMatches,
  type ReleaseDescriptor,
} from "@/lib/investigations/trajectory-eval";

const descriptor: ReleaseDescriptor = {
  workflowDigest: "a".repeat(64),
  buildDigest: "b".repeat(64),
  model: "gemini-2.5-flash",
  promptVersion: "p1",
  schemaVersion: "1",
  policyVersion: "policy1",
  evaluatorVersion: "eval1",
  corpusHash: "c".repeat(64),
};

describe("trajectory evaluation", () => {
  it("evaluates partial order rather than requiring one exact sequence", () => {
    const base = {
      caseKey: "partial-order",
      requiredKinds: ["source.captured", "claims.extracted", "final.gate"],
      forbiddenKinds: [],
      partialOrder: [
        ["source.captured", "claims.extracted"],
        ["claims.extracted", "final.gate"],
      ],
      expectedPublication: false,
    };
    const event = (eventKey: string, kind: string) => ({
      eventKey,
      kind,
      claimKeys: [],
      sourceKeys: [],
      visibility: "internal" as const,
      safetyViolation: false,
    });
    expect(
      evaluateTrajectory({
        ...base,
        events: [
          event("1", "source.captured"),
          event("parallel", "unrelated.review"),
          event("2", "claims.extracted"),
          event("3", "final.gate"),
        ],
      }).passed,
    ).toBe(true);
    expect(
      evaluateTrajectory({
        ...base,
        events: [
          event("2", "claims.extracted"),
          event("1", "source.captured"),
          event("3", "final.gate"),
        ],
      }).failures,
    ).toContain("ORDER:source.captured->claims.extracted");
  });

  it("fails publication without release attestation and trace reconciliation", () => {
    const event = (eventKey: string, kind: string) => ({
      eventKey,
      kind,
      claimKeys: [],
      sourceKeys: [],
      visibility: "internal" as const,
      safetyViolation: false,
    });
    const result = evaluateSuite([
      {
        caseKey: "false-publish",
        events: [event("1", "publication.confirmed")],
        requiredKinds: ["publication.confirmed"],
        forbiddenKinds: [],
        partialOrder: [],
        expectedPublication: true,
      },
    ]);
    expect(result.passed).toBe(false);
    expect(result.falsePublishCount).toBe(0);
  });

  it("counts an unexpected publication even when its release and trace records are present", () => {
    const event = (eventKey: string, kind: string) => ({
      eventKey,
      kind,
      claimKeys: [],
      sourceKeys: [],
      visibility: "internal" as const,
      safetyViolation: false,
    });
    const result = evaluateSuite([
      {
        caseKey: "unexpected-publish",
        events: [
          event("1", "workflow.release_attested"),
          event("2", "trace.reconciled"),
          event("3", "publication.confirmed"),
        ],
        requiredKinds: ["workflow.release_attested", "trace.reconciled"],
        forbiddenKinds: [],
        partialOrder: [
          ["workflow.release_attested", "publication.confirmed"],
          ["trace.reconciled", "publication.confirmed"],
        ],
        expectedPublication: false,
      },
    ]);
    expect(result.results[0].failures).toEqual(["PUBLICATION_OUTCOME"]);
    expect(result.falsePublishCount).toBe(1);
  });

  it("binds promotion to every immutable release field", () => {
    expect(releaseMatches(descriptor, descriptor)).toBe(true);
    expect(
      releaseMatches({ ...descriptor, corpusHash: "d".repeat(64) }, descriptor),
    ).toBe(false);
    expect(
      releaseMatches({ ...descriptor, model: "another-model" }, descriptor),
    ).toBe(false);
  });
});
