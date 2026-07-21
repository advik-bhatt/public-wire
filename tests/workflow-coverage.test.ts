import { describe, expect, it } from "vitest";
import {
  BaseLlm,
  InMemorySessionService,
  Runner,
  stringifyContent,
  type BaseLlmConnection,
  type LlmRequest,
  type LlmResponse,
} from "@google/adk";
import { createUserContent } from "@google/genai";
import { verifierOutputSchema } from "@/lib/adk/public-wire/agents/claim-verifier";
import {
  createDeskWorkflow,
  verificationCoversExtraction,
} from "@/lib/adk/public-wire/workflows/desk-workflow";

class SequenceLlm extends BaseLlm {
  private index = 0;
  readonly instructions: string[] = [];
  constructor(private readonly outputs: unknown[]) {
    super({ model: "fake-public-wire-sequence" });
  }
  async *generateContentAsync(
    request: LlmRequest,
  ): AsyncGenerator<LlmResponse, void> {
    this.instructions.push(String(request.config?.systemInstruction ?? ""));
    const output = this.outputs[this.index++];
    yield {
      content: { role: "model", parts: [{ text: JSON.stringify(output) }] },
    };
  }
  async connect(): Promise<BaseLlmConnection> {
    throw new Error("live mode is not supported in this test");
  }
}

const extraction = {
  candidateTitle: "A local change",
  whyItMatters: "It changes resident access.",
  whoIsAffected: ["Residents"],
  claims: [
    {
      claimKey: "claim_first",
      text: "First fact",
      claimType: "action" as const,
      importance: "material" as const,
      evidence: [],
    },
    {
      claimKey: "claim_second",
      text: "Second fact",
      claimType: "impact" as const,
      importance: "material" as const,
      evidence: [],
    },
  ],
};

function passingVerifierPanel(claimKey: string) {
  return (["temporal", "authority", "contradiction"] as const).map(
    (perspective) => ({
      perspective,
      claims: [{ claimKey, outcome: "pass", issueCodes: [] }],
    }),
  );
}

describe("verification coverage", () => {
  it("requires exactly one result for every extracted claim", () => {
    expect(
      verificationCoversExtraction(extraction, {
        claims: [
          { claimKey: "claim_first", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      }),
    ).toBe(false);
    expect(
      verificationCoversExtraction(extraction, {
        claims: [
          { claimKey: "claim_first", outcome: "supported", issueCodes: [] },
          { claimKey: "claim_unknown", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      }),
    ).toBe(false);
    expect(
      verificationCoversExtraction(extraction, {
        claims: [
          { claimKey: "claim_first", outcome: "supported", issueCodes: [] },
          { claimKey: "claim_second", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      }),
    ).toBe(true);
  });

  it("rejects duplicate verification keys", () => {
    expect(
      verifierOutputSchema.safeParse({
        claims: [
          { claimKey: "claim_first", outcome: "supported", issueCodes: [] },
          { claimKey: "claim_first", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      }).success,
    ).toBe(false);
  });

  it("runs the verifier before emitting a missing-evidence hold", async () => {
    const model = new SequenceLlm([
      {
        candidateTitle: "Unsupported service impact",
        whyItMatters: "Residents need supported service information.",
        whoIsAffected: ["Residents"],
        claims: [
          {
            claimKey: "claim_missing",
            text: "Bus service will change.",
            claimType: "impact",
            importance: "material",
            evidence: [],
            missingEvidenceReason: "No transit advisory was captured.",
          },
        ],
      },
      {
        claims: [
          {
            claimKey: "claim_missing",
            outcome: "unsupported",
            issueCodes: ["MISSING_SOURCE"],
          },
        ],
        blockingContradiction: false,
      },
    ]);
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:missing",
    });
    const runner = new Runner({
      appName: "public-wire-workflow-test",
      agent: createDeskWorkflow(model as never),
      sessionService: service,
    });
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:missing",
      newMessage: createUserContent("test"),
    }))
      events.push(event);
    const session = await service.getSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:missing",
    });

    expect(session?.state.pw_verification).toEqual({
      claims: [
        {
          claimKey: "claim_missing",
          outcome: "unsupported",
          issueCodes: ["MISSING_SOURCE"],
        },
      ],
      blockingContradiction: false,
    });
    expect(JSON.parse(stringifyContent(events.at(-1)!))).toEqual({
      outcome: "held",
      reasonCode: "MISSING_EVIDENCE",
    });
  });

  it("revises one flagged draft and reruns factual review before becoming ready", async () => {
    const model = new SequenceLlm([
      {
        candidateTitle: "Water-main access notice",
        whyItMatters: "Residents need the supported access instruction.",
        whoIsAffected: ["Jersey Avenue residents"],
        claims: [
          {
            claimKey: "claim_access",
            text: "Affected properties should follow posted access directions while crews are present.",
            claimType: "impact",
            importance: "material",
            evidence: [
              {
                artifactName: "notice.txt",
                artifactVersion: 0,
                sourceUrl: "https://example.gov/notice",
                excerpt: "follow posted access directions",
                startOffset: 0,
                endOffset: 31,
                relation: "supports",
                authority: "official",
              },
            ],
          },
        ],
      },
      {
        claims: [
          { claimKey: "claim_access", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      },
      ...passingVerifierPanel("claim_access"),
      {
        outcome: "publish",
        classification: "resident-relevant",
        reasonCodes: ["EVIDENCE_COMPLETE", "RESIDENT_RELEVANT"],
        explanation: "The supported access instruction is locally relevant.",
        suggestedQueries: [],
      },
      {
        headline: "Jersey Avenue will close to all traffic",
        prose: "All access will be blocked while crews are present.",
        usedClaimKeys: ["claim_access"],
      },
      {
        outcome: "fail",
        issues: [
          {
            claimKey: "claim_access",
            code: "OVERSTATED",
            span: "All access will be blocked",
          },
        ],
        styleWarnings: [],
      },
      {
        headline: "Jersey Avenue utility work includes access directions",
        prose:
          "Affected properties should follow posted access directions while crews are present.",
        usedClaimKeys: ["claim_access"],
      },
      { outcome: "pass", issues: [], styleWarnings: [] },
    ]);
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:revision",
    });
    const runner = new Runner({
      appName: "public-wire-workflow-test",
      agent: createDeskWorkflow(model as never, 1),
      sessionService: service,
    });
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:revision",
      newMessage: createUserContent("test"),
    }))
      events.push(event);
    const session = await service.getSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:revision",
    });

    expect(session?.state.pw_revision_history).toEqual([
      expect.objectContaining({
        attempt: 1,
        review: expect.objectContaining({ outcome: "fail" }),
      }),
      expect.objectContaining({
        attempt: 2,
        review: expect.objectContaining({ outcome: "pass" }),
      }),
    ]);
    expect(session?.state.pw_draft).toEqual(
      expect.objectContaining({
        headline: "Jersey Avenue utility work includes access directions",
      }),
    );
    expect(model.instructions[2]).toContain("CAPTURED ARTIFACT PACKET");
    expect(model.instructions[2]).toContain("test");
    expect(model.instructions[8]).toContain('"outcome":"fail"');
    expect(model.instructions[8]).toContain(
      '"span":"All access will be blocked"',
    );
    expect(model.instructions[8]).toContain(
      '"headline":"Jersey Avenue will close to all traffic"',
    );
    expect(
      model.instructions.some((instruction) =>
        instruction.includes("[object Object]"),
      ),
    ).toBe(false);
    expect(JSON.parse(stringifyContent(events.at(-1)!))).toEqual({
      outcome: "publish_ready",
      reasonCode: "READY",
    });
  });

  it("holds after the single revision budget is exhausted", async () => {
    const supportedExtraction = {
      candidateTitle: "Proposed parking-rate change",
      whyItMatters: "Residents need proposal status to remain precise.",
      whoIsAffected: ["Downtown drivers"],
      claims: [
        {
          claimKey: "claim_proposal",
          text: "A public hearing on proposed parking-rate changes is scheduled for August 5.",
          claimType: "action",
          importance: "material",
          evidence: [
            {
              artifactName: "agenda.txt",
              artifactVersion: 0,
              sourceUrl: "https://example.gov/agenda",
              excerpt: "public hearing on proposed parking-rate changes",
              startOffset: 0,
              endOffset: 47,
              relation: "supports",
              authority: "official",
            },
          ],
        },
      ],
    };
    const model = new SequenceLlm([
      supportedExtraction,
      {
        claims: [
          { claimKey: "claim_proposal", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      },
      ...passingVerifierPanel("claim_proposal"),
      {
        outcome: "publish",
        classification: "resident-relevant",
        reasonCodes: ["EVIDENCE_COMPLETE"],
        explanation: "The proposal and hearing are supported.",
        suggestedQueries: [],
      },
      {
        headline: "Parking rates will increase August 5",
        prose: "The new rates take effect August 5.",
        usedClaimKeys: ["claim_proposal"],
      },
      {
        outcome: "fail",
        issues: [
          {
            claimKey: "claim_proposal",
            code: "STATUS_MISMATCH",
            span: "will increase",
          },
        ],
        styleWarnings: [],
      },
      {
        headline: "Parking rates will take effect after the hearing",
        prose: "The rates will take effect after the August 5 hearing.",
        usedClaimKeys: ["claim_proposal"],
      },
      {
        outcome: "fail",
        issues: [
          {
            claimKey: "claim_proposal",
            code: "ADDED_FACT",
            span: "will take effect after",
          },
        ],
        styleWarnings: [],
      },
    ]);
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:revision-cap",
    });
    const runner = new Runner({
      appName: "public-wire-workflow-test",
      agent: createDeskWorkflow(model as never, 1),
      sessionService: service,
    });
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:revision-cap",
      newMessage: createUserContent("test"),
    }))
      events.push(event);
    const session = await service.getSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:revision-cap",
    });

    expect(session?.state.pw_revision_history).toHaveLength(2);
    expect(JSON.parse(stringifyContent(events.at(-1)!))).toEqual({
      outcome: "held",
      reasonCode: "FACTUAL_REVIEW_FAILED",
    });
  });

  it("rejects reviewer issues that do not map to a claim used by the draft", async () => {
    const model = new SequenceLlm([
      {
        candidateTitle: "Local notice",
        whyItMatters: "The supported notice is locally relevant.",
        whoIsAffected: [],
        claims: [
          {
            claimKey: "claim_known",
            text: "A hearing is scheduled.",
            claimType: "action",
            importance: "material",
            evidence: [
              {
                artifactName: "notice.txt",
                artifactVersion: 0,
                sourceUrl: "https://example.gov/notice",
                excerpt: "A hearing is scheduled.",
                startOffset: 0,
                endOffset: 23,
                relation: "supports",
                authority: "official",
              },
            ],
          },
        ],
      },
      {
        claims: [
          { claimKey: "claim_known", outcome: "supported", issueCodes: [] },
        ],
        blockingContradiction: false,
      },
      ...passingVerifierPanel("claim_known"),
      {
        outcome: "publish",
        classification: "resident-relevant",
        reasonCodes: ["EVIDENCE_COMPLETE"],
        explanation: "The notice is supported.",
        suggestedQueries: [],
      },
      {
        headline: "A hearing is scheduled",
        prose: "A hearing is scheduled.",
        usedClaimKeys: ["claim_known"],
      },
      {
        outcome: "fail",
        issues: [
          {
            claimKey: "claim_invented",
            code: "ADDED_FACT",
            span: "invented claim",
          },
        ],
        styleWarnings: [],
      },
    ]);
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:unknown-review-claim",
    });
    const runner = new Runner({
      appName: "public-wire-workflow-test",
      agent: createDeskWorkflow(model as never, 1),
      sessionService: service,
    });
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:unknown-review-claim",
      newMessage: createUserContent("test"),
    }))
      events.push(event);
    const session = await service.getSession({
      appName: "public-wire-workflow-test",
      userId: "town:test",
      sessionId: "investigation:unknown-review-claim",
    });

    expect(session?.state.pw_revision_history).toEqual([]);
    expect(JSON.parse(stringifyContent(events.at(-1)!))).toEqual({
      outcome: "held",
      reasonCode: "FACTUAL_REVIEW_FAILED",
    });
  });
});
