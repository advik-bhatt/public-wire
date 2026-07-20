ALTER TABLE source_artifacts ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE source_artifacts ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE source_artifacts ADD COLUMN IF NOT EXISTS fetch_method text;
ALTER TABLE source_artifacts ADD COLUMN IF NOT EXISTS http_status integer;
ALTER TABLE source_artifacts ADD COLUMN IF NOT EXISTS effective_at timestamptz;

UPDATE source_artifacts
SET source_id=COALESCE(source_id, 'legacy'),
    media_type=COALESCE(media_type, 'application/octet-stream'),
    fetch_method=COALESCE(fetch_method, 'upload')
WHERE source_id IS NULL OR media_type IS NULL OR fetch_method IS NULL;

ALTER TABLE source_artifacts ALTER COLUMN source_id SET NOT NULL;
ALTER TABLE source_artifacts ALTER COLUMN media_type SET NOT NULL;
ALTER TABLE source_artifacts ALTER COLUMN fetch_method SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='source_artifacts_derivation_pair_check') THEN
    ALTER TABLE source_artifacts ADD CONSTRAINT source_artifacts_derivation_pair_check
      CHECK ((derived_from_artifact_id IS NULL) = (derived_from_artifact_version IS NULL)) NOT VALID;
    ALTER TABLE source_artifacts VALIDATE CONSTRAINT source_artifacts_derivation_pair_check;
  END IF;
END $$;

DO $$
DECLARE key_columns integer;
BEGIN
  SELECT array_length(conkey, 1) INTO key_columns
  FROM pg_constraint
  WHERE conrelid='source_artifacts'::regclass AND contype='p';
  IF key_columns = 1 THEN
    ALTER TABLE source_artifacts DROP CONSTRAINT source_artifacts_pkey CASCADE;
    ALTER TABLE source_artifacts ADD PRIMARY KEY (artifact_id, artifact_version);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='source_artifacts'::regclass AND contype='f' AND array_length(conkey, 1)=2
  ) THEN
    ALTER TABLE source_artifacts
      ADD CONSTRAINT source_artifacts_derivation_fkey
      FOREIGN KEY (derived_from_artifact_id, derived_from_artifact_version)
      REFERENCES source_artifacts(artifact_id, artifact_version);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='evidence_links'::regclass AND contype='f' AND array_length(conkey, 1)=2
  ) THEN
    ALTER TABLE evidence_links
      ADD CONSTRAINT evidence_links_artifact_version_fkey
      FOREIGN KEY (artifact_id, artifact_version)
      REFERENCES source_artifacts(artifact_id, artifact_version);
  END IF;
END $$;

ALTER TABLE investigation_jobs DROP CONSTRAINT IF EXISTS investigation_jobs_state_check;
ALTER TABLE investigation_jobs ADD CONSTRAINT investigation_jobs_state_check
  CHECK (state IN ('queued','running','complete','failed','cancelled','dead_letter'));

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

ALTER TABLE final_gate_results ALTER COLUMN job_attempt_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='final_gate_results_attempt_fkey') THEN
    ALTER TABLE final_gate_results
      ADD CONSTRAINT final_gate_results_attempt_fkey
      FOREIGN KEY (job_attempt_id) REFERENCES investigation_job_attempts(job_attempt_id);
  END IF;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS workflow_decisions_event_revision_idx
  ON workflow_decisions (investigation_id, revision, event_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='claims_created_event_fkey') THEN
    ALTER TABLE claims ADD CONSTRAINT claims_created_event_fkey FOREIGN KEY (created_by_event_id) REFERENCES event_envelopes(event_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evidence_extractor_event_fkey') THEN
    ALTER TABLE evidence_links ADD CONSTRAINT evidence_extractor_event_fkey FOREIGN KEY (extractor_event_id) REFERENCES event_envelopes(event_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='evidence_verifier_event_fkey') THEN
    ALTER TABLE evidence_links ADD CONSTRAINT evidence_verifier_event_fkey FOREIGN KEY (verifier_event_id) REFERENCES event_envelopes(event_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='workflow_decisions_event_fkey') THEN
    ALTER TABLE workflow_decisions ADD CONSTRAINT workflow_decisions_event_fkey FOREIGN KEY (event_id) REFERENCES event_envelopes(event_id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='final_gate_results_event_fkey') THEN
    ALTER TABLE final_gate_results ADD CONSTRAINT final_gate_results_event_fkey FOREIGN KEY (event_id) REFERENCES event_envelopes(event_id) NOT VALID;
  END IF;
END $$;

UPDATE runtime_controls
SET rollout = rollout || '{"shadowSampleRate":0}'::jsonb,
    version = version + 1,
    updated_at = now(),
    actor = '002_public_wire_adversarial_hardening'
WHERE control_key='canonical' AND NOT (rollout ? 'shadowSampleRate');
