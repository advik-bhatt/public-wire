import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { CivicBrief } from "@/lib/public-wire-data";

const SENSO_BASE_URL = "https://sdk.senso.ai/api/v1";
const providerResponseSchema = z
  .object({
    id: z
      .union([z.string().min(1).max(200), z.number().finite()])
      .transform(String),
    url: z.string().url().max(1000),
  })
  .passthrough();

export type SensoPublishResult = {
  provider: "Senso";
  mode: "real-api" | "blocked" | "provider-error";
  state: "blocked" | "confirmed" | "unknown" | "failed";
  purpose: string;
  publishedUrl?: string;
  providerId?: string;
  errorCode?: string;
};

export function civicBriefSlug(text: string, discriminator?: string) {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "public-wire-brief";
  if (!discriminator) return base.slice(0, 80);
  const suffix = createHash("sha256")
    .update(discriminator)
    .digest("hex")
    .slice(0, 8);
  return `${base.slice(0, 71).replace(/-+$/g, "")}-${suffix}`;
}

function toMarkdown(brief: CivicBrief) {
  const escape = (value: string) =>
    value.replace(/[\\`*_[\]{}()#+.!|<>-]/g, "\\$&");
  const sourceList = brief.sources
    .map(
      (source) =>
        `- **${escape(source.title)}:** ${escape(source.role)} ([source](<${source.url.replace(/>/g, "%3E")}>)`,
    )
    .join("\n");
  return [
    `## Summary`,
    ``,
    escape(brief.summary),
    ``,
    `## Why It Matters`,
    ``,
    escape(brief.whyItMatters),
    ``,
    `## Who May Be Affected`,
    ``,
    brief.whoIsAffected.map(escape).join(", "),
    ``,
    `## Sources`,
    ``,
    sourceList,
  ].join("\n");
}

export function canonicalizeCivicBriefForPublication(brief: CivicBrief) {
  return JSON.stringify({
    headline: brief.headline,
    category: brief.category,
    summary: brief.summary,
    whyItMatters: brief.whyItMatters,
    whoIsAffected: brief.whoIsAffected,
    sources: brief.sources.map((source) => ({
      title: source.title,
      url: source.url,
      role: source.role,
    })),
  });
}

export function civicBriefPublicationHash(brief: CivicBrief) {
  return createHash("sha256")
    .update(canonicalizeCivicBriefForPublication(brief))
    .digest("hex");
}

export async function publishCivicBrief(params: {
  brief: CivicBrief;
  idempotencyKey?: string;
  signal?: AbortSignal;
}): Promise<SensoPublishResult> {
  const enabled = process.env.PUBLIC_WIRE_PUBLICATION_ENABLED === "true";
  const killed =
    process.env.PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH !== "false";
  const apiKey = process.env.SENSO_API_KEY;
  const handle = process.env.SENSO_HANDLE;

  if (
    !enabled ||
    killed ||
    !apiKey ||
    !handle ||
    !/^[A-Za-z0-9_-]{2,80}$/.test(handle)
  ) {
    return {
      provider: "Senso",
      mode: "blocked",
      state: "blocked",
      purpose:
        "External publication is disabled until durable intent storage and both publication controls are active.",
      errorCode:
        !enabled || killed ? "PUBLICATION_BLOCKED" : "MISSING_CONFIGURATION",
    };
  }

  const slug = civicBriefSlug(params.brief.headline, params.brief.id);
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(
    () => controller.abort(new Error("Senso publish timed out")),
    15_000,
  );

  try {
    const response = await fetch(`${SENSO_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        ...(params.idempotencyKey
          ? { "Idempotency-Key": params.idempotencyKey }
          : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        title: params.brief.headline,
        handle,
        slug,
        body: toMarkdown(params.brief),
        tags: ["civic", params.brief.category.toLowerCase()],
      }),
    });
    if (!response.ok) {
      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      return {
        provider: "Senso",
        mode: "provider-error",
        state: retryable ? "unknown" : "failed",
        purpose: retryable
          ? "Senso returned a retryable response without confirmation."
          : "Senso returned a definite failure.",
        errorCode: `HTTP_${response.status}`,
      };
    }

    const raw = await response.json().catch(() => null);
    const candidate =
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data: unknown }).data
        : raw;
    const verified = providerResponseSchema.safeParse(candidate);
    const publishedUrl = verified.success
      ? new URL(verified.data.url)
      : undefined;
    const expectedPath = `/${handle}/${slug}`;
    if (
      !verified.success ||
      !publishedUrl ||
      publishedUrl.protocol !== "https:" ||
      publishedUrl.hostname !== "cited.md" ||
      publishedUrl.pathname.replace(/\/$/, "") !== expectedPath
    ) {
      return {
        provider: "Senso",
        mode: "provider-error",
        state: "unknown",
        purpose:
          "Senso accepted the request but did not return a verifiable remote identity.",
        errorCode: "AMBIGUOUS_RESPONSE",
      };
    }
    return {
      provider: "Senso",
      mode: "real-api",
      state: "confirmed",
      purpose:
        "Senso returned a verified provider identifier and cited.md URL.",
      publishedUrl: verified.data.url,
      providerId: verified.data.id,
    };
  } catch {
    return {
      provider: "Senso",
      mode: "provider-error",
      state: controller.signal.aborted ? "unknown" : "failed",
      purpose: "Senso publication did not produce a confirmed remote identity.",
      errorCode: controller.signal.aborted
        ? "AMBIGUOUS_TIMEOUT"
        : "PROVIDER_ERROR",
    };
  } finally {
    clearTimeout(timeout);
    params.signal?.removeEventListener("abort", forwardAbort);
  }
}
