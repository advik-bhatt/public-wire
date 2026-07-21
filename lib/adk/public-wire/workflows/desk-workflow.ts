import "server-only";

import {
  BaseAgent,
  createEvent,
  createEventActions,
  type Event,
  type Gemini,
  type InvocationContext,
  type LlmAgent,
} from "@google/adk";
import type { Content } from "@google/genai";
import { z } from "zod";
import {
  adkEditorialOutputSchema,
  createEditorialClassifier,
} from "../agents/editorial-classifier";
import {
  createExtractorAgent,
  extractorOutputSchema,
} from "../agents/extractor";
import {
  createClaimVerifierAgent,
  verifierOutputSchema,
} from "../agents/claim-verifier";
import { createWriterAgent, writerOutputSchema } from "../agents/writer";
import {
  createFactualReviewerAgent,
  factualReviewerOutputSchema,
} from "../agents/factual-reviewer";
import {
  createVerifierPanel,
  perspectiveCoversExtraction,
  readVerifierPanel,
} from "../agents/verifier-panel";

export type DeskOutcome = {
  outcome: "publish_ready" | "held";
  reasonCode:
    | "READY"
    | "INVALID_EXTRACTION"
    | "MISSING_EVIDENCE"
    | "CONTRADICTION"
    | "EDITORIAL_HOLD"
    | "INVALID_DRAFT"
    | "FACTUAL_REVIEW_FAILED";
};

const DESK_OUTCOMES = new Set<DeskOutcome["outcome"]>([
  "publish_ready",
  "held",
]);
const DESK_REASON_CODES = new Set<DeskOutcome["reasonCode"]>([
  "READY",
  "INVALID_EXTRACTION",
  "MISSING_EVIDENCE",
  "CONTRADICTION",
  "EDITORIAL_HOLD",
  "INVALID_DRAFT",
  "FACTUAL_REVIEW_FAILED",
]);
const MAX_DRAFT_REVISIONS = 1;

export const deskOutcomeSchema = {
  parse(value: string): DeskOutcome {
    const parsed = JSON.parse(value) as Partial<DeskOutcome>;
    if (
      !parsed.outcome ||
      !DESK_OUTCOMES.has(parsed.outcome) ||
      !parsed.reasonCode ||
      !DESK_REASON_CODES.has(parsed.reasonCode)
    ) {
      throw new Error("INVALID_DESK_OUTCOME");
    }
    return parsed as DeskOutcome;
  },
};

export const draftRevisionHistorySchema = z
  .array(
    z
      .object({
        attempt: z.number().int().min(1).max(2),
        draft: writerOutputSchema,
        review: factualReviewerOutputSchema,
      })
      .strict(),
  )
  .max(2);

type DraftRevisionHistory = z.infer<typeof draftRevisionHistorySchema>;

export function verificationCoversExtraction(
  extraction: z.infer<typeof extractorOutputSchema>,
  verification: z.infer<typeof verifierOutputSchema>,
) {
  const expected = new Set(extraction.claims.map((claim) => claim.claimKey));
  const actual = new Set(verification.claims.map((claim) => claim.claimKey));
  return (
    actual.size === verification.claims.length &&
    actual.size === expected.size &&
    [...expected].every((claimKey) => actual.has(claimKey))
  );
}

function terminalEvent(
  context: InvocationContext,
  agentName: string,
  value: DeskOutcome,
): Event {
  const content: Content = {
    role: "model",
    parts: [{ text: JSON.stringify(value) }],
  };
  return createEvent({
    invocationId: context.invocationId,
    author: agentName,
    content,
  });
}

function stateEvent(
  context: InvocationContext,
  agentName: string,
  stateDelta: Record<string, unknown>,
): Event {
  return createEvent({
    invocationId: context.invocationId,
    author: agentName,
    actions: createEventActions({ stateDelta }),
  });
}

function reviewReferencesDraftClaims(
  review: z.infer<typeof factualReviewerOutputSchema>,
  usedClaimKeys: string[],
  knownClaims: Set<string>,
) {
  return review.issues.every(
    (issue) =>
      knownClaims.has(issue.claimKey) && usedClaimKeys.includes(issue.claimKey),
  );
}

class DeskWorkflow extends BaseAgent {
  constructor(
    private readonly extractor: LlmAgent,
    private readonly verifier: LlmAgent,
    private readonly verifierPanel: BaseAgent,
    private readonly editor: LlmAgent,
    private readonly writer: LlmAgent,
    private readonly reviewer: LlmAgent,
    private readonly maxDraftRevisions: number,
  ) {
    super({
      name: "public_wire_desk_workflow",
      description: "Runs PublicWire's bounded evidence-first desk workflow.",
      subAgents: [extractor, verifier, verifierPanel, editor, writer, reviewer],
    });
  }

  protected override async *runAsyncImpl(
    context: InvocationContext,
  ): AsyncGenerator<Event, void, void> {
    yield* this.extractor.runAsync(context);
    const extraction = extractorOutputSchema.safeParse(
      context.session.state.pw_extraction,
    );
    if (!extraction.success) {
      yield terminalEvent(context, this.name, {
        outcome: "held",
        reasonCode: "INVALID_EXTRACTION",
      });
      return;
    }
    yield* this.verifier.runAsync(context);
    const verification = verifierOutputSchema.safeParse(
      context.session.state.pw_verification,
    );
    if (
      !verification.success ||
      !verificationCoversExtraction(extraction.data, verification.data) ||
      verification.data.claims.some((claim) => claim.outcome !== "supported")
    ) {
      yield terminalEvent(context, this.name, {
        outcome: "held",
        reasonCode:
          verification.success && verification.data.blockingContradiction
            ? "CONTRADICTION"
            : "MISSING_EVIDENCE",
      });
      return;
    }

    // Parallel agents propose independent judgments. Schema parsing, complete
    // claim coverage, and the fail-closed branch below remain deterministic.
    yield* this.verifierPanel.runAsync(context);
    const panel = readVerifierPanel(context.session.state);
    const panelComplete =
      panel.success &&
      perspectiveCoversExtraction(extraction.data, panel.data.temporal) &&
      perspectiveCoversExtraction(extraction.data, panel.data.authority) &&
      perspectiveCoversExtraction(extraction.data, panel.data.contradiction);
    const temporalOrAuthorityFailure =
      panel.success &&
      [panel.data.temporal, panel.data.authority].some((perspective) =>
        perspective.claims.some((claim) => claim.outcome === "fail"),
      );
    const contradictionFailure =
      panel.success &&
      panel.data.contradiction.claims.some((claim) => claim.outcome === "fail");
    if (!panelComplete || temporalOrAuthorityFailure || contradictionFailure) {
      if (panel.success) {
        yield stateEvent(context, this.name, {
          pw_verifier_panel: panel.data,
        });
      }
      yield terminalEvent(context, this.name, {
        outcome: "held",
        reasonCode: contradictionFailure ? "CONTRADICTION" : "MISSING_EVIDENCE",
      });
      return;
    }
    yield stateEvent(context, this.name, {
      pw_verifier_panel: panel.data,
    });

    yield* this.editor.runAsync(context);
    const editorial = adkEditorialOutputSchema.safeParse(
      context.session.state.pw_editorial,
    );
    if (!editorial.success || editorial.data.outcome !== "publish") {
      yield terminalEvent(context, this.name, {
        outcome: "held",
        reasonCode: "EDITORIAL_HOLD",
      });
      return;
    }

    const knownClaims = new Set(
      extraction.data.claims.map((claim) => claim.claimKey),
    );
    const revisionHistory: DraftRevisionHistory = [];
    yield stateEvent(context, this.name, {
      pw_prior_draft: { status: "none" },
      pw_revision_feedback: { status: "none" },
      pw_revision_history: revisionHistory,
    });

    for (let attempt = 1; attempt <= this.maxDraftRevisions + 1; attempt += 1) {
      yield* this.writer.runAsync(context);
      const draft = writerOutputSchema.safeParse(
        context.session.state.pw_draft,
      );
      if (
        !draft.success ||
        draft.data.usedClaimKeys.some((claimKey) => !knownClaims.has(claimKey))
      ) {
        yield terminalEvent(context, this.name, {
          outcome: "held",
          reasonCode: "INVALID_DRAFT",
        });
        return;
      }

      yield* this.reviewer.runAsync(context);
      const review = factualReviewerOutputSchema.safeParse(
        context.session.state.pw_factual_review,
      );
      if (
        !review.success ||
        !reviewReferencesDraftClaims(
          review.data,
          draft.data.usedClaimKeys,
          knownClaims,
        )
      ) {
        yield terminalEvent(context, this.name, {
          outcome: "held",
          reasonCode: "FACTUAL_REVIEW_FAILED",
        });
        return;
      }

      revisionHistory.push({ attempt, draft: draft.data, review: review.data });
      const stateDelta: Record<string, unknown> = {
        pw_revision_history: draftRevisionHistorySchema.parse(revisionHistory),
      };
      if (review.data.outcome === "fail" && attempt <= this.maxDraftRevisions) {
        stateDelta.pw_prior_draft = draft.data;
        stateDelta.pw_revision_feedback = review.data;
      }
      yield stateEvent(context, this.name, stateDelta);
      if (review.data.outcome === "pass") {
        yield terminalEvent(context, this.name, {
          outcome: "publish_ready",
          reasonCode: "READY",
        });
        return;
      }
    }

    yield terminalEvent(context, this.name, {
      outcome: "held",
      reasonCode: "FACTUAL_REVIEW_FAILED",
    });
  }

  protected override async *runLiveImpl(): AsyncGenerator<Event, void, void> {
    throw new Error(
      "PublicWire desk workflow does not support live audio/video execution",
    );
  }
}

export function createDeskWorkflow(model: Gemini, maxDraftRevisions = 0) {
  if (
    !Number.isInteger(maxDraftRevisions) ||
    maxDraftRevisions < 0 ||
    maxDraftRevisions > MAX_DRAFT_REVISIONS
  ) {
    throw new Error("PUBLIC_WIRE_INVALID_DRAFT_REVISION_BUDGET");
  }
  const extractor = createExtractorAgent(model);
  const verifier = createClaimVerifierAgent(model);
  const editor = createEditorialClassifier(model);
  editor.outputKey = "pw_editorial";
  return new DeskWorkflow(
    extractor,
    verifier,
    createVerifierPanel(model),
    editor,
    createWriterAgent(model),
    createFactualReviewerAgent(model),
    maxDraftRevisions,
  );
}
