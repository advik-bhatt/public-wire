DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviewer_results_reviewer_check') THEN
    ALTER TABLE reviewer_results ADD CONSTRAINT reviewer_results_reviewer_check
      CHECK (reviewer IN ('editorial','factual','style','reliability','reachability')) NOT VALID;
    ALTER TABLE reviewer_results VALIDATE CONSTRAINT reviewer_results_reviewer_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='final_gate_results_outcome_check') THEN
    ALTER TABLE final_gate_results ADD CONSTRAINT final_gate_results_outcome_check
      CHECK ((passed AND cardinality(reason_codes)=0) OR (NOT passed AND cardinality(reason_codes)>0)) NOT VALID;
    ALTER TABLE final_gate_results VALIDATE CONSTRAINT final_gate_results_outcome_check;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS publication_intents_provider_key_idx
  ON publication_intents (provider_key) WHERE provider_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS publications_provider_id_idx
  ON publications (provider_id);

CREATE INDEX IF NOT EXISTS public_disclosure_publication_slug_idx
  ON investigation_disclosures ((approved_projection->'publication'->>'slug'))
  WHERE visibility='public' AND revoked_at IS NULL;
