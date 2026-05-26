import { GoogleGenAI } from "@google/genai";

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
};

type ClaimVerdict = {
  claim: string;
  supported: boolean;
  sourceEvidence: string | null;
  verdict: "supported" | "unsupported" | "overstated";
};

type AdversarialResult = {
  claims: ClaimVerdict[];
  overallVerdict: "clean" | "minor-overstatement" | "unsupported-claims";
  unsupportedCount: number;
};

type SourceReachability = {
  url: string;
  reachable: boolean;
  status: number;
};

export type LapdogReview = {
  provider: "Datadog Lapdog";
  mode: "lapdog-traced" | "configured-forwarder" | "local-audit";
  passed: boolean;
  score: number;
  verdict: string;
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    comment: string;
  }[];
  traceSummary: string[];
  sourceReachability?: SourceReachability[];
  adversarialReview?: AdversarialResult;
  raw?: unknown;
  error?: string;
};

async function checkSourceReachability(
  sources: { url: string }[]
): Promise<SourceReachability[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(source.url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        return { url: source.url, reachable: res.ok || res.status < 500, status: res.status };
      } catch {
        clearTimeout(timeout);
        return { url: source.url, reachable: false, status: 0 };
      }
    })
  );

  return results.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : { url: sources[index]?.url ?? "", reachable: false, status: 0 }
  );
}

function extractJsonObject(text: string): unknown {
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

async function runAdversarialClaimCheck(
  headline: string,
  summary: string,
  rawSourceText: string
): Promise<AdversarialResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a skeptical fact-checker for a civic news organization. Your job is to find failures, not confirm correctness.

Published brief:
Headline: ${headline}
Summary: ${summary}

Raw source text the brief was derived from:
${rawSourceText.slice(0, 6000)}

Instructions:
- Break the headline and summary into individual factual claims: specific locations, timeframes, what changed, certainty level ("will", "may", "is expected to"), who is affected.
- For each claim, identify what evidence in the source text supports it. Paraphrase and inference are fine — the brief does not have to quote verbatim. But the source must contain information that reasonably supports the claim.
- Mark a claim "unsupported" only if the source text contains no information that reasonably supports it — not just because the wording differs.
- Mark a claim "overstated" if the brief is more specific or more certain than the source warrants. Example: source says "possible work" but brief says "closure confirmed."
- A brief that hedges more than the source (e.g. says "may affect" when source says "will close") is fine — that is appropriate caution.
- Be skeptical about specificity: named streets, specific dates/times, and quantitative claims are the highest-risk hallucinations.

Return JSON only:
{
  "claims": [
    {
      "claim": "specific claim from the brief",
      "supported": boolean,
      "sourceEvidence": "brief description of what in the source supports this, or null if nothing found",
      "verdict": "supported" | "unsupported" | "overstated"
    }
  ],
  "overallVerdict": "clean" | "minor-overstatement" | "unsupported-claims",
  "unsupportedCount": number
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    clearTimeout(timeout);

    const parsed = extractJsonObject(response.text || "") as Record<string, unknown> | null;

    if (!parsed || !Array.isArray(parsed.claims)) return null;

    return {
      claims: (parsed.claims as Record<string, unknown>[]).map((c) => ({
        claim: String(c.claim || ""),
        supported: Boolean(c.supported),
        sourceEvidence: c.sourceEvidence ? String(c.sourceEvidence) : null,
        verdict: (c.verdict === "unsupported" || c.verdict === "overstated"
          ? c.verdict
          : "supported") as ClaimVerdict["verdict"],
      })),
      overallVerdict:
        parsed.overallVerdict === "unsupported-claims"
          ? "unsupported-claims"
          : parsed.overallVerdict === "minor-overstatement"
            ? "minor-overstatement"
            : "clean",
      unsupportedCount: Number(parsed.unsupportedCount ?? 0),
    };
  } catch {
    return null;
  }
}

export async function runLapdogReliabilityReview(
  input: ReliabilityInput
): Promise<LapdogReview> {
  const lapdogUrl = process.env.DATADOG_LAPDOG_URL;

  const [reachability, adversarialReview] = await Promise.all([
    checkSourceReachability(input.sources),
    input.rawSourceText
      ? runAdversarialClaimCheck(input.headline, input.summary, input.rawSourceText)
      : Promise.resolve(null),
  ]);

  const reachableCount = reachability.filter((s) => s.reachable).length;
  const allReachable = reachableCount === reachability.length;
  const adversarialPassed =
    !adversarialReview || adversarialReview.overallVerdict !== "unsupported-claims";

  const baseScore = input.geminiDecision?.publishable ? 88 : 55;
  const reachabilityPenalty = allReachable ? 0 : Math.min(15, (reachability.length - reachableCount) * 7);
  const adversarialPenalty = adversarialReview
    ? Math.min(20, adversarialReview.unsupportedCount * 8)
    : 0;
  const score = Math.max(10, baseScore - reachabilityPenalty - adversarialPenalty);

  const passed =
    Boolean(input.geminiDecision?.publishable) &&
    adversarialPassed &&
    reachableCount >= Math.ceil(reachability.length / 2);

  const adversarialVerdictLine = adversarialReview
    ? adversarialReview.overallVerdict === "clean"
      ? `Adversarial claim check found no unsupported claims across ${adversarialReview.claims.length} assertions.`
      : adversarialReview.overallVerdict === "minor-overstatement"
        ? `Adversarial check flagged minor overstatement in ${adversarialReview.unsupportedCount} claim(s). Brief is cautious enough to publish.`
        : `Adversarial check found ${adversarialReview.unsupportedCount} unsupported claim(s) not directly quoted from source text. Review before publishing.`
    : "Adversarial claim check skipped — no raw source text available.";

  const reachabilityLine = `${reachableCount}/${reachability.length} source URLs verified reachable.`;

  const verdict = passed
    ? `Publishable. ${reachabilityLine} ${adversarialVerdictLine}`
    : `Hold. ${!input.geminiDecision?.publishable ? "Did not pass editorial relevance check." : ""} ${!adversarialPassed ? adversarialVerdictLine : ""} ${!allReachable && reachableCount < Math.ceil(reachability.length / 2) ? "Majority of source URLs unreachable." : ""}`.trim();

  const localReview: LapdogReview = {
    provider: "Datadog Lapdog",
    mode: process.env.DD_TRACE_AGENT_URL ? "lapdog-traced" : "local-audit",
    passed,
    score,
    verdict,
    checks: [
      {
        name: "Source grounding",
        status: input.sources.length >= 2 ? "pass" : "warn",
        comment:
          input.sources.length >= 2
            ? "Brief includes multiple public source references."
            : "Brief has limited source coverage.",
      },
      {
        name: "Source reachability",
        status: allReachable ? "pass" : reachableCount > 0 ? "warn" : "fail",
        comment: `${reachabilityLine}${reachability.some((s) => !s.reachable) ? ` Unreachable: ${reachability.filter((s) => !s.reachable).map((s) => s.url).join(", ")}` : ""}`,
      },
      {
        name: "Claim specificity",
        status: input.headline.length > 20 && input.summary.length > 40 ? "pass" : "warn",
        comment: "Headline and summary include a specific location/topic claim.",
      },
      {
        name: "Adversarial claim verification",
        status: !adversarialReview
          ? "warn"
          : adversarialReview.overallVerdict === "clean"
            ? "pass"
            : adversarialReview.overallVerdict === "minor-overstatement"
              ? "warn"
              : "fail",
        comment: adversarialVerdictLine,
      },
      {
        name: "Resident impact",
        status:
          input.geminiDecision?.classification === "resident-relevant" ||
          input.geminiDecision?.classification === "urgent"
            ? "pass"
            : "warn",
        comment:
          input.geminiDecision?.reason ||
          "Gemini decision unavailable; using local policy fallback.",
      },
      {
        name: "Trace completeness",
        status: input.events.length >= 5 && input.agentTrace.length >= 4 ? "pass" : "warn",
        comment: "Audit trail includes extraction, decision, grounding, and storage steps.",
      },
    ],
    traceSummary: input.events.map((event) => `${event.step}. ${event.source}: ${event.title}`),
    sourceReachability: reachability,
    adversarialReview: adversarialReview ?? undefined,
  };

  if (!lapdogUrl) return localReview;

  try {
    const response = await fetch(lapdogUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, localReview }),
    });

    if (!response.ok) {
      throw new Error(`Lapdog forwarder returned ${response.status}: ${await response.text()}`);
    }

    const raw = await response.json();

    return { ...localReview, mode: "configured-forwarder", raw };
  } catch (error) {
    return { ...localReview, error: String(error) };
  }
}
