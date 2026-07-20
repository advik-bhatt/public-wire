import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { LocalChange, LocalSource } from "@/lib/public-wire-data";

export type WriterResult = {
  provider: "Google Gemini (Writer)";
  mode: "real-api" | "demo-no-publish" | "provider-error";
  purpose: string;
  outcome: "pass" | "unavailable" | "timed_out" | "error";
  prose?: string;
  errorCode?: string;
};

export async function runWriterAgent(params: {
  change: LocalChange;
  sources: LocalSource[];
  area: string;
  signal?: AbortSignal;
}): Promise<WriterResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      provider: "Google Gemini (Writer)",
      mode: "demo-no-publish",
      purpose:
        "Writer is unavailable; demo content remains explicitly unpublished.",
      outcome: "unavailable",
      errorCode: "MISSING_API_KEY",
    };
  }

  const controller = new AbortController();
  const forwardAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new Error("Writer timed out")),
    10_000,
  );
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
      contents: `Write a 2-3 sentence factual civic brief using only the approved fields below. Do not invent details. Return plain text.\n\nArea: ${params.area}\nSources: ${params.sources
        .slice(0, 3)
        .map((source) => source.name)
        .join(
          ", ",
        )}\nHeadline: ${params.change.title}\nWhat changed: ${params.change.whatChanged}\nWhy it matters: ${params.change.whyItMatters}\nWho is affected: ${params.change.whoIsAffected.join(", ")}`,
      config: { abortSignal: controller.signal },
    });
    const prose = response.text?.trim();
    if (!prose || prose.length > 2_000)
      throw new Error("Writer returned invalid prose");
    return {
      provider: "Google Gemini (Writer)",
      mode: "real-api",
      purpose: "Writer drafted prose from approved fields only.",
      outcome: "pass",
      prose,
    };
  } catch {
    const timedOut = controller.signal.aborted;
    return {
      provider: "Google Gemini (Writer)",
      mode: "provider-error",
      purpose: "Writer failed; no draft is eligible for publication.",
      outcome: timedOut ? "timed_out" : "error",
      errorCode: timedOut ? "TIMEOUT" : "PROVIDER_ERROR",
    };
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener("abort", forwardAbort);
  }
}
