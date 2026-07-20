import "server-only";

import {
  DatabaseSessionService,
  FileArtifactService,
  Gemini,
  GoogleLLMVariant,
  InMemorySessionService,
  Runner,
  type BaseSessionService,
} from "@google/adk";
import { resolve } from "node:path";
import { createEditorialClassifier } from "./agents/editorial-classifier";
import { createDissentResolverAgent } from "./agents/dissent-resolver";
import { createDeskWorkflow } from "./workflows/desk-workflow";
import type { PublicWireAdkConfig } from "./config";
import { ExecutionBudgetPlugin } from "./plugins/execution-budget";
import { ProvenancePlugin } from "./plugins/provenance";
import { SourceSafetyPlugin } from "./plugins/source-safety";
import { TrajectoryPlugin } from "./plugins/trajectory";
import type { EventSink, InvocationIdentity } from "./services/interfaces";

export const PUBLIC_WIRE_ADK_APP_NAME = "public-wire";

async function createSessionService(
  config: PublicWireAdkConfig,
): Promise<BaseSessionService> {
  if (!config.databaseUrl) return new InMemorySessionService();
  const service = new DatabaseSessionService(config.databaseUrl);
  await service.init();
  return service;
}

export async function createEditorialShadowRunner(params: {
  config: PublicWireAdkConfig;
  identity: InvocationIdentity;
  userId: string;
  sessionId: string;
  eventSink: EventSink;
  allowedSourceHosts: string[];
}) {
  if (!params.config.geminiApiKey)
    throw new Error("GEMINI_API_KEY is required for an ADK runner");
  const model = new Gemini({
    apiKey: params.config.geminiApiKey,
    model: params.config.model,
    vertexai: false,
  });
  if (model.apiBackend !== GoogleLLMVariant.GEMINI_API)
    throw new Error("PublicWire ADK must use the Gemini Developer API");

  const sessionService = await createSessionService(params.config);
  const artifactRoot = resolve(process.cwd(), params.config.artifactDirectory);
  const artifactService = new FileArtifactService(artifactRoot);
  const agent = createEditorialClassifier(model);
  const runner = new Runner({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    agent,
    sessionService,
    artifactService,
    plugins: [
      new ExecutionBudgetPlugin(params.config.budgets),
      new SourceSafetyPlugin(params.allowedSourceHosts),
      new TrajectoryPlugin({
        identity: params.identity,
        sink: params.eventSink,
        model: params.config.model,
      }),
      new ProvenancePlugin({
        config: params.config,
        identity: params.identity,
        appName: PUBLIC_WIRE_ADK_APP_NAME,
        userId: params.userId,
        sessionId: params.sessionId,
        sink: params.eventSink,
      }),
    ],
  });

  await sessionService.getOrCreateSession({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    userId: params.userId,
    sessionId: params.sessionId,
    state: {
      investigationId: params.identity.investigationId,
      jobId: params.identity.jobId,
      jobAttemptId: params.identity.jobAttemptId,
      requestedRevision: params.identity.requestedRevision,
    },
  });
  return { runner, model, sessionService, artifactService };
}

export async function createDeskShadowRunner(params: {
  config: PublicWireAdkConfig;
  identity: InvocationIdentity;
  userId: string;
  sessionId: string;
  eventSink: EventSink;
  allowedSourceHosts: string[];
}) {
  if (!params.config.geminiApiKey)
    throw new Error("GEMINI_API_KEY is required for an ADK runner");
  const model = new Gemini({
    apiKey: params.config.geminiApiKey,
    model: params.config.model,
    vertexai: false,
  });
  if (model.apiBackend !== GoogleLLMVariant.GEMINI_API)
    throw new Error("PublicWire ADK must use the Gemini Developer API");
  const sessionService = await createSessionService(params.config);
  const artifactService = new FileArtifactService(
    resolve(process.cwd(), params.config.artifactDirectory),
  );
  const runner = new Runner({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    agent: createDeskWorkflow(model, params.config.budgets.draftRevisions),
    sessionService,
    artifactService,
    plugins: [
      new ExecutionBudgetPlugin(params.config.budgets),
      new SourceSafetyPlugin(params.allowedSourceHosts),
      new TrajectoryPlugin({
        identity: params.identity,
        sink: params.eventSink,
        model: params.config.model,
      }),
      new ProvenancePlugin({
        config: params.config,
        identity: params.identity,
        appName: PUBLIC_WIRE_ADK_APP_NAME,
        userId: params.userId,
        sessionId: params.sessionId,
        sink: params.eventSink,
      }),
    ],
  });
  await sessionService.getOrCreateSession({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    userId: params.userId,
    sessionId: params.sessionId,
    state: {
      investigationId: params.identity.investigationId,
      jobId: params.identity.jobId,
      jobAttemptId: params.identity.jobAttemptId,
      requestedRevision: params.identity.requestedRevision,
    },
  });
  return { runner, model, sessionService, artifactService };
}

export async function createDissentShadowRunner(params: {
  config: PublicWireAdkConfig;
  identity: InvocationIdentity;
  userId: string;
  sessionId: string;
  eventSink: EventSink;
  allowedSourceHosts: string[];
  conflict: unknown;
}) {
  if (!params.config.geminiApiKey)
    throw new Error("GEMINI_API_KEY is required for an ADK runner");
  const model = new Gemini({
    apiKey: params.config.geminiApiKey,
    model: params.config.model,
    vertexai: false,
  });
  if (model.apiBackend !== GoogleLLMVariant.GEMINI_API)
    throw new Error("PublicWire ADK must use the Gemini Developer API");
  const sessionService = await createSessionService(params.config);
  const artifactService = new FileArtifactService(
    resolve(process.cwd(), params.config.artifactDirectory),
  );
  const runner = new Runner({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    agent: createDissentResolverAgent(model),
    sessionService,
    artifactService,
    plugins: [
      new ExecutionBudgetPlugin({
        ...params.config.budgets,
        modelCalls: Math.min(2, params.config.budgets.modelCalls),
        toolCalls: 0,
      }),
      new SourceSafetyPlugin(params.allowedSourceHosts),
      new TrajectoryPlugin({
        identity: params.identity,
        sink: params.eventSink,
        model: params.config.model,
      }),
      new ProvenancePlugin({
        config: params.config,
        identity: params.identity,
        appName: PUBLIC_WIRE_ADK_APP_NAME,
        userId: params.userId,
        sessionId: params.sessionId,
        sink: params.eventSink,
      }),
    ],
  });
  await sessionService.getOrCreateSession({
    appName: PUBLIC_WIRE_ADK_APP_NAME,
    userId: params.userId,
    sessionId: params.sessionId,
    state: {
      investigationId: params.identity.investigationId,
      jobId: params.identity.jobId,
      jobAttemptId: params.identity.jobAttemptId,
      requestedRevision: params.identity.requestedRevision,
      pw_dissent_conflict: params.conflict,
    },
  });
  return { runner, model, sessionService, artifactService };
}
