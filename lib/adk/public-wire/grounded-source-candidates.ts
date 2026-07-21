import "server-only";

type GroundingMetadataLike = {
  groundingChunks?: Array<{ web?: { uri?: string } }>;
};

function normalizedHttpsUrl(value: string) {
  const cleaned = value.replace(/[),.;!?]+$/g, "");
  try {
    const url = new URL(cleaned);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function collectGroundedSourceCandidates(params: {
  groundingMetadata?: GroundingMetadataLike;
  renderedText?: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(20, params.limit ?? 20));
  const candidates = new Set<string>();
  for (const chunk of params.groundingMetadata?.groundingChunks ?? []) {
    const url = chunk.web?.uri ? normalizedHttpsUrl(chunk.web.uri) : undefined;
    if (url) candidates.add(url);
  }
  for (const match of params.renderedText?.match(/https:\/\/[^\s<>{}\[\]"']+/g) ?? []) {
    const url = normalizedHttpsUrl(match);
    if (url) candidates.add(url);
  }
  return [...candidates].slice(0, limit);
}
