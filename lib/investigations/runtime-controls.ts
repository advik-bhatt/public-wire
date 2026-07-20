import "server-only";

import { query } from "@/lib/db/postgres";
import type { RuntimeControlService } from "@/lib/adk/public-wire/services/interfaces";

type ControlValue = Awaited<ReturnType<RuntimeControlService["get"]>>;
let cached: { value: ControlValue; expiresAt: number } | undefined;

export class PostgresRuntimeControlService implements RuntimeControlService {
  async get(requireFresh = false) {
    const maximumAgeMs = Number(
      process.env.PUBLIC_WIRE_CONTROL_MAX_AGE_MS || 300_000,
    );
    try {
      const result = await query<{
        ai_mode: "legacy" | "shadow" | "adk";
        publication_blocked: boolean;
        rollout: { shadowSampleRate?: unknown } | null;
        version: string;
      }>(
        "SELECT ai_mode,publication_blocked,rollout,version::text FROM runtime_controls WHERE control_key='canonical'",
      );
      if (!result.rowCount)
        throw new Error("PUBLIC_WIRE_RUNTIME_CONTROL_UNAVAILABLE");
      const row = result.rows[0];
      const sampleRate = Number(row.rollout?.shadowSampleRate ?? 0);
      const expiresAt = Date.now() + maximumAgeMs;
      const value: ControlValue = {
        mode: row.ai_mode,
        publicationBlocked: row.publication_blocked,
        shadowSampleRate: Number.isFinite(sampleRate)
          ? Math.max(0, Math.min(1, sampleRate))
          : 0,
        version: Number(row.version),
        freshUntil: new Date(expiresAt).toISOString(),
      };
      cached = { value, expiresAt };
      return value;
    } catch (error) {
      if (!requireFresh && cached && cached.expiresAt >= Date.now())
        return cached.value;
      throw error;
    }
  }
}
