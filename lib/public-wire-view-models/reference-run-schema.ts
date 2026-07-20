import { z } from "zod";
import { publicInvestigationDetailSchema } from "./schemas";

const referenceAgentResultSchema = z
  .object({
    key: z.enum([
      "capture",
      "extractor",
      "verifier",
      "editor",
      "writer",
      "reviewer",
      "monitor",
      "change-analyst",
      "evidence-repair",
      "dissent-resolver",
      "external-review",
      "final-gate",
    ]),
    name: z.string().min(1).max(80),
    kind: z.enum([
      "tool",
      "llm-agent",
      "application-review",
      "deterministic-gate",
    ]),
    status: z.enum(["complete", "held", "blocked", "pending"]),
    output: z.string().min(1).max(320),
    stateKey: z.string().min(1).max(80).optional(),
  })
  .strict();

const draftIssueCodeSchema = z.enum([
  "ADDED_FACT",
  "NUMERIC_MISMATCH",
  "DATE_MISMATCH",
  "LOCATION_MISMATCH",
  "STATUS_MISMATCH",
  "ATTRIBUTION_MISMATCH",
  "OVERSTATED",
]);

const referenceStoryMomentSchema = z
  .object({
    momentKey: z.string().regex(/^moment_[a-z0-9_]{3,80}$/),
    stage: z.enum([
      "monitor",
      "capture",
      "extract",
      "assess",
      "verify",
      "editorial",
      "draft",
      "review",
      "maintain",
      "publish",
    ]),
    actor: z.string().min(1).max(80),
    status: z.enum(["complete", "caught", "revised", "held", "ready"]),
    headline: z.string().min(1).max(140),
    narrative: z.string().min(1).max(420),
    eventKeys: z.array(z.string()).min(1).max(4),
    claimKeys: z.array(z.string()).max(8),
    receiptKeys: z.array(z.string()).max(8),
    visual: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("receipt"),
          receiptKey: z.string(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("claim-counts"),
          supported: z.number().int().nonnegative(),
          disputed: z.number().int().nonnegative(),
          missing: z.number().int().nonnegative(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("draft-change"),
          phase: z.enum(["draft", "caught", "revised"]),
          before: z.string().min(1).max(320),
          flaggedText: z.string().min(1).max(180),
          issueCode: draftIssueCodeSchema,
          after: z.string().min(1).max(320),
        })
        .strict(),
      z
        .object({
          kind: z.literal("evidence-conflict"),
          supportReceiptKey: z.string(),
          contradictionReceiptKey: z.string(),
        })
        .strict(),
      z
        .object({
          kind: z.literal("source-diff"),
          beforeLabel: z.string().min(1).max(100),
          afterLabel: z.string().min(1).max(100),
          before: z.string().min(1).max(320),
          after: z.string().min(1).max(320),
          impact: z.enum([
            "no_change",
            "clarification",
            "material_update",
            "checking",
          ]),
        })
        .strict(),
      z
        .object({
          kind: z.literal("dissent-assessment"),
          supportReceiptKey: z.string(),
          contradictionReceiptKey: z.string(),
          outcomeLabel: z.string().min(1).max(100),
          explanation: z.string().min(1).max(320),
        })
        .strict(),
      z
        .object({
          kind: z.literal("record-revision"),
          revisionType: z.enum([
            "update",
            "clarification",
            "correction",
            "retraction",
          ]),
          beforeLabel: z.string().min(1).max(100),
          afterLabel: z.string().min(1).max(100),
          detail: z.string().min(1).max(320),
        })
        .strict(),
      z
        .object({
          kind: z.literal("gate"),
          label: z.string().min(1).max(100),
          detail: z.string().min(1).max(280),
        })
        .strict(),
    ]),
    system: z
      .object({
        agentKind: z.string().min(1).max(80),
        stateKey: z.string().min(1).max(80).optional(),
        eventCode: z.string().min(1).max(80),
        recordLabel: z.enum(["Public event", "Linked outcome"]).optional(),
      })
      .strict(),
    contribution: z
      .object({
        inputLabel: z.string().min(1).max(160),
        operation: z.string().min(1).max(200),
        addedValue: z.string().min(1).max(280),
        outputLabel: z.string().min(1).max(160),
        residentImpact: z.string().min(1).max(280),
        decisionCheckpointKeys: z.array(z.string()).max(8),
      })
      .strict()
      .optional(),
  })
  .strict();

const referenceStorySchema = z
  .object({
    outcomeLabel: z.string().min(1).max(80),
    outcomeTone: z.enum(["positive", "caution", "stopped"]),
    hook: z.string().min(1).max(180),
    metrics: z
      .array(
        z
          .object({
            label: z.string().min(1).max(40),
            value: z.number().int().nonnegative().max(999),
          })
          .strict(),
      )
      .length(3),
    pivotalMomentKey: z.string(),
    moments: z.array(referenceStoryMomentSchema).min(3).max(10),
    loopEdges: z
      .array(
        z
          .object({
            fromMomentKey: z.string(),
            toMomentKey: z.string(),
            label: z.string().min(1).max(80),
            kind: z.enum([
              "draft-revision",
              "evidence-recheck",
              "source-maintenance",
            ]),
          })
          .strict(),
      )
      .max(4)
      .default([]),
  })
  .strict();

const decisionValueSchema = z.union([
  z.string().min(1).max(120),
  z.number().finite(),
  z.boolean(),
]);

const referenceIntelligenceSchema = z
  .object({
    residentAnswer: z
      .object({
        bottomLine: z.string().min(1).max(420),
        whatIsNew: z.array(z.string().min(1).max(240)).min(1).max(8),
        actions: z
          .array(
            z
              .object({
                label: z.string().min(1).max(220),
                deadline: z.string().min(1).max(80).optional(),
                affectedGroups: z
                  .array(z.string().min(1).max(100))
                  .min(1)
                  .max(12),
              })
              .strict(),
          )
          .max(8),
        knownUnknowns: z.array(z.string().min(1).max(260)).max(8),
      })
      .strict(),
    aggregation: z
      .object({
        uniqueSourceCount: z.number().int().positive().max(50),
        uniquePublisherCount: z.number().int().positive().max(20),
        materialClaimCount: z.number().int().positive().max(100),
        maxClaimsCoveredByOneSource: z.number().int().nonnegative().max(100),
        requiresMultipleSources: z.boolean(),
        explanation: z.string().min(1).max(420),
        sourceLayers: z
          .array(
            z
              .object({
                layerKey: z.string().regex(/^layer_[a-z0-9_]{3,80}$/),
                label: z.string().min(1).max(120),
                publisher: z.string().min(1).max(120),
                jurisdiction: z.string().min(1).max(120),
                contribution: z.string().min(1).max(280),
                receiptKeys: z.array(z.string()).min(1).max(12),
                capturedText: z.string().min(1).max(2400).optional(),
              })
              .strict(),
          )
          .min(1)
          .max(12),
      })
      .strict(),
    addedValue: z
      .array(
        z
          .object({
            valueKey: z.string().regex(/^value_[a-z0-9_]{3,80}$/),
            kind: z.enum([
              "joined_sources",
              "closed_evidence_gap",
              "caught_regression",
              "preserved_conflict",
              "detected_source_change",
              "prevented_overclaim",
            ]),
            headline: z.string().min(1).max(160),
            residentConsequence: z.string().min(1).max(320),
            inputClaimKeys: z.array(z.string()).max(12),
            inputReceiptKeys: z.array(z.string()).max(12),
            outputClaimKeys: z.array(z.string()).max(12),
            eventKeys: z.array(z.string()).min(1).max(12),
            momentKey: z.string(),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    decisionCheckpoints: z
      .array(
        z
          .object({
            checkpointKey: z.string().regex(/^checkpoint_[a-z0-9_]{3,80}$/),
            label: z.string().min(1).max(140),
            stage: z.enum([
              "capture",
              "extract",
              "assess",
              "verify",
              "editorial",
              "draft",
              "review",
              "maintain",
              "publish",
            ]),
            owner: z.enum(["adk_agent", "application_policy", "human"]),
            status: z.enum(["pass", "fail", "not_run"]),
            observed: z
              .object({
                label: z.string().min(1).max(100),
                value: decisionValueSchema,
              })
              .strict(),
            required: z
              .object({
                label: z.string().min(1).max(100),
                value: decisionValueSchema,
              })
              .strict(),
            consequence: z.string().min(1).max(320),
            policyVersion: z.string().min(1).max(80),
            claimKeys: z.array(z.string()).max(12),
            receiptKeys: z.array(z.string()).max(12),
            eventKeys: z.array(z.string()).min(1).max(12),
            momentKey: z.string(),
          })
          .strict(),
      )
      .min(1)
      .max(16),
  })
  .strict();

export const referenceRunSchema = z
  .object({
    scenarioKey: z.string().regex(/^[a-z0-9-]{3,80}$/),
    label: z.string().min(1).max(80),
    deck: z.string().min(1).max(280),
    execution: z
      .discriminatedUnion("kind", [
        z
          .object({
            kind: z.literal("deterministic_reference"),
            contractVersion: z.string().min(1).max(80),
          })
          .strict(),
        z
          .object({
            kind: z.literal("recorded_adk_trace"),
            frameworkVersion: z.string().min(1).max(40),
            model: z.string().min(1).max(120),
            traceKey: z.string().min(1).max(160),
          })
          .strict(),
      ])
      .optional(),
    input: z
      .object({
        origin: z.enum([
          "official-source-packet",
          "coverage-request-and-sources",
          "single-source-artifact",
        ]),
        label: z.string().min(1).max(100),
        summary: z.string().min(1).max(420),
        receiptKeys: z.array(z.string()).min(1).max(8),
      })
      .strict(),
    detail: publicInvestigationDetailSchema,
    agents: z.array(referenceAgentResultSchema).min(1).max(10),
    story: referenceStorySchema,
    intelligence: referenceIntelligenceSchema.optional(),
    output: z
      .object({
        kind: z.literal("brief-candidate"),
        briefSlug: z
          .string()
          .regex(/^[a-z0-9-]{3,160}$/)
          .optional(),
        headline: z.string().min(1).max(240),
        summary: z.string().min(1).max(900),
        disposition: z.string().min(1).max(160),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((run, ctx) => {
    const eventKeys = new Set(
      run.detail.events.map((event) => event.publicEventKey),
    );
    const claimKeys = new Set(
      run.detail.claims.map((claim) => claim.publicClaimKey),
    );
    const receiptKeys = new Set(
      run.detail.sourceReceipts.map((receipt) => receipt.publicReceiptKey),
    );
    const momentKeys = run.story.moments.map((moment) => moment.momentKey);
    const summaryCounts = run.detail.summary.materialClaimCounts;

    if (run.input.receiptKeys.some((key) => !receiptKeys.has(key))) {
      ctx.addIssue({
        code: "custom",
        path: ["input", "receiptKeys"],
        message: "Input receipts must resolve inside the public projection",
      });
    }

    for (const [claimIndex, claim] of run.detail.claims.entries()) {
      if (
        claim.evidence.some((receipt) => receipt.relation === "contradicts")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["detail", "claims", claimIndex, "evidence"],
          message: "Evidence receipts cannot contradict their claim",
        });
      }
      if (
        claim.contradictions.some(
          (receipt) => receipt.relation !== "contradicts",
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["detail", "claims", claimIndex, "contradictions"],
          message: "Contradiction receipts must be marked contradicts",
        });
      }
    }

    if (new Set(momentKeys).size !== momentKeys.length) {
      ctx.addIssue({
        code: "custom",
        path: ["story", "moments"],
        message: "Story moment keys must be unique",
      });
    }
    if (
      !run.story.moments.some(
        (moment) => moment.momentKey === run.story.pivotalMomentKey,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["story", "pivotalMomentKey"],
        message: "Pivotal moment must exist",
      });
    }
    const firstMomentReceiptKeys = new Set(
      run.story.moments[0]?.receiptKeys ?? [],
    );
    if (
      run.input.receiptKeys.length !== firstMomentReceiptKeys.size ||
      run.input.receiptKeys.some((key) => !firstMomentReceiptKeys.has(key))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["input", "receiptKeys"],
        message:
          "Declared run input must match the first captured story moment",
      });
    }
    let previousMomentCursor = -1;
    for (const [momentIndex, moment] of run.story.moments.entries()) {
      const linkedCursors = run.detail.events
        .filter((event) => moment.eventKeys.includes(event.publicEventKey))
        .map((event) => event.cursor);
      const momentCursor = linkedCursors.length
        ? Math.min(...linkedCursors)
        : previousMomentCursor;
      if (momentCursor < previousMomentCursor) {
        ctx.addIssue({
          code: "custom",
          path: ["story", "moments", momentIndex, "eventKeys"],
          message: "Story moments must follow persisted event chronology",
        });
      }
      previousMomentCursor = Math.max(previousMomentCursor, momentCursor);
    }
    for (const [edgeIndex, edge] of run.story.loopEdges.entries()) {
      if (
        !momentKeys.includes(edge.fromMomentKey) ||
        !momentKeys.includes(edge.toMomentKey) ||
        edge.fromMomentKey === edge.toMomentKey
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["story", "loopEdges", edgeIndex],
          message:
            "Workflow loop edges must connect two distinct story moments",
        });
      }
    }

    for (const [index, moment] of run.story.moments.entries()) {
      const path = ["story", "moments", index] as const;
      const linkedEvents = run.detail.events.filter((event) =>
        moment.eventKeys.includes(event.publicEventKey),
      );
      if (moment.eventKeys.some((key) => !eventKeys.has(key))) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "eventKeys"],
          message: "Story events must resolve",
        });
      }
      if (moment.claimKeys.some((key) => !claimKeys.has(key))) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "claimKeys"],
          message: "Story claims must resolve",
        });
      }
      if (moment.receiptKeys.some((key) => !receiptKeys.has(key))) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "receiptKeys"],
          message: "Story receipts must resolve",
        });
      }
      if (
        linkedEvents.length &&
        !linkedEvents.some(
          (event) => event.eventCode === moment.system.eventCode,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "system", "eventCode"],
          message: "System event code must match a linked event",
        });
      }
      if (
        moment.visual.kind === "receipt" &&
        !receiptKeys.has(moment.visual.receiptKey)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "visual", "receiptKey"],
          message: "Visual receipt must resolve",
        });
      }
      if (
        moment.visual.kind === "evidence-conflict" &&
        (!receiptKeys.has(moment.visual.supportReceiptKey) ||
          !receiptKeys.has(moment.visual.contradictionReceiptKey))
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "visual"],
          message: "Conflict receipts must resolve",
        });
      }
      if (
        moment.visual.kind === "dissent-assessment" &&
        (!receiptKeys.has(moment.visual.supportReceiptKey) ||
          !receiptKeys.has(moment.visual.contradictionReceiptKey))
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "visual"],
          message: "Dissent assessment receipts must resolve",
        });
      }
      if (moment.visual.kind === "evidence-conflict") {
        const { supportReceiptKey, contradictionReceiptKey } = moment.visual;
        const support = run.detail.sourceReceipts.find(
          (receipt) => receipt.publicReceiptKey === supportReceiptKey,
        );
        const contradiction = run.detail.sourceReceipts.find(
          (receipt) => receipt.publicReceiptKey === contradictionReceiptKey,
        );
        if (
          support?.relation !== "supports" ||
          contradiction?.relation !== "contradicts"
        ) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "visual"],
            message:
              "Conflict visual must preserve support and contradiction semantics",
          });
        }
      }
      if (
        moment.visual.kind === "draft-change" &&
        !moment.visual.before.includes(moment.visual.flaggedText)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "visual", "flaggedText"],
          message: "Flagged text must exist in the first draft",
        });
      }
      if (
        moment.visual.kind === "claim-counts" &&
        (moment.visual.supported !== summaryCounts.supported ||
          moment.visual.disputed !== summaryCounts.disputed ||
          moment.visual.missing !== summaryCounts.missing)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "visual"],
          message: "Story counts must match the public projection",
        });
      }
    }

    if (run.intelligence) {
      const { aggregation, addedValue, decisionCheckpoints } = run.intelligence;
      const layerKeys = aggregation.sourceLayers.map((layer) => layer.layerKey);
      if (new Set(layerKeys).size !== layerKeys.length) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "sourceLayers"],
          message: "Source layer keys must be unique",
        });
      }
      const layerReceipts = aggregation.sourceLayers.flatMap(
        (layer) => layer.receiptKeys,
      );
      if (layerReceipts.some((key) => !receiptKeys.has(key))) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "sourceLayers"],
          message: "Aggregation layers must resolve to public receipts",
        });
      }
      const uniqueSourceUrls = new Set(
        layerReceipts
          .map(
            (key) =>
              run.detail.sourceReceipts.find(
                (receipt) => receipt.publicReceiptKey === key,
              )?.sourceUrl,
          )
          .filter(Boolean),
      );
      if (uniqueSourceUrls.size !== aggregation.uniqueSourceCount) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "uniqueSourceCount"],
          message: "Unique source count must match distinct linked source URLs",
        });
      }
      if (
        new Set(aggregation.sourceLayers.map((layer) => layer.publisher))
          .size !== aggregation.uniquePublisherCount
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "uniquePublisherCount"],
          message:
            "Publisher count must match distinct source-layer publishers",
        });
      }
      const materialClaimCount =
        summaryCounts.supported +
        summaryCounts.disputed +
        summaryCounts.missing;
      if (aggregation.materialClaimCount !== materialClaimCount) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "materialClaimCount"],
          message:
            "Aggregation material claim count must match the public projection",
        });
      }
      if (
        aggregation.requiresMultipleSources &&
        (uniqueSourceUrls.size < 2 ||
          aggregation.maxClaimsCoveredByOneSource >=
            aggregation.materialClaimCount)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "requiresMultipleSources"],
          message:
            "Multi-source synthesis requires multiple artifacts and no single artifact covering the full answer",
        });
      }
      if (aggregation.sourceLayers.some((layer) => !layer.capturedText)) {
        ctx.addIssue({
          code: "custom",
          path: ["intelligence", "aggregation", "sourceLayers"],
          message:
            "Every displayed source layer requires captured normalized text",
        });
      }
      for (const [layerIndex, layer] of aggregation.sourceLayers.entries()) {
        if (!layer.capturedText) continue;
        const layerReceiptRecords = layer.receiptKeys
          .map((key) =>
            run.detail.sourceReceipts.find(
              (receipt) => receipt.publicReceiptKey === key,
            ),
          )
          .filter(Boolean);
        if (
          layerReceiptRecords.some(
            (receipt) =>
              receipt && !layer.capturedText!.includes(receipt.boundedExcerpt),
          )
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "intelligence",
              "aggregation",
              "sourceLayers",
              layerIndex,
              "capturedText",
            ],
            message:
              "Every displayed receipt must occur verbatim in its captured normalized text",
          });
        }
      }
      for (const [valueIndex, value] of addedValue.entries()) {
        if (
          !momentKeys.includes(value.momentKey) ||
          value.inputClaimKeys.some((key) => !claimKeys.has(key)) ||
          value.outputClaimKeys.some((key) => !claimKeys.has(key)) ||
          value.inputReceiptKeys.some((key) => !receiptKeys.has(key)) ||
          value.eventKeys.some((key) => !eventKeys.has(key))
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["intelligence", "addedValue", valueIndex],
            message: "Added-value links must resolve inside the run",
          });
        }
      }
      const checkpointKeys = new Set(
        decisionCheckpoints.map((checkpoint) => checkpoint.checkpointKey),
      );
      for (const [
        checkpointIndex,
        checkpoint,
      ] of decisionCheckpoints.entries()) {
        if (
          !momentKeys.includes(checkpoint.momentKey) ||
          checkpoint.claimKeys.some((key) => !claimKeys.has(key)) ||
          checkpoint.receiptKeys.some((key) => !receiptKeys.has(key)) ||
          checkpoint.eventKeys.some((key) => !eventKeys.has(key))
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["intelligence", "decisionCheckpoints", checkpointIndex],
            message: "Decision checkpoint links must resolve inside the run",
          });
        }
        if (
          checkpoint.stage === "publish" &&
          checkpoint.status === "fail" &&
          run.output
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["output"],
            message:
              "A failed publication checkpoint cannot emit a brief candidate",
          });
        }
      }
      for (const [momentIndex, moment] of run.story.moments.entries()) {
        if (
          moment.contribution?.decisionCheckpointKeys.some(
            (key) => !checkpointKeys.has(key),
          )
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "story",
              "moments",
              momentIndex,
              "contribution",
              "decisionCheckpointKeys",
            ],
            message: "Moment checkpoints must resolve",
          });
        }
      }
    }
  });

export type ReferenceRun = z.infer<typeof referenceRunSchema>;
