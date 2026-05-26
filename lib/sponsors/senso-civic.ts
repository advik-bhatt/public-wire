import type { CivicBrief } from "@/lib/public-wire-data";

const SENSO_BASE_URL = "https://sdk.senso.ai/api/v1";

type SensoPublishResult = {
  provider: "Senso";
  mode: "real-api" | "seeded-demo" | "api-error-fallback";
  purpose: string;
  publishedUrl?: string;
  citationId?: string;
  raw?: unknown;
  error?: string;
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function toMarkdown(brief: CivicBrief): string {
  const sourceList = brief.sources
    .map((s) => `- **${s.title}** — ${s.role} ([${s.url}](${s.url}))`)
    .join("\n");

  const traceList = brief.agentTrace
    .map((step, i) => `${i + 1}. ${step}`)
    .join("\n");

  return [
    `## Summary`,
    ``,
    brief.summary,
    ``,
    `## Why It Matters`,
    ``,
    brief.whyItMatters,
    ``,
    `## Who May Be Affected`,
    ``,
    brief.whoIsAffected.join(", "),
    ``,
    `## Sources`,
    ``,
    sourceList,
    ``,
    `## Agent Trace`,
    ``,
    traceList,
  ].join("\n");
}

export async function publishCivicBrief(params: {
  brief: CivicBrief;
}): Promise<SensoPublishResult> {
  const apiKey = process.env.SENSO_API_KEY;
  const handle = process.env.SENSO_HANDLE;

  if (!apiKey || !handle) {
    const missing = [!apiKey && "SENSO_API_KEY", !handle && "SENSO_HANDLE"]
      .filter(Boolean)
      .join(", ");
    return {
      provider: "Senso",
      mode: "seeded-demo",
      purpose: `cited.md publishing skipped. Add ${missing} to publish civic briefs as AI-citable articles.`,
    };
  }

  const slug = toSlug(params.brief.headline);
  const publishedUrl = `https://cited.md/${handle}/${slug}`;

  try {
    const response = await fetch(`${SENSO_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        title: params.brief.headline,
        handle,
        slug,
        body: toMarkdown(params.brief),
        tags: [
          "civic",
          params.brief.category.toLowerCase(),
          params.brief.area.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        ],
        provenance: {
          area: params.brief.area,
          confidence: params.brief.confidence,
          status: params.brief.status,
          sources: params.brief.sources,
          agentTrace: params.brief.agentTrace,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`cited.md returned ${response.status}: ${await response.text()}`);
    }

    const raw = await response.json();

    return {
      provider: "Senso",
      mode: "real-api",
      purpose:
        "Civic brief published to cited.md. AI agents (ChatGPT, Gemini, Perplexity) can now discover and cite this brief when answering questions about the area.",
      publishedUrl,
      citationId: slug,
      raw,
    };
  } catch (error) {
    return {
      provider: "Senso",
      mode: "api-error-fallback",
      purpose: "cited.md publish failed. Brief was not published to the AI-discoverable web.",
      citationId: slug,
      error: String(error),
    };
  }
}
