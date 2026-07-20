import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

type ReliabilityInput = {
  headline: string;
  summary: string;
  sources: { title: string; url: string; role: string }[];
  agentTrace: string[];
  geminiDecision?: {
    publishable: boolean;
    classification: string;
    reason: string;
  };
  events: {
    step: number;
    title: string;
    detail: string;
    source: string;
    risk: string;
    status: string;
  }[];
  rawSourceText?: string;
  canonicalPublication?: string;
  prevalidatedSourceReachability?: SourceReachability[];
  signal?: AbortSignal;
};

const adversarialSchema = z
  .object({
    claims: z
      .array(
        z
          .object({
            claim: z.string().trim().min(1).max(600),
            supported: z.boolean(),
            sourceEvidence: z.string().trim().min(1).max(900).nullable(),
            verdict: z.enum(["supported", "unsupported", "overstated"]),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    overallVerdict: z.enum([
      "clean",
      "minor-overstatement",
      "unsupported-claims",
    ]),
    unsupportedCount: z.number().int().nonnegative().max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const actual = value.claims.filter(
      (claim) => claim.verdict !== "supported" || !claim.supported,
    ).length;
    if (value.unsupportedCount !== actual)
      ctx.addIssue({
        code: "custom",
        message: "Unsupported count does not match claims",
      });
    if (value.overallVerdict === "clean" && actual > 0)
      ctx.addIssue({
        code: "custom",
        message: "A clean verdict cannot include unsupported claims",
      });
  });

type AdversarialResult = z.infer<typeof adversarialSchema>;
type SourceReachability = { url: string; reachable: boolean; status: number };

export type LapdogReview = {
  provider: "Datadog Lapdog";
  mode:
    | "lapdog-traced"
    | "configured-forwarder"
    | "local-audit"
    | "provider-error";
  outcome:
    | "pass"
    | "fail"
    | "unavailable"
    | "malformed"
    | "timed_out"
    | "error";
  passed: boolean;
  score: number;
  verdict: string;
  checks: { name: string; status: "pass" | "warn" | "fail"; comment: string }[];
  traceSummary: string[];
  sourceReachability: SourceReachability[];
  adversarialReview?: AdversarialResult;
  errorCode?: string;
};

function combineSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new Error("Reliability check timed out")),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", forwardAbort);
    },
  };
}

async function checkSourceReachability(
  sources: { url: string }[],
  signal?: AbortSignal,
) {
  const results = await Promise.allSettled(
    sources.map(async (source): Promise<SourceReachability> => {
      let url: URL;
      try {
        url = new URL(source.url);
      } catch {
        return { url: source.url, reachable: false, status: 0 };
      }
      if (url.protocol !== "https:")
        return { url: source.url, reachable: false, status: 0 };
      const scoped = combineSignal(signal, 4_000);
      try {
        const response = await fetch(url, {
          method: "HEAD",
          signal: scoped.signal,
          redirect: "error",
        });
        return {
          url: source.url,
          reachable: response.ok,
          status: response.status,
        };
      } catch {
        return { url: source.url, reachable: false, status: 0 };
      } finally {
        scoped.cleanup();
      }
    }),
  );
  return results.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : { url: sources[index]?.url ?? "", reachable: false, status: 0 },
  );
}

function parseJson(text: string) {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return null;
  }
}

async function runAdversarialClaimCheck(
  input: ReliabilityInput,
): Promise<{
  outcome:
    | "pass"
    | "fail"
    | "unavailable"
    | "malformed"
    | "timed_out"
    | "error";
  result?: AdversarialResult;
}> {
  if (!input.rawSourceText?.trim() || !process.env.GEMINI_API_KEY)
    return { outcome: "unavailable" };
  const scoped = combineSignal(input.signal, 12_000);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
      contents: `Act as a skeptical civic fact-checker. Break every provider-visible field in the canonical publication into factual claims and compare every claim only against the captured source text. This includes the headline, summary, why-it-matters statement, affected groups, and source descriptions. Unsupported or more-certain wording must not pass. Return JSON only.\n\nCanonical publication JSON:\n${input.canonicalPublication || JSON.stringify({ headline: input.headline, summary: input.summary, sources: input.sources })}\n\nCaptured source text:\n${input.rawSourceText.slice(0, 8_000)}`,
      config: {
        abortSignal: scoped.signal,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["claims", "overallVerdict", "unsupportedCount"],
          properties: {
            claims: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["claim", "supported", "sourceEvidence", "verdict"],
                properties: {
                  claim: { type: "string" },
                  supported: { type: "boolean" },
                  sourceEvidence: {
                    anyOf: [{ type: "string" }, { type: "null" }],
                  },
                  verdict: {
                    type: "string",
                    enum: ["supported", "unsupported", "overstated"],
                  },
                },
              },
            },
            overallVerdict: {
              type: "string",
              enum: ["clean", "minor-overstatement", "unsupported-claims"],
            },
            unsupportedCount: { type: "integer" },
          },
        },
      },
    });
    const parsed = adversarialSchema.safeParse(parseJson(response.text || ""));
    if (!parsed.success) return { outcome: "malformed" };
    return {
      outcome: parsed.data.overallVerdict === "clean" ? "pass" : "fail",
      result: parsed.data,
    };
  } catch {
    return { outcome: scoped.signal.aborted ? "timed_out" : "error" };
  } finally {
    scoped.cleanup();
  }
}

export async function runLapdogReliabilityReview(
  input: ReliabilityInput,
): Promise<LapdogReview> {
  const [reachability, adversarial] = await Promise.all([
    input.prevalidatedSourceReachability
      ? Promise.resolve(input.prevalidatedSourceReachability)
      : checkSourceReachability(input.sources, input.signal),
    runAdversarialClaimCheck(input),
  ]);
  const reachableCount = reachability.filter(
    (source) => source.reachable,
  ).length;
  const allReachable =
    input.sources.length > 0 && reachableCount === input.sources.length;
  const passed =
    Boolean(input.geminiDecision?.publishable) &&
    input.sources.length > 0 &&
    allReachable &&
    adversarial.outcome === "pass";
  const blockingOutcome =
    adversarial.outcome === "pass"
      ? passed
        ? "pass"
        : "fail"
      : adversarial.outcome;
  const score = passed
    ? 100
    : Math.max(
        0,
        70 -
          (input.sources.length - reachableCount) * 20 -
          (adversarial.result?.unsupportedCount ?? 1) * 15,
      );
  const verdict = passed
    ? `Pass. ${reachableCount}/${input.sources.length} source URLs are reachable and every checked claim is supported.`
    : `Hold. Required reliability checks did not all return an explicit pass.`;

  const review: LapdogReview = {
    provider: "Datadog Lapdog",
    mode: process.env.DD_TRACE_AGENT_URL ? "lapdog-traced" : "local-audit",
    outcome: blockingOutcome,
    passed,
    score,
    verdict,
    checks: [
      {
        name: "Source grounding",
        status: input.sources.length > 0 ? "pass" : "fail",
        comment:
          input.sources.length > 0
            ? `${input.sources.length} source receipt(s) supplied.`
            : "No source receipts were supplied.",
      },
      {
        name: "Source reachability",
        status: allReachable ? "pass" : "fail",
        comment: `${reachableCount}/${input.sources.length} source URLs returned an explicit success.`,
      },
      {
        name: "Adversarial claim verification",
        status: adversarial.outcome === "pass" ? "pass" : "fail",
        comment:
          adversarial.outcome === "pass"
            ? "Every checked claim is supported by captured source text."
            : `Claim verification ended as ${adversarial.outcome}.`,
      },
      {
        name: "Editorial approval",
        status: input.geminiDecision?.publishable ? "pass" : "fail",
        comment:
          input.geminiDecision?.reason ||
          "No explicit editorial pass was supplied.",
      },
    ],
    traceSummary: input.events.map(
      (event) => `${event.step}. ${event.source}: ${event.title}`,
    ),
    sourceReachability: reachability,
    adversarialReview: adversarial.result,
    errorCode: passed
      ? undefined
      : adversarial.outcome === "pass"
        ? "RELIABILITY_FAILED"
        : `ADVERSARIAL_${adversarial.outcome.toUpperCase()}`,
  };

  if (!process.env.DATADOG_LAPDOG_URL) return review;
  const scoped = combineSignal(input.signal, 6_000);
  try {
    const response = await fetch(process.env.DATADOG_LAPDOG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: scoped.signal,
      body: JSON.stringify({
        verdict: review.verdict,
        passed: review.passed,
        checks: review.checks,
      }),
    });
    if (!response.ok) throw new Error("Forwarder failed");
    return { ...review, mode: "configured-forwarder" };
  } catch {
    return {
      ...review,
      mode: "provider-error",
      outcome: scoped.signal.aborted ? "timed_out" : "error",
      passed: false,
      errorCode: "FORWARDER_ERROR",
    };
  } finally {
    scoped.cleanup();
  }
}
