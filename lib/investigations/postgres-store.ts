import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { query, withTransaction } from "@/lib/db/postgres";
import {
  publicInvestigationDetailSchema,
  publicInvestigationEventSchema,
  publicJobViewSchema,
  type PublicInvestigationDetail,
  type PublicInvestigationEvent,
  type PublicJobView,
} from "@/lib/public-wire-view-models/schemas";
import {
  evidenceMatrixSchema,
  publicWireEventEnvelopeSchema,
  reviewerResultSchema,
  sourceArtifactSchema,
  workflowDecisionSchema,
  type EvidenceLink,
  type EvidenceMatrix,
  type PublicWireEventEnvelope,
  type ReviewerResult,
  type SourceArtifact,
  type WorkflowDecision,
} from "@/lib/adk/public-wire/contracts";
import type {
  EventSink,
  InvestigationRepository,
  InvocationIdentity,
  JobRepository,
  TrajectorySpan,
} from "@/lib/adk/public-wire/services/interfaces";
import {
  changeAssessmentSchema,
  humanDispositionCommandSchema,
  sourceRefreshRequestSchema,
  type ChangeAssessment,
  type HumanDispositionCommand,
} from "./change-intelligence";
import {
  conflictFingerprint,
  persistedConflictSchema,
  validateDissentProposal,
  type PersistedConflict,
} from "./dissent-policy";
import type { DissentResolverOutput } from "@/lib/adk/public-wire/agents/dissent-resolver";

function opaque(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

function normalizeTopic(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(...parts: string[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

function publicJobState(state: string): PublicJobView["state"] {
  return state === "dead_letter"
    ? "failed"
    : publicJobViewSchema.shape.state.parse(state);
}

function initialProjection(params: {
  publicCaseKey: string;
  areaKey: string;
  areaDisplayName: string;
  topic: string;
  now: string;
  streamEpoch: string;
  runtimeMode: "real" | "shadow";
}): PublicInvestigationDetail {
  return publicInvestigationDetailSchema.parse({
    schemaVersion: "1",
    summary: {
      publicCaseKey: params.publicCaseKey,
      areaKey: params.areaKey,
      areaDisplayName: params.areaDisplayName,
      topic: params.topic,
      workflowState: "discovered",
      publicationState: "none",
      lifecycleState: "open",
      correctionState: "none",
      visibility: "private",
      freshnessState: "unknown",
      runtimeMode: params.runtimeMode,
      currentDetermination:
        "The request is queued for a source-backed check. No claim has been confirmed.",
      materialClaimCounts: { supported: 0, disputed: 0, missing: 0 },
      sourceReceiptCount: 0,
      openedAt: params.now,
      updatedAt: params.now,
      revision: 1,
    },
    projectionRevision: 1,
    snapshotCursor: 0,
    streamEpoch: params.streamEpoch,
    whoIsAffected: [],
    stageRail: [
      { stage: "capture", label: "Capture sources", state: "current" },
      { stage: "extract", label: "Identify claims", state: "pending" },
      { stage: "verify", label: "Check evidence", state: "pending" },
      { stage: "publish", label: "Publication gate", state: "pending" },
    ],
    claims: [],
    sourceReceipts: [],
    currentDecision: {
      outcome: "needs_evidence",
      reasonCodes: ["MISSING_EVIDENCE"],
    },
    events: [],
    revisions: [],
  });
}

export class PostgresPublicWireStore
  implements JobRepository, InvestigationRepository, EventSink
{
  async findByIdempotency(requesterScopeHash: string, idempotencyKey: string) {
    const result = await query<{
      job_receipt_key: string;
      public_case_key: string;
      state: string;
      created_at: Date;
      updated_at: Date;
      safe_error_code: PublicJobView["safeErrorCode"] | null;
    }>(
      `SELECT jr.job_receipt_key,pk.public_case_key,j.state,j.created_at,j.updated_at,j.safe_error_code
      FROM investigation_jobs j JOIN job_receipt_keys jr ON jr.job_id=j.job_id
      JOIN public_case_keys pk ON pk.investigation_id=j.investigation_id
      WHERE j.requester_scope_hash=$1 AND j.idempotency_key=$2`,
      [requesterScopeHash, idempotencyKey],
    );
    if (!result.rowCount) return undefined;
    const row = result.rows[0];
    const state = publicJobState(row.state);
    return publicJobViewSchema.parse({
      jobReceiptKey: row.job_receipt_key,
      publicCaseKey: row.public_case_key,
      state,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      retryable: state === "failed",
      safeErrorCode: row.safe_error_code ?? undefined,
    });
  }

  async createOrReuse(params: {
    areaKey: string;
    topic: string;
    sourceHint?: string;
    requesterScopeHash: string;
    idempotencyKey: string;
    runtimeMode?: "real" | "shadow";
    admissionLimit?: number;
    areaAdmissionLimit?: number;
  }): Promise<PublicJobView> {
    return withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`${params.requesterScopeHash}:${params.idempotencyKey}`],
      );
      const existing = await client.query<{
        job_receipt_key: string;
        public_case_key: string;
        state: string;
        created_at: Date;
        updated_at: Date;
        safe_error_code: PublicJobView["safeErrorCode"] | null;
      }>(
        `SELECT jr.job_receipt_key, pk.public_case_key, j.state, j.created_at, j.updated_at, j.safe_error_code
          FROM investigation_jobs j
          JOIN job_receipt_keys jr ON jr.job_id = j.job_id
          JOIN public_case_keys pk ON pk.investigation_id = j.investigation_id
         WHERE j.requester_scope_hash = $1 AND j.idempotency_key = $2`,
        [params.requesterScopeHash, params.idempotencyKey],
      );
      if (existing.rowCount) {
        const row = existing.rows[0];
        const state = publicJobState(row.state);
        return publicJobViewSchema.parse({
          jobReceiptKey: row.job_receipt_key,
          publicCaseKey: row.public_case_key,
          state,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          retryable: state === "failed",
          safeErrorCode: row.safe_error_code ?? undefined,
        });
      }

      if (params.admissionLimit !== undefined) {
        const areaLimit = Math.max(
          params.admissionLimit,
          Math.floor(params.areaAdmissionLimit ?? 200),
        );
        const areaScope = fingerprint("area-admission", params.areaKey);
        const areaAdmitted = await client.query(
          `INSERT INTO admission_quotas (area_key,requester_scope_hash,operation,window_started_at,used,limit_value)
          VALUES ($1,$2,'case-request-area',date_trunc('hour',now()),1,$3)
          ON CONFLICT (area_key,requester_scope_hash,operation,window_started_at)
          DO UPDATE SET used=admission_quotas.used+1 WHERE admission_quotas.used < admission_quotas.limit_value
          RETURNING used`,
          [params.areaKey, areaScope, areaLimit],
        );
        if (!areaAdmitted.rowCount)
          throw new Error("PUBLIC_WIRE_ADMISSION_REJECTED");
        const admitted = await client.query(
          `INSERT INTO admission_quotas (area_key,requester_scope_hash,operation,window_started_at,used,limit_value)
          VALUES ($1,$2,'case-request',date_trunc('hour',now()),1,$3)
          ON CONFLICT (area_key,requester_scope_hash,operation,window_started_at)
          DO UPDATE SET used=admission_quotas.used+1 WHERE admission_quotas.used < admission_quotas.limit_value
          RETURNING used`,
          [params.areaKey, params.requesterScopeHash, params.admissionLimit],
        );
        if (!admitted.rowCount)
          throw new Error("PUBLIC_WIRE_ADMISSION_REJECTED");
      }

      const area = await client.query<{ display_name: string }>(
        "SELECT display_name FROM area_registry WHERE area_key = $1 AND enabled",
        [params.areaKey],
      );
      if (!area.rowCount) throw new Error("AREA_NOT_FOUND");
      const normalized = normalizeTopic(params.topic);
      const investigation = await client.query<{
        investigation_id: string;
        opened_at: Date;
      }>(
        `INSERT INTO investigations (area_key, topic, normalized_topic, workflow_state, policy_version)
        VALUES ($1,$2,$3,'discovered',$4) RETURNING investigation_id, opened_at`,
        [
          params.areaKey,
          params.topic,
          normalized,
          process.env.PUBLIC_WIRE_POLICY_VERSION || "2026-07-19.1",
        ],
      );
      const investigationId = investigation.rows[0].investigation_id;
      await client.query(
        `INSERT INTO investigation_disclosures (investigation_id, visibility, requester_scope_hash, policy_version, actor)
        VALUES ($1,'private',$2,$3,'requester')`,
        [
          investigationId,
          params.requesterScopeHash,
          process.env.PUBLIC_WIRE_POLICY_VERSION || "2026-07-19.1",
        ],
      );

      const publicCaseKey = opaque("case");
      const jobReceiptKey = opaque("job");
      const streamEpoch = opaque("epoch");
      await client.query(
        "INSERT INTO public_case_keys (public_case_key, investigation_id, requester_scope_hash) VALUES ($1,$2,$3)",
        [publicCaseKey, investigationId, params.requesterScopeHash],
      );
      const job = await client.query<{
        job_id: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO investigation_jobs (investigation_id, requester_scope_hash, operation, requested_revision, input_fingerprint, idempotency_key, state)
        VALUES ($1,$2,'scan',1,$3,$4,'queued') RETURNING job_id, created_at, updated_at`,
        [
          investigationId,
          params.requesterScopeHash,
          fingerprint(params.areaKey, normalized, params.sourceHint || ""),
          params.idempotencyKey,
        ],
      );
      await client.query(
        "INSERT INTO job_receipt_keys (job_receipt_key, job_id, requester_scope_hash) VALUES ($1,$2,$3)",
        [jobReceiptKey, job.rows[0].job_id, params.requesterScopeHash],
      );
      await client.query(
        "INSERT INTO coverage_requests (investigation_id, requester_scope_hash, normalized_request, source_hint, state, idempotency_key) VALUES ($1,$2,$3,$4,'queued',$5)",
        [
          investigationId,
          params.requesterScopeHash,
          normalized,
          params.sourceHint || null,
          params.idempotencyKey,
        ],
      );
      const now = investigation.rows[0].opened_at.toISOString();
      const projection = initialProjection({
        publicCaseKey,
        areaKey: params.areaKey,
        areaDisplayName: area.rows[0].display_name,
        topic: params.topic,
        now,
        streamEpoch,
        runtimeMode: params.runtimeMode ?? "shadow",
      });
      await client.query(
        `INSERT INTO public_projection_snapshots (investigation_id, public_case_key, requester_scope_hash, visibility, schema_version, projection_revision, snapshot_cursor, stream_epoch, payload)
        VALUES ($1,$2,$3,'private','1',1,0,$4,$5::jsonb)`,
        [
          investigationId,
          publicCaseKey,
          params.requesterScopeHash,
          streamEpoch,
          JSON.stringify(projection),
        ],
      );
      return publicJobViewSchema.parse({
        jobReceiptKey,
        publicCaseKey,
        state: "queued",
        createdAt: job.rows[0].created_at.toISOString(),
        updatedAt: job.rows[0].updated_at.toISOString(),
        retryable: false,
      });
    });
  }

  async getJobByReceipt(jobReceiptKey: string, requesterScopeHash: string) {
    const result = await query<{
      public_case_key: string;
      state: string;
      created_at: Date;
      updated_at: Date;
      safe_error_code: PublicJobView["safeErrorCode"] | null;
    }>(
      `SELECT pk.public_case_key, j.state, j.created_at, j.updated_at, j.safe_error_code
      FROM job_receipt_keys jr JOIN investigation_jobs j ON j.job_id=jr.job_id JOIN public_case_keys pk ON pk.investigation_id=j.investigation_id
      WHERE jr.job_receipt_key=$1 AND jr.requester_scope_hash=$2`,
      [jobReceiptKey, requesterScopeHash],
    );
    if (!result.rowCount) return undefined;
    const row = result.rows[0];
    const state = publicJobState(row.state);
    return publicJobViewSchema.parse({
      jobReceiptKey,
      publicCaseKey: row.public_case_key,
      state,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      retryable: state === "failed",
      safeErrorCode: row.safe_error_code ?? undefined,
    });
  }

  async enqueueSourceRefresh(params: {
    investigationId: string;
    sourceWatchId: string;
    expectedRevision: number;
    requesterScopeHash: string;
    idempotencyKey: string;
  }): Promise<PublicJobView> {
    const parsed = sourceRefreshRequestSchema.parse(params);
    return withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [
          `source-refresh:${params.requesterScopeHash}:${parsed.idempotencyKey}`,
        ],
      );
      const existing = await client.query<{
        job_receipt_key: string;
        public_case_key: string;
        state: string;
        created_at: Date;
        updated_at: Date;
        safe_error_code: PublicJobView["safeErrorCode"] | null;
        investigation_id: string;
        source_watch_id: string;
        requested_revision: number;
      }>(
        `SELECT jr.job_receipt_key,pk.public_case_key,j.state,j.created_at,j.updated_at,j.safe_error_code,j.investigation_id,j.source_watch_id::text,j.requested_revision
        FROM investigation_jobs j JOIN job_receipt_keys jr ON jr.job_id=j.job_id
        JOIN public_case_keys pk ON pk.investigation_id=j.investigation_id
        WHERE j.requester_scope_hash=$1 AND j.idempotency_key=$2`,
        [params.requesterScopeHash, parsed.idempotencyKey],
      );
      if (existing.rowCount) {
        const row = existing.rows[0];
        if (
          row.investigation_id !== parsed.investigationId ||
          row.source_watch_id !== parsed.sourceWatchId ||
          row.requested_revision !== parsed.expectedRevision + 1
        )
          throw new Error("PUBLIC_WIRE_IDEMPOTENCY_KEY_REUSED");
        const state = publicJobState(row.state);
        return publicJobViewSchema.parse({
          jobReceiptKey: row.job_receipt_key,
          publicCaseKey: row.public_case_key,
          state,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          retryable: state === "failed",
          safeErrorCode: row.safe_error_code ?? undefined,
        });
      }
      const owned = await client.query<{ public_case_key: string }>(
        `SELECT pk.public_case_key FROM investigations i
        JOIN source_watches w ON w.investigation_id=i.investigation_id AND w.source_watch_id=$2 AND w.state='active'
        JOIN public_case_keys pk ON pk.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$3 FOR UPDATE OF i,w`,
        [parsed.investigationId, parsed.sourceWatchId, parsed.expectedRevision],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_STALE_SOURCE_REFRESH");
      const nextRevision = parsed.expectedRevision + 1;
      const job = await client.query<{
        job_id: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO investigation_jobs
        (investigation_id,requester_scope_hash,operation,source_watch_id,requested_revision,input_fingerprint,idempotency_key,state)
        VALUES ($1,$2,'source_refresh',$3,$4,$5,$6,'queued') RETURNING job_id,created_at,updated_at`,
        [
          parsed.investigationId,
          params.requesterScopeHash,
          parsed.sourceWatchId,
          nextRevision,
          fingerprint(
            parsed.investigationId,
            parsed.sourceWatchId,
            String(parsed.expectedRevision),
          ),
          parsed.idempotencyKey,
        ],
      );
      const jobReceiptKey = opaque("job");
      await client.query(
        "INSERT INTO job_receipt_keys (job_receipt_key,job_id,requester_scope_hash) VALUES ($1,$2,$3)",
        [jobReceiptKey, job.rows[0].job_id, params.requesterScopeHash],
      );
      return publicJobViewSchema.parse({
        jobReceiptKey,
        publicCaseKey: owned.rows[0].public_case_key,
        state: "queued",
        createdAt: job.rows[0].created_at.toISOString(),
        updatedAt: job.rows[0].updated_at.toISOString(),
        retryable: false,
      });
    });
  }

  async claimNext(
    workerId: string,
    leaseMs: number,
  ): Promise<InvocationIdentity | undefined> {
    const terminalInvestigations: string[] = [];
    const claimed = await withTransaction(async (client) => {
      const expired = await client.query<{
        job_id: string;
        investigation_id: string;
        attempt_number: number;
      }>(`UPDATE investigation_job_attempts
        SET state='failed',failure_code='LEASE_EXPIRED',finished_at=now()
        WHERE state='running' AND lease_expires_at < now()
        RETURNING job_id,investigation_id,attempt_number`);
      for (const attempt of expired.rows) {
        const retry = attempt.attempt_number < 3;
        await client.query(
          "UPDATE investigation_jobs SET state=$2,safe_error_code=$3,updated_at=now() WHERE job_id=$1 AND state='running'",
          [
            attempt.job_id,
            retry ? "queued" : "dead_letter",
            retry ? null : "SERVICE_UNAVAILABLE",
          ],
        );
        const requested = await client.query<{ requested_revision: number }>(
          "SELECT requested_revision FROM investigation_jobs WHERE job_id=$1",
          [attempt.job_id],
        );
        await client.query(
          "UPDATE investigations SET workflow_state=$2,updated_at=now() WHERE investigation_id=$1 AND current_revision=$3",
          [
            attempt.investigation_id,
            retry ? "discovered" : "failed",
            requested.rows[0]?.requested_revision,
          ],
        );
        if (!retry) terminalInvestigations.push(attempt.investigation_id);
      }
      const job = await client.query<{
        job_id: string;
        investigation_id: string;
        requested_revision: number;
        area_key: string;
        operation: "scan" | "source_refresh";
        source_watch_id: string | null;
        current_revision: number;
      }>(`SELECT j.job_id,j.investigation_id,j.requested_revision,i.area_key,j.operation,j.source_watch_id::text,i.current_revision
        FROM investigation_jobs j JOIN investigations i ON i.investigation_id=j.investigation_id
        WHERE j.state='queued' AND NOT EXISTS (SELECT 1 FROM investigation_job_attempts a WHERE a.investigation_id=j.investigation_id AND a.state='running')
        ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`);
      if (!job.rowCount) return undefined;
      const selected = job.rows[0];
      const resumeRevision =
        selected.operation === "source_refresh" &&
        selected.current_revision === selected.requested_revision &&
        Boolean(
          (
            await client.query(
              `SELECT 1 FROM source_observations o
        JOIN investigation_revisions r ON r.investigation_id=o.investigation_id AND r.revision=o.revision
        WHERE o.investigation_id=$1 AND o.source_watch_id=$2 AND o.revision=$3 AND r.revision_kind='source_refresh'`,
              [
                selected.investigation_id,
                selected.source_watch_id,
                selected.requested_revision,
              ],
            )
          ).rowCount,
        );
      const count = await client.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM investigation_job_attempts WHERE job_id=$1",
        [selected.job_id],
      );
      const attemptNumber = Number(count.rows[0].count) + 1;
      if (attemptNumber > 3) {
        await client.query(
          "UPDATE investigation_jobs SET state='dead_letter',safe_error_code='SERVICE_UNAVAILABLE',updated_at=now() WHERE job_id=$1",
          [selected.job_id],
        );
        await client.query(
          "UPDATE investigations SET workflow_state='failed',updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
          [selected.investigation_id, selected.requested_revision],
        );
        terminalInvestigations.push(selected.investigation_id);
        return undefined;
      }
      const adkSessionId = `revision:${selected.requested_revision}:attempt:${randomBytes(16).toString("hex")}`;
      const attempt = await client.query<{
        job_attempt_id: string;
        lease_token: string;
      }>(
        `INSERT INTO investigation_job_attempts (job_id,investigation_id,attempt_number,state,worker_id,lease_expires_at,adk_session_id)
        VALUES ($1,$2,$3,'running',$4,now()+($5::text || ' milliseconds')::interval,$6) RETURNING job_attempt_id,lease_token::text`,
        [
          selected.job_id,
          selected.investigation_id,
          attemptNumber,
          workerId,
          leaseMs,
          adkSessionId,
        ],
      );
      await client.query(
        "UPDATE investigation_jobs SET state='running',updated_at=now() WHERE job_id=$1",
        [selected.job_id],
      );
      const expectedCurrentRevision =
        selected.operation === "source_refresh" && !resumeRevision
          ? selected.requested_revision - 1
          : selected.requested_revision;
      const stateChange =
        selected.operation === "source_refresh"
          ? await client.query(
              `UPDATE investigations SET freshness_state='stale',workflow_state='verifying',updated_at=now()
            WHERE investigation_id=$1 AND current_revision=$2
              AND NOT EXISTS (SELECT 1 FROM publication_intents WHERE investigation_id=$1 AND state IN ('pending','unknown'))`,
              [selected.investigation_id, expectedCurrentRevision],
            )
          : await client.query(
              "UPDATE investigations SET workflow_state=CASE WHEN publication_state='confirmed' THEN 'complete' ELSE 'gathering' END,updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
              [selected.investigation_id, selected.requested_revision],
            );
      if (!stateChange.rowCount) {
        await client.query(
          "UPDATE investigation_job_attempts SET state='failed',failure_code='STALE_REVISION',finished_at=now() WHERE job_attempt_id=$1",
          [attempt.rows[0].job_attempt_id],
        );
        await client.query(
          "UPDATE investigation_jobs SET state='failed',safe_error_code='POLICY_REJECTED',updated_at=now() WHERE job_id=$1",
          [selected.job_id],
        );
        return undefined;
      }
      return {
        investigationId: selected.investigation_id,
        jobId: selected.job_id,
        jobAttemptId: attempt.rows[0].job_attempt_id,
        areaKey: selected.area_key,
        requestedRevision: selected.requested_revision,
        leaseToken: attempt.rows[0].lease_token,
        operation: selected.operation,
        sourceWatchId: selected.source_watch_id ?? undefined,
        adkSessionId,
        resumeRevision,
      };
    });
    for (const investigationId of terminalInvestigations)
      await this.updateTerminalProjection(investigationId, "failed", "TIMEOUT");
    return claimed;
  }

  async bindInvocation(
    jobAttemptId: string,
    leaseToken: string,
    invocationId: string,
  ) {
    await query(
      "UPDATE investigation_job_attempts SET invocation_id=$3 WHERE job_attempt_id=$1 AND lease_token=$2::uuid AND state='running' AND lease_expires_at >= now() AND invocation_id IS NULL",
      [jobAttemptId, leaseToken, invocationId],
    );
  }

  async heartbeat(jobAttemptId: string, leaseToken: string, leaseMs: number) {
    const result = await query(
      `UPDATE investigation_job_attempts SET heartbeat_at=now(),lease_expires_at=now()+($3::text || ' milliseconds')::interval
      WHERE job_attempt_id=$1 AND lease_token=$2::uuid AND state='running' AND lease_expires_at >= now()`,
      [jobAttemptId, leaseToken, leaseMs],
    );
    return Boolean(result.rowCount);
  }

  async complete(
    jobAttemptId: string,
    leaseToken: string,
    outcome: "complete" | "failed" | "cancelled",
    errorCode?: string,
  ) {
    return withTransaction(async (client) => {
      const attempt = await client.query<{
        job_id: string;
        investigation_id: string;
        attempt_number: number;
      }>(
        "UPDATE investigation_job_attempts SET state=$3,failure_code=$4,finished_at=now() WHERE job_attempt_id=$1 AND lease_token=$2::uuid AND state='running' AND lease_expires_at >= now() RETURNING job_id,investigation_id,attempt_number",
        [jobAttemptId, leaseToken, outcome, errorCode || null],
      );
      if (!attempt.rowCount) return "lost" as const;
      const retryable =
        outcome === "failed" &&
        ["TIMEOUT", "WORKER_ERROR", "PROVIDER_UNAVAILABLE"].includes(
          errorCode || "",
        ) &&
        attempt.rows[0].attempt_number < 3;
      const jobState = retryable
        ? "queued"
        : outcome === "failed" && attempt.rows[0].attempt_number >= 3
          ? "dead_letter"
          : outcome;
      await client.query(
        "UPDATE investigation_jobs SET state=$2,safe_error_code=$3,updated_at=now() WHERE job_id=$1",
        [
          attempt.rows[0].job_id,
          jobState,
          jobState === "failed" || jobState === "dead_letter"
            ? "SERVICE_UNAVAILABLE"
            : null,
        ],
      );
      const requested = await client.query<{ requested_revision: number }>(
        "SELECT requested_revision FROM investigation_jobs WHERE job_id=$1",
        [attempt.rows[0].job_id],
      );
      if (outcome !== "complete")
        await client.query(
          "UPDATE investigations SET workflow_state=$2,updated_at=now() WHERE investigation_id=$1 AND current_revision=$3 AND publication_state <> 'confirmed'",
          [
            attempt.rows[0].investigation_id,
            retryable
              ? "discovered"
              : outcome === "cancelled"
                ? "cancelled"
                : "failed",
            requested.rows[0]?.requested_revision,
          ],
        );
      return retryable
        ? ("retried" as const)
        : outcome === "complete"
          ? ("completed" as const)
          : ("terminal" as const);
    });
  }

  async updateTerminalProjection(
    investigationId: string,
    terminal: "held" | "failed",
    errorCode:
      | "PROVIDER_UNAVAILABLE"
      | "TIMEOUT"
      | "PERSISTENCE_UNAVAILABLE" = "PROVIDER_UNAVAILABLE",
    fence?: { jobAttemptId: string; leaseToken: string },
    runtimeMode?: PublicInvestigationDetail["summary"]["runtimeMode"],
  ) {
    const result = await query<{ payload: unknown }>(
      "SELECT payload FROM public_projection_snapshots WHERE investigation_id=$1",
      [investigationId],
    );
    if (!result.rowCount) return;
    const current = publicInvestigationDetailSchema.parse(
      result.rows[0].payload,
    );
    const now = new Date().toISOString();
    const cursor = current.snapshotCursor + 1;
    const event: PublicInvestigationEvent =
      terminal === "held"
        ? {
            cursor,
            publicEventKey: opaque("event"),
            occurredAt: now,
            stage: "capture",
            status: "held",
            eventCode: "WORKFLOW_COMPLETED",
            safeParams: { outcome: "held" },
            sourceReceiptKeys: [],
            claimKeys: [],
          }
        : {
            cursor,
            publicEventKey: opaque("event"),
            occurredAt: now,
            stage: "capture",
            status: "failed",
            eventCode: "WORKFLOW_FAILED",
            safeParams: { errorCode },
            sourceReceiptKeys: [],
            claimKeys: [],
          };
    const projection = publicInvestigationDetailSchema.parse({
      ...current,
      projectionRevision: current.projectionRevision + 1,
      snapshotCursor: cursor,
      summary: {
        ...current.summary,
        workflowState: terminal,
        runtimeMode: runtimeMode ?? current.summary.runtimeMode,
        updatedAt: now,
        currentDetermination:
          terminal === "held"
            ? "This shadow request was not selected within the configured sampling and budget controls."
            : "The check stopped safely without confirming or publishing a claim.",
      },
      stageRail: current.stageRail.map((stage) =>
        stage.state === "complete"
          ? stage
          : { ...stage, state: "blocked" as const },
      ),
      currentDecision: {
        outcome: "hold",
        reasonCodes: [
          terminal === "held" ? "POLICY_BLOCK" : "PROVIDER_UNAVAILABLE",
        ],
      },
      events: [...current.events, event].slice(-200),
    });
    await this.updateProjection(investigationId, projection, [event], fence);
  }

  async loadJobInput(investigationId: string) {
    const result = await query<{
      area_key: string;
      topic: string;
      current_revision: number;
      public_case_key: string;
      requester_scope_hash: string;
      opened_at: Date;
      projection_revision: number;
      snapshot_cursor: string;
      stream_epoch: string;
      current_projection: unknown;
    }>(
      `SELECT i.area_key,i.topic,i.current_revision,i.opened_at,pk.public_case_key,pk.requester_scope_hash,s.projection_revision,s.snapshot_cursor::text,s.stream_epoch,s.payload AS current_projection
      FROM investigations i JOIN public_case_keys pk ON pk.investigation_id=i.investigation_id
      JOIN public_projection_snapshots s ON s.investigation_id=i.investigation_id WHERE i.investigation_id=$1`,
      [investigationId],
    );
    return result.rows[0];
  }

  async loadSourceRefreshInput(identity: InvocationIdentity) {
    if (identity.operation !== "source_refresh" || !identity.sourceWatchId)
      return undefined;
    const result = await query<{
      canonical_url: string;
      source_id: string;
      access_classification: "public" | "internal-restricted";
      normalized_content_hash: string | null;
      source_observation_id: string | null;
      prior_observation_id: string | null;
      observation_revision: number | null;
      candidate_payload: unknown;
    }>(
      `SELECT w.canonical_url,w.source_id,w.access_classification,
        o.normalized_content_hash,o.source_observation_id,o.prior_observation_id,o.revision AS observation_revision,c.payload AS candidate_payload
      FROM source_watches w
      LEFT JOIN LATERAL (SELECT normalized_content_hash,source_observation_id,prior_observation_id,revision FROM source_observations
        WHERE source_watch_id=w.source_watch_id ORDER BY observed_at DESC LIMIT 1) o ON true
      LEFT JOIN LATERAL (SELECT payload FROM investigation_candidates WHERE investigation_id=w.investigation_id ORDER BY revision DESC LIMIT 1) c ON true
      WHERE w.source_watch_id=$1 AND w.investigation_id=$2 AND w.state='active'`,
      [identity.sourceWatchId, identity.investigationId],
    );
    return result.rows[0];
  }

  async loadAffectedClaimLineages(
    investigationId: string,
    sourceWatchId: string,
  ) {
    const result = await query<{
      claim_lineage_id: string;
      normalized_text: string;
      claim_type: string;
      importance: string;
    }>(
      `SELECT DISTINCT ON (m.claim_lineage_id)
        m.claim_lineage_id,c.normalized_text,c.claim_type,c.importance
      FROM source_watches w LEFT JOIN source_watch_aliases wa ON wa.source_watch_id=w.source_watch_id
      JOIN evidence_links e ON e.source_url=w.canonical_url OR e.source_url=wa.canonical_url
      JOIN claims c ON c.claim_id=e.claim_id AND c.investigation_id=w.investigation_id
      JOIN claim_lineage_members m ON m.claim_id=c.claim_id
      WHERE w.source_watch_id=$1 AND w.investigation_id=$2
      ORDER BY m.claim_lineage_id,c.revision DESC`,
      [sourceWatchId, investigationId],
    );
    return result.rows;
  }

  async persistUnchangedSourceRefresh(
    identity: InvocationIdentity,
    normalizedContentHash: string,
    httpStatus: number,
  ) {
    if (identity.operation !== "source_refresh" || !identity.sourceWatchId)
      throw new Error("PUBLIC_WIRE_NOT_SOURCE_REFRESH");
    const sourceWatchId = identity.sourceWatchId;
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          identity.investigationId,
          identity.resumeRevision
            ? identity.requestedRevision
            : identity.requestedRevision - 1,
          identity.jobAttemptId,
          identity.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      const prior = await client.query<{
        normalized_content_hash: string | null;
      }>(
        `SELECT normalized_content_hash FROM source_observations
        WHERE source_watch_id=$1 ORDER BY observed_at DESC LIMIT 1`,
        [sourceWatchId],
      );
      if (prior.rows[0]?.normalized_content_hash !== normalizedContentHash)
        throw new Error("PUBLIC_WIRE_SOURCE_HASH_CHANGED");
      await client.query(
        `INSERT INTO source_checks
        (source_watch_id,investigation_id,requested_revision,job_attempt_id,request_fingerprint,outcome,http_status)
        VALUES ($1,$2,$3,$4,$5,'unchanged',$6) ON CONFLICT DO NOTHING`,
        [
          sourceWatchId,
          identity.investigationId,
          identity.requestedRevision,
          identity.jobAttemptId,
          fingerprint(identity.jobId, sourceWatchId, normalizedContentHash),
          httpStatus,
        ],
      );
      await client.query(
        "UPDATE investigations SET freshness_state='current',workflow_state=CASE WHEN publication_state='confirmed' THEN 'complete' ELSE workflow_state END,updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
        [
          identity.investigationId,
          identity.resumeRevision
            ? identity.requestedRevision
            : identity.requestedRevision - 1,
        ],
      );
    });
  }

  async persistSourceObservation(params: {
    identity: InvocationIdentity;
    sourceId: string;
    canonicalUrl: string;
    accessClassification: "public" | "internal-restricted";
    normalizedContentHash: string;
    artifactId: string;
    artifactVersion: number;
    httpStatus: number;
  }) {
    return withTransaction(async (client) => {
      const expectedCurrentRevision =
        params.identity.operation === "source_refresh" &&
        !params.identity.resumeRevision
          ? params.identity.requestedRevision - 1
          : params.identity.requestedRevision;
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          params.identity.investigationId,
          expectedCurrentRevision,
          params.identity.jobAttemptId,
          params.identity.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      let sourceWatchId: string;
      if (params.identity.sourceWatchId) {
        const watch = await client.query<{
          source_watch_id: string;
          source_id: string;
          canonical_url: string;
          access_classification: "public" | "internal-restricted";
        }>(
          `SELECT source_watch_id,source_id,canonical_url,access_classification FROM source_watches
          WHERE source_watch_id=$1 AND investigation_id=$2 FOR UPDATE`,
          [params.identity.sourceWatchId, params.identity.investigationId],
        );
        const currentWatch = watch.rows[0];
        if (
          !currentWatch ||
          currentWatch.source_id !== params.sourceId ||
          currentWatch.access_classification !== params.accessClassification
        )
          throw new Error("PUBLIC_WIRE_SOURCE_WATCH_MISMATCH");
        sourceWatchId = currentWatch.source_watch_id;
        for (const url of [currentWatch.canonical_url, params.canonicalUrl]) {
          await client.query(
            `INSERT INTO source_watch_aliases (source_watch_id,canonical_url) VALUES ($1,$2)
            ON CONFLICT (source_watch_id,canonical_url) DO UPDATE SET last_seen_at=now()`,
            [sourceWatchId, url],
          );
        }
        if (currentWatch.canonical_url !== params.canonicalUrl)
          await client.query(
            "UPDATE source_watches SET canonical_url=$2,updated_at=now() WHERE source_watch_id=$1",
            [sourceWatchId, params.canonicalUrl],
          );
      } else {
        const watch = await client.query<{ source_watch_id: string }>(
          `INSERT INTO source_watches
          (investigation_id,source_id,canonical_url,access_classification)
          VALUES ($1,$2,$3,$4) ON CONFLICT (investigation_id,source_id,canonical_url)
          DO UPDATE SET updated_at=now() RETURNING source_watch_id`,
          [
            params.identity.investigationId,
            params.sourceId,
            params.canonicalUrl,
            params.accessClassification,
          ],
        );
        sourceWatchId = watch.rows[0].source_watch_id;
        await client.query(
          `INSERT INTO source_watch_aliases (source_watch_id,canonical_url) VALUES ($1,$2)
          ON CONFLICT (source_watch_id,canonical_url) DO UPDATE SET last_seen_at=now()`,
          [sourceWatchId, params.canonicalUrl],
        );
      }
      const prior = await client.query<{
        source_observation_id: string;
        normalized_content_hash: string | null;
        prior_observation_id: string | null;
      }>(
        `SELECT source_observation_id,normalized_content_hash,prior_observation_id FROM source_observations
        WHERE source_watch_id=$1 ORDER BY observed_at DESC LIMIT 1 FOR UPDATE`,
        [sourceWatchId],
      );
      const unchanged =
        prior.rows[0]?.normalized_content_hash === params.normalizedContentHash;
      const requestFingerprint = fingerprint(
        params.identity.jobId,
        sourceWatchId,
        params.normalizedContentHash,
      );
      const check = await client.query<{ source_check_id: string }>(
        `INSERT INTO source_checks
        (source_watch_id,investigation_id,requested_revision,job_attempt_id,request_fingerprint,outcome,http_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (source_watch_id,request_fingerprint)
        DO UPDATE SET request_fingerprint=EXCLUDED.request_fingerprint RETURNING source_check_id`,
        [
          sourceWatchId,
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.identity.jobAttemptId,
          requestFingerprint,
          unchanged ? "unchanged" : "changed",
          params.httpStatus,
        ],
      );
      if (unchanged) {
        if (!params.identity.resumeRevision)
          await client.query(
            "UPDATE investigations SET freshness_state='current',updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
            [params.identity.investigationId, expectedCurrentRevision],
          );
        return {
          changed: false as const,
          sourceWatchId,
          observationId: prior.rows[0]?.source_observation_id,
          priorObservationId: prior.rows[0]?.prior_observation_id ?? undefined,
        };
      }
      if (params.identity.operation === "source_refresh") {
        const advanced = await client.query(
          `UPDATE investigations SET current_revision=$2,workflow_state='verifying',freshness_state='stale',updated_at=now()
          WHERE investigation_id=$1 AND current_revision=$3
            AND NOT EXISTS (SELECT 1 FROM publication_intents WHERE investigation_id=$1 AND state IN ('pending','unknown'))`,
          [
            params.identity.investigationId,
            params.identity.requestedRevision,
            expectedCurrentRevision,
          ],
        );
        if (!advanced.rowCount)
          throw new Error("PUBLIC_WIRE_SOURCE_REFRESH_REVISION_FENCE_LOST");
        await client.query(
          `INSERT INTO investigation_revisions
          (investigation_id,revision,parent_revision,revision_kind,job_attempt_id,input_fingerprint)
          VALUES ($1,$2,$3,'source_refresh',$4,$5) ON CONFLICT DO NOTHING`,
          [
            params.identity.investigationId,
            params.identity.requestedRevision,
            expectedCurrentRevision,
            params.identity.jobAttemptId,
            fingerprint(
              params.normalizedContentHash,
              String(params.identity.requestedRevision),
            ),
          ],
        );
      } else {
        await client.query(
          `INSERT INTO investigation_revisions
          (investigation_id,revision,parent_revision,revision_kind,job_attempt_id,input_fingerprint)
          VALUES ($1,$2,NULL,'initial',$3,$4) ON CONFLICT DO NOTHING`,
          [
            params.identity.investigationId,
            params.identity.requestedRevision,
            params.identity.jobAttemptId,
            fingerprint(params.normalizedContentHash, "initial"),
          ],
        );
      }
      const observation = await client.query<{ source_observation_id: string }>(
        `INSERT INTO source_observations
        (source_check_id,source_watch_id,investigation_id,revision,prior_observation_id,normalized_content_hash,artifact_id,artifact_version)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (source_watch_id,normalized_content_hash) DO UPDATE SET normalized_content_hash=EXCLUDED.normalized_content_hash
        RETURNING source_observation_id`,
        [
          check.rows[0].source_check_id,
          sourceWatchId,
          params.identity.investigationId,
          params.identity.requestedRevision,
          prior.rows[0]?.source_observation_id ?? null,
          params.normalizedContentHash,
          params.artifactId,
          params.artifactVersion,
        ],
      );
      return {
        changed: true as const,
        sourceWatchId,
        observationId: observation.rows[0].source_observation_id,
        priorObservationId: prior.rows[0]?.source_observation_id,
      };
    });
  }

  async persistSourceRefreshFailure(
    identity: InvocationIdentity,
    httpStatus?: number,
  ) {
    if (identity.operation !== "source_refresh" || !identity.sourceWatchId)
      return;
    const sourceWatchId = identity.sourceWatchId;
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          identity.investigationId,
          identity.resumeRevision
            ? identity.requestedRevision
            : identity.requestedRevision - 1,
          identity.jobAttemptId,
          identity.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      await client.query(
        `INSERT INTO source_checks
        (source_watch_id,investigation_id,requested_revision,job_attempt_id,request_fingerprint,outcome,http_status)
        VALUES ($1,$2,$3,$4,$5,'unreachable',$6) ON CONFLICT DO NOTHING`,
        [
          sourceWatchId,
          identity.investigationId,
          identity.requestedRevision,
          identity.jobAttemptId,
          fingerprint(
            identity.jobId,
            sourceWatchId,
            "unreachable",
            String(httpStatus ?? "unknown"),
          ),
          httpStatus ?? null,
        ],
      );
      await client.query(
        "UPDATE investigations SET freshness_state='stale',updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
        [
          identity.investigationId,
          identity.resumeRevision
            ? identity.requestedRevision
            : identity.requestedRevision - 1,
        ],
      );
    });
  }

  async persistChangeAssessment(params: {
    identity: InvocationIdentity;
    priorObservationId: string;
    currentObservationId: string;
    assessment: ChangeAssessment;
  }) {
    const parsed = changeAssessmentSchema.parse(params.assessment);
    if (
      params.identity.operation !== "source_refresh" ||
      !params.identity.sourceWatchId
    )
      throw new Error("PUBLIC_WIRE_NOT_SOURCE_REFRESH");
    const sourceWatchId = params.identity.sourceWatchId;
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.identity.jobAttemptId,
          params.identity.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      const observations = await client.query<{
        source_observation_id: string;
        normalized_content_hash: string;
      }>(
        `SELECT source_observation_id,normalized_content_hash FROM source_observations
        WHERE source_observation_id = ANY($1::uuid[]) AND source_watch_id=$2`,
        [
          [params.priorObservationId, params.currentObservationId],
          sourceWatchId,
        ],
      );
      if (observations.rowCount !== 2)
        throw new Error("PUBLIC_WIRE_CHANGE_OBSERVATION_LINEAGE_MISSING");
      const assessment = await client.query<{ change_assessment_id: string }>(
        `INSERT INTO change_assessments
        (investigation_id,revision,source_watch_id,prior_observation_id,current_observation_id,normalized_diff_hash,outcome,requires_human_disposition,policy_version,job_attempt_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (investigation_id,revision,prior_observation_id,current_observation_id) DO UPDATE SET outcome=EXCLUDED.outcome,requires_human_disposition=EXCLUDED.requires_human_disposition
        RETURNING change_assessment_id`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          sourceWatchId,
          params.priorObservationId,
          params.currentObservationId,
          parsed.normalizedDiffHash,
          parsed.outcome,
          parsed.requiresHumanDisposition,
          process.env.PUBLIC_WIRE_POLICY_VERSION || "2026-07-19.1",
          params.identity.jobAttemptId,
        ],
      );
      for (const delta of parsed.deltas) {
        await client.query(
          `INSERT INTO change_deltas (change_assessment_id,claim_lineage_id,delta_kind,public_safe)
          SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM claim_lineages WHERE claim_lineage_id=$2 AND investigation_id=$5)
            AND NOT EXISTS (SELECT 1 FROM change_deltas WHERE change_assessment_id=$1 AND claim_lineage_id=$2)`,
          [
            assessment.rows[0].change_assessment_id,
            delta.claimLineageId,
            delta.kind,
            delta.publicSafe,
            params.identity.investigationId,
          ],
        );
        if (delta.publicSafe)
          await client.query(
            `UPDATE change_deltas SET before_excerpt=$3,after_excerpt=$4
          WHERE change_assessment_id=$1 AND claim_lineage_id=$2 AND public_safe`,
            [
              assessment.rows[0].change_assessment_id,
              delta.claimLineageId,
              delta.beforeExcerpt ?? null,
              delta.afterExcerpt ?? null,
            ],
          );
      }
      return parsed;
    });
    return parsed;
  }

  async loadClaimLineageSnapshot(investigationId: string, revision: number) {
    const result = await query<{
      claim_lineage_id: string;
      normalized_text: string;
      status:
        | "proposed"
        | "supported"
        | "disputed"
        | "unsupported"
        | "superseded";
      importance: "material" | "contextual";
      public_safe: boolean;
    }>(
      `SELECT m.claim_lineage_id,c.normalized_text,c.status,c.importance,
        COALESCE(bool_and(a.access_classification='public' AND EXISTS (SELECT 1 FROM source_watches w LEFT JOIN source_watch_aliases wa ON wa.source_watch_id=w.source_watch_id WHERE w.investigation_id=c.investigation_id AND w.access_classification='public' AND (w.canonical_url=e.source_url OR wa.canonical_url=e.source_url))),false) AS public_safe
      FROM claim_lineage_members m JOIN claims c ON c.claim_id=m.claim_id
      LEFT JOIN evidence_links e ON e.claim_id=c.claim_id
      LEFT JOIN source_artifacts a ON a.artifact_id=e.artifact_id AND a.artifact_version=e.artifact_version
      WHERE c.investigation_id=$1 AND c.revision=$2
      GROUP BY m.claim_lineage_id,c.claim_id,c.normalized_text,c.status,c.importance`,
      [investigationId, revision],
    );
    return result.rows.map((row) => ({
      claimLineageId: row.claim_lineage_id,
      text: row.normalized_text,
      status: row.status,
      importance: row.importance,
      publicSafe: row.public_safe,
    }));
  }

  async persistDraftDependencies(params: {
    identity: InvocationIdentity;
    contentHash: string;
    claimIds: string[];
  }) {
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.identity.jobAttemptId,
          params.identity.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      for (const claimId of [...new Set(params.claimIds)]) {
        await client.query(
          `INSERT INTO draft_dependencies (investigation_id,revision,draft_content_hash,claim_lineage_id,claim_id)
          SELECT $1,$2,$3,claim_lineage_id,claim_id FROM claim_lineage_members
          WHERE claim_id=$4 AND investigation_id=$1 ON CONFLICT DO NOTHING`,
          [
            params.identity.investigationId,
            params.identity.requestedRevision,
            params.contentHash,
            claimId,
          ],
        );
      }
    });
  }

  async setWorkflowState(
    investigationId: string,
    expectedRevision: number,
    state: "needs_evidence" | "held" | "publish_ready" | "complete" | "failed",
    fence?: { jobAttemptId: string; leaseToken: string },
  ) {
    const result = fence
      ? await query(
          `UPDATE investigations i SET workflow_state=$3,updated_at=now()
          WHERE i.investigation_id=$1 AND i.current_revision=$2 AND EXISTS (
            SELECT 1 FROM investigation_job_attempts a WHERE a.job_attempt_id=$4 AND a.investigation_id=i.investigation_id
              AND a.lease_token=$5::uuid AND a.state='running' AND a.lease_expires_at >= now()
          )`,
          [
            investigationId,
            expectedRevision,
            state,
            fence.jobAttemptId,
            fence.leaseToken,
          ],
        )
      : await query(
          "UPDATE investigations SET workflow_state=$3,updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
          [investigationId, expectedRevision, state],
        );
    if (!result.rowCount)
      throw new Error("PUBLIC_WIRE_STALE_INVESTIGATION_REVISION");
  }

  async loadForMutation(
    investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
  ) {
    const result = await query<{ current_revision: number }>(
      `SELECT i.current_revision FROM investigations i
      JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
      WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3
        AND a.lease_token=$4::uuid AND a.state='running' AND a.lease_expires_at >= now()`,
      [investigationId, expectedRevision, jobAttemptId, leaseToken],
    );
    return result.rowCount
      ? { revision: result.rows[0].current_revision, leaseToken }
      : undefined;
  }

  async persistEvidence(
    _investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
    _matrix: EvidenceMatrix,
    _decision: WorkflowDecision,
  ) {
    const matrix = evidenceMatrixSchema.parse(_matrix);
    const decision = workflowDecisionSchema.parse(_decision);
    if (matrix.investigationId !== _investigationId)
      throw new Error("PUBLIC_WIRE_INVESTIGATION_MISMATCH");
    await withTransaction(async (client) => {
      const current = await client.query<{ current_revision: number }>(
        `SELECT i.current_revision FROM investigations i
        JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3
          AND a.lease_token=$4::uuid AND a.state='running' AND a.lease_expires_at >= now()
        FOR UPDATE OF i,a`,
        [_investigationId, expectedRevision, jobAttemptId, leaseToken],
      );
      if (!current.rowCount || matrix.revision !== expectedRevision)
        throw new Error("PUBLIC_WIRE_STALE_INVESTIGATION_REVISION");
      for (const claim of matrix.claims) {
        await client.query(
          `INSERT INTO claims (claim_id,investigation_id,revision,normalized_text,claim_type,importance,status,created_by_event_id,prompt_version,schema_version)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (claim_id) DO NOTHING`,
          [
            claim.claimId,
            claim.investigationId,
            claim.revision,
            claim.normalizedText,
            claim.claimType,
            claim.importance,
            claim.status,
            claim.createdByEventId,
            claim.promptVersion,
            claim.schemaVersion,
          ],
        );
        const lineage = claim.claimLineageId
          ? await client.query<{ claim_lineage_id: string }>(
              `SELECT claim_lineage_id FROM claim_lineages WHERE claim_lineage_id=$1 AND investigation_id=$2`,
              [claim.claimLineageId, claim.investigationId],
            )
          : await client.query<{ claim_lineage_id: string }>(
              `INSERT INTO claim_lineages (investigation_id,lineage_key)
              VALUES ($1,$2) ON CONFLICT (investigation_id,lineage_key) DO UPDATE SET lineage_key=EXCLUDED.lineage_key RETURNING claim_lineage_id`,
              [
                claim.investigationId,
                fingerprint(claim.claimId, claim.claimType),
              ],
            );
        if (!lineage.rowCount)
          throw new Error("PUBLIC_WIRE_CLAIM_LINEAGE_MISMATCH");
        await client.query(
          `INSERT INTO claim_lineage_members (claim_lineage_id,claim_id,investigation_id,revision)
          VALUES ($1,$2,$3,$4) ON CONFLICT (claim_id) DO NOTHING`,
          [
            lineage.rows[0].claim_lineage_id,
            claim.claimId,
            claim.investigationId,
            claim.revision,
          ],
        );
      }
      for (const link of matrix.evidenceLinks) {
        await client.query(
          `INSERT INTO evidence_links (evidence_link_id,claim_id,artifact_id,artifact_version,source_url,supporting_excerpt,start_offset,end_offset,page_number,relation,source_authority,extractor_event_id,verifier_event_id,verified_at,confidence)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (evidence_link_id) DO NOTHING`,
          [
            link.evidenceLinkId,
            link.claimId,
            link.artifactId,
            link.artifactVersion,
            link.sourceUrl,
            link.supportingExcerpt,
            link.startOffset ?? null,
            link.endOffset ?? null,
            link.pageNumber ?? null,
            link.relation,
            link.sourceAuthority,
            link.extractorEventId,
            link.verifierEventId ?? null,
            link.verifiedAt ?? null,
            link.confidence,
          ],
        );
      }
      await client.query(
        `INSERT INTO workflow_decisions (investigation_id,revision,outcome,reason_codes,blocking_claim_ids,event_id,policy_version)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (investigation_id,revision,event_id) DO NOTHING`,
        [
          _investigationId,
          matrix.revision,
          decision.outcome,
          decision.reasonCodes,
          decision.blockingClaimIds,
          decision.eventId,
          decision.policyVersion,
        ],
      );
      for (const contradiction of matrix.contradictions) {
        const lineage = await client.query<{ claim_lineage_id: string }>(
          `SELECT claim_lineage_id FROM claim_lineage_members WHERE claim_id=$1`,
          [contradiction.claimId],
        );
        const facts = await client.query<{
          evidence_link_id: string;
          relation: "supports" | "contradicts" | "contextualizes";
          source_authority:
            | "official"
            | "first-party"
            | "public-secondary"
            | "unknown";
          effective_at: Date | null;
          content_hash: string;
          access_classification: "public" | "internal-restricted";
          normalized_text: string;
        }>(
          `SELECT e.evidence_link_id,e.relation,e.source_authority,a.effective_at,a.content_hash,
            CASE WHEN a.access_classification='public' AND EXISTS (SELECT 1 FROM source_watches w LEFT JOIN source_watch_aliases wa ON wa.source_watch_id=w.source_watch_id WHERE w.investigation_id=c.investigation_id AND w.access_classification='public' AND (w.canonical_url=e.source_url OR wa.canonical_url=e.source_url)) THEN 'public' ELSE 'internal-restricted' END AS access_classification,c.normalized_text
          FROM evidence_links e JOIN source_artifacts a ON a.artifact_id=e.artifact_id AND a.artifact_version=e.artifact_version
          JOIN claims c ON c.claim_id=e.claim_id WHERE e.claim_id=$1`,
          [contradiction.claimId],
        );
        if (!lineage.rowCount || facts.rows.length < 2) continue;
        const body = {
          claimLineageId: lineage.rows[0].claim_lineage_id,
          evidence: facts.rows.map((row) => ({
            evidenceLinkId: row.evidence_link_id,
            relation: row.relation,
            authority: row.source_authority,
            effectiveAt: row.effective_at?.toISOString(),
            scopeKey: normalizeTopic(row.normalized_text).slice(0, 160),
            artifactContentHash: row.content_hash,
            accessClassification: row.access_classification,
          })),
        };
        const conflict = persistedConflictSchema.parse({
          ...body,
          conflictFingerprint: conflictFingerprint(body),
        });
        const inserted = await client.query<{ claim_conflict_id: string }>(
          `INSERT INTO claim_conflicts
          (investigation_id,revision,claim_lineage_id,conflict_fingerprint,status,created_by_event_id,job_attempt_id)
          VALUES ($1,$2,$3,$4,'provisional',$5,$6) ON CONFLICT (investigation_id,revision,conflict_fingerprint)
          DO UPDATE SET conflict_fingerprint=EXCLUDED.conflict_fingerprint RETURNING claim_conflict_id`,
          [
            _investigationId,
            expectedRevision,
            conflict.claimLineageId,
            conflict.conflictFingerprint,
            decision.eventId,
            jobAttemptId,
          ],
        );
        for (const evidence of conflict.evidence) {
          await client.query(
            `INSERT INTO claim_conflict_evidence (claim_conflict_id,evidence_link_id,side_key)
            VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [
              inserted.rows[0].claim_conflict_id,
              evidence.evidenceLinkId,
              evidence.relation,
            ],
          );
        }
      }
    });
  }

  async loadUnresolvedDissentConflicts(
    investigationId: string,
    revision: number,
  ): Promise<Array<PersistedConflict & { claimConflictId: string }>> {
    const conflicts = await query<{
      claim_conflict_id: string;
      claim_lineage_id: string;
      conflict_fingerprint: string;
    }>(
      `SELECT c.claim_conflict_id,c.claim_lineage_id,c.conflict_fingerprint
      FROM claim_conflicts c WHERE c.investigation_id=$1 AND c.revision=$2 AND c.status='provisional'
        AND NOT EXISTS (SELECT 1 FROM dissent_resolutions d WHERE d.claim_conflict_id=c.claim_conflict_id)
      ORDER BY c.created_at`,
      [investigationId, revision],
    );
    const result: Array<PersistedConflict & { claimConflictId: string }> = [];
    for (const conflict of conflicts.rows) {
      const evidence = await query<{
        evidence_link_id: string;
        relation: "supports" | "contradicts" | "contextualizes";
        source_authority:
          | "official"
          | "first-party"
          | "public-secondary"
          | "unknown";
        effective_at: Date | null;
        content_hash: string;
        access_classification: "public" | "internal-restricted";
        normalized_text: string;
      }>(
        `SELECT e.evidence_link_id,e.relation,e.source_authority,a.effective_at,a.content_hash,
          CASE WHEN a.access_classification='public' AND EXISTS (SELECT 1 FROM source_watches w LEFT JOIN source_watch_aliases wa ON wa.source_watch_id=w.source_watch_id WHERE w.investigation_id=c.investigation_id AND w.access_classification='public' AND (w.canonical_url=e.source_url OR wa.canonical_url=e.source_url)) THEN 'public' ELSE 'internal-restricted' END AS access_classification,c.normalized_text
        FROM claim_conflict_evidence ce JOIN evidence_links e ON e.evidence_link_id=ce.evidence_link_id
        JOIN source_artifacts a ON a.artifact_id=e.artifact_id AND a.artifact_version=e.artifact_version
        JOIN claims c ON c.claim_id=e.claim_id WHERE ce.claim_conflict_id=$1 ORDER BY e.evidence_link_id`,
        [conflict.claim_conflict_id],
      );
      result.push({
        claimConflictId: conflict.claim_conflict_id,
        conflictFingerprint: conflict.conflict_fingerprint,
        claimLineageId: conflict.claim_lineage_id,
        evidence: evidence.rows.map((row) => ({
          evidenceLinkId: row.evidence_link_id,
          relation: row.relation,
          authority: row.source_authority,
          effectiveAt: row.effective_at?.toISOString(),
          scopeKey: normalizeTopic(row.normalized_text).slice(0, 160),
          artifactContentHash: row.content_hash,
          accessClassification: row.access_classification,
        })),
      });
    }
    return result;
  }

  async persistDissentResolution(params: {
    identity: InvocationIdentity;
    claimConflictId: string;
    conflict: PersistedConflict;
    proposal: DissentResolverOutput;
    eventId: string;
    model: string;
    promptVersion: string;
    schemaVersion: string;
    policyVersion: string;
  }) {
    const proposal = validateDissentProposal(params.conflict, params.proposal);
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        JOIN claim_conflicts c ON c.investigation_id=i.investigation_id AND c.claim_conflict_id=$5 AND c.conflict_fingerprint=$6
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a,c`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.identity.jobAttemptId,
          params.identity.leaseToken,
          params.claimConflictId,
          params.conflict.conflictFingerprint,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_DISSENT_LEASE_LOST");
      await client.query(
        `INSERT INTO dissent_resolutions
        (claim_conflict_id,investigation_id,revision,conflict_fingerprint,proposed_outcome,basis_code,supporting_evidence_link_ids,limiting_evidence_link_ids,model,prompt_version,schema_version,policy_version,event_id,job_attempt_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`,
        [
          params.claimConflictId,
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.conflict.conflictFingerprint,
          proposal.proposedOutcome,
          proposal.basisCode,
          proposal.supportingEvidenceLinkIds,
          proposal.limitingEvidenceLinkIds,
          params.model,
          params.promptVersion,
          params.schemaVersion,
          params.policyVersion,
          params.eventId,
          params.identity.jobAttemptId,
        ],
      );
    });
    return proposal;
  }

  async persistCandidate(params: {
    investigationId: string;
    revision: number;
    jobAttemptId: string;
    leaseToken: string;
    candidateId: string;
    payload: unknown;
  }) {
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a`,
        [
          params.investigationId,
          params.revision,
          params.jobAttemptId,
          params.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      await client.query(
        `INSERT INTO investigation_candidates (candidate_id,investigation_id,revision,payload,extraction_state,selection_decision)
        VALUES ($1,$2,$3,$4::jsonb,'validated','selected') ON CONFLICT (candidate_id) DO NOTHING`,
        [
          params.candidateId,
          params.investigationId,
          params.revision,
          JSON.stringify(params.payload),
        ],
      );
    });
  }

  async getAttemptLineage(jobAttemptId: string) {
    const result = await query<{ event_id: string; author: string | null }>(
      `SELECT event_id,envelope->>'author' AS author
      FROM event_envelopes WHERE job_attempt_id=$1 ORDER BY cursor`,
      [jobAttemptId],
    );
    const byAuthor = (name: string) =>
      [...result.rows].reverse().find((row) => row.author === name)?.event_id;
    const fallback = result.rows.at(-1)?.event_id;
    const extractionEventId = byAuthor("public_wire_extractor");
    const verificationEventId = byAuthor("public_wire_claim_verifier");
    const decisionEventId = byAuthor("public_wire_desk_workflow") ?? fallback;
    if (!extractionEventId || !verificationEventId || !decisionEventId)
      throw new Error("PUBLIC_WIRE_EVENT_LINEAGE_INCOMPLETE");
    return { extractionEventId, verificationEventId, decisionEventId };
  }

  async getLatestAgentEventId(
    jobAttemptId: string,
    sessionId: string,
    author: string,
  ) {
    const result = await query<{ event_id: string }>(
      `SELECT event_id FROM event_envelopes
      WHERE job_attempt_id=$1 AND session_id=$2 AND envelope->>'author'=$3 ORDER BY cursor DESC LIMIT 1`,
      [jobAttemptId, sessionId, author],
    );
    if (!result.rowCount)
      throw new Error("PUBLIC_WIRE_AGENT_EVENT_NOT_PERSISTED");
    return result.rows[0].event_id;
  }

  async getOrCreatePublicMappings(
    investigationId: string,
    claimIds: string[],
    evidenceLinks: EvidenceLink[],
  ) {
    return withTransaction(async (client) => {
      const claimKeys = new Map<string, string>();
      const claimLineageKeys = new Map<string, string>();
      for (const claimId of claimIds) {
        const lineage = await client.query<{ claim_lineage_id: string }>(
          "SELECT claim_lineage_id FROM claim_lineage_members WHERE claim_id=$1 AND investigation_id=$2",
          [claimId, investigationId],
        );
        if (!lineage.rowCount)
          throw new Error("PUBLIC_WIRE_CLAIM_LINEAGE_MISSING");
        const priorKey = await client.query<{ public_claim_key: string }>(
          `SELECT COALESCE(lk.public_claim_key,pk.public_claim_key) AS public_claim_key
          FROM claim_lineages l
          LEFT JOIN public_claim_lineage_keys lk ON lk.claim_lineage_id=l.claim_lineage_id
          LEFT JOIN LATERAL (SELECT pk.public_claim_key FROM claim_lineage_members m JOIN public_claim_keys pk ON pk.claim_id=m.claim_id WHERE m.claim_lineage_id=l.claim_lineage_id ORDER BY m.revision LIMIT 1) pk ON true
          WHERE l.claim_lineage_id=$1`,
          [lineage.rows[0].claim_lineage_id],
        );
        const publicClaimKey =
          priorKey.rows[0]?.public_claim_key ?? opaque("claim");
        await client.query(
          `INSERT INTO public_claim_lineage_keys (public_claim_key,claim_lineage_id,investigation_id)
          VALUES ($1,$2,$3) ON CONFLICT (claim_lineage_id) DO NOTHING`,
          [publicClaimKey, lineage.rows[0].claim_lineage_id, investigationId],
        );
        if (!priorKey.rows[0]?.public_claim_key)
          await client.query(
            `INSERT INTO public_claim_keys (public_claim_key,claim_id,investigation_id)
          VALUES ($1,$2,$3) ON CONFLICT (claim_id) DO NOTHING`,
            [publicClaimKey, claimId, investigationId],
          );
        claimKeys.set(claimId, publicClaimKey);
        claimLineageKeys.set(lineage.rows[0].claim_lineage_id, publicClaimKey);
      }
      const receiptKeys = new Map<string, string>();
      for (const link of evidenceLinks) {
        const result = await client.query<{ public_receipt_key: string }>(
          `INSERT INTO public_evidence_receipt_keys (public_receipt_key,evidence_link_id,investigation_id)
          VALUES ($1,$2,$3) ON CONFLICT (evidence_link_id) DO UPDATE SET evidence_link_id=EXCLUDED.evidence_link_id RETURNING public_receipt_key`,
          [opaque("receipt"), link.evidenceLinkId, investigationId],
        );
        receiptKeys.set(link.evidenceLinkId, result.rows[0].public_receipt_key);
      }
      return { claimKeys, claimLineageKeys, receiptKeys };
    });
  }

  async persistReviews(
    _investigationId: string,
    expectedRevision: number,
    jobAttemptId: string,
    leaseToken: string,
    _reviews: ReviewerResult[],
  ) {
    const reviews = _reviews.map((review) =>
      reviewerResultSchema.parse(review),
    );
    await withTransaction(async (client) => {
      const current = await client.query<{ current_revision: number }>(
        `SELECT i.current_revision FROM investigations i
        JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3
          AND a.lease_token=$4::uuid AND a.state='running' AND a.lease_expires_at >= now()
        FOR UPDATE OF i,a`,
        [_investigationId, expectedRevision, jobAttemptId, leaseToken],
      );
      if (!current.rowCount)
        throw new Error("PUBLIC_WIRE_STALE_INVESTIGATION_REVISION");
      for (const review of reviews) {
        await client.query(
          `INSERT INTO reviewer_results (investigation_id,revision,reviewer,outcome,issue_codes,reviewed_content_hash)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [
            _investigationId,
            expectedRevision,
            review.reviewer,
            review.outcome,
            review.issueCodes,
            review.reviewedContentHash,
          ],
        );
      }
    });
  }

  async persistFinalGate(params: {
    investigationId: string;
    revision: number;
    jobAttemptId: string;
    leaseToken: string;
    contentHash: string;
    passed: boolean;
    reasonCodes: string[];
    event: PublicWireEventEnvelope;
  }) {
    const event = publicWireEventEnvelopeSchema.parse(params.event);
    if (
      event.origin !== "application" ||
      event.eventType !== "final_gate.evaluated" ||
      event.investigationId !== params.investigationId ||
      event.jobAttemptId !== params.jobAttemptId ||
      event.contentHash !== params.contentHash
    )
      throw new Error("PUBLIC_WIRE_FINAL_GATE_EVENT_MISMATCH");
    if (params.passed && params.reasonCodes.length > 0)
      throw new Error("PUBLIC_WIRE_PASSING_GATE_HAS_REASONS");
    if (!params.passed && params.reasonCodes.length === 0)
      throw new Error("PUBLIC_WIRE_FAILED_GATE_REQUIRES_REASON");

    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i
        JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3
          AND a.lease_token=$4::uuid AND a.state='running' AND a.lease_expires_at >= now()
        FOR UPDATE OF i,a`,
        [
          params.investigationId,
          params.revision,
          params.jobAttemptId,
          params.leaseToken,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");

      const inserted = await client.query<{ event_id: string }>(
        `INSERT INTO event_envelopes
        (event_id,investigation_id,job_id,job_attempt_id,app_name,user_id,session_id,adk_event_id,invocation_id,envelope,persisted_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
        ON CONFLICT (app_name,user_id,session_id,adk_event_id) DO NOTHING RETURNING event_id`,
        [
          event.eventId,
          event.investigationId,
          event.jobId,
          event.jobAttemptId,
          event.appName,
          event.userId,
          event.sessionId,
          event.adkEventId ?? null,
          event.invocationId ?? null,
          JSON.stringify(event),
          event.persistedAt,
        ],
      );
      if (inserted.rowCount) {
        for (const destination of [
          "clickhouse",
          "datadog",
          "public-projection",
        ]) {
          await client.query(
            "INSERT INTO event_outbox (event_id,destination) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [event.eventId, destination],
          );
        }
      }

      await client.query(
        `INSERT INTO final_gate_results
        (investigation_id,revision,content_hash,passed,reason_codes,job_attempt_id,event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (investigation_id,revision,content_hash) DO UPDATE
        SET passed=EXCLUDED.passed,reason_codes=EXCLUDED.reason_codes,job_attempt_id=EXCLUDED.job_attempt_id,event_id=EXCLUDED.event_id,created_at=now()
        WHERE NOT EXISTS (
          SELECT 1 FROM publications p
          WHERE p.investigation_id=EXCLUDED.investigation_id AND p.revision=EXCLUDED.revision AND p.content_hash=EXCLUDED.content_hash
        )`,
        [
          params.investigationId,
          params.revision,
          params.contentHash,
          params.passed,
          params.reasonCodes,
          params.jobAttemptId,
          event.eventId,
        ],
      );
    });
  }

  async persistPublicationAttestation(params: {
    identity: InvocationIdentity;
    contentHash: string;
    workflowReleaseId: string;
    traceDigest: string;
  }) {
    await withTransaction(async (client) => {
      const owned = await client.query(
        `SELECT 1 FROM investigations i JOIN investigation_job_attempts a ON a.investigation_id=i.investigation_id
        JOIN workflow_releases r ON r.workflow_release_id=$5 AND r.revoked_at IS NULL
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND a.job_attempt_id=$3 AND a.lease_token=$4::uuid
          AND a.state='running' AND a.lease_expires_at >= now() FOR UPDATE OF i,a,r`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.identity.jobAttemptId,
          params.identity.leaseToken,
          params.workflowReleaseId,
        ],
      );
      if (!owned.rowCount)
        throw new Error("PUBLIC_WIRE_ATTESTATION_FENCE_LOST");
      await client.query(
        `INSERT INTO publication_attestations
        (investigation_id,revision,content_hash,workflow_release_id,trace_digest,reconciled_at)
        VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT (investigation_id,revision,content_hash)
        DO UPDATE SET workflow_release_id=EXCLUDED.workflow_release_id,trace_digest=EXCLUDED.trace_digest,reconciled_at=EXCLUDED.reconciled_at`,
        [
          params.identity.investigationId,
          params.identity.requestedRevision,
          params.contentHash,
          params.workflowReleaseId,
          params.traceDigest,
        ],
      );
    });
  }

  async computePublicationAttestationDigest(
    identity: InvocationIdentity,
    contentHash: string,
  ) {
    const [spans, reviews, gate] = await Promise.all([
      query<{
        span_kind: string;
        name: string;
        outcome: string;
        started_at: Date;
        ended_at: Date | null;
        model: string | null;
        input_hash: string | null;
        output_hash: string | null;
      }>(
        `SELECT span_kind,name,outcome,started_at,ended_at,model,input_hash,output_hash FROM execution_spans
        WHERE job_attempt_id=$1 AND investigation_id=$2 AND revision=$3 ORDER BY started_at,execution_span_id`,
        [
          identity.jobAttemptId,
          identity.investigationId,
          identity.requestedRevision,
        ],
      ),
      query<{
        reviewer: string;
        outcome: string;
        issue_codes: string[];
        reviewed_content_hash: string;
      }>(
        `SELECT reviewer,outcome,issue_codes,reviewed_content_hash FROM reviewer_results
        WHERE investigation_id=$1 AND revision=$2 AND reviewed_content_hash=$3 ORDER BY reviewer`,
        [identity.investigationId, identity.requestedRevision, contentHash],
      ),
      query<{
        passed: boolean;
        reason_codes: string[];
        content_hash: string;
        event_id: string;
      }>(
        `SELECT passed,reason_codes,content_hash,event_id FROM final_gate_results
        WHERE investigation_id=$1 AND revision=$2 AND content_hash=$3 AND job_attempt_id=$4`,
        [
          identity.investigationId,
          identity.requestedRevision,
          contentHash,
          identity.jobAttemptId,
        ],
      ),
    ]);
    if (
      !spans.rowCount ||
      spans.rows.some((span) => span.outcome === "started" || !span.ended_at) ||
      (reviews.rowCount ?? 0) < 4 ||
      !gate.rowCount
    )
      throw new Error("PUBLIC_WIRE_ATTESTATION_TRACE_INCOMPLETE");
    return createHash("sha256")
      .update(
        JSON.stringify({
          spans: spans.rows.map((span) => ({
            ...span,
            started_at: span.started_at.toISOString(),
            ended_at: span.ended_at?.toISOString(),
          })),
          reviews: reviews.rows,
          gate: gate.rows[0],
        }),
      )
      .digest("hex");
  }

  async persistArtifacts(
    artifacts: SourceArtifact[],
    identity: InvocationIdentity,
  ) {
    const parsed = artifacts.map((artifact) =>
      sourceArtifactSchema.parse(artifact),
    );
    if (
      parsed.some(
        (artifact) => artifact.investigationId !== identity.investigationId,
      )
    )
      throw new Error("PUBLIC_WIRE_INVESTIGATION_MISMATCH");
    await withTransaction(async (client) => {
      const expectedCurrentRevision =
        identity.operation === "source_refresh" && !identity.resumeRevision
          ? identity.requestedRevision - 1
          : identity.requestedRevision;
      const owned = await client.query(
        `SELECT 1 FROM investigation_job_attempts a JOIN investigations i ON i.investigation_id=a.investigation_id
        WHERE a.job_attempt_id=$1 AND a.lease_token=$2::uuid AND a.state='running' AND a.lease_expires_at >= now()
          AND i.investigation_id=$3 AND i.current_revision=$4 FOR UPDATE OF a,i`,
        [
          identity.jobAttemptId,
          identity.leaseToken,
          identity.investigationId,
          expectedCurrentRevision,
        ],
      );
      if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
      for (const artifact of parsed) {
        await client.query(
          `INSERT INTO source_artifacts (artifact_id,investigation_id,artifact_version,artifact_kind,adk_artifact_name,source_id,source_url,canonical_url,media_type,content_hash,derived_from_artifact_id,derived_from_artifact_version,normalizer_version,fetch_method,http_status,effective_at,storage_uri,access_classification,metadata,fetched_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20) ON CONFLICT (artifact_id,artifact_version) DO NOTHING`,
          [
            artifact.artifactId,
            artifact.investigationId,
            artifact.adkArtifactVersion,
            artifact.artifactKind,
            artifact.adkArtifactName,
            artifact.sourceId,
            artifact.sourceUrl,
            artifact.canonicalUrl,
            artifact.mediaType,
            artifact.contentHash,
            artifact.derivedFromArtifactId ?? null,
            artifact.derivedFromArtifactVersion ?? null,
            artifact.normalizerVersion ?? null,
            artifact.fetchMethod,
            artifact.httpStatus ?? null,
            artifact.effectiveAt ?? null,
            artifact.storageUri,
            artifact.accessClassification,
            JSON.stringify(artifact.metadata || {}),
            artifact.fetchedAt,
          ],
        );
      }
    });
  }

  async getPublicProjection(
    publicCaseKey: string,
    requesterScopeHash?: string,
  ) {
    const result = await query<{
      payload: unknown;
      approved_projection: unknown;
      snapshot_visibility: string;
      visibility: string;
      requester_scope_hash: string | null;
    }>(
      `SELECT s.payload,s.visibility AS snapshot_visibility,d.approved_projection,d.visibility,d.requester_scope_hash FROM public_projection_snapshots s
      JOIN public_case_keys k ON k.public_case_key=s.public_case_key
      JOIN investigation_disclosures d ON d.investigation_id=s.investigation_id
      WHERE s.public_case_key=$1 AND k.revoked_at IS NULL AND d.revoked_at IS NULL`,
      [publicCaseKey],
    );
    if (!result.rowCount) return undefined;
    const row = result.rows[0];
    if (
      row.visibility !== "public" &&
      (!requesterScopeHash || requesterScopeHash !== row.requester_scope_hash)
    )
      return undefined;
    if (row.visibility !== row.snapshot_visibility) return undefined;
    const payload =
      row.visibility === "public" ? row.approved_projection : row.payload;
    const projection = publicInvestigationDetailSchema.safeParse(payload);
    if (
      !projection.success ||
      projection.data.summary.visibility !== row.visibility
    )
      return undefined;
    return projection.data;
  }

  async getEvents(
    publicCaseKey: string,
    requesterScopeHash: string | undefined,
    after: number,
    epoch: string,
  ) {
    const snapshot = await this.getPublicProjection(
      publicCaseKey,
      requesterScopeHash,
    );
    if (!snapshot) return undefined;
    if (snapshot.streamEpoch !== epoch)
      return { reset: true as const, snapshot };
    const bounds = await query<{ minimum: string | null }>(
      "SELECT min(cursor)::text AS minimum FROM public_event_projections WHERE public_case_key=$1 AND stream_epoch=$2",
      [publicCaseKey, epoch],
    );
    const minimum =
      bounds.rows[0]?.minimum === null
        ? undefined
        : Number(bounds.rows[0]?.minimum);
    if (minimum !== undefined && after > 0 && after < minimum - 1)
      return { reset: true as const, snapshot };
    const result = await query<{ payload: unknown }>(
      "SELECT payload FROM public_event_projections WHERE public_case_key=$1 AND stream_epoch=$2 AND cursor>$3 ORDER BY cursor LIMIT 100",
      [publicCaseKey, epoch, after],
    );
    return {
      reset: false as const,
      snapshot,
      events: result.rows.map((row) =>
        publicInvestigationEventSchema.parse(row.payload),
      ),
    };
  }

  async append(input: PublicWireEventEnvelope) {
    const event = publicWireEventEnvelopeSchema.parse(input);
    await withTransaction(async (client) => {
      const inserted = await client.query<{ event_id: string }>(
        `INSERT INTO event_envelopes (event_id,investigation_id,job_id,job_attempt_id,app_name,user_id,session_id,adk_event_id,invocation_id,envelope,persisted_at)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11 FROM investigation_job_attempts a
        WHERE a.job_attempt_id=$4 AND a.investigation_id=$2 AND a.state='running' AND a.lease_expires_at >= now()
        ON CONFLICT (app_name,user_id,session_id,adk_event_id) DO NOTHING RETURNING event_id`,
        [
          event.eventId,
          event.investigationId,
          event.jobId,
          event.jobAttemptId,
          event.appName,
          event.userId,
          event.sessionId,
          event.adkEventId,
          event.invocationId,
          JSON.stringify(event),
          event.persistedAt,
        ],
      );
      if (!inserted.rowCount) {
        const duplicate = await client.query(
          "SELECT 1 FROM event_envelopes WHERE app_name=$1 AND user_id=$2 AND session_id=$3 AND adk_event_id=$4",
          [event.appName, event.userId, event.sessionId, event.adkEventId],
        );
        if (!duplicate.rowCount)
          throw new Error("PUBLIC_WIRE_EVENT_LEASE_LOST");
      }
      if (inserted.rowCount) {
        for (const destination of [
          "clickhouse",
          "datadog",
          "public-projection",
        ]) {
          await client.query(
            "INSERT INTO event_outbox (event_id,destination) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [event.eventId, destination],
          );
        }
      }
    });
  }

  async appendSpan(span: TrajectorySpan) {
    const forbidden = new Set([
      "prompt",
      "body",
      "content",
      "reasoning",
      "secret",
      "token",
    ]);
    if (
      Object.keys(span.safeAttributes).some((key) =>
        forbidden.has(key.toLowerCase()),
      )
    )
      throw new Error("PUBLIC_WIRE_UNSAFE_SPAN_ATTRIBUTE");
    const result = await query(
      `INSERT INTO execution_spans
      (execution_span_id,investigation_id,revision,job_attempt_id,invocation_id,parent_span_id,span_kind,name,outcome,started_at,ended_at,latency_ms,model,input_hash,output_hash,safe_attributes)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb
      FROM investigation_job_attempts a WHERE a.job_attempt_id=$4 AND a.lease_token=$17::uuid
        AND a.state='running' AND a.lease_expires_at >= now()
      ON CONFLICT (execution_span_id) DO UPDATE SET outcome=EXCLUDED.outcome,ended_at=EXCLUDED.ended_at,latency_ms=EXCLUDED.latency_ms,
        model=EXCLUDED.model,input_hash=EXCLUDED.input_hash,output_hash=EXCLUDED.output_hash,safe_attributes=EXCLUDED.safe_attributes`,
      [
        span.executionSpanId,
        span.investigationId,
        span.revision,
        span.jobAttemptId,
        span.invocationId,
        span.parentSpanId ?? null,
        span.spanKind,
        span.name,
        span.outcome,
        span.startedAt,
        span.endedAt ?? null,
        span.latencyMs ?? null,
        span.model ?? null,
        span.inputHash ?? null,
        span.outputHash ?? null,
        JSON.stringify(span.safeAttributes),
        span.leaseToken,
      ],
    );
    if (!result.rowCount) throw new Error("PUBLIC_WIRE_TRAJECTORY_LEASE_LOST");
  }

  async applyHumanDisposition(input: HumanDispositionCommand) {
    const command = humanDispositionCommandSchema.parse(input);
    return withTransaction(async (client) => {
      const conflict = await client.query<{
        claim_conflict_id: string;
        status: string;
      }>(
        `SELECT c.claim_conflict_id,c.status FROM claim_conflicts c
        JOIN investigations i ON i.investigation_id=c.investigation_id
        WHERE c.investigation_id=$1 AND i.current_revision=$2 AND c.conflict_fingerprint=$3
        FOR UPDATE OF c,i`,
        [
          command.investigationId,
          command.expectedRevision,
          command.conflictFingerprint,
        ],
      );
      if (!conflict.rowCount)
        throw new Error("PUBLIC_WIRE_HUMAN_DISPOSITION_FENCE_LOST");
      const inserted = await client.query<{ human_disposition_id: string }>(
        `INSERT INTO human_dispositions
        (claim_conflict_id,investigation_id,expected_revision,conflict_fingerprint,decision,actor,actor_role,idempotency_key,rationale)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (actor,idempotency_key) DO NOTHING RETURNING human_disposition_id`,
        [
          conflict.rows[0].claim_conflict_id,
          command.investigationId,
          command.expectedRevision,
          command.conflictFingerprint,
          command.decision,
          command.actor,
          command.actorRole,
          command.idempotencyKey,
          command.rationale,
        ],
      );
      if (!inserted.rowCount) {
        const existing = await client.query<{
          human_disposition_id: string;
          investigation_id: string;
          expected_revision: number;
          conflict_fingerprint: string;
          decision: string;
          rationale: string;
          actor_role: string;
        }>(
          "SELECT human_disposition_id,investigation_id,expected_revision,conflict_fingerprint,decision,rationale,actor_role FROM human_dispositions WHERE actor=$1 AND idempotency_key=$2",
          [command.actor, command.idempotencyKey],
        );
        const row = existing.rows[0];
        if (
          !row ||
          row.investigation_id !== command.investigationId ||
          row.expected_revision !== command.expectedRevision ||
          row.conflict_fingerprint !== command.conflictFingerprint ||
          row.decision !== command.decision ||
          row.rationale !== command.rationale ||
          row.actor_role !== command.actorRole
        )
          throw new Error("PUBLIC_WIRE_IDEMPOTENCY_KEY_REUSED");
        return row.human_disposition_id;
      }
      if (command.decision !== "keep_held") {
        const nextRevision = command.expectedRevision + 1;
        const correctionState =
          command.decision === "retract"
            ? "retracted"
            : command.decision === "correct"
              ? "corrected"
              : "clarified";
        const revisionKind =
          command.decision === "retract"
            ? "retraction"
            : command.decision === "correct"
              ? "correction"
              : "clarification";
        const advanced = await client.query(
          `UPDATE investigations SET current_revision=$3,correction_state=$4,
            publication_state=CASE WHEN EXISTS (SELECT 1 FROM publications p WHERE p.investigation_id=$1) THEN 'confirmed' ELSE 'none' END,
            workflow_state='held',freshness_state='stale',updated_at=now()
          WHERE investigation_id=$1 AND current_revision=$2
            AND NOT EXISTS (SELECT 1 FROM publication_intents WHERE investigation_id=$1 AND state IN ('pending','unknown'))`,
          [
            command.investigationId,
            command.expectedRevision,
            nextRevision,
            correctionState,
          ],
        );
        if (!advanced.rowCount)
          throw new Error("PUBLIC_WIRE_HUMAN_DISPOSITION_REVISION_FENCE_LOST");
        await client.query(
          `INSERT INTO investigation_revisions
          (investigation_id,revision,parent_revision,revision_kind,human_disposition_id,input_fingerprint)
          VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            command.investigationId,
            nextRevision,
            command.expectedRevision,
            revisionKind,
            inserted.rows[0].human_disposition_id,
            fingerprint(
              command.conflictFingerprint,
              command.decision,
              command.rationale,
            ),
          ],
        );
        const affected = await client.query<{ claim_id: string }>(
          `SELECT m.claim_id FROM claim_conflicts c JOIN claim_lineage_members m ON m.claim_lineage_id=c.claim_lineage_id
          WHERE c.claim_conflict_id=$1 AND m.revision=$2`,
          [conflict.rows[0].claim_conflict_id, command.expectedRevision],
        );
        const prior = await client.query<{ publication_id: string }>(
          "SELECT publication_id FROM publications WHERE investigation_id=$1 ORDER BY confirmed_at DESC LIMIT 1",
          [command.investigationId],
        );
        if (["correct", "retract"].includes(command.decision)) {
          await client.query(
            `INSERT INTO corrections (investigation_id,correction_type,rationale_code,affected_claim_ids,prior_publication_id)
            VALUES ($1,$2,$3,$4,$5)`,
            [
              command.investigationId,
              command.decision === "retract" ? "retraction" : "correction",
              command.decision === "retract"
                ? "PUBLICATION_RETRACTED"
                : "FACT_CORRECTED",
              affected.rows.map((row) => row.claim_id),
              prior.rows[0]?.publication_id ?? null,
            ],
          );
        }
        const snapshot = await client.query<{
          payload: unknown;
          public_case_key: string;
          visibility: "private" | "unlisted" | "public";
        }>(
          `SELECT s.payload,s.public_case_key,d.visibility FROM public_projection_snapshots s
          JOIN investigation_disclosures d ON d.investigation_id=s.investigation_id WHERE s.investigation_id=$1 FOR UPDATE OF s,d`,
          [command.investigationId],
        );
        const currentProjection = publicInvestigationDetailSchema.parse(
          snapshot.rows[0].payload,
        );
        const publicClaimKeys = await client.query<{
          public_claim_key: string;
        }>(
          `SELECT DISTINCT COALESCE(lk.public_claim_key,pk.public_claim_key) AS public_claim_key
          FROM claim_conflicts c JOIN claim_lineage_members m ON m.claim_lineage_id=c.claim_lineage_id
          LEFT JOIN public_claim_lineage_keys lk ON lk.claim_lineage_id=m.claim_lineage_id
          LEFT JOIN public_claim_keys pk ON pk.claim_id=m.claim_id
          WHERE c.claim_conflict_id=$1 AND m.revision=$2`,
          [conflict.rows[0].claim_conflict_id, command.expectedRevision],
        );
        const affectedClaimKeys = publicClaimKeys.rows.flatMap((row) =>
          row.public_claim_key ? [row.public_claim_key] : [],
        );
        const dispositionType =
          command.decision === "retract"
            ? ("retraction" as const)
            : command.decision === "correct"
              ? ("correction" as const)
              : ("clarification" as const);
        const rationaleCode =
          command.decision === "retract"
            ? ("PUBLICATION_RETRACTED" as const)
            : command.decision === "correct"
              ? ("FACT_CORRECTED" as const)
              : ("WORDING_CLARIFIED" as const);
        const now = new Date().toISOString();
        const lifecycleEvent: PublicInvestigationEvent = {
          cursor: currentProjection.snapshotCursor + 1,
          publicEventKey: opaque("event"),
          occurredAt: now,
          stage: "publish",
          status: "held",
          eventCode: "LIFECYCLE_DISPOSITION",
          safeParams: { type: dispositionType, localRecordOnly: true },
          sourceReceiptKeys: [],
          claimKeys: affectedClaimKeys,
        };
        const lifecycleProjection = publicInvestigationDetailSchema.parse({
          ...currentProjection,
          schemaVersion: "2",
          projectionRevision: currentProjection.projectionRevision + 1,
          snapshotCursor: lifecycleEvent.cursor,
          summary: {
            ...currentProjection.summary,
            revision: nextRevision,
            workflowState: "held",
            correctionState,
            freshnessState: "stale",
            updatedAt: now,
            currentDetermination:
              dispositionType === "retraction"
                ? "PublicWire retracted this local record after authenticated editorial review. The historical route remains available; this notice does not assert that the external provider changed its copy."
                : `PublicWire recorded a local ${dispositionType} after authenticated editorial review. The prior confirmed route remains historical while the new revision is held; this does not assert an external provider change.`,
          },
          events: [...currentProjection.events, lifecycleEvent].slice(-200),
          revisions: [
            ...currentProjection.revisions,
            {
              publicRevisionKey: opaque("revision"),
              revisionNumber: nextRevision,
              type: dispositionType,
              rationaleCode,
              affectedClaimKeys,
              effectiveAt: now,
              priorPublicUrl: currentProjection.publication?.externalUrl,
            },
          ],
          correctionNotice: {
            type: dispositionType,
            rationaleCode,
            affectedClaimKeys,
            effectiveAt: now,
            priorVersionUrl: currentProjection.publication?.externalUrl,
          },
          sourceVersions:
            currentProjection.schemaVersion === "2"
              ? currentProjection.sourceVersions
              : undefined,
          dissentRecords:
            currentProjection.schemaVersion === "2"
              ? currentProjection.dissentRecords
              : undefined,
          changeSummary:
            currentProjection.schemaVersion === "2"
              ? currentProjection.changeSummary
              : undefined,
          workflowAttestation: undefined,
        });
        await client.query(
          `UPDATE public_projection_snapshots SET schema_version='2',projection_revision=$2,snapshot_cursor=$3,payload=$4::jsonb,updated_at=now()
          WHERE investigation_id=$1`,
          [
            command.investigationId,
            lifecycleProjection.projectionRevision,
            lifecycleProjection.snapshotCursor,
            JSON.stringify(lifecycleProjection),
          ],
        );
        if (snapshot.rows[0].visibility === "public")
          await client.query(
            `UPDATE investigation_disclosures SET approved_projection=$2::jsonb,actor=$3,effective_at=now()
          WHERE investigation_id=$1 AND visibility='public' AND revoked_at IS NULL`,
            [
              command.investigationId,
              JSON.stringify(lifecycleProjection),
              command.actor,
            ],
          );
        await client.query(
          `INSERT INTO public_event_projections (public_event_key,investigation_id,public_case_key,cursor,stream_epoch,event_code,payload,occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
          [
            lifecycleEvent.publicEventKey,
            command.investigationId,
            snapshot.rows[0].public_case_key,
            lifecycleEvent.cursor,
            lifecycleProjection.streamEpoch,
            lifecycleEvent.eventCode,
            JSON.stringify(lifecycleEvent),
            now,
          ],
        );
      }
      return inserted.rows[0].human_disposition_id;
    });
  }

  async reconcile(
    identity: InvocationIdentity,
    expectedAdkEventIds: string[] = [],
  ) {
    const result = await query<{ adk_event_id: string | null }>(
      "SELECT adk_event_id FROM event_envelopes WHERE job_attempt_id=$1",
      [identity.jobAttemptId],
    );
    const persisted = new Set(
      result.rows.flatMap((row) =>
        row.adk_event_id ? [row.adk_event_id] : [],
      ),
    );
    if (
      !persisted.size ||
      expectedAdkEventIds.some((eventId) => !persisted.has(eventId))
    )
      throw new Error("PUBLIC_WIRE_EVENT_RECONCILIATION_FAILED");
  }

  async updateProjection(
    investigationId: string,
    projection: PublicInvestigationDetail,
    events: PublicInvestigationEvent[] = [],
    fence?: {
      jobAttemptId: string;
      leaseToken: string;
      finalize?: {
        freshnessState: "current" | "stale" | "unknown";
        workflowState: PublicInvestigationDetail["summary"]["workflowState"];
      };
    },
  ) {
    const parsed = publicInvestigationDetailSchema.parse(projection);
    await withTransaction(async (client) => {
      const disclosure = await client.query<{
        visibility: PublicInvestigationDetail["summary"]["visibility"];
        current_revision: number;
      }>(
        `SELECT d.visibility,i.current_revision FROM investigation_disclosures d
        JOIN investigations i ON i.investigation_id=d.investigation_id
        WHERE d.investigation_id=$1 AND d.revoked_at IS NULL FOR SHARE OF d,i`,
        [investigationId],
      );
      if (
        !disclosure.rowCount ||
        disclosure.rows[0].visibility !== parsed.summary.visibility
      )
        throw new Error("PUBLIC_WIRE_DISCLOSURE_MISMATCH");
      if (disclosure.rows[0].current_revision !== parsed.summary.revision)
        throw new Error("PUBLIC_WIRE_STALE_INVESTIGATION_REVISION");
      if (fence) {
        const owned = await client.query(
          `SELECT 1 FROM investigation_job_attempts
          WHERE investigation_id=$1 AND job_attempt_id=$2 AND lease_token=$3::uuid
            AND state='running' AND lease_expires_at >= now() FOR UPDATE`,
          [investigationId, fence.jobAttemptId, fence.leaseToken],
        );
        if (!owned.rowCount) throw new Error("PUBLIC_WIRE_MUTATION_LEASE_LOST");
        if (fence.finalize) {
          if (
            parsed.summary.freshnessState !== fence.finalize.freshnessState ||
            parsed.summary.workflowState !== fence.finalize.workflowState
          )
            throw new Error("PUBLIC_WIRE_PROJECTION_FINAL_STATE_MISMATCH");
          const finalized = await client.query(
            "UPDATE investigations SET freshness_state=$2,workflow_state=$3,updated_at=now() WHERE investigation_id=$1 AND current_revision=$4",
            [
              investigationId,
              fence.finalize.freshnessState,
              fence.finalize.workflowState,
              parsed.summary.revision,
            ],
          );
          if (!finalized.rowCount)
            throw new Error("PUBLIC_WIRE_STALE_INVESTIGATION_REVISION");
        }
      }
      const updated = await client.query(
        `UPDATE public_projection_snapshots SET visibility=$2,schema_version=$3,projection_revision=$4,snapshot_cursor=$5,stream_epoch=$6,payload=$7::jsonb,updated_at=now()
        WHERE investigation_id=$1 AND projection_revision < $4 AND (stream_epoch <> $6 OR snapshot_cursor < $5)`,
        [
          investigationId,
          parsed.summary.visibility,
          parsed.schemaVersion,
          parsed.projectionRevision,
          parsed.snapshotCursor,
          parsed.streamEpoch,
          JSON.stringify(parsed),
        ],
      );
      if (!updated.rowCount)
        throw new Error("PUBLIC_WIRE_STALE_PROJECTION_REVISION");
      for (const event of events.map((item) =>
        publicInvestigationEventSchema.parse(item),
      )) {
        await client.query(
          `INSERT INTO public_event_projections (public_event_key,investigation_id,public_case_key,cursor,stream_epoch,event_code,payload,occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT DO NOTHING`,
          [
            event.publicEventKey,
            investigationId,
            parsed.summary.publicCaseKey,
            event.cursor,
            parsed.streamEpoch,
            event.eventCode,
            JSON.stringify(event),
            event.occurredAt,
          ],
        );
      }
      if (parsed.summary.visibility === "public") {
        await client.query(
          `UPDATE investigation_disclosures SET approved_projection=$2::jsonb,actor='change-intelligence-projection',effective_at=now()
          WHERE investigation_id=$1 AND visibility='public' AND revoked_at IS NULL`,
          [investigationId, JSON.stringify(parsed)],
        );
      }
    });
  }

  async publishProjection(params: {
    investigationId: string;
    jobAttemptId: string;
    leaseToken: string;
    revision: number;
    contentHash: string;
    projection: PublicInvestigationDetail;
    events: PublicInvestigationEvent[];
  }) {
    const projection = publicInvestigationDetailSchema.parse(params.projection);
    const events = params.events.map((event) =>
      publicInvestigationEventSchema.parse(event),
    );
    const providerUrl = projection.publication?.externalUrl;
    if (
      projection.summary.revision !== params.revision ||
      projection.summary.visibility !== "public" ||
      projection.summary.runtimeMode !== "real" ||
      projection.summary.publicationState !== "confirmed" ||
      projection.summary.workflowState !== "complete" ||
      !providerUrl
    )
      throw new Error("PUBLIC_WIRE_INVALID_PUBLICATION_PROJECTION");

    await withTransaction(async (client) => {
      const confirmed = await client.query(
        `SELECT 1 FROM investigations i
        JOIN publications p ON p.investigation_id=i.investigation_id AND p.revision=i.current_revision
        JOIN investigation_job_attempts a ON a.job_attempt_id=$5 AND a.investigation_id=i.investigation_id
        WHERE i.investigation_id=$1 AND i.current_revision=$2 AND i.publication_state='confirmed'
          AND p.content_hash=$3 AND p.provider_url=$4
          AND a.lease_token=$6::uuid AND a.state='running' AND a.lease_expires_at >= now()
        FOR UPDATE OF i,p,a`,
        [
          params.investigationId,
          params.revision,
          params.contentHash,
          providerUrl,
          params.jobAttemptId,
          params.leaseToken,
        ],
      );
      if (!confirmed.rowCount)
        throw new Error("PUBLIC_WIRE_PUBLICATION_PROJECTION_FENCE_LOST");

      await client.query(
        "UPDATE investigations SET freshness_state='current',workflow_state='complete',updated_at=now() WHERE investigation_id=$1 AND current_revision=$2",
        [params.investigationId, params.revision],
      );

      await client.query(
        `UPDATE investigation_disclosures
        SET visibility='public',approved_projection=$2::jsonb,actor='publication-service',effective_at=now(),revoked_at=NULL
        WHERE investigation_id=$1`,
        [params.investigationId, JSON.stringify(projection)],
      );
      const updated = await client.query(
        `UPDATE public_projection_snapshots
        SET visibility='public',schema_version=$2,projection_revision=$3,snapshot_cursor=$4,stream_epoch=$5,payload=$6::jsonb,updated_at=now()
        WHERE investigation_id=$1 AND projection_revision < $3 AND (stream_epoch <> $5 OR snapshot_cursor < $4)`,
        [
          params.investigationId,
          projection.schemaVersion,
          projection.projectionRevision,
          projection.snapshotCursor,
          projection.streamEpoch,
          JSON.stringify(projection),
        ],
      );
      if (!updated.rowCount) {
        const existing = await client.query<{
          visibility: string;
          projection_revision: number;
          snapshot_cursor: string;
        }>(
          "SELECT visibility,projection_revision,snapshot_cursor::text FROM public_projection_snapshots WHERE investigation_id=$1",
          [params.investigationId],
        );
        const row = existing.rows[0];
        if (
          !row ||
          row.visibility !== "public" ||
          row.projection_revision !== projection.projectionRevision ||
          Number(row.snapshot_cursor) !== projection.snapshotCursor
        ) {
          throw new Error("PUBLIC_WIRE_STALE_PROJECTION_REVISION");
        }
      }

      for (const event of events) {
        await client.query(
          `INSERT INTO public_event_projections
          (public_event_key,investigation_id,public_case_key,cursor,stream_epoch,event_code,payload,occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) ON CONFLICT DO NOTHING`,
          [
            event.publicEventKey,
            params.investigationId,
            projection.summary.publicCaseKey,
            event.cursor,
            projection.streamEpoch,
            event.eventCode,
            JSON.stringify(event),
            event.occurredAt,
          ],
        );
      }
    });
  }
}
