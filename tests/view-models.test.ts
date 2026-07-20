import { describe, expect, it } from "vitest";
import {
  demoEdition,
  demoInvestigation,
  referenceRuns,
  referenceRunSchema,
} from "@/lib/public-wire-view-models/fixtures";
import {
  nycDemoEdition,
  nycReferenceRuns,
} from "@/lib/public-wire-view-models/nyc-fixtures";
import {
  publicEditionBriefV1Schema,
  publicEditionBriefV2Schema,
  publicInvestigationDetailSchema,
  publicInvestigationEventSchema,
} from "@/lib/public-wire-view-models/schemas";
import { investigationStatusLabel } from "@/lib/public-wire-view-models/state-labels";
import { resolveArea } from "@/lib/areas/registry";
import {
  referenceOutputReceipts,
  referenceSourcePages,
} from "@/lib/public-wire-view-models/reference-run-selectors";

describe("public view models", () => {
  it("keeps the curated fixtures inside the strict production contracts", () => {
    expect(demoEdition.runtimeMode).toBe("demo");
    expect(publicInvestigationDetailSchema.parse(demoInvestigation)).toEqual(
      demoInvestigation,
    );
    expect(referenceRuns).toHaveLength(7);
    expect(nycReferenceRuns).toHaveLength(4);
    expect(nycDemoEdition.areaKey).toBe("new-york-city");
    for (const run of referenceRuns) {
      expect(publicInvestigationDetailSchema.parse(run.detail)).toEqual(
        run.detail,
      );
      expect(run.detail.summary.runtimeMode).toBe("demo");
      expect(run.detail.publication).toBeUndefined();
    }
    for (const run of nycReferenceRuns) {
      expect(run.intelligence).toBeDefined();
      expect(run.execution?.kind).toBe("deterministic_reference");
      expect(run.intelligence?.addedValue.length).toBeGreaterThan(0);
      expect(run.intelligence?.decisionCheckpoints.length).toBeGreaterThan(0);
      expect(
        run.intelligence?.aggregation.sourceLayers.every((layer) =>
          Boolean(layer.capturedText),
        ),
      ).toBe(true);
    }
  });

  it("rejects arbitrary public event detail and internal identifiers", () => {
    const event = demoInvestigation.events[0];
    expect(
      publicInvestigationEventSchema.safeParse({
        ...event,
        detail: "raw model reasoning",
      }).success,
    ).toBe(false);
    expect(
      publicInvestigationEventSchema.safeParse({
        ...event,
        investigationId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });

  it("keeps showcase moments bound to their public projection", () => {
    const run = referenceRuns[0];
    const receiptMoment = run.story.moments.find(
      (moment) => moment.visual.kind === "receipt",
    )!;
    expect(
      referenceRunSchema.safeParse({
        ...run,
        story: {
          ...run.story,
          moments: run.story.moments.map((moment) =>
            moment.momentKey === receiptMoment.momentKey
              ? {
                  ...moment,
                  visual: {
                    kind: "receipt",
                    receiptKey: "receipt_unknown_reference_9Qm4xN2pL8vR",
                  },
                }
              : moment,
          ),
        },
      }).success,
    ).toBe(false);

    const draftMoment = run.story.moments.find(
      (moment) => moment.visual.kind === "draft-change",
    )!;
    expect(
      referenceRunSchema.safeParse({
        ...run,
        story: {
          ...run.story,
          moments: run.story.moments.map((moment) =>
            moment.momentKey === draftMoment.momentKey
              ? {
                  ...moment,
                  visual: {
                    ...moment.visual,
                    flaggedText: "text not present in the draft",
                  },
                }
              : moment,
          ),
        },
      }).success,
    ).toBe(false);
  });

  it("models verifier and maintenance loops explicitly", () => {
    const maintenance = nycReferenceRuns.find(
      (run) => run.scenarioKey === "nyc-busway-source-recheck",
    )!;
    const dissent = nycReferenceRuns.find(
      (run) => run.scenarioKey === "nyc-bridge-contradiction",
    )!;
    expect(maintenance.story.loopEdges[0]?.kind).toBe("source-maintenance");
    expect(
      maintenance.story.moments.some(
        (moment) => moment.visual.kind === "source-diff",
      ),
    ).toBe(true);
    expect(
      maintenance.story.moments.some(
        (moment) => moment.visual.kind === "record-revision",
      ),
    ).toBe(true);
    expect(dissent.story.loopEdges[0]?.kind).toBe("evidence-recheck");
    expect(
      dissent.story.moments.some(
        (moment) => moment.visual.kind === "dissent-assessment",
      ),
    ).toBe(true);
  });

  it("binds resident value, aggregation proof, agent additions, and decision thresholds to the run", () => {
    const run = nycReferenceRuns.find(
      (candidate) => candidate.scenarioKey === "nyc-bins-revision",
    )!;
    expect(run.intelligence?.aggregation.uniqueSourceCount).toBe(4);
    expect(run.intelligence?.aggregation.uniquePublisherCount).toBe(2);
    expect(run.intelligence?.aggregation.requiresMultipleSources).toBe(true);
    expect(
      run.intelligence?.decisionCheckpoints.some(
        (checkpoint) =>
          checkpoint.status === "fail" && checkpoint.owner === "adk_agent",
      ),
    ).toBe(true);
    expect(
      run.story.moments.every((moment) => Boolean(moment.contribution)),
    ).toBe(true);
    expect(run.agents.some((agent) => agent.key === "evidence-repair")).toBe(
      true,
    );
    expect(new Set(run.story.loopEdges.map((edge) => edge.kind))).toEqual(
      new Set(["evidence-recheck", "draft-revision"]),
    );
    expect(
      run.detail.events.filter((event) => event.eventCode === "DRAFT_CREATED"),
    ).toHaveLength(2);
    expect(
      referenceRunSchema.safeParse({
        ...run,
        input: {
          ...run.input,
          receiptKeys: run.detail.sourceReceipts.map(
            (receipt) => receipt.publicReceiptKey,
          ),
        },
      }).success,
    ).toBe(false);

    expect(
      referenceRunSchema.safeParse({
        ...run,
        intelligence: {
          ...run.intelligence!,
          aggregation: {
            ...run.intelligence!.aggregation,
            uniqueSourceCount: 5,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      referenceRunSchema.safeParse({
        ...run,
        intelligence: {
          ...run.intelligence!,
          aggregation: {
            ...run.intelligence!.aggregation,
            sourceLayers: run.intelligence!.aggregation.sourceLayers.map(
              (layer, index) =>
                index
                  ? layer
                  : {
                      ...layer,
                      capturedText:
                        "This fragment does not contain its receipts.",
                    },
            ),
          },
        },
      }).success,
    ).toBe(false);
    expect(
      referenceRunSchema.safeParse({
        ...run,
        intelligence: {
          ...run.intelligence!,
          addedValue: run.intelligence!.addedValue.map((value, index) =>
            index
              ? value
              : {
                  ...value,
                  inputReceiptKeys: ["receipt_unknown_value_7Qm4xN2pL8vR"],
                },
          ),
        },
      }).success,
    ).toBe(false);
    expect(
      referenceRunSchema.safeParse({
        ...run,
        intelligence: {
          ...run.intelligence!,
          decisionCheckpoints: run.intelligence!.decisionCheckpoints.map(
            (checkpoint) =>
              checkpoint.stage === "publish"
                ? { ...checkpoint, status: "fail" as const }
                : checkpoint,
          ),
        },
      }).success,
    ).toBe(false);
  });

  it("projects repaired evidence into the briefing source list", () => {
    const run = nycReferenceRuns.find(
      (candidate) => candidate.scenarioKey === "nyc-bins-revision",
    )!;
    expect(run.input.receiptKeys).toHaveLength(3);
    expect(referenceOutputReceipts(run)).toHaveLength(6);
    expect(referenceSourcePages(run)).toHaveLength(4);
  });

  it("keeps displayed inputs and brief candidates explicit and source-bound", () => {
    for (const run of referenceRuns) {
      const receiptKeys = new Set(
        run.detail.sourceReceipts.map((receipt) => receipt.publicReceiptKey),
      );
      expect(run.input.receiptKeys.every((key) => receiptKeys.has(key))).toBe(
        true,
      );
      if (run.output) expect(run.output.kind).toBe("brief-candidate");
    }
    const run = referenceRuns[0];
    expect(
      referenceRunSchema.safeParse({
        ...run,
        input: {
          ...run.input,
          receiptKeys: ["receipt_unknown_input_7Qm4xN2pL8vR"],
        },
      }).success,
    ).toBe(false);
  });

  it("preserves support and contradiction semantics across the story view", () => {
    const run = structuredClone(
      nycReferenceRuns.find(
        (candidate) => candidate.scenarioKey === "nyc-bridge-contradiction",
      )!,
    );
    const disputed = run.detail.claims.find(
      (claim) => claim.status === "disputed",
    )!;
    const contradictionKey = disputed.contradictions[0].publicReceiptKey;
    const mislabeled = {
      ...disputed.contradictions[0],
      relation: "supports" as const,
    };
    disputed.contradictions = [mislabeled];
    run.detail.sourceReceipts = run.detail.sourceReceipts.map((receipt) =>
      receipt.publicReceiptKey === contradictionKey ? mislabeled : receipt,
    );
    expect(referenceRunSchema.safeParse(run).success).toBe(false);
  });

  it("keeps every NYC receipt on the registered official-source boundary", () => {
    const area = resolveArea("new-york-city")!;
    for (const run of nycReferenceRuns) {
      expect(run.detail.publication).toBeUndefined();
      expect(run.detail.summary.publicationState).toBe("none");
      for (const receipt of run.detail.sourceReceipts) {
        expect(area.officialSourceHosts).toContain(
          new URL(receipt.sourceUrl).hostname,
        );
      }
    }
    expect(nycDemoEdition.metrics.confirmedUpdates).toBe(0);
  });

  it("preserves V1 parsing while accepting safe source-version and dissent additions", () => {
    const contradiction = nycReferenceRuns.find(
      (run) => run.scenarioKey === "nyc-bridge-contradiction",
    )!.detail;
    expect(contradiction.schemaVersion).toBe("2");
    if (contradiction.schemaVersion !== "2")
      throw new Error("Expected a V2 change-intelligence fixture");
    expect(contradiction.sourceVersions).toHaveLength(1);
    expect(contradiction.dissentRecords?.[0].outcome).toBe(
      "unresolved_material",
    );
    expect(
      publicInvestigationDetailSchema.safeParse({
        ...contradiction,
        sourceVersions: [
          {
            ...contradiction.sourceVersions![0],
            rawBody: "restricted source body",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("versions edition change intelligence without widening the strict V1 wire contract", () => {
    const brief = {
      publicBriefKey: "brief_public_example_Q7v4mN9xL2pR",
      slug: "example-brief-a1b2c3d4",
      publicCaseKey: "case_public_example_Q7v4mN9xL2pR",
      headline: "Example civic update",
      summary: "An official civic update was confirmed.",
      whyItMatters: "Residents can act on the updated information.",
      whoIsAffected: ["Residents"],
      category: "Civic",
      publicationState: "confirmed",
      lifecycleState: "resolved",
      correctionState: "none",
      freshnessState: "current",
      publishedAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
      sourceReceiptCount: 1,
      materialClaimCount: 1,
    };
    const withChange = {
      ...brief,
      changeImpact: "material_update",
      changeLabel: "Official guidance updated",
    };
    expect(publicEditionBriefV1Schema.safeParse(withChange).success).toBe(
      false,
    );
    expect(publicEditionBriefV2Schema.safeParse(withChange).success).toBe(true);
  });

  it("does not label intent, unknown, or demo state as published", () => {
    expect(
      investigationStatusLabel({
        ...demoInvestigation.summary,
        runtimeMode: "real",
        publicationState: "pending",
      }),
    ).toBe("Publication pending");
    expect(
      investigationStatusLabel({
        ...demoInvestigation.summary,
        runtimeMode: "real",
        publicationState: "unknown",
      }),
    ).toBe("Publication status unavailable");
    expect(
      investigationStatusLabel({
        ...demoInvestigation.summary,
        publicationState: "confirmed",
      }),
    ).toBe("Reference run");
    expect(
      investigationStatusLabel({
        ...demoInvestigation.summary,
        runtimeMode: "real",
        publicationState: "confirmed",
      }),
    ).toBe("Published");
  });

  it("rejects a supported claim without a receipt", () => {
    const claim = demoInvestigation.claims[0];
    const candidate = {
      ...demoInvestigation,
      claims: [{ ...claim, evidence: [] }],
    };
    expect(publicInvestigationDetailSchema.safeParse(candidate).success).toBe(
      false,
    );
  });

  it("rejects mismatched receipt reuse and inconsistent summary counts", () => {
    const claim = demoInvestigation.claims[0];
    const mismatchedReceipt = {
      ...claim.evidence[0],
      boundedExcerpt: "A different excerpt under the same public receipt key.",
    };
    const mismatched = {
      ...demoInvestigation,
      claims: [
        { ...claim, evidence: [mismatchedReceipt] },
        ...demoInvestigation.claims.slice(1),
      ],
    };
    expect(publicInvestigationDetailSchema.safeParse(mismatched).success).toBe(
      false,
    );
    expect(
      publicInvestigationDetailSchema.safeParse({
        ...demoInvestigation,
        summary: {
          ...demoInvestigation.summary,
          sourceReceiptCount: demoInvestigation.summary.sourceReceiptCount + 1,
        },
      }).success,
    ).toBe(false);
  });

  it("prevents demo or non-public cases from exposing a publication record", () => {
    const publication = {
      publicBriefKey: "brief_public_example_Q7v4mN9xL2pR",
      slug: "example-brief",
      headline: "Example",
      summary: "Example summary",
      whyItMatters: "Example significance",
      whoIsAffected: ["Residents"],
      category: "Civic",
      publishedAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
      sourceReceiptCount: 1,
      materialClaimCount: 1,
    };
    expect(
      publicInvestigationDetailSchema.safeParse({
        ...demoInvestigation,
        publication,
        summary: {
          ...demoInvestigation.summary,
          publicationState: "confirmed",
        },
      }).success,
    ).toBe(false);
  });

  it("accepts a confirmed real public publication projection", () => {
    const publication = {
      publicBriefKey: "brief_public_example_Q7v4mN9xL2pR",
      slug: "example-brief-a1b2c3d4",
      headline: "Example civic update",
      summary: "An official civic update was confirmed.",
      whyItMatters: "Residents can act on the updated information.",
      whoIsAffected: ["Residents"],
      category: "Civic",
      publishedAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
      sourceReceiptCount: 1,
      materialClaimCount: 1,
      externalUrl: "https://cited.md/public-wire/example-brief-a1b2c3d4",
    };
    const result = publicInvestigationDetailSchema.safeParse({
      ...demoInvestigation,
      publication,
      currentDecision: {
        outcome: "publish",
        reasonCodes: ["EVIDENCE_COMPLETE"],
      },
      summary: {
        ...demoInvestigation.summary,
        workflowState: "complete",
        publicationState: "confirmed",
        runtimeMode: "real",
        visibility: "public",
      },
    });
    expect(result.success).toBe(true);
  });
});
