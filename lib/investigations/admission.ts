import "server-only";

import { withTransaction } from "@/lib/db/postgres";
import type { AdmissionService } from "@/lib/adk/public-wire/services/interfaces";

export class PostgresAdmissionService implements AdmissionService {
  constructor(
    private readonly limits = { "case-request": 8, "shadow-run": 4 },
  ) {}

  async admit(params: {
    areaKey: string;
    requesterScopeHash: string;
    operation: "case-request" | "shadow-run";
  }) {
    const limit = this.limits[params.operation];
    return withTransaction(async (client) => {
      const result = await client.query<{ used: number }>(
        `INSERT INTO admission_quotas (area_key,requester_scope_hash,operation,window_started_at,used,limit_value)
        VALUES ($1,$2,$3,date_trunc('hour',now()),1,$4)
        ON CONFLICT (area_key,requester_scope_hash,operation,window_started_at)
        DO UPDATE SET used=admission_quotas.used+1
        WHERE admission_quotas.used < admission_quotas.limit_value
        RETURNING used`,
        [params.areaKey, params.requesterScopeHash, params.operation, limit],
      );
      return result.rowCount
        ? { admitted: true }
        : { admitted: false, retryAfterSeconds: 3600 };
    });
  }
}
