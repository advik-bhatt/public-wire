import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LocalChange } from "@/lib/public-wire-data";

const decisionSchema = z
  .object({
    publishable: z.boolean(),
    classification: z.enum([
      "resident-relevant",
      "routine",
      "unsupported",
      "urgent",
    ]),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type GoogleEditorialResult = {
  provider: "Google Gemini";
  mode: "real-api" | "demo-no-publish" | "provider-error";
  purpose: string;
  reviewOutcome:
    | "pass"
    | "fail"
    | "unavailable"
    | "malformed"
    | "timed_out"
    | "error";
  decision: z.infer<typeof decisionSchema>;
  errorCode?: string;
};

function safeDecision(reason: string): GoogleEditorialResult["decision"] {
  return { publishable: false, classification: "unsupported", reason };
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

export async function googleEditorialDecision(params: {
  area: string;
  change: LocalChange | undefined;
  signal?: AbortSignal;
}): Promise<GoogleEditorialResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!params.change) {
    return {
      provider: "Google Gemini",
      mode: "demo-no-publish",
      purpose: "No candidate was available for editorial review.",
      reviewOutcome: "unavailable",
      decision: safeDecision("No candidate was available for review."),
      errorCode: "NO_CANDIDATE",
    };
  }

  if (!apiKey) {
    return {
      provider: "Google Gemini",
      mode: "demo-no-publish",
      purpose:
        "Gemini is unavailable; demo mode cannot approve external publication.",
      reviewOutcome: "unavailable",
      decision: safeDecision("Editorial review is unavailable in demo mode."),
      errorCode: "MISSING_API_KEY",
    };
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new Error("Editorial review timed out")),
    10_000,
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
      contents: `You are PublicWire's editorial classifier. Use only the candidate below. Hold routine, speculative, unsupported, non-local, or private-person claims. Return the requested JSON object only.\n\nArea: ${params.area}\nTitle: ${params.change.title}\nCategory: ${params.change.category}\nWhat changed: ${params.change.whatChanged}\nWhy it matters: ${params.change.whyItMatters}\nEvidence notes: ${params.change.evidence.join("; ")}\nAffected groups: ${params.change.whoIsAffected.join(", ")}`,
      config: {
        abortSignal: controller.signal,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["publishable", "classification", "reason"],
          properties: {
            publishable: { type: "boolean" },
            classification: {
              type: "string",
              enum: ["resident-relevant", "routine", "unsupported", "urgent"],
            },
            reason: { type: "string" },
          },
        },
      },
    });

    const parsed = decisionSchema.safeParse(parseJson(response.text || ""));
    if (!parsed.success) {
      return {
        provider: "Google Gemini",
        mode: "provider-error",
        purpose:
          "Gemini returned an invalid editorial response; the candidate was held.",
        reviewOutcome: "malformed",
        decision: safeDecision("Editorial response failed strict validation."),
        errorCode: "INVALID_MODEL_OUTPUT",
      };
    }

    return {
      provider: "Google Gemini",
      mode: "real-api",
      purpose: "Gemini returned a strictly validated editorial classification.",
      reviewOutcome: parsed.data.publishable ? "pass" : "fail",
      decision: parsed.data,
    };
  } catch {
    const timedOut = controller.signal.aborted;
    return {
      provider: "Google Gemini",
      mode: "provider-error",
      purpose: "Editorial review failed; the candidate was held.",
      reviewOutcome: timedOut ? "timed_out" : "error",
      decision: safeDecision(
        timedOut ? "Editorial review timed out." : "Editorial review failed.",
      ),
      errorCode: timedOut ? "TIMEOUT" : "PROVIDER_ERROR",
    };
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener("abort", forwardAbort);
  }
}
