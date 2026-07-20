import { describe, expect, it } from "vitest";
import { loadAdkConfig } from "@/lib/adk/public-wire/config";

describe("ADK configuration", () => {
  it("defaults publication to blocked and shadow mode", () => {
    const config = loadAdkConfig({ NODE_ENV: "test" });
    expect(config.mode).toBe("shadow");
    expect(config.publicationEnabled).toBe(false);
    expect(config.budgets.evidenceIterations).toBe(2);
  });

  it("forbids shadow publication", () => {
    expect(() =>
      loadAdkConfig({
        NODE_ENV: "test",
        PUBLIC_WIRE_ADK_SHADOW_PUBLISH: "true",
      }),
    ).toThrow(/forbidden/);
  });

  it("requires persistence in non-legacy production modes", () => {
    expect(() =>
      loadAdkConfig({ NODE_ENV: "production", PUBLIC_WIRE_AI_MODE: "shadow" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires a Gemini key in canonical ADK mode", () => {
    expect(() =>
      loadAdkConfig({
        NODE_ENV: "test",
        PUBLIC_WIRE_AI_MODE: "adk",
        DATABASE_URL: "postgres://localhost/publicwire",
      }),
    ).toThrow(/GEMINI_API_KEY/);
  });

  it("requires both publication controls and ADK canonical mode", () => {
    const config = loadAdkConfig({
      NODE_ENV: "test",
      PUBLIC_WIRE_AI_MODE: "adk",
      DATABASE_URL: "postgres://localhost/publicwire",
      GEMINI_API_KEY: "test-key",
      PUBLIC_WIRE_PUBLICATION_ENABLED: "true",
      PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH: "false",
    });
    expect(config.publicationEnabled).toBe(true);
  });
});
