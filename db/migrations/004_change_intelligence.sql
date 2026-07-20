-- PublicWire change intelligence, dissent resolution, and workflow promotion.
-- This migration is forward-only: existing rows remain valid while every new
-- change-intelligence write is linked to an investigation revision and attempt.

ALTER TABLE investigation_job_attempts ADD COLUMN IF NOT EXISTS adk_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS investigation_attempt_adk_session_idx
  ON investigation_job_attempts (adk_session_id) WHERE adk_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS investigation_revisions (
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  parent_revision integer,
  revision_kind text NOT NULL CHECK (revision_kind IN ('initial','source_refresh','clarification','correction','retraction')),
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  input_fingerprint text NOT NULL CHECK (input_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, revision),
  CHECK ((revision = 1 AND parent_revision IS NULL) OR (revision > 1 AND parent_revision = revision - 1))
);

CREATE TABLE IF NOT EXISTS source_watches (
  source_watch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  source_id text NOT NULL,
  canonical_url text NOT NULL CHECK (canonical_url LIKE 'https://%'),
  access_classification text NOT NULL CHECK (access_classification IN ('public','internal-restricted')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','paused','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, source_id, canonical_url)
);

CREATE TABLE IF NOT EXISTS source_watch_aliases (
  source_watch_id uuid NOT NULL REFERENCES source_watches(source_watch_id) ON DELETE CASCADE,
  canonical_url text NOT NULL CHECK (canonical_url LIKE 'https://%'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_watch_id,canonical_url)
);

ALTER TABLE investigation_jobs ADD COLUMN IF NOT EXISTS source_watch_id uuid REFERENCES source_watches(source_watch_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='investigation_jobs_operation_v2_check') THEN
    ALTER TABLE investigation_jobs ADD CONSTRAINT investigation_jobs_operation_v2_check
      CHECK (operation IN ('scan','source_refresh')) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS source_checks (
  source_check_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_watch_id uuid NOT NULL REFERENCES source_watches(source_watch_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  requested_revision integer NOT NULL CHECK (requested_revision > 0),
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('changed','unchanged','unreachable','error')),
  http_status integer CHECK (http_status BETWEEN 100 AND 599),
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_watch_id, request_fingerprint)
);

CREATE TABLE IF NOT EXISTS source_observations (
  source_observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_check_id uuid NOT NULL UNIQUE REFERENCES source_checks(source_check_id) ON DELETE CASCADE,
  source_watch_id uuid NOT NULL REFERENCES source_watches(source_watch_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  prior_observation_id uuid REFERENCES source_observations(source_observation_id),
  normalized_content_hash text CHECK (normalized_content_hash ~ '^[a-f0-9]{64}$'),
  artifact_id uuid,
  artifact_version integer,
  observed_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((artifact_id IS NULL) = (artifact_version IS NULL)),
  CHECK (normalized_content_hash IS NOT NULL OR artifact_id IS NULL),
  FOREIGN KEY (artifact_id, artifact_version) REFERENCES source_artifacts(artifact_id, artifact_version),
  UNIQUE (source_watch_id, normalized_content_hash)
);

CREATE TABLE IF NOT EXISTS claim_lineages (
  claim_lineage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  lineage_key text NOT NULL CHECK (lineage_key ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, lineage_key)
);

CREATE TABLE IF NOT EXISTS claim_lineage_members (
  claim_lineage_id uuid NOT NULL REFERENCES claim_lineages(claim_lineage_id) ON DELETE CASCADE,
  claim_id uuid NOT NULL UNIQUE REFERENCES claims(claim_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  supersedes_claim_id uuid REFERENCES claims(claim_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_lineage_id, revision)
);

CREATE TABLE IF NOT EXISTS public_claim_lineage_keys (
  public_claim_key text PRIMARY KEY CHECK (char_length(public_claim_key) >= 20),
  claim_lineage_id uuid NOT NULL UNIQUE REFERENCES claim_lineages(claim_lineage_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS draft_dependencies (
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  draft_content_hash text NOT NULL CHECK (draft_content_hash ~ '^[a-f0-9]{64}$'),
  claim_lineage_id uuid NOT NULL REFERENCES claim_lineages(claim_lineage_id),
  claim_id uuid NOT NULL REFERENCES claims(claim_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, revision, draft_content_hash, claim_lineage_id)
);

CREATE TABLE IF NOT EXISTS claim_conflicts (
  claim_conflict_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  claim_lineage_id uuid NOT NULL REFERENCES claim_lineages(claim_lineage_id),
  conflict_fingerprint text NOT NULL CHECK (conflict_fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional','resolved_supported','scoped_difference','unresolved_material','human_disposition')),
  created_by_event_id uuid NOT NULL REFERENCES event_envelopes(event_id),
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, conflict_fingerprint)
);

CREATE TABLE IF NOT EXISTS claim_conflict_evidence (
  claim_conflict_id uuid NOT NULL REFERENCES claim_conflicts(claim_conflict_id) ON DELETE CASCADE,
  evidence_link_id uuid NOT NULL REFERENCES evidence_links(evidence_link_id),
  side_key text NOT NULL CHECK (char_length(side_key) BETWEEN 1 AND 80),
  PRIMARY KEY (claim_conflict_id, evidence_link_id)
);

CREATE TABLE IF NOT EXISTS dissent_resolutions (
  dissent_resolution_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_conflict_id uuid NOT NULL REFERENCES claim_conflicts(claim_conflict_id),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  conflict_fingerprint text NOT NULL CHECK (conflict_fingerprint ~ '^[a-f0-9]{64}$'),
  proposed_outcome text NOT NULL CHECK (proposed_outcome IN ('resolved_supported','scoped_difference','unresolved_material')),
  basis_code text NOT NULL CHECK (basis_code IN ('SAME_FACT_DIFFERENT_SCOPE','SUPERSEDED_SOURCE_VERSION','UNEQUAL_AUTHORITY','EQUAL_AUTHORITY_CONFLICT','INSUFFICIENT_METADATA')),
  supporting_evidence_link_ids uuid[] NOT NULL,
  limiting_evidence_link_ids uuid[] NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  policy_version text NOT NULL,
  event_id uuid NOT NULL REFERENCES event_envelopes(event_id),
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_conflict_id, conflict_fingerprint, prompt_version, schema_version, policy_version)
);

CREATE TABLE IF NOT EXISTS human_dispositions (
  human_disposition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_conflict_id uuid NOT NULL REFERENCES claim_conflicts(claim_conflict_id),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  expected_revision integer NOT NULL CHECK (expected_revision > 0),
  conflict_fingerprint text NOT NULL CHECK (conflict_fingerprint ~ '^[a-f0-9]{64}$'),
  decision text NOT NULL CHECK (decision IN ('narrow','attribute','keep_held','correct','retract')),
  actor text NOT NULL CHECK (char_length(actor) BETWEEN 3 AND 160),
  actor_role text NOT NULL DEFAULT 'editor' CHECK (actor_role IN ('editor','administrator','publisher')),
  idempotency_key text NOT NULL,
  rationale text NOT NULL CHECK (char_length(rationale) BETWEEN 8 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor, idempotency_key)
);

ALTER TABLE investigation_revisions ALTER COLUMN job_attempt_id DROP NOT NULL;
ALTER TABLE investigation_revisions ADD COLUMN IF NOT EXISTS human_disposition_id uuid REFERENCES human_dispositions(human_disposition_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='investigation_revisions_origin_check') THEN
    ALTER TABLE investigation_revisions ADD CONSTRAINT investigation_revisions_origin_check
      CHECK (num_nonnulls(job_attempt_id,human_disposition_id)=1) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS change_assessments (
  change_assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  source_watch_id uuid NOT NULL REFERENCES source_watches(source_watch_id),
  prior_observation_id uuid NOT NULL REFERENCES source_observations(source_observation_id),
  current_observation_id uuid NOT NULL REFERENCES source_observations(source_observation_id),
  normalized_diff_hash text NOT NULL CHECK (normalized_diff_hash ~ '^[a-f0-9]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('no_editorial_impact','clarification','material_update','possible_correction','possible_retraction','unreachable')),
  requires_human_disposition boolean NOT NULL,
  policy_version text NOT NULL,
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, prior_observation_id, current_observation_id)
);

CREATE TABLE IF NOT EXISTS change_deltas (
  change_delta_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_assessment_id uuid NOT NULL REFERENCES change_assessments(change_assessment_id) ON DELETE CASCADE,
  claim_lineage_id uuid NOT NULL REFERENCES claim_lineages(claim_lineage_id),
  delta_kind text NOT NULL CHECK (delta_kind IN ('added','removed','changed','status_changed','unaffected')),
  before_excerpt text,
  after_excerpt text,
  public_safe boolean NOT NULL DEFAULT false,
  CHECK (char_length(COALESCE(before_excerpt,'')) <= 600 AND char_length(COALESCE(after_excerpt,'')) <= 600)
);

CREATE TABLE IF NOT EXISTS execution_spans (
  execution_span_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id),
  invocation_id text NOT NULL,
  parent_span_id uuid REFERENCES execution_spans(execution_span_id),
  span_kind text NOT NULL CHECK (span_kind IN ('run','agent','model','tool','policy','persistence')),
  name text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('started','succeeded','failed','cancelled')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  latency_ms integer CHECK (latency_ms >= 0),
  model text,
  input_hash text CHECK (input_hash IS NULL OR input_hash ~ '^[a-f0-9]{64}$'),
  output_hash text CHECK (output_hash IS NULL OR output_hash ~ '^[a-f0-9]{64}$'),
  safe_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (NOT (safe_attributes ?| ARRAY['prompt','body','content','reasoning','secret','token']))
);

CREATE TABLE IF NOT EXISTS eval_suites (
  eval_suite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_key text NOT NULL UNIQUE,
  evaluator_version text NOT NULL,
  corpus_hash text NOT NULL CHECK (corpus_hash ~ '^[a-f0-9]{64}$'),
  locked_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_cases (
  eval_case_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_suite_id uuid NOT NULL REFERENCES eval_suites(eval_suite_id) ON DELETE CASCADE,
  case_key text NOT NULL,
  fixture_hash text NOT NULL CHECK (fixture_hash ~ '^[a-f0-9]{64}$'),
  expected_invariants jsonb NOT NULL,
  expected_partial_order jsonb NOT NULL,
  UNIQUE (eval_suite_id, case_key)
);

CREATE TABLE IF NOT EXISTS eval_runs (
  eval_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_suite_id uuid NOT NULL REFERENCES eval_suites(eval_suite_id),
  workflow_digest text NOT NULL CHECK (workflow_digest ~ '^[a-f0-9]{64}$'),
  build_digest text NOT NULL CHECK (build_digest ~ '^[a-f0-9]{64}$'),
  model text NOT NULL,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  policy_version text NOT NULL,
  evaluator_version text NOT NULL,
  corpus_hash text NOT NULL CHECK (corpus_hash ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (state IN ('running','passed','failed')),
  false_publish_count integer NOT NULL DEFAULT 0 CHECK (false_publish_count >= 0),
  safety_violation_count integer NOT NULL DEFAULT 0 CHECK (safety_violation_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS eval_case_results (
  eval_run_id uuid NOT NULL REFERENCES eval_runs(eval_run_id) ON DELETE CASCADE,
  eval_case_id uuid NOT NULL REFERENCES eval_cases(eval_case_id),
  passed boolean NOT NULL,
  invariant_results jsonb NOT NULL,
  partial_order_results jsonb NOT NULL,
  trace_digest text NOT NULL CHECK (trace_digest ~ '^[a-f0-9]{64}$'),
  safety_violations text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (eval_run_id, eval_case_id)
);

CREATE TABLE IF NOT EXISTS workflow_releases (
  workflow_release_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_key text NOT NULL UNIQUE,
  workflow_digest text NOT NULL CHECK (workflow_digest ~ '^[a-f0-9]{64}$'),
  build_digest text NOT NULL CHECK (build_digest ~ '^[a-f0-9]{64}$'),
  model text NOT NULL,
  prompt_version text NOT NULL,
  schema_version text NOT NULL,
  policy_version text NOT NULL,
  evaluator_version text NOT NULL,
  corpus_hash text NOT NULL CHECK (corpus_hash ~ '^[a-f0-9]{64}$'),
  eval_run_id uuid NOT NULL REFERENCES eval_runs(eval_run_id),
  promoted_by text NOT NULL,
  promoted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= promoted_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_workflow_release
  ON workflow_releases ((true)) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS publication_attestations (
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision > 0),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  workflow_release_id uuid NOT NULL REFERENCES workflow_releases(workflow_release_id),
  trace_digest text NOT NULL CHECK (trace_digest ~ '^[a-f0-9]{64}$'),
  reconciled_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, revision, content_hash)
);

CREATE INDEX IF NOT EXISTS source_checks_watch_time_idx ON source_checks(source_watch_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS source_observations_watch_time_idx ON source_observations(source_watch_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS claim_lineage_members_investigation_revision_idx ON claim_lineage_members(investigation_id, revision);
CREATE INDEX IF NOT EXISTS claim_conflicts_revision_idx ON claim_conflicts(investigation_id, revision);
CREATE INDEX IF NOT EXISTS change_assessments_revision_idx ON change_assessments(investigation_id, revision);
CREATE INDEX IF NOT EXISTS execution_spans_attempt_idx ON execution_spans(job_attempt_id, started_at);

CREATE OR REPLACE FUNCTION public_wire_block_revision_during_publication()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_revision <> OLD.current_revision AND EXISTS (
    SELECT 1 FROM publication_intents
    WHERE investigation_id=OLD.investigation_id AND state IN ('pending','unknown')
  ) THEN
    RAISE EXCEPTION 'PUBLIC_WIRE_PUBLICATION_FENCE_ACTIVE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS public_wire_publication_revision_fence ON investigations;
CREATE TRIGGER public_wire_publication_revision_fence
BEFORE UPDATE OF current_revision ON investigations
FOR EACH ROW EXECUTE FUNCTION public_wire_block_revision_during_publication();
