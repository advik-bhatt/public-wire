import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../db/migrations/004_change_intelligence.sql", import.meta.url),
  "utf8",
);

describe("change intelligence migration", () => {
  it.each([
    "source_watches",
    "source_watch_aliases",
    "source_checks",
    "source_observations",
    "investigation_revisions",
    "claim_lineages",
    "public_claim_lineage_keys",
    "claim_conflicts",
    "dissent_resolutions",
    "human_dispositions",
    "change_assessments",
    "execution_spans",
    "eval_suites",
    "eval_runs",
    "eval_case_results",
    "workflow_releases",
    "publication_attestations",
  ])("creates %s", (table) => {
    expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
  });

  it("fences both pending and unknown publication intents", () => {
    expect(migration).toContain("state IN ('pending','unknown')");
  });

  it("keeps execution spans free of prompt, body, content, reasoning, secret, and token fields", () => {
    expect(migration).toContain(
      "NOT (safe_attributes ?| ARRAY['prompt','body','content','reasoning','secret','token'])",
    );
  });

  it("stores authenticated actor roles and redirect aliases", () => {
    expect(migration).toContain("actor_role text NOT NULL");
    expect(migration).toContain("PRIMARY KEY (source_watch_id,canonical_url)");
  });
});
