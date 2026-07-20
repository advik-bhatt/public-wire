import "server-only";

import { query, withTransaction } from "@/lib/db/postgres";
import {
  releaseDescriptorSchema,
  releaseMatches,
  type ReleaseDescriptor,
} from "./trajectory-eval";

export function workflowAttestationEnforced(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.PUBLIC_WIRE_AI_MODE === "adk") return true;
  if (env.NODE_ENV === "production")
    return env.PUBLIC_WIRE_RELEASE_ATTESTATION_ENFORCED !== "false";
  return env.PUBLIC_WIRE_RELEASE_ATTESTATION_ENFORCED === "true";
}

export function configuredReleaseDescriptor(
  params: {
    model: string;
    promptVersion: string;
    schemaVersion: string;
    policyVersion: string;
  },
  env: NodeJS.ProcessEnv = process.env,
): ReleaseDescriptor | undefined {
  const parsed = releaseDescriptorSchema.safeParse({
    workflowDigest: env.PUBLIC_WIRE_WORKFLOW_DIGEST,
    buildDigest: env.PUBLIC_WIRE_BUILD_DIGEST,
    model: params.model,
    promptVersion: params.promptVersion,
    schemaVersion: params.schemaVersion,
    policyVersion: params.policyVersion,
    evaluatorVersion: env.PUBLIC_WIRE_EVALUATOR_VERSION,
    corpusHash: env.PUBLIC_WIRE_EVAL_CORPUS_HASH,
  });
  return parsed.success ? parsed.data : undefined;
}

export async function currentReleaseMatches(descriptor: ReleaseDescriptor) {
  const parsed = releaseDescriptorSchema.parse(descriptor);
  const result = await query<
    ReleaseDescriptor & {
      workflow_release_id: string;
      release_key: string;
      promoted_at: Date;
      locked_case_count: number;
      passed_case_count: number;
      false_publish_count: number;
      safety_violation_count: number;
    }
  >(`SELECT r.workflow_release_id,r.release_key,r.promoted_at,
      r.workflow_digest AS "workflowDigest",r.build_digest AS "buildDigest",r.model,
      r.prompt_version AS "promptVersion",r.schema_version AS "schemaVersion",r.policy_version AS "policyVersion",
      r.evaluator_version AS "evaluatorVersion",r.corpus_hash AS "corpusHash",
      er.false_publish_count,er.safety_violation_count,
      (SELECT count(*)::int FROM eval_cases c WHERE c.eval_suite_id=er.eval_suite_id) AS locked_case_count,
      (SELECT count(*)::int FROM eval_case_results cr
        WHERE cr.eval_run_id=er.eval_run_id AND cr.passed AND cardinality(cr.safety_violations)=0) AS passed_case_count
    FROM workflow_releases r JOIN eval_runs er ON er.eval_run_id=r.eval_run_id
    WHERE r.revoked_at IS NULL LIMIT 1`);
  if (!result.rowCount) return { matches: false as const };
  const row = result.rows[0];
  const coverageComplete =
    row.locked_case_count > 0 &&
    row.locked_case_count === row.passed_case_count &&
    row.false_publish_count === 0 &&
    row.safety_violation_count === 0;
  return {
    matches: releaseMatches(row, parsed) && coverageComplete,
    releaseId: row.workflow_release_id,
    releaseKey: row.release_key,
    promotedAt: row.promoted_at.toISOString(),
    lockedCaseCount: row.locked_case_count,
    passedCaseCount: row.passed_case_count,
    falsePublishDecisions: row.false_publish_count,
    safetyViolations: row.safety_violation_count,
  };
}

export async function promoteWorkflowRelease(
  params: ReleaseDescriptor & {
    evalRunId: string;
    releaseKey: string;
    actor: string;
  },
) {
  const descriptor = releaseDescriptorSchema.parse(params);
  return withTransaction(async (client) => {
    const run = await client.query<{
      state: string;
      false_publish_count: number;
      safety_violation_count: number;
    }>(
      `SELECT state,false_publish_count,safety_violation_count
      FROM eval_runs WHERE eval_run_id=$1 AND workflow_digest=$2 AND build_digest=$3 AND model=$4
        AND prompt_version=$5 AND schema_version=$6 AND policy_version=$7 AND evaluator_version=$8 AND corpus_hash=$9
      FOR UPDATE`,
      [
        params.evalRunId,
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
    const evaluated = run.rows[0];
    if (
      !evaluated ||
      evaluated.state !== "passed" ||
      evaluated.false_publish_count !== 0 ||
      evaluated.safety_violation_count !== 0
    ) {
      throw new Error("PUBLIC_WIRE_RELEASE_EVAL_NOT_PROMOTABLE");
    }
    const coverage = await client.query<{
      locked_count: string;
      result_count: string;
      passing_count: string;
    }>(
      `SELECT
        (SELECT count(*)::text FROM eval_cases WHERE eval_suite_id=$2) AS locked_count,
        count(*)::text AS result_count,
        count(*) FILTER (WHERE r.passed AND cardinality(r.safety_violations)=0)::text AS passing_count
      FROM eval_case_results r WHERE r.eval_run_id=$1`,
      [
        params.evalRunId,
        (
          await client.query<{ eval_suite_id: string }>(
            "SELECT eval_suite_id FROM eval_runs WHERE eval_run_id=$1",
            [params.evalRunId],
          )
        ).rows[0]?.eval_suite_id,
      ],
    );
    const counts = coverage.rows[0];
    if (
      !counts ||
      Number(counts.locked_count) === 0 ||
      counts.locked_count !== counts.result_count ||
      counts.locked_count !== counts.passing_count
    )
      throw new Error("PUBLIC_WIRE_RELEASE_EVAL_COVERAGE_INCOMPLETE");
    await client.query(
      "UPDATE workflow_releases SET revoked_at=now() WHERE revoked_at IS NULL",
    );
    const inserted = await client.query<{ workflow_release_id: string }>(
      `INSERT INTO workflow_releases
      (release_key,workflow_digest,build_digest,model,prompt_version,schema_version,policy_version,evaluator_version,corpus_hash,eval_run_id,promoted_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING workflow_release_id`,
      [
        params.releaseKey,
        descriptor.workflowDigest,
        descriptor.buildDigest,
        descriptor.model,
        descriptor.promptVersion,
        descriptor.schemaVersion,
        descriptor.policyVersion,
        descriptor.evaluatorVersion,
        descriptor.corpusHash,
        params.evalRunId,
        params.actor,
      ],
    );
    return inserted.rows[0].workflow_release_id;
  });
}
