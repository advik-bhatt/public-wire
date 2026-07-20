import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CivicBrief } from "@/lib/public-wire-data";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
  publish: vi.fn(),
  controlsGet: vi.fn(),
}));

vi.mock("@/lib/db/postgres", () => ({
  query: mocks.query,
  withTransaction: vi.fn(
    async (
      callback: (client: { query: typeof mocks.clientQuery }) => unknown,
    ) => callback({ query: mocks.clientQuery }),
  ),
}));

vi.mock("@/lib/sponsors/senso-civic", () => ({
  civicBriefPublicationHash: vi.fn(() => "a".repeat(64)),
  publishCivicBrief: mocks.publish,
}));

vi.mock("@/lib/investigations/runtime-controls", () => ({
  PostgresRuntimeControlService: class {
    get() {
      return mocks.controlsGet();
    }
  },
}));

import { PostgresPublicationService } from "@/lib/investigations/publication-service";

const brief: CivicBrief = {
  id: "brief-1",
  headline: "A verified civic update",
  area: "Test Town, NJ",
  category: "Civic",
  confidence: "high",
  status: "active",
  summary: "The official notice changes public hours.",
  whyItMatters: "Residents can plan their visit.",
  whoIsAffected: ["Residents"],
  sources: [
    {
      title: "Official notice",
      url: "https://example.gov/notice",
      role: "Primary source",
    },
  ],
  agentTrace: [],
};

const params = {
  investigationId: "11111111-1111-4111-8111-111111111111",
  jobAttemptId: "22222222-2222-4222-8222-222222222222",
  leaseToken: "33333333-3333-4333-8333-333333333333",
  revision: 1,
  contentHash: "a".repeat(64),
  reviewedDraftHash: "a".repeat(64),
  brief,
};

beforeEach(() => {
  vi.stubEnv("PUBLIC_WIRE_PUBLICATION_ENABLED", "true");
  vi.stubEnv("PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH", "false");
  vi.stubEnv("SENSO_API_KEY", "test-key");
  vi.stubEnv("SENSO_HANDLE", "public-wire");
  mocks.controlsGet.mockResolvedValue({
    mode: "adk",
    publicationBlocked: false,
    shadowSampleRate: 0,
    version: 1,
    freshUntil: new Date(Date.now() + 60_000).toISOString(),
  });
  mocks.query.mockResolvedValue({ rowCount: 0, rows: [] });
  mocks.clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes("SELECT 1") && sql.includes("final_gate_results"))
      return { rowCount: 1, rows: [{}] };
    if (sql.includes("INSERT INTO publication_intents"))
      return { rowCount: 1, rows: [{ publication_intent_id: "intent-1" }] };
    return { rowCount: 1, rows: [] };
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("PostgresPublicationService", () => {
  it("publishes only through a current final-gate fence and persists confirmation", async () => {
    mocks.publish.mockResolvedValue({
      provider: "Senso",
      mode: "real-api",
      state: "confirmed",
      purpose: "confirmed",
      providerId: "remote-1",
      publishedUrl: "https://cited.md/public-wire/verified",
    });
    const result = await new PostgresPublicationService().publish(params);

    expect(result).toMatchObject({
      state: "confirmed",
      providerId: "remote-1",
    });
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("INSERT INTO publications"),
      ),
    ).toBe(true);
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("publication_state='confirmed'"),
      ),
    ).toBe(true);
  });

  it("does not confirm after the provider call when the lease fence is lost", async () => {
    let fenceChecks = 0;
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT 1") && sql.includes("final_gate_results")) {
        fenceChecks += 1;
        return {
          rowCount: fenceChecks >= 3 ? 0 : 1,
          rows: fenceChecks >= 3 ? [] : [{}],
        };
      }
      if (sql.includes("INSERT INTO publication_intents"))
        return { rowCount: 1, rows: [{ publication_intent_id: "intent-1" }] };
      return { rowCount: 1, rows: [] };
    });
    mocks.publish.mockResolvedValue({
      provider: "Senso",
      mode: "real-api",
      state: "confirmed",
      purpose: "confirmed",
      providerId: "remote-1",
      publishedUrl: "https://cited.md/public-wire/verified",
    });

    const result = await new PostgresPublicationService().publish(params);

    expect(result.state).toBe("unknown");
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("PUBLICATION_FENCE_LOST_AFTER_PROVIDER"),
      ),
    ).toBe(true);
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("INSERT INTO publications"),
      ),
    ).toBe(false);
  });

  it("replays an ambiguous provider result with the same idempotency key", async () => {
    mocks.publish
      .mockResolvedValueOnce({
        provider: "Senso",
        mode: "provider-error",
        state: "unknown",
        purpose: "timeout",
        errorCode: "AMBIGUOUS_TIMEOUT",
      })
      .mockResolvedValueOnce({
        provider: "Senso",
        mode: "real-api",
        state: "confirmed",
        purpose: "confirmed",
        providerId: "remote-1",
        publishedUrl: "https://cited.md/public-wire/verified",
      });
    const result = await new PostgresPublicationService().publish(params);

    expect(result.state).toBe("confirmed");
    expect(mocks.publish).toHaveBeenCalledTimes(2);
    const keys = mocks.publish.mock.calls.map(([call]) => call.idempotencyKey);
    expect(new Set(keys).size).toBe(1);
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("attempt_count=attempt_count+1"),
      ),
    ).toBe(true);
  });

  it("does not create an intent when the final-gate fence is absent", async () => {
    mocks.clientQuery.mockResolvedValue({ rowCount: 0, rows: [] });
    const result = await new PostgresPublicationService().publish(params);

    expect(result.state).toBe("failed");
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(
      mocks.clientQuery.mock.calls.some(([sql]) =>
        String(sql).includes("INSERT INTO publication_intents"),
      ),
    ).toBe(false);
  });

  it("does not create an intent before Senso credentials are configured", async () => {
    vi.stubEnv("SENSO_API_KEY", "");
    const result = await new PostgresPublicationService().publish(params);

    expect(result.state).toBe("failed");
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.clientQuery).not.toHaveBeenCalled();
  });
});
