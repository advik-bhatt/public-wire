import "server-only";

import { isIP } from "node:net";
import { BasePlugin, type BaseTool, type Context } from "@google/adk";

function isPrivateHost(hostname: string) {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local")
  )
    return true;
  if (isIP(lower) === 4) {
    const [a, b] = lower.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (lower.startsWith("::ffff:")) return isPrivateHost(lower.slice(7));
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

export function assertSafePublicUrl(rawUrl: string, allowedHosts: string[]) {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isPrivateHost(url.hostname)
  ) {
    throw new Error("PUBLIC_WIRE_UNSAFE_SOURCE_URL");
  }
  if (
    !allowedHosts.includes(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""))
  )
    throw new Error("PUBLIC_WIRE_SOURCE_HOST_NOT_ALLOWED");
  return url;
}

export class SourceSafetyPlugin extends BasePlugin {
  constructor(private readonly allowedHosts: string[]) {
    super("public_wire_source_safety");
  }

  override async beforeToolCallback({
    toolArgs,
  }: {
    tool: BaseTool;
    toolArgs: Record<string, unknown>;
    toolContext: Context;
  }) {
    for (const [key, value] of Object.entries(toolArgs)) {
      if (/url/i.test(key) && typeof value === "string")
        assertSafePublicUrl(value, this.allowedHosts);
    }
    return undefined;
  }
}
