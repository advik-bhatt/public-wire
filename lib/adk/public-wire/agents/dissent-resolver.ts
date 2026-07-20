import "server-only";

import { LlmAgent, type Gemini } from "@google/adk";
import { z } from "zod";
import { instructionStateJson } from "./instruction-state";

const uuid = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const dissentResolverOutputSchema = z
  .object({
    conflictFingerprint: digest,
    proposedOutcome: z.enum([
      "resolved_supported",
      "scoped_difference",
      "unresolved_material",
    ]),
    basisCode: z.enum([
      "SAME_FACT_DIFFERENT_SCOPE",
      "SUPERSEDED_SOURCE_VERSION",
      "UNEQUAL_AUTHORITY",
      "EQUAL_AUTHORITY_CONFLICT",
      "INSUFFICIENT_METADATA",
    ]),
    supportingEvidenceLinkIds: z.array(uuid).max(50),
    limitingEvidenceLinkIds: z.array(uuid).min(1).max(50),
    scopeNote: z.string().trim().min(1).max(400),
  })
  .strict();

export type DissentResolverOutput = z.infer<typeof dissentResolverOutputSchema>;

export function createDissentResolverAgent(model: Gemini) {
  return new LlmAgent({
    name: "public_wire_dissent_resolver",
    description:
      "Proposes a bounded disposition for one persisted evidence conflict.",
    model,
    includeContents: "none",
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    outputSchema: dissentResolverOutputSchema,
    outputKey: "pw_dissent_resolution",
    generateContentConfig: { temperature: 0 },
    instruction: (
      context,
    ) => `Review exactly one persisted conflict from the structured state below. Evidence authority, dates, scope, and fingerprints are application-supplied facts; never infer or alter them. Do not vote, publish, call tools, or mark unsupported evidence supported. Equal-authority evidence that conflicts over the same scope and effective period must remain unresolved_material. Return only the schema.

PERSISTED CONFLICT:
${instructionStateJson(context, "pw_dissent_conflict")}`,
  });
}
