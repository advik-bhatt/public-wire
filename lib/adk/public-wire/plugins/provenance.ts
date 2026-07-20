import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { BasePlugin, stringifyContent, type Event } from "@google/adk";
import type { PublicWireAdkConfig } from "../config";
import { publicWireEventEnvelopeSchema } from "../contracts";
import type { EventSink, InvocationIdentity } from "../services/interfaces";

function eventTime(timestamp: number) {
  const milliseconds =
    timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  return new Date(milliseconds).toISOString();
}

export class ProvenancePlugin extends BasePlugin {
  constructor(
    private readonly params: {
      config: PublicWireAdkConfig;
      identity: InvocationIdentity;
      appName: string;
      userId: string;
      sessionId: string;
      sink: EventSink;
    },
  ) {
    super("public_wire_provenance");
  }

  override async onEventCallback({ event }: { event: Event }) {
    const text = stringifyContent(event);
    const envelope = publicWireEventEnvelopeSchema.parse({
      eventId: randomUUID(),
      origin: "adk",
      adkEventId: event.id,
      invocationId: event.invocationId,
      jobId: this.params.identity.jobId,
      jobAttemptId: this.params.identity.jobAttemptId,
      investigationId: this.params.identity.investigationId,
      appName: this.params.appName,
      userId: this.params.userId,
      sessionId: this.params.sessionId,
      author: event.author,
      branch: event.branch,
      eventType: event.errorCode ? "error" : text ? "content" : "activity",
      occurredAt: eventTime(event.timestamp),
      persistedAt: new Date().toISOString(),
      model: event.modelVersion,
      promptVersion: this.params.config.promptVersion,
      finishReason: event.finishReason,
      errorCode: event.errorCode,
      contentHash: text
        ? createHash("sha256").update(text).digest("hex")
        : undefined,
      visibility: "internal",
      payload: {
        partial: Boolean(event.partial),
        turnComplete: Boolean(event.turnComplete),
        hasContent: Boolean(text),
      },
    });
    await this.params.sink.append(envelope);
    return undefined;
  }
}
