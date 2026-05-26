import Nimble from "@nimble-way/nimble-js";
import { GoogleGenAI } from "@google/genai";
import type { LocalChange, LocalSource } from "@/lib/public-wire-data";

type NimbleCivicResult = {
  provider: "Nimble";
  mode: "real-api" | "seeded-demo" | "api-error-fallback";
  purpose: string;
  sources: LocalSource[];
  changes: LocalChange[];
  raw?: unknown;
  error?: string;
};

const GEMINI_TIMEOUT_MS = 12000;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 80);
}

function isNewBrunswick(area: string) {
  return /new\s+brunswick/i.test(area);
}

function textFromResult(raw: unknown) {
  try {
    return JSON.stringify(raw, null, 2).slice(0, 12000);
  } catch {
    return String(raw).slice(0, 12000);
  }
}

function sourceCategory(input: unknown): LocalSource["category"] {
  const value = String(input || "").toLowerCase();

  if (value.includes("transit") || value.includes("road") || value.includes("traffic")) {
    return "transportation";
  }

  if (value.includes("school")) return "school";
  if (value.includes("event")) return "event";
  if (value.includes("permit") || value.includes("planning") || value.includes("development")) {
    return "permit";
  }

  return "city";
}

function changeCategory(input: unknown): LocalChange["category"] {
  const value = String(input || "").toLowerCase();

  if (value.includes("construction")) return "construction";
  if (value.includes("transport") || value.includes("road") || value.includes("traffic")) {
    return "transportation";
  }

  if (value.includes("school")) return "school";
  if (value.includes("event")) return "event";
  return "city-agenda";
}

function importance(input: unknown): LocalChange["importance"] {
  const value = String(input || "").toLowerCase();

  if (value.includes("urgent")) return "urgent";
  if (value.includes("routine")) return "routine";
  if (value.includes("unsupported")) return "unsupported";

  return "resident-relevant";
}

function status(input: unknown): LocalChange["status"] {
  const value = String(input || "").toLowerCase();

  if (value.includes("rejected")) return "rejected";
  if (value.includes("updated")) return "updated";

  return "new";
}

function extractJsonObject(text: string) {
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

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

function buildLiveSearchSource(area: string, raw: unknown): LocalSource {
  const rawText = textFromResult(raw);

  return {
    id: "nimble_live_search",
    name: `Nimble live civic web search for ${area} (${rawText.length} chars extracted)`,
    url: "Nimble Search API result",
    category: "city",
    sourceType: "public",
  };
}

// Tries to use Nimble's output_schema response directly before falling back to Gemini.
// Nimble returns structured data when the API honors output_schema; this makes it the
// actual extraction primitive rather than just a search bar.
function tryParseNimbleStructured(
  raw: unknown,
  area: string
): { sources: LocalSource[]; changes: LocalChange[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (!Array.isArray(r.sources) || !Array.isArray(r.changes)) return null;
  if (r.sources.length === 0 && r.changes.length === 0) return null;

  const sources: LocalSource[] = (r.sources as any[]).slice(0, 8).map((source, index) => ({
    id: slugify(source.id || source.name || `source_${index + 1}`) || `source_${index + 1}`,
    name: String(source.name || `Public source for ${area}`).slice(0, 140),
    url: String(source.url || "Nimble Search API result").slice(0, 300),
    category: sourceCategory(source.category),
    sourceType: source.sourceType === "official" ? "official" : "public",
  }));

  if (sources.length === 0) return null;

  const sourceIds = new Set(sources.map((s) => s.id));
  const defaultSourceId = sources[0].id;

  const changes: LocalChange[] = (r.changes as any[])
    .slice(0, 5)
    .map((change, index) => {
      const rawSourceId = slugify(change.sourceId || "");
      const sourceId = sourceIds.has(rawSourceId) ? rawSourceId : defaultSourceId;
      return {
        id: slugify(change.id || change.title || `change_${index + 1}`) || `change_${index + 1}`,
        sourceId,
        title: String(change.title || `Civic update for ${area}`).slice(0, 180),
        category: changeCategory(change.category),
        status: status(change.status),
        importance: importance(change.importance),
        whatChanged: String(change.whatChanged || "").slice(0, 500),
        whyItMatters: String(change.whyItMatters || "").slice(0, 500),
        whoIsAffected: Array.isArray(change.whoIsAffected)
          ? change.whoIsAffected.map((item: unknown) => String(item).slice(0, 80)).slice(0, 8)
          : ["residents"],
        evidence: Array.isArray(change.evidence)
          ? change.evidence.map((item: unknown) => String(item).slice(0, 300)).slice(0, 6)
          : ["Extracted via Nimble output_schema structured extraction."],
        rejectionReason: change.rejectionReason ? String(change.rejectionReason).slice(0, 300) : undefined,
      };
    })
    .filter((c) => c.whatChanged && c.whyItMatters);

  return { sources, changes };
}

async function extractChangesWithGemini(params: {
  area: string;
  requestedTopic?: string;
  raw: unknown;
}): Promise<{ sources: LocalSource[]; changes: LocalChange[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const rawText = textFromResult(params.raw);

  if (!apiKey) {
    return {
      sources: [buildLiveSearchSource(params.area, params.raw)],
      changes: [],
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are the civic extraction layer for PublicWire.

Area: ${params.area}
Requested topic: ${params.requestedTopic || "general local civic scan"}

Nimble search evidence:
${rawText}

Extract only source-backed civic updates for the named area.

Rules:
- Use only the evidence above.
- Do not import examples from New Brunswick, Rutgers, George Street, or any other place unless the evidence says they apply to the named area.
- If the evidence does not support a publishable local update, return an empty changes array.
- Official/public civic surfaces include municipal notices, agendas, road work, public works, transit, school notices, permits, utility notices, public events, and agency alerts.
- Reject rumors, private-person claims, unsupported crime claims, opinion, and vague claims.
- Output JSON only.

Return:
{
  "sources": [
    {
      "id": "short_source_id",
      "name": "source name",
      "url": "source URL or Nimble Search API result",
      "category": "city | transportation | school | event | permit",
      "sourceType": "official | public"
    }
  ],
  "changes": [
    {
      "id": "short_change_id",
      "sourceId": "matching source id",
      "title": "resident-facing headline",
      "category": "transportation | city-agenda | event | school | construction",
      "status": "new | updated | rejected",
      "importance": "urgent | resident-relevant | routine | unsupported",
      "whatChanged": "specific supported change",
      "whyItMatters": "resident impact",
      "whoIsAffected": ["group 1", "group 2"],
      "evidence": ["specific evidence string 1", "specific evidence string 2"],
      "rejectionReason": "only if rejected"
    }
  ]
}
`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    }),
    GEMINI_TIMEOUT_MS,
    "Gemini civic extraction"
  );

  const parsed = extractJsonObject(response.text || "");
  const sourceRows = Array.isArray(parsed?.sources) ? parsed.sources : [];
  const changeRows = Array.isArray(parsed?.changes) ? parsed.changes : [];

  const fallbackSource = buildLiveSearchSource(params.area, params.raw);

  const sources: LocalSource[] = sourceRows.slice(0, 8).map((source: any, index: number) => ({
    id: slugify(source.id || source.name || `source_${index + 1}`) || `source_${index + 1}`,
    name: String(source.name || `Public source for ${params.area}`).slice(0, 140),
    url: String(source.url || "Nimble Search API result").slice(0, 300),
    category: sourceCategory(source.category),
    sourceType: source.sourceType === "official" ? "official" : "public",
  }));

  const sourceIds = new Set(sources.map((source) => source.id));
  const defaultSourceId = sources[0]?.id || fallbackSource.id;

  const changes: LocalChange[] = changeRows.slice(0, 5).map((change: any, index: number) => {
    const rawSourceId = slugify(change.sourceId || "");
    const sourceId = sourceIds.has(rawSourceId) ? rawSourceId : defaultSourceId;

    return {
      id: slugify(change.id || change.title || `change_${index + 1}`) || `change_${index + 1}`,
      sourceId,
      title: String(change.title || `Civic update found for ${params.area}`).slice(0, 180),
      category: changeCategory(change.category),
      status: status(change.status),
      importance: importance(change.importance),
      whatChanged: String(change.whatChanged || "").slice(0, 500),
      whyItMatters: String(change.whyItMatters || "").slice(0, 500),
      whoIsAffected: Array.isArray(change.whoIsAffected)
        ? change.whoIsAffected.map((item: unknown) => String(item).slice(0, 80)).slice(0, 8)
        : ["residents"],
      evidence: Array.isArray(change.evidence)
        ? change.evidence.map((item: unknown) => String(item).slice(0, 300)).slice(0, 6)
        : ["Extracted from Nimble search evidence."],
      rejectionReason: change.rejectionReason ? String(change.rejectionReason).slice(0, 300) : undefined,
    };
  });

  return {
    sources: sources.length ? sources : [fallbackSource],
    changes: changes.filter((change) => change.whatChanged && change.whyItMatters),
  };
}

export async function nimbleRunCivicScan(params: {
  area: string;
  requestedTopic?: string;
  fallbackSources: LocalSource[];
  fallbackChanges: LocalChange[];
}): Promise<NimbleCivicResult> {
  const apiKey = process.env.NIMBLE_API_KEY;

  if (!apiKey) {
    const allowSeededFallback = isNewBrunswick(params.area) && !params.requestedTopic;

    return {
      provider: "Nimble",
      mode: "seeded-demo",
      purpose: allowSeededFallback
        ? "Nimble API key missing. Using seeded New Brunswick civic data."
        : "Nimble API key missing. No live searched-township evidence available.",
      sources: allowSeededFallback ? params.fallbackSources : [],
      changes: allowSeededFallback ? params.fallbackChanges : [],
    };
  }

  try {
    const nimble = new Nimble({ apiKey });
    const requestedTopic = params.requestedTopic?.trim();

    // output_schema instructs Nimble to return structured civic data directly,
    // treating it as an extraction primitive rather than a plain search bar.
    const nimbleCivicSchema = {
      type: "object",
      properties: {
        sources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              url: { type: "string" },
              category: { type: "string", enum: ["city", "transportation", "school", "event", "permit"] },
              sourceType: { type: "string", enum: ["official", "public"] },
            },
          },
        },
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              sourceId: { type: "string" },
              title: { type: "string" },
              category: { type: "string", enum: ["transportation", "city-agenda", "event", "school", "construction"] },
              status: { type: "string", enum: ["new", "updated", "rejected"] },
              importance: { type: "string", enum: ["urgent", "resident-relevant", "routine", "unsupported"] },
              whatChanged: { type: "string" },
              whyItMatters: { type: "string" },
              whoIsAffected: { type: "array", items: { type: "string" } },
              evidence: { type: "array", items: { type: "string" } },
              rejectionReason: { type: "string" },
            },
          },
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (nimble.search as any)({
      query: requestedTopic
        ? `For ${params.area}, investigate this local civic topic or claim: "${requestedTopic}". Find official or public sources that support, contradict, or fail to corroborate it. Prioritize township notices, municipal pages, construction, road closures, public works, transit alerts, parking authority updates, school notices, permits, utility notices, council agendas, agency pages, and local public records. Exclude private-person claims, unsupported crime claims, opinion, and speculation.`
        : `For ${params.area}, find official or public civic sources and recent resident-relevant updates. Prioritize township notices, municipal pages, construction, road closures, public works, transit alerts, parking authority updates, school notices, permits, utility notices, and council agendas. Exclude rumors, private-person claims, unsupported crime claims, and opinion.`,
      focus: "general",
      search_depth: "lite",
      output_schema: nimbleCivicSchema,
    });

    const nimbleStructured = tryParseNimbleStructured(result, params.area);

    if (nimbleStructured) {
      return {
        provider: "Nimble",
        mode: "real-api",
        purpose: requestedTopic
          ? "Nimble output_schema structured extraction for requested-topic civic investigation."
          : "Nimble output_schema structured extraction for civic source discovery.",
        sources: nimbleStructured.sources,
        changes: nimbleStructured.changes,
        raw: result,
      };
    }

    // Nimble returned unstructured text — Gemini parses it as the extraction fallback.
    const extracted = await extractChangesWithGemini({
      area: params.area,
      requestedTopic,
      raw: result,
    });

    return {
      provider: "Nimble",
      mode: "real-api",
      purpose: requestedTopic
        ? "Nimble search + Gemini extraction for requested-topic civic investigation."
        : "Nimble search + Gemini extraction for civic source discovery.",
      sources: extracted.sources,
      changes: extracted.changes,
      raw: result,
    };
  } catch (error) {
    const allowSeededFallback = isNewBrunswick(params.area) && !params.requestedTopic;

    return {
      provider: "Nimble",
      mode: "api-error-fallback",
      purpose: allowSeededFallback
        ? "Live civic scan failed. Using seeded New Brunswick civic data."
        : "Live civic scan failed. No searched-township evidence was converted into a publishable brief.",
      sources: allowSeededFallback ? params.fallbackSources : [],
      changes: allowSeededFallback ? params.fallbackChanges : [],
      error: String(error),
    };
  }
}
