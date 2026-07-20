import "server-only";

import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/postgres";
import {
  civicBriefPublicationHash,
  publishCivicBrief,
} from "@/lib/sponsors/senso-civic";
import type { PublicationService } from "@/lib/adk/public-wire/services/interfaces";
import { PostgresRuntimeControlService } from "./runtime-controls";
import {
  configuredReleaseDescriptor,
  workflowAttestationEnforced,
} from "./workflow-release";

type PublishParams = Parameters<PublicationService["publish"]>[0];

async function hasCurrentPublicationFence(
  client: PoolClient,
  params: PublishParams,
) {
  if (workflowAttestationEnforced()) {
    const descriptor = configuredReleaseDescriptor({
      model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
      promptVersion: process.env.PUBLIC_WIRE_PROMPT_VERSION || "2026-07-19.1",
      schemaVersion: process.env.PUBLIC_WIRE_SCHEMA_VERSION || "1",
      policyVersion: process.env.PUBLIC_WIRE_POLICY_VERSION || "2026-07-19.1",
    });
    if (!descriptor) return false;
    const attested = await client.query(
      `SELECT 1 FROM publication_attestations a
      JOIN workflow_releases r ON r.workflow_release_id=a.workflow_release_id AND r.revoked_at IS NULL
      WHERE a.investigation_id=$1 AND a.revision=$2 AND a.content_hash=$3
        AND r.workflow_digest=$4 AND r.build_digest=$5 AND r.model=$6
        AND r.prompt_version=$7 AND r.schema_version=$8 AND r.policy_version=$9
        AND r.evaluator_version=$10 AND r.corpus_hash=$11`,
      [
        params.investigationId,
        params.revision,
        params.contentHash,
        descriptor.workflowDigest,
        descriptor.buildDigest,
        descriptor.model,
        descriptor.promptVersion,
        descriptor.schemaVersion,
        descriptor.policyVersion,
        descriptor.evaluatorVersion,
        descriptor.corpusHash,
      ],
    );
    if (!attested.rowCount) return false;
  }
  const result = await client.query(
    `SELECT 1
    FROM investigations i
    JOIN final_gate_results g ON g.investigation_id=i.investigation_id AND g.revision=i.current_revision
    JOIN investigation_job_attempts a ON a.job_attempt_id=$2 AND a.investigation_id=i.investigation_id
    WHERE i.investigation_id=$1 AND i.current_revision=$3 AND i.workflow_state='publish_ready'
      AND g.content_hash=$4 AND g.passed AND g.job_attempt_id=a.job_attempt_id
      AND a.lease_token=$5::uuid AND a.state='running' AND a.lease_expires_at >= now() + interval '20 seconds'
      AND (SELECT count(DISTINCT reviewer) FROM reviewer_results r
            WHERE r.investigation_id=i.investigation_id AND r.revision=i.current_revision
              AND r.reviewed_content_hash=$4 AND r.outcome='pass'
              AND r.reviewer IN ('factual','style','reliability','reachability')) = 4
      AND EXISTS (SELECT 1 FROM workflow_decisions d WHERE d.investigation_id=i.investigation_id AND d.revision=i.current_revision AND d.outcome='publish')
    FOR UPDATE OF i,a`,
    [
      params.investigationId,
      params.jobAttemptId,
      params.revision,
      params.contentHash,
      params.leaseToken,
    ],
  );
  return Boolean(result.rowCount);
}

async function controlsAllowPublication() {
  const controls = await new PostgresRuntimeControlService().get(true);
  const handle = process.env.SENSO_HANDLE;
  return (
    !controls.publicationBlocked &&
    controls.mode === "adk" &&
    process.env.PUBLIC_WIRE_PUBLICATION_ENABLED === "true" &&
    process.env.PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH === "false" &&
    Boolean(process.env.SENSO_API_KEY) &&
    Boolean(handle && /^[A-Za-z0-9_-]{2,80}$/.test(handle))
  );
}

async function confirmedPublication(params: PublishParams) {
  const result = await query<{ provider_id: string; provider_url: string }>(
    `SELECT p.provider_id,p.provider_url
    FROM publications p
    WHERE p.investigation_id=$1 AND p.revision=$2 AND p.content_hash=$3`,
    [params.investigationId, params.revision, params.contentHash],
  );
  return result.rows[0];
}

type Intent = {
  id: string;
  state: "pending" | "confirmed" | "unknown" | "failed";
  created: boolean;
  attemptCount: number;
  providerId?: string;
  providerUrl?: string;
};

export class PostgresPublicationService implements PublicationService {
  async publish(params: PublishParams) {
    const exactPayloadHash = civicBriefPublicationHash(params.brief);
    if (
      params.contentHash !== params.reviewedDraftHash ||
      params.contentHash !== exactPayloadHash
    )
      return { state: "failed" as const };
    const alreadyConfirmed = await confirmedPublication(params);
    if (alreadyConfirmed)
      return {
        state: "confirmed" as const,
        providerId: alreadyConfirmed.provider_id,
        providerUrl: alreadyConfirmed.provider_url,
      };
    if (!(await controlsAllowPublication()))
      return { state: "failed" as const };

    let intent = await withTransaction(
      async (client): Promise<Intent | undefined> => {
        if (!(await hasCurrentPublicationFence(client, params)))
          return undefined;
        const inserted = await client.query<{ publication_intent_id: string }>(
          `INSERT INTO publication_intents (investigation_id,revision,content_hash,state,provider_key,attempt_count)
        VALUES ($1,$2,$3,'pending',$4,1) ON CONFLICT (investigation_id,revision,content_hash) DO NOTHING RETURNING publication_intent_id`,
          [
            params.investigationId,
            params.revision,
            params.contentHash,
            `public-wire-${params.investigationId}-${params.revision}`,
          ],
        );
        if (inserted.rowCount)
          return {
            id: inserted.rows[0].publication_intent_id,
            state: "pending",
            created: true,
            attemptCount: 1,
          };
        const existing = await client.query<{
          publication_intent_id: string;
          state: Intent["state"];
          provider_id: string | null;
          provider_url: string | null;
          attempt_count: number;
        }>(
          "SELECT publication_intent_id,state,provider_id,provider_url,attempt_count FROM publication_intents WHERE investigation_id=$1 AND revision=$2 AND content_hash=$3 FOR UPDATE",
          [params.investigationId, params.revision, params.contentHash],
        );
        const row = existing.rows[0];
        return {
          id: row.publication_intent_id,
          state: row.state,
          created: false,
          attemptCount: row.attempt_count,
          providerId: row.provider_id || undefined,
          providerUrl: row.provider_url || undefined,
        };
      },
    );
    if (!intent) return { state: "failed" as const };
    if (!intent.created) {
      if (intent.state === "confirmed")
        return {
          state: "confirmed" as const,
          providerId: intent.providerId,
          providerUrl: intent.providerUrl,
        };
      if (intent.state === "failed") return { state: "failed" as const };
      if (intent.attemptCount >= 3) return { state: "unknown" as const };
      const reclaimed = await withTransaction(async (client) => {
        if (!(await hasCurrentPublicationFence(client, params))) return false;
        const result = await client.query(
          `UPDATE publication_intents
          SET state='pending',attempt_count=attempt_count+1,updated_at=now()
          WHERE publication_intent_id=$1 AND state IN ('pending','unknown') AND attempt_count < 3`,
          [intent!.id],
        );
        return Boolean(result.rowCount);
      });
      if (!reclaimed) return { state: "unknown" as const };
      intent = {
        ...intent,
        state: "pending",
        attemptCount: intent.attemptCount + 1,
      };
    }

    const idempotencyKey = `public-wire-${params.investigationId}-${params.revision}-${params.contentHash}`;
    let provider: Awaited<ReturnType<typeof publishCivicBrief>>;
    while (true) {
      const fenceStillCurrent = await withTransaction(async (client) => {
        const current = await hasCurrentPublicationFence(client, params);
        if (current)
          await client.query(
            `UPDATE investigations SET publication_state=CASE WHEN EXISTS (SELECT 1 FROM publications p WHERE p.investigation_id=$1) THEN 'confirmed' ELSE 'pending' END,updated_at=now()
          WHERE investigation_id=$1 AND current_revision=$2`,
            [params.investigationId, params.revision],
          );
        return current;
      });
      if (
        !(await controlsAllowPublication()) ||
        !fenceStillCurrent ||
        params.signal?.aborted
      ) {
        await withTransaction(async (client) => {
          await client.query(
            "UPDATE publication_intents SET state='failed',last_error_code='PUBLICATION_FENCE_LOST',updated_at=now() WHERE publication_intent_id=$1 AND state='pending'",
            [intent!.id],
          );
        });
        return { state: "failed" as const };
      }

      provider = await publishCivicBrief({
        brief: params.brief,
        idempotencyKey,
        signal: params.signal,
      });
      if (
        provider.state !== "unknown" ||
        intent.attemptCount >= 3 ||
        params.signal?.aborted
      )
        break;
      const incremented = await withTransaction(async (client) => {
        if (!(await hasCurrentPublicationFence(client, params))) return false;
        const result = await client.query(
          `UPDATE publication_intents SET attempt_count=attempt_count+1,updated_at=now()
          WHERE publication_intent_id=$1 AND state='pending' AND attempt_count < 3`,
          [intent!.id],
        );
        return Boolean(result.rowCount);
      });
      if (!incremented) break;
      intent = { ...intent, attemptCount: intent.attemptCount + 1 };
    }

    const controlsStillAllow = await controlsAllowPublication();
    return withTransaction(async (client) => {
      if (
        provider.state === "confirmed" &&
        provider.providerId &&
        provider.publishedUrl
      ) {
        if (
          !controlsStillAllow ||
          !(await hasCurrentPublicationFence(client, params))
        ) {
          await client.query(
            "UPDATE publication_intents SET state='unknown',last_error_code='PUBLICATION_FENCE_LOST_AFTER_PROVIDER',updated_at=now() WHERE publication_intent_id=$1 AND state='pending'",
            [intent.id],
          );
          await client.query(
            `UPDATE investigations SET publication_state=CASE WHEN EXISTS (SELECT 1 FROM publications p WHERE p.investigation_id=$1) THEN 'confirmed' ELSE 'unknown' END,updated_at=now()
            WHERE investigation_id=$1 AND current_revision=$2`,
            [params.investigationId, params.revision],
          );
          return { state: "unknown" as const };
        }
        await client.query(
          "UPDATE publication_intents SET state='confirmed',provider_id=$2,provider_url=$3,last_error_code=NULL,updated_at=now() WHERE publication_intent_id=$1 AND state='pending'",
          [intent.id, provider.providerId, provider.publishedUrl],
        );
        await client.query(
          `INSERT INTO publications (publication_intent_id,investigation_id,revision,content_hash,provider_id,provider_url)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (publication_intent_id) DO NOTHING`,
          [
            intent.id,
            params.investigationId,
            params.revision,
            params.contentHash,
            provider.providerId,
            provider.publishedUrl,
          ],
        );
        await client.query(
          "UPDATE investigations SET publication_state='confirmed',workflow_state='complete',updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
          [params.investigationId, params.revision],
        );
        return {
          state: "confirmed" as const,
          providerId: provider.providerId,
          providerUrl: provider.publishedUrl,
        };
      }
      const state = provider.state === "unknown" ? "unknown" : "failed";
      await client.query(
        "UPDATE publication_intents SET state=$2,last_error_code=$3,updated_at=now() WHERE publication_intent_id=$1 AND state='pending'",
        [intent.id, state, provider.errorCode || "PROVIDER_FAILURE"],
      );
      await client.query(
        `UPDATE investigations SET publication_state=CASE WHEN EXISTS (SELECT 1 FROM publications p WHERE p.investigation_id=$1) THEN 'confirmed' ELSE $2 END,updated_at=now()
        WHERE investigation_id=$1 AND current_revision=$3`,
        [params.investigationId, state, params.revision],
      );
      return { state: state as "unknown" | "failed" };
    });
  }
}
