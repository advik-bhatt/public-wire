import { GoogleGenAI } from "@google/genai";
import type { LocalChange, LocalSource } from "@/lib/public-wire-data";

export type WriterResult = {
  provider: "Google Gemini (Writer)";
  mode: "real-api" | "seeded-demo" | "api-error-fallback";
  purpose: string;
  prose: string;
  error?: string;
};

export async function runWriterAgent(params: {
  change: LocalChange;
  sources: LocalSource[];
  area: string;
}): Promise<WriterResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      provider: "Google Gemini (Writer)",
      mode: "seeded-demo",
      purpose: "Gemini API key missing. Using raw change text as prose.",
      prose: params.change.whatChanged,
    };
  }

  const sourceNames = params.sources
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");

  const prompt = `You are the Writer agent for PublicWire, an autonomous civic newsroom.

Area: ${params.area}
Sources consulted: ${sourceNames}
Approved civic change:
- Headline: ${params.change.title}
- What changed: ${params.change.whatChanged}
- Why it matters: ${params.change.whyItMatters}
- Who is affected: ${params.change.whoIsAffected.join(", ")}

Write a 2-3 sentence resident-facing civic brief. Be factual, specific, and plain-language. Do not editorialize. Do not invent details not listed above. Return plain text only, no markdown, no headers.`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
      provider: "Google Gemini (Writer)",
      mode: "real-api",
      purpose: "Writer agent produced a polished resident-facing brief from the approved civic change.",
      prose: (response.text || params.change.whatChanged).trim(),
    };
  } catch (error) {
    return {
      provider: "Google Gemini (Writer)",
      mode: "api-error-fallback",
      purpose: "Writer agent failed. Using raw change text as prose.",
      prose: params.change.whatChanged,
      error: String(error),
    };
  }
}
