import "server-only";

import {
  BasePlugin,
  type Context,
  type LlmRequest,
  type BaseTool,
} from "@google/adk";

type Counters = { modelCalls: number; toolCalls: number; startedAt: number };

export class ExecutionBudgetPlugin extends BasePlugin {
  private readonly counters = new Map<string, Counters>();

  constructor(
    private readonly limits: {
      modelCalls: number;
      toolCalls: number;
      timeoutMs: number;
    },
  ) {
    super("public_wire_execution_budget");
  }

  private get(invocationId: string) {
    const current = this.counters.get(invocationId) ?? {
      modelCalls: 0,
      toolCalls: 0,
      startedAt: Date.now(),
    };
    this.counters.set(invocationId, current);
    if (Date.now() - current.startedAt > this.limits.timeoutMs)
      throw new Error("PUBLIC_WIRE_BUDGET_TIMEOUT");
    return current;
  }

  override async beforeModelCallback({
    callbackContext,
  }: {
    callbackContext: Context;
    llmRequest: LlmRequest;
  }) {
    const counter = this.get(callbackContext.invocationId);
    counter.modelCalls += 1;
    if (counter.modelCalls > this.limits.modelCalls)
      throw new Error("PUBLIC_WIRE_MODEL_BUDGET_EXHAUSTED");
    return undefined;
  }

  override async beforeToolCallback({
    toolContext,
  }: {
    tool: BaseTool;
    toolArgs: Record<string, unknown>;
    toolContext: Context;
  }) {
    const counter = this.get(toolContext.invocationId);
    counter.toolCalls += 1;
    if (counter.toolCalls > this.limits.toolCalls)
      throw new Error("PUBLIC_WIRE_TOOL_BUDGET_EXHAUSTED");
    return undefined;
  }

  override async afterRunCallback({
    invocationContext,
  }: Parameters<BasePlugin["afterRunCallback"]>[0]) {
    this.counters.delete(invocationContext.invocationId);
  }
}
