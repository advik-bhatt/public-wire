import { describe, expect, it } from "vitest";
import {
  BaseLlm,
  BasePlugin,
  Gemini,
  GoogleLLMVariant,
  InMemorySessionService,
  LlmAgent,
  Runner,
  stringifyContent,
  type LlmRequest,
  type LlmResponse,
} from "@google/adk";
import type { BaseLlmConnection } from "@google/adk";
import { z } from "zod";
import { createUserContent } from "@google/genai";

class FakeLlm extends BaseLlm {
  constructor() {
    super({ model: "fake-public-wire" });
  }
  async *generateContentAsync(
    _request: LlmRequest,
    _stream?: boolean,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<LlmResponse, void> {
    if (abortSignal?.aborted) return;
    yield {
      content: {
        role: "model",
        parts: [{ text: JSON.stringify({ outcome: "hold" }) }],
      },
    };
  }
  async connect(): Promise<BaseLlmConnection> {
    throw new Error("live mode is not supported in this test");
  }
}

class CapturePlugin extends BasePlugin {
  invocationIds: string[] = [];
  constructor() {
    super("capture");
  }
  override async onEventCallback({
    event,
  }: Parameters<BasePlugin["onEventCallback"]>[0]) {
    this.invocationIds.push(event.invocationId);
    return undefined;
  }
}

describe("ADK TypeScript compatibility", () => {
  it("constructs Gemini explicitly on the Developer API backend", () => {
    const model = new Gemini({
      apiKey: "test-only",
      model: "gemini-2.5-flash",
      vertexai: false,
    });
    expect(model.apiBackend).toBe(GoogleLLMVariant.GEMINI_API);
  });

  it("runs structured output with generated event and invocation ids", async () => {
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-test",
      userId: "town:test",
      sessionId: "investigation:test",
    });
    const plugin = new CapturePlugin();
    const agent = new LlmAgent({
      name: "compatibility_agent",
      model: new FakeLlm(),
      instruction: "Return the schema.",
      outputSchema: z.object({ outcome: z.literal("hold") }).strict(),
      disallowTransferToParent: true,
      disallowTransferToPeers: true,
    });
    const runner = new Runner({
      appName: "public-wire-test",
      agent,
      sessionService: service,
      plugins: [plugin],
    });
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:test",
      newMessage: createUserContent("test"),
    }))
      events.push(event);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.id && event.invocationId)).toBe(true);
    expect(plugin.invocationIds[0]).toBe(events[0].invocationId);
    expect(JSON.parse(stringifyContent(events.at(-1)!))).toEqual({
      outcome: "hold",
    });
  });

  it("honors an already-aborted runner signal", async () => {
    const service = new InMemorySessionService();
    await service.createSession({
      appName: "public-wire-test",
      userId: "town:test",
      sessionId: "investigation:cancel",
    });
    const runner = new Runner({
      appName: "public-wire-test",
      agent: new LlmAgent({ name: "cancel_agent", model: new FakeLlm() }),
      sessionService: service,
    });
    const controller = new AbortController();
    controller.abort();
    const events = [];
    for await (const event of runner.runAsync({
      userId: "town:test",
      sessionId: "investigation:cancel",
      newMessage: createUserContent("test"),
      abortSignal: controller.signal,
    }))
      events.push(event);
    expect(events).toHaveLength(0);
  });
});
