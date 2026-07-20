import "server-only";

import { FunctionTool, type FileArtifactService } from "@google/adk";
import { z } from "zod";

const parameters = z
  .object({
    artifactName: z.string().min(1).max(240),
    version: z.number().int().nonnegative(),
    start: z.number().int().nonnegative().default(0),
    length: z.number().int().min(1).max(8_000).default(4_000),
  })
  .strict();

export function createArtifactReaderTool(params: {
  service: FileArtifactService;
  appName?: string;
  userId: string;
  sessionId: string;
  allowedArtifactNames: Set<string>;
}) {
  return new FunctionTool({
    name: "read_artifact_excerpt",
    description:
      "Reads a bounded excerpt from an artifact authorized for this investigation.",
    parameters,
    execute: async ({ artifactName, version, start, length }) => {
      if (!params.allowedArtifactNames.has(artifactName))
        throw new Error("PUBLIC_WIRE_ARTIFACT_NOT_AUTHORIZED");
      const artifact = await params.service.loadArtifact({
        appName: params.appName || "public-wire",
        userId: params.userId,
        sessionId: params.sessionId,
        filename: artifactName,
        version,
      });
      const encoded = artifact?.inlineData?.data;
      if (!encoded) throw new Error("PUBLIC_WIRE_ARTIFACT_MISSING");
      const text = Buffer.from(encoded, "base64").toString("utf8");
      return {
        artifactName,
        version,
        start,
        end: Math.min(text.length, start + length),
        excerpt: text.slice(start, start + length),
      };
    },
  });
}
