import { GoogleGenAI } from "@google/genai";

export type MentorResult = {
  provider: "Google Gemini (Mentor)";
  mode: "real-api" | "seeded-demo" | "api-error-fallback";
  purpose: string;
  approved: boolean;
  notes: string;
  error?: string;
};

function extractJson(text: string): { approved: boolean; notes: string } | null {
  const cleaned = text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function runMentorReview(params: {
  prose: string;
  headline: string;
  area: string;
}): Promise<MentorResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      provider: "Google Gemini (Mentor)",
      mode: "seeded-demo",
      purpose: "Gemini API key missing. Mentor auto-approves in demo mode.",
      approved: true,
      notes: "Auto-approved: no Gemini key configured.",
    };
  }

  const prompt = `You are the Mentor agent for PublicWire, an autonomous civic newsroom. Your role is editorial quality control before publication.

Review this civic brief for publication readiness:
Headline: ${params.headline}
Area: ${params.area}
Brief: ${params.prose}

Evaluate:
1. Is it factually specific (not vague or generic)?
2. Does it avoid unsupported claims or speculation?
3. Is it useful to a resident of ${params.area}?
4. Is it free of editorializing or opinion?

Return JSON only, no other text:
{"approved": true or false, "notes": "one sentence of editorial feedback"}`;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const parsed = extractJson(response.text || "");
    if (parsed) {
      return {
        provider: "Google Gemini (Mentor)",
        mode: "real-api",
        purpose: "Mentor agent reviewed the written brief for accuracy, specificity, and resident value.",
        approved: Boolean(parsed.approved),
        notes: String(parsed.notes || "Brief passed editorial review."),
      };
    }

    return {
      provider: "Google Gemini (Mentor)",
      mode: "real-api",
      purpose: "Mentor agent reviewed the brief; response was not parseable, defaulting to approved.",
      approved: true,
      notes: "Brief approved (parse fallback).",
    };
  } catch (error) {
    return {
      provider: "Google Gemini (Mentor)",
      mode: "api-error-fallback",
      purpose: "Mentor review failed. Auto-approving to avoid blocking publication.",
      approved: true,
      notes: "Auto-approved: mentor error fallback.",
      error: String(error),
    };
  }
}
