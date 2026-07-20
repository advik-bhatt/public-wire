import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createHash } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { assertSafePublicUrl } from "../plugins/source-safety";

function privateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (normalized.startsWith("::ffff:"))
    return privateAddress(normalized.slice(7));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

async function assertPublicDns(hostname: string) {
  if (privateAddress(hostname))
    throw new Error("PUBLIC_WIRE_UNSAFE_DNS_RESULT");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some((entry) => privateAddress(entry.address))
  )
    throw new Error("PUBLIC_WIRE_UNSAFE_DNS_RESULT");
  return addresses[0];
}

function requestPinned(
  url: URL,
  pinned: { address: string; family: number },
  maxBytes: number,
  signal?: AbortSignal,
) {
  return new Promise<{
    status: number;
    location?: string;
    mediaType: string;
    bytes: Buffer;
  }>((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        signal,
        family: pinned.family,
        headers: {
          Accept: "text/html,application/pdf,text/plain,application/json",
          "Accept-Encoding": "identity",
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, pinned.address, pinned.family),
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        const mediaType = String(
          response.headers["content-type"] || "application/octet-stream",
        ).split(";")[0];
        const declared = Number(response.headers["content-length"] || 0);
        if (declared > maxBytes) {
          reject(new Error("PUBLIC_WIRE_SOURCE_TOO_LARGE"));
          response.destroy();
          return;
        }
        if (status >= 300 && status < 400) {
          response.resume();
          resolve({ status, location, mediaType, bytes: Buffer.alloc(0) });
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        response.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            response.destroy(new Error("PUBLIC_WIRE_SOURCE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status,
            location,
            mediaType,
            bytes: Buffer.concat(chunks, total),
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

const parameters = z
  .object({
    url: z.string().url(),
    maxBytes: z.number().int().min(1_000).max(1_000_000).default(250_000),
  })
  .strict();

export async function fetchApprovedSource(params: {
  url: string;
  allowedHosts: string[];
  maxBytes?: number;
  signal?: AbortSignal;
}) {
  const maxBytes = params.maxBytes ?? 250_000;
  let url = assertSafePublicUrl(params.url, params.allowedHosts);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const pinned = await assertPublicDns(url.hostname);
    const response = await requestPinned(url, pinned, maxBytes, params.signal);
    if (response.status >= 300 && response.status < 400) {
      const location = response.location;
      if (!location || redirect === 3)
        throw new Error("PUBLIC_WIRE_REDIRECT_REJECTED");
      url = assertSafePublicUrl(
        new URL(location, url).toString(),
        params.allowedHosts,
      );
      continue;
    }
    if (response.status < 200 || response.status >= 300)
      throw new Error(`PUBLIC_WIRE_SOURCE_HTTP_${response.status}`);
    return {
      canonicalUrl: url.toString(),
      httpStatus: response.status,
      mediaType: response.mediaType,
      byteLength: response.bytes.byteLength,
      contentHash: createHash("sha256").update(response.bytes).digest("hex"),
      text: new TextDecoder("utf-8", { fatal: false }).decode(response.bytes),
    };
  }
  throw new Error("PUBLIC_WIRE_FETCH_FAILED");
}

export function createSourceFetchTool(allowedHosts: string[]) {
  return new FunctionTool({
    name: "fetch_source",
    description:
      "Fetches one allowlisted public HTTPS civic source with strict redirect and byte limits.",
    parameters,
    execute: async ({ url, maxBytes }, context) =>
      fetchApprovedSource({
        url,
        allowedHosts,
        maxBytes,
        signal: context?.abortSignal,
      }),
  });
}
