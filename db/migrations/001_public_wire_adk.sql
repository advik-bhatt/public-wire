CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS area_registry (
  area_key text PRIMARY KEY CHECK (area_key ~ '^[a-z0-9-]+$'),
  display_name text NOT NULL,
  timezone text NOT NULL,
  source_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO area_registry (area_key, display_name, timezone, source_policy)
VALUES ('new-brunswick', 'New Brunswick, NJ', 'America/New_York', '{"allowedSourceClasses":["official","public"]}'::jsonb)
ON CONFLICT (area_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS investigations (
  investigation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL REFERENCES area_registry(area_key),
  topic text NOT NULL CHECK (char_length(topic) BETWEEN 8 AND 240),
  normalized_topic text NOT NULL,
  workflow_state text NOT NULL CHECK (workflow_state IN ('discovered','gathering','verifying','needs_evidence','held','drafting','reviewing','publish_ready','complete','failed','cancelled')),
  publication_state text NOT NULL DEFAULT 'none' CHECK (publication_state IN ('none','pending','confirmed','unknown','failed','withdrawn')),
  lifecycle_state text NOT NULL DEFAULT 'open' CHECK (lifecycle_state IN ('open','resolved')),
  correction_state text NOT NULL DEFAULT 'none' CHECK (correction_state IN ('none','clarified','corrected','retracted')),
  freshness_state text NOT NULL DEFAULT 'unknown' CHECK (freshness_state IN ('current','stale','unknown')),
  current_revision integer NOT NULL DEFAULT 1 CHECK (current_revision > 0),
  policy_version text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS investigations_area_topic_idx ON investigations (area_key, normalized_topic);

CREATE TABLE IF NOT EXISTS investigation_disclosures (
  investigation_id uuid PRIMARY KEY REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  requester_scope_hash text,
  policy_version text NOT NULL,
  actor text NOT NULL,
  approved_projection jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS public_case_keys (
  public_case_key text PRIMARY KEY CHECK (char_length(public_case_key) >= 20),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  requester_scope_hash text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investigation_candidates (
  candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL,
  source_fingerprint text,
  payload jsonb NOT NULL,
  extraction_state text NOT NULL,
  selection_decision text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, candidate_id)
);

CREATE TABLE IF NOT EXISTS source_artifacts (
  artifact_id uuid NOT NULL,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  artifact_version integer NOT NULL,
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('raw','normalized','evidence-matrix','draft','other')),
  adk_artifact_name text NOT NULL,
  source_id text NOT NULL,
  source_url text NOT NULL,
  canonical_url text NOT NULL,
  media_type text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  derived_from_artifact_id uuid,
  derived_from_artifact_version integer,
  normalizer_version text,
  fetch_method text NOT NULL,
  http_status integer,
  effective_at timestamptz,
  storage_uri text NOT NULL,
  access_classification text NOT NULL CHECK (access_classification IN ('public','internal-restricted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL,
  PRIMARY KEY (artifact_id, artifact_version),
  CONSTRAINT source_artifacts_derivation_pair_check CHECK ((derived_from_artifact_id IS NULL) = (derived_from_artifact_version IS NULL)),
  FOREIGN KEY (derived_from_artifact_id, derived_from_artifact_version)
    REFERENCES source_artifacts(artifact_id, artifact_version)
);

CREATE TABLE IF NOT EXISTS claims (
  claim_id uuid PRIMARY KEY,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL,
  normalized_text text NOT NULL,
  claim_type text NOT NULL,
  importance text NOT NULL CHECK (importance IN ('material','contextual')),
  status text NOT NULL CHECK (status IN ('proposed','supported','disputed','unsupported','superseded')),
  created_by_event_id uuid,
  prompt_version text NOT NULL,
  schema_version text NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_links (
  evidence_link_id uuid PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL,
  artifact_version integer NOT NULL,
  source_url text NOT NULL,
  supporting_excerpt text NOT NULL,
  start_offset integer,
  end_offset integer,
  page_number integer,
  relation text NOT NULL CHECK (relation IN ('supports','contradicts','contextualizes')),
  source_authority text NOT NULL,
  extractor_event_id uuid NOT NULL,
  verifier_event_id uuid,
  verified_at timestamptz,
  confidence numeric(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  FOREIGN KEY (artifact_id, artifact_version)
    REFERENCES source_artifacts(artifact_id, artifact_version)
);

CREATE TABLE IF NOT EXISTS public_claim_keys (
  public_claim_key text PRIMARY KEY CHECK (char_length(public_claim_key) >= 20),
  claim_id uuid NOT NULL UNIQUE REFERENCES claims(claim_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_evidence_receipt_keys (
  public_receipt_key text PRIMARY KEY CHECK (char_length(public_receipt_key) >= 20),
  evidence_link_id uuid NOT NULL UNIQUE REFERENCES evidence_links(evidence_link_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_decisions (
  decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('publish','hold','reject','needs_evidence','needs_revision')),
  reason_codes text[] NOT NULL,
  blocking_claim_ids uuid[] NOT NULL DEFAULT '{}',
  event_id uuid NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, event_id)
);

CREATE TABLE IF NOT EXISTS reviewer_results (
  reviewer_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL,
  reviewer text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('pass','fail','skipped','unavailable','malformed','timed_out','error')),
  issue_codes text[] NOT NULL DEFAULT '{}',
  reviewed_content_hash text NOT NULL CHECK (reviewed_content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, reviewer, reviewed_content_hash)
);

CREATE TABLE IF NOT EXISTS final_gate_results (
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  revision integer NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  passed boolean NOT NULL,
  reason_codes text[] NOT NULL DEFAULT '{}',
  job_attempt_id uuid NOT NULL,
  event_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, revision, content_hash)
);

CREATE TABLE IF NOT EXISTS investigation_jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  requester_scope_hash text NOT NULL,
  operation text NOT NULL,
  requested_revision integer NOT NULL,
  input_fingerprint text NOT NULL,
  idempotency_key text NOT NULL,
  state text NOT NULL CHECK (state IN ('queued','running','complete','failed','cancelled','dead_letter')),
  safe_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_scope_hash, idempotency_key)
);

CREATE TABLE IF NOT EXISTS job_receipt_keys (
  job_receipt_key text PRIMARY KEY CHECK (char_length(job_receipt_key) >= 20),
  job_id uuid NOT NULL UNIQUE REFERENCES investigation_jobs(job_id) ON DELETE CASCADE,
  requester_scope_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investigation_job_attempts (
  job_attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES investigation_jobs(job_id) ON DELETE CASCADE,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  state text NOT NULL CHECK (state IN ('running','complete','failed','cancelled')),
  worker_id text NOT NULL,
  lease_token uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_expires_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  invocation_id text UNIQUE,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (job_id, attempt_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_running_attempt_per_investigation
  ON investigation_job_attempts (investigation_id) WHERE state = 'running';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='final_gate_results_attempt_fkey') THEN
    ALTER TABLE final_gate_results
      ADD CONSTRAINT final_gate_results_attempt_fkey
      FOREIGN KEY (job_attempt_id) REFERENCES investigation_job_attempts(job_attempt_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_envelopes (
  event_id uuid PRIMARY KEY,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES investigation_jobs(job_id) ON DELETE CASCADE,
  job_attempt_id uuid NOT NULL REFERENCES investigation_job_attempts(job_attempt_id) ON DELETE CASCADE,
  app_name text NOT NULL,
  user_id text NOT NULL,
  session_id text NOT NULL,
  adk_event_id text,
  invocation_id text,
  cursor bigint GENERATED ALWAYS AS IDENTITY,
  envelope jsonb NOT NULL,
  persisted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (app_name, user_id, session_id, adk_event_id)
);

CREATE TABLE IF NOT EXISTS event_outbox (
  outbox_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES event_envelopes(event_id) ON DELETE CASCADE,
  destination text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','delivered','failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (event_id, destination)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='claims_created_event_fkey') THEN
    ALTER TABLE claims ADD CONSTRAINT claims_created_event_fkey FOREIGN KEY (created_by_event_id) REFERENCES event_envelopes(event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evidence_extractor_event_fkey') THEN
    ALTER TABLE evidence_links ADD CONSTRAINT evidence_extractor_event_fkey FOREIGN KEY (extractor_event_id) REFERENCES event_envelopes(event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evidence_verifier_event_fkey') THEN
    ALTER TABLE evidence_links ADD CONSTRAINT evidence_verifier_event_fkey FOREIGN KEY (verifier_event_id) REFERENCES event_envelopes(event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='workflow_decisions_event_fkey') THEN
    ALTER TABLE workflow_decisions ADD CONSTRAINT workflow_decisions_event_fkey FOREIGN KEY (event_id) REFERENCES event_envelopes(event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='final_gate_results_event_fkey') THEN
    ALTER TABLE final_gate_results ADD CONSTRAINT final_gate_results_event_fkey FOREIGN KEY (event_id) REFERENCES event_envelopes(event_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public_projection_snapshots (
  investigation_id uuid PRIMARY KEY REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  public_case_key text NOT NULL UNIQUE REFERENCES public_case_keys(public_case_key) ON DELETE CASCADE,
  requester_scope_hash text,
  visibility text NOT NULL CHECK (visibility IN ('private','unlisted','public')),
  schema_version text NOT NULL,
  projection_revision integer NOT NULL,
  snapshot_cursor bigint NOT NULL DEFAULT 0,
  stream_epoch text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public_event_projections (
  public_event_key text PRIMARY KEY,
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
  public_case_key text NOT NULL REFERENCES public_case_keys(public_case_key) ON DELETE CASCADE,
  cursor bigint NOT NULL,
  stream_epoch text NOT NULL,
  event_code text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  UNIQUE (public_case_key, stream_epoch, cursor)
);

CREATE TABLE IF NOT EXISTS publication_intents (
  publication_intent_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id),
  revision integer NOT NULL,
  content_hash text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending','confirmed','unknown','failed')),
  provider_key text,
  provider_id text,
  provider_url text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, revision, content_hash)
);

CREATE TABLE IF NOT EXISTS publications (
  publication_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_intent_id uuid NOT NULL UNIQUE REFERENCES publication_intents(publication_intent_id),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id),
  revision integer NOT NULL,
  content_hash text NOT NULL,
  provider_id text NOT NULL,
  provider_url text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public_wire_block_revision_during_publication()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_revision <> OLD.current_revision AND EXISTS (
    SELECT 1 FROM publication_intents
    WHERE investigation_id=OLD.investigation_id AND state='pending'
  ) THEN
    RAISE EXCEPTION 'PUBLIC_WIRE_PUBLICATION_FENCE_ACTIVE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS public_wire_publication_revision_fence ON investigations;
CREATE TRIGGER public_wire_publication_revision_fence
BEFORE UPDATE OF current_revision ON investigations
FOR EACH ROW EXECUTE FUNCTION public_wire_block_revision_during_publication();

CREATE TABLE IF NOT EXISTS corrections (
  correction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id),
  correction_type text NOT NULL CHECK (correction_type IN ('clarification','correction','retraction')),
  rationale_code text NOT NULL,
  affected_claim_ids uuid[] NOT NULL,
  prior_publication_id uuid REFERENCES publications(publication_id),
  replacement_publication_id uuid REFERENCES publications(publication_id),
  effective_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coverage_requests (
  coverage_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id uuid NOT NULL REFERENCES investigations(investigation_id),
  requester_scope_hash text NOT NULL,
  normalized_request text NOT NULL,
  source_hint text,
  state text NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_scope_hash, idempotency_key)
);

CREATE TABLE IF NOT EXISTS runtime_controls (
  control_key text PRIMARY KEY,
  ai_mode text NOT NULL CHECK (ai_mode IN ('legacy','shadow','adk')),
  publication_blocked boolean NOT NULL DEFAULT true,
  rollout jsonb NOT NULL DEFAULT '{}'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  actor text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO runtime_controls (control_key, ai_mode, publication_blocked, rollout, actor)
VALUES ('canonical', 'shadow', true, '{"shadowSampleRate":0}'::jsonb, 'migration') ON CONFLICT (control_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS admission_quotas (
  area_key text NOT NULL REFERENCES area_registry(area_key),
  requester_scope_hash text NOT NULL,
  operation text NOT NULL,
  window_started_at timestamptz NOT NULL,
  used integer NOT NULL DEFAULT 0,
  limit_value integer NOT NULL,
  PRIMARY KEY (area_key, requester_scope_hash, operation, window_started_at)
);
