import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  evaluateSuite,
  lockedEvalCaseSchema,
  releaseDescriptorSchema,
} from "../lib/investigations/trajectory-eval";
import { Pool, type PoolClient } from "pg";

let evalPool: Pool | undefined;

async function withEvalTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
) {
  evalPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: "public-wire-eval",
  });
  const client = await evalPool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function persistResult(
  cases: unknown[],
  result: ReturnType<typeof evaluateSuite>,
) {
  if (!process.env.DATABASE_URL) return undefined;
  const lockedCases = cases.map((item) => lockedEvalCaseSchema.parse(item));
  const corpusHash = createHash("sha256")
    .update(JSON.stringify(lockedCases))
    .digest("hex");
  const descriptor = releaseDescriptorSchema.parse({
    workflowDigest: process.env.PUBLIC_WIRE_WORKFLOW_DIGEST,
    buildDigest: process.env.PUBLIC_WIRE_BUILD_DIGEST,
    model: process.env.PUBLIC_WIRE_ADK_MODEL || "gemini-2.5-flash",
    promptVersion: process.env.PUBLIC_WIRE_PROMPT_VERSION || "2026-07-20.1",
    schemaVersion: process.env.PUBLIC_WIRE_SCHEMA_VERSION || "1",
    policyVersion: process.env.PUBLIC_WIRE_POLICY_VERSION || "2026-07-19.1",
    evaluatorVersion:
      process.env.PUBLIC_WIRE_EVALUATOR_VERSION || "trajectory-contract-v1",
    corpusHash,
  });
  return withEvalTransaction(async (client) => {
    const suiteKey =
      process.env.PUBLIC_WIRE_EVAL_SUITE_KEY ||
      "public-wire-trajectory-contract-v1";
    const existing = await client.query<{
      eval_suite_id: string;
      corpus_hash: string;
      evaluator_version: string;
    }>(
      "SELECT eval_suite_id,corpus_hash,evaluator_version FROM eval_suites WHERE suite_key=$1 FOR UPDATE",
      [suiteKey],
    );
    if (
      existing.rowCount &&
      (existing.rows[0].corpus_hash !== descriptor.corpusHash ||
        existing.rows[0].evaluator_version !== descriptor.evaluatorVersion)
    )
      throw new Error("PUBLIC_WIRE_LOCKED_EVAL_SUITE_MISMATCH");
    const suite = existing.rowCount
      ? existing.rows[0]
      : (
          await client.query<{
            eval_suite_id: string;
            corpus_hash: string;
            evaluator_version: string;
          }>(
            `INSERT INTO eval_suites (suite_key,evaluator_version,corpus_hash,locked_at)
      VALUES ($1,$2,$3,now()) RETURNING eval_suite_id,corpus_hash,evaluator_version`,
            [suiteKey, descriptor.evaluatorVersion, descriptor.corpusHash],
          )
        ).rows[0];
    const caseIds = new Map<string, string>();
    for (const evalCase of lockedCases) {
      const fixtureHash = createHash("sha256")
        .update(JSON.stringify(evalCase))
        .digest("hex");
      const inserted = await client.query<{ eval_case_id: string }>(
        `INSERT INTO eval_cases (eval_suite_id,case_key,fixture_hash,expected_invariants,expected_partial_order)
        VALUES ($1,$2,$3,$4::jsonb,$5::jsonb) ON CONFLICT (eval_suite_id,case_key) DO UPDATE SET case_key=EXCLUDED.case_key
        WHERE eval_cases.fixture_hash=EXCLUDED.fixture_hash RETURNING eval_case_id`,
        [
          suite.eval_suite_id,
          evalCase.caseKey,
          fixtureHash,
          JSON.stringify({
            requiredKinds: evalCase.requiredKinds,
            forbiddenKinds: evalCase.forbiddenKinds,
            expectedPublication: evalCase.expectedPublication,
          }),
          JSON.stringify(evalCase.partialOrder),
        ],
      );
      if (!inserted.rowCount)
        throw new Error("PUBLIC_WIRE_LOCKED_EVAL_CASE_MISMATCH");
      caseIds.set(evalCase.caseKey, inserted.rows[0].eval_case_id);
    }
    const run = await client.query<{ eval_run_id: string }>(
      `INSERT INTO eval_runs
      (eval_suite_id,workflow_digest,build_digest,model,prompt_version,schema_version,policy_version,evaluator_version,corpus_hash,state,false_publish_count,safety_violation_count,finished_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now()) RETURNING eval_run_id`,
      [
        suite.eval_suite_id,
        descriptor.workflowDigest,
        descriptor.buildDigest,
        descriptor.model,
        descriptor.promptVersion,
        descriptor.schemaVersion,
        descriptor.policyVersion,
        descriptor.evaluatorVersion,
        descriptor.corpusHash,
        result.passed ? "passed" : "failed",
        result.falsePublishCount,
        result.safetyViolationCount,
      ],
    );
    for (const caseResult of result.results)
      await client.query(
        `INSERT INTO eval_case_results
      (eval_run_id,eval_case_id,passed,invariant_results,partial_order_results,trace_digest,safety_violations)
      VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)`,
        [
          run.rows[0].eval_run_id,
          caseIds.get(caseResult.caseKey),
          caseResult.passed,
          JSON.stringify({ failures: caseResult.failures }),
          JSON.stringify({
            passed: !caseResult.failures.some((failure) =>
              failure.startsWith("ORDER:"),
            ),
          }),
          caseResult.traceDigest,
          caseResult.safetyViolations,
        ],
      );
    return run.rows[0].eval_run_id;
  });
}

async function main() {
  const path = process.argv[2]
    ? resolve(process.argv[2])
    : resolve(process.cwd(), "tests/fixtures/locked-trajectories.json");
  const cases = JSON.parse(await readFile(path, "utf8"));
  const result = evaluateSuite(cases);
  const evalRunId = await persistResult(cases, result);
  process.stdout.write(
    `${JSON.stringify({ ...result, evaluationKind: "deterministic_trajectory_contract", evalRunId }, null, 2)}\n`,
  );
  if (!result.passed || result.falsePublishCount || result.safetyViolationCount)
    process.exitCode = 1;
  if (evalPool) await evalPool.end();
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Evaluation failed"}\n`,
  );
  process.exitCode = 1;
});
