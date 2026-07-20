import "server-only";

import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const integerString = (minimum: number, maximum: number) =>
  z.coerce.number().int().min(minimum).max(maximum);

const configSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PUBLIC_WIRE_AI_MODE: z.enum(["legacy", "shadow", "adk"]).default("shadow"),
    PUBLIC_WIRE_ADK_SHADOW_PUBLISH: booleanString.default(false),
    PUBLIC_WIRE_ADK_MODEL: z
      .string()
      .min(1)
      .max(120)
      .default("gemini-2.5-flash"),
    PUBLIC_WIRE_ADK_MAX_EVIDENCE_ITERATIONS: integerString(0, 2).default(2),
    PUBLIC_WIRE_ADK_MAX_DRAFT_REVISIONS: integerString(0, 1).default(1),
    PUBLIC_WIRE_ADK_MAX_MODEL_CALLS: integerString(1, 50).default(12),
    PUBLIC_WIRE_ADK_MAX_TOOL_CALLS: integerString(1, 100).default(24),
    PUBLIC_WIRE_ADK_TIMEOUT_MS: integerString(5_000, 300_000).default(45_000),
    PUBLIC_WIRE_PROMPT_VERSION: z
      .string()
      .min(1)
      .max(80)
      .default("2026-07-19.1"),
    PUBLIC_WIRE_SCHEMA_VERSION: z.string().min(1).max(40).default("1"),
    PUBLIC_WIRE_POLICY_VERSION: z
      .string()
      .min(1)
      .max(80)
      .default("2026-07-19.1"),
    PUBLIC_WIRE_PUBLICATION_ENABLED: booleanString.default(false),
    PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH: booleanString.default(true),
    GEMINI_API_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().url().optional(),
    PUBLIC_WIRE_ARTIFACT_DIR: z
      .string()
      .min(1)
      .default(".data/public-wire-artifacts"),
  })
  .strict();

export type PublicWireAdkConfig = ReturnType<typeof loadAdkConfig>;

export function loadAdkConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.parse({
    NODE_ENV: env.NODE_ENV,
    PUBLIC_WIRE_AI_MODE: env.PUBLIC_WIRE_AI_MODE,
    PUBLIC_WIRE_ADK_SHADOW_PUBLISH: env.PUBLIC_WIRE_ADK_SHADOW_PUBLISH,
    PUBLIC_WIRE_ADK_MODEL: env.PUBLIC_WIRE_ADK_MODEL,
    PUBLIC_WIRE_ADK_MAX_EVIDENCE_ITERATIONS:
      env.PUBLIC_WIRE_ADK_MAX_EVIDENCE_ITERATIONS,
    PUBLIC_WIRE_ADK_MAX_DRAFT_REVISIONS:
      env.PUBLIC_WIRE_ADK_MAX_DRAFT_REVISIONS,
    PUBLIC_WIRE_ADK_MAX_MODEL_CALLS: env.PUBLIC_WIRE_ADK_MAX_MODEL_CALLS,
    PUBLIC_WIRE_ADK_MAX_TOOL_CALLS: env.PUBLIC_WIRE_ADK_MAX_TOOL_CALLS,
    PUBLIC_WIRE_ADK_TIMEOUT_MS: env.PUBLIC_WIRE_ADK_TIMEOUT_MS,
    PUBLIC_WIRE_PROMPT_VERSION: env.PUBLIC_WIRE_PROMPT_VERSION,
    PUBLIC_WIRE_SCHEMA_VERSION: env.PUBLIC_WIRE_SCHEMA_VERSION,
    PUBLIC_WIRE_POLICY_VERSION: env.PUBLIC_WIRE_POLICY_VERSION,
    PUBLIC_WIRE_PUBLICATION_ENABLED: env.PUBLIC_WIRE_PUBLICATION_ENABLED,
    PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH:
      env.PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    DATABASE_URL: env.DATABASE_URL,
    PUBLIC_WIRE_ARTIFACT_DIR: env.PUBLIC_WIRE_ARTIFACT_DIR,
  });

  if (parsed.PUBLIC_WIRE_ADK_SHADOW_PUBLISH) {
    throw new Error("PUBLIC_WIRE_ADK_SHADOW_PUBLISH=true is forbidden");
  }
  if (
    parsed.NODE_ENV === "production" &&
    parsed.PUBLIC_WIRE_AI_MODE !== "legacy" &&
    !parsed.DATABASE_URL
  ) {
    throw new Error("ADK production modes require DATABASE_URL");
  }
  if (parsed.PUBLIC_WIRE_AI_MODE === "adk" && !parsed.GEMINI_API_KEY) {
    throw new Error("ADK canonical mode requires GEMINI_API_KEY");
  }

  return {
    environment: parsed.NODE_ENV,
    mode: parsed.PUBLIC_WIRE_AI_MODE,
    model: parsed.PUBLIC_WIRE_ADK_MODEL,
    geminiApiKey: parsed.GEMINI_API_KEY,
    databaseUrl: parsed.DATABASE_URL,
    artifactDirectory: parsed.PUBLIC_WIRE_ARTIFACT_DIR,
    promptVersion: parsed.PUBLIC_WIRE_PROMPT_VERSION,
    schemaVersion: parsed.PUBLIC_WIRE_SCHEMA_VERSION,
    policyVersion: parsed.PUBLIC_WIRE_POLICY_VERSION,
    publicationEnabled:
      parsed.PUBLIC_WIRE_PUBLICATION_ENABLED &&
      !parsed.PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH &&
      parsed.PUBLIC_WIRE_AI_MODE === "adk",
    budgets: {
      evidenceIterations: parsed.PUBLIC_WIRE_ADK_MAX_EVIDENCE_ITERATIONS,
      draftRevisions: parsed.PUBLIC_WIRE_ADK_MAX_DRAFT_REVISIONS,
      modelCalls: parsed.PUBLIC_WIRE_ADK_MAX_MODEL_CALLS,
      toolCalls: parsed.PUBLIC_WIRE_ADK_MAX_TOOL_CALLS,
      timeoutMs: parsed.PUBLIC_WIRE_ADK_TIMEOUT_MS,
    },
  } as const;
}
