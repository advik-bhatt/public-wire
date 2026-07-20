import "server-only";

import { randomUUID } from "node:crypto";
import {
  BasePlugin,
  type BaseAgent,
  type BaseTool,
  type Context,
  type InvocationContext,
} from "@google/adk";
import type {
  InvocationIdentity,
  TrajectorySpan,
  TrajectorySpanSink,
} from "../services/interfaces";

type ActiveSpan = { spanId: string; startedAt: number };

export class TrajectoryPlugin extends BasePlugin {
  private readonly active = new Map<string, ActiveSpan>();

  constructor(
    private readonly params: {
      identity: InvocationIdentity;
      sink: TrajectorySpanSink;
      model: string;
    },
  ) {
    super("public_wire_trajectory");
  }

  private key(invocationId: string, kind: string, name: string) {
    return `${invocationId}:${kind}:${name}`;
  }

  private start(
    invocationId: string,
    kind: TrajectorySpan["spanKind"],
    name: string,
    attributes: Record<string, string | number | boolean> = {},
  ) {
    const active = { spanId: randomUUID(), startedAt: Date.now() };
    this.active.set(this.key(invocationId, kind, name), active);
    return this.params.sink.appendSpan({
      executionSpanId: active.spanId,
      investigationId: this.params.identity.investigationId,
      revision: this.params.identity.requestedRevision,
      jobAttemptId: this.params.identity.jobAttemptId,
      invocationId,
      spanKind: kind,
      name,
      outcome: "started",
      startedAt: new Date(active.startedAt).toISOString(),
      model: kind === "model" ? this.params.model : undefined,
      safeAttributes: attributes,
      leaseToken: this.params.identity.leaseToken,
    });
  }

  private finish(
    invocationId: string,
    kind: TrajectorySpan["spanKind"],
    name: string,
    outcome: "succeeded" | "failed" | "cancelled" = "succeeded",
  ) {
    const key = this.key(invocationId, kind, name);
    const active = this.active.get(key);
    if (!active) return Promise.resolve();
    this.active.delete(key);
    const endedAt = Date.now();
    return this.params.sink.appendSpan({
      executionSpanId: active.spanId,
      investigationId: this.params.identity.investigationId,
      revision: this.params.identity.requestedRevision,
      jobAttemptId: this.params.identity.jobAttemptId,
      invocationId,
      spanKind: kind,
      name,
      outcome,
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      latencyMs: endedAt - active.startedAt,
      model: kind === "model" ? this.params.model : undefined,
      safeAttributes: {},
      leaseToken: this.params.identity.leaseToken,
    });
  }

  override async beforeRunCallback({
    invocationContext,
  }: {
    invocationContext: InvocationContext;
  }) {
    await this.start(invocationContext.invocationId, "run", "public_wire_run");
    return undefined;
  }

  override async afterRunCallback({
    invocationContext,
  }: {
    invocationContext: InvocationContext;
  }) {
    await this.finish(
      invocationContext.invocationId,
      "run",
      "public_wire_run",
      invocationContext.endInvocation ? "cancelled" : "succeeded",
    );
  }

  override async beforeAgentCallback({
    agent,
    callbackContext,
  }: {
    agent: BaseAgent;
    callbackContext: Context;
  }) {
    await this.start(callbackContext.invocationId, "agent", agent.name);
    return undefined;
  }

  override async afterAgentCallback({
    agent,
    callbackContext,
  }: {
    agent: BaseAgent;
    callbackContext: Context;
  }) {
    await this.finish(callbackContext.invocationId, "agent", agent.name);
    return undefined;
  }

  override async beforeModelCallback({
    callbackContext,
  }: Parameters<BasePlugin["beforeModelCallback"]>[0]) {
    await this.start(
      callbackContext.invocationId,
      "model",
      callbackContext.agentName || "model",
    );
    return undefined;
  }

  override async afterModelCallback({
    callbackContext,
  }: Parameters<BasePlugin["afterModelCallback"]>[0]) {
    await this.finish(
      callbackContext.invocationId,
      "model",
      callbackContext.agentName || "model",
    );
    return undefined;
  }

  override async onModelErrorCallback({
    callbackContext,
  }: Parameters<BasePlugin["onModelErrorCallback"]>[0]) {
    await this.finish(
      callbackContext.invocationId,
      "model",
      callbackContext.agentName || "model",
      "failed",
    );
    return undefined;
  }

  override async beforeToolCallback({
    tool,
    toolContext,
  }: {
    tool: BaseTool;
    toolArgs: Record<string, unknown>;
    toolContext: Context;
  }) {
    await this.start(toolContext.invocationId, "tool", tool.name);
    return undefined;
  }

  override async afterToolCallback({
    tool,
    toolContext,
  }: Parameters<BasePlugin["afterToolCallback"]>[0]) {
    await this.finish(toolContext.invocationId, "tool", tool.name);
    return undefined;
  }

  override async onToolErrorCallback({
    tool,
    toolContext,
  }: Parameters<BasePlugin["onToolErrorCallback"]>[0]) {
    await this.finish(toolContext.invocationId, "tool", tool.name, "failed");
    return undefined;
  }
}
