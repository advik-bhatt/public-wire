import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { FileArtifactService } from "@google/adk";
import type { Part } from "@google/genai";
import { sourceArtifactSchema, type SourceArtifact } from "../contracts";

const NORMALIZER_VERSION = "plain-text-v1";

export function normalizeSourceText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function part(text: string, mediaType: string): Part {
  return {
    inlineData: {
      data: Buffer.from(text, "utf8").toString("base64"),
      mimeType: mediaType,
    },
  };
}

export async function captureSourceArtifacts(params: {
  artifactService: FileArtifactService;
  investigationId: string;
  userId: string;
  sessionId: string;
  sourceId: string;
  sourceUrl: string;
  rawText: string;
  rawMediaType?: string;
  httpStatus?: number;
  fetchMethod: SourceArtifact["fetchMethod"];
  accessClassification?: SourceArtifact["accessClassification"];
}) {
  const fetchedAt = new Date().toISOString();
  const rawId = randomUUID();
  const normalizedId = randomUUID();
  const rawHash = createHash("sha256").update(params.rawText).digest("hex");
  const normalizedText = normalizeSourceText(params.rawText);
  const normalizedHash = createHash("sha256")
    .update(normalizedText)
    .digest("hex");
  const rawName = `sources/${params.sourceId}/raw-source`;
  const normalizedName = `sources/${params.sourceId}/normalized.txt`;

  const rawMetadata = sourceArtifactSchema.parse({
    artifactId: rawId,
    artifactKind: "raw",
    adkArtifactName: rawName,
    adkArtifactVersion: 0,
    investigationId: params.investigationId,
    sourceId: params.sourceId,
    sourceUrl: params.sourceUrl,
    canonicalUrl: params.sourceUrl,
    mediaType: params.rawMediaType || "application/octet-stream",
    fetchedAt,
    contentHash: rawHash,
    fetchMethod: params.fetchMethod,
    httpStatus: params.httpStatus,
    accessClassification: params.accessClassification ?? "public",
    storageUri: `artifact://${params.userId}/${params.sessionId}/${rawName}`,
  });
  const rawVersion = await params.artifactService.saveArtifact({
    appName: "public-wire",
    userId: params.userId,
    sessionId: params.sessionId,
    filename: rawName,
    artifact: part(
      params.rawText,
      params.rawMediaType || "application/octet-stream",
    ),
    customMetadata: rawMetadata,
  });

  const normalizedMetadata = sourceArtifactSchema.parse({
    artifactId: normalizedId,
    artifactKind: "normalized",
    adkArtifactName: normalizedName,
    adkArtifactVersion: 0,
    investigationId: params.investigationId,
    sourceId: params.sourceId,
    sourceUrl: params.sourceUrl,
    canonicalUrl: params.sourceUrl,
    mediaType: "text/plain",
    fetchedAt,
    contentHash: normalizedHash,
    derivedFromArtifactId: rawId,
    derivedFromArtifactVersion: rawVersion,
    normalizerVersion: NORMALIZER_VERSION,
    fetchMethod: params.fetchMethod,
    httpStatus: params.httpStatus,
    accessClassification: params.accessClassification ?? "public",
    storageUri: `artifact://${params.userId}/${params.sessionId}/${normalizedName}`,
  });
  const normalizedVersion = await params.artifactService.saveArtifact({
    appName: "public-wire",
    userId: params.userId,
    sessionId: params.sessionId,
    filename: normalizedName,
    artifact: part(normalizedText, "text/plain"),
    customMetadata: normalizedMetadata,
  });

  return {
    raw: { ...rawMetadata, adkArtifactVersion: rawVersion },
    normalized: {
      ...normalizedMetadata,
      adkArtifactVersion: normalizedVersion,
    },
    normalizedText,
  };
}
