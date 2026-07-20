import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const mentorResponseSchema = z
  .object({
    approved: z.boolean(),
    notes: z.string().trim().min(1).max(500),
  })
  .strict();

export type MentorResult = {
  provider: "Google Gemini (Mentor)";
  mode: "real-api" | "demo-no-publish" | "provider-error";
  purpose: string;
  outcome:
    | "pass"
    | "fail"
    | "unavailable"
    | "malformed"
    | "timed_out"
    | "error";
  approved: boolean;
  notes: string;
  errorCode?: string;
};

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function runMentorReview(params: {
  prose: string;
  headline: string;
  area: string;
  signal?: AbortSignal;
}): Promise<MentorResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      provider: "Google Gemini (Mentor)",
      mode: "demo-no-publish",
      purpose: "Mentor review is unavailable; demo mode cannot publish.",
      outcome: "unavailable",
      approved: false,
      notes: "Draft review is unavailable in demo mode.",
      errorCode: "MISSING_API_KEY",
    };
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new Error("Mentor review timed out")),
    10_000,
  );

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
      contents: `Review this civic brief for factual specificity, unsupported claims, resident usefulness, and editorializing. Return JSON only.\n\nHeadline: ${params.headline}\nArea: ${params.area}\nBrief: ${params.prose}`,
      config: {
        abortSignal: controller.signal,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["approved", "notes"],
          properties: {
            approved: { type: "boolean" },
            notes: { type: "string" },
          },
        },
      },
    });
    const parsed = mentorResponseSchema.safeParse(
      extractJson(response.text || ""),
    );
    if (!parsed.success) {
      return {
        provider: "Google Gemini (Mentor)",
        mode: "provider-error",
        purpose: "Mentor output failed strict validation; the draft was held.",
        outcome: "malformed",
        approved: false,
        notes: "Draft review response was invalid.",
        errorCode: "INVALID_MODEL_OUTPUT",
      };
    }
    return {
      provider: "Google Gemini (Mentor)",
      mode: "real-api",
      purpose: "Mentor completed a strictly validated draft review.",
      outcome: parsed.data.approved ? "pass" : "fail",
      approved: parsed.data.approved,
      notes: parsed.data.notes,
    };
  } catch {
    const timedOut = controller.signal.aborted;
    return {
      provider: "Google Gemini (Mentor)",
      mode: "provider-error",
      purpose: "Mentor review failed; the draft was held.",
      outcome: timedOut ? "timed_out" : "error",
      approved: false,
      notes: timedOut ? "Draft review timed out." : "Draft review failed.",
      errorCode: timedOut ? "TIMEOUT" : "PROVIDER_ERROR",
    };
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener("abort", forwardAbort);
  }
}
