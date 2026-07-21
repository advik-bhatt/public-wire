import "server-only";

import { GOOGLE_SEARCH, LlmAgent, type Gemini } from "@google/adk";

export function createGroundedSourceDiscoveryAgent(model: Gemini) {
  return new LlmAgent({
    name: "public_wire_grounded_source_discovery",
    description:
      "Finds current official civic source candidates with Google Search Grounding.",
    model,
    includeContents: "none",
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    tools: [GOOGLE_SEARCH],
    generateContentConfig: { temperature: 0 },
    instruction: `Find current official or first party civic web pages that can support, limit, or contradict the supplied local claim. Prefer municipal agencies, public authorities, transit agencies, and official service guidance. Search results are discovery leads only, not evidence. Do not state that a claim is verified. Return a concise source finding with citations supplied by Google Search Grounding.`,
  });
}
