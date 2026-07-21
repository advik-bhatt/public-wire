import { describe, expect, it } from "vitest";
import {
  buildReaderAuditAnswers,
  matchReaderAuditQuestion,
} from "@/lib/public-wire-view-models/reader-audit";
import {
  NYC_BINS_CASE_KEY,
  nycBinsInvestigation,
} from "@/lib/public-wire-view-models/nyc-fixtures";

describe("reader audit answers", () => {
  it("derives source and repair impact from the disclosed case record", () => {
    expect(nycBinsInvestigation.summary.publicCaseKey).toBe(NYC_BINS_CASE_KEY);
    const answers = buildReaderAuditAnswers(nycBinsInvestigation);
    expect(answers.support.sources.length).toBeGreaterThan(1);
    expect(answers.support.answer).toContain("bounded excerpt");
    expect(answers.agents.answer).toContain("bounded recovery loop");
    expect(answers.agents.answer).toContain("new sources");
    expect(answers.agents.activityAnchor).toBe("#activity-heading");
    expect(answers.change.headline).toBe(
      "2 material claims corrected before application review",
    );
    expect(answers.change.answer).toContain("complete second review");
    expect(answers.change.metrics).toContainEqual({
      label: "Draft rewrites",
      value: "1",
    });
    expect(answers.change.claimKeys).toEqual(
      expect.arrayContaining([
        "claim_ref_nyc_bins_enforcement_K7v2mQ9xP4rT",
        "claim_ref_nyc_bins_scope_F7m3qL9xP2vR",
      ]),
    );
    expect(answers.change.activityAnchor).toBe("#activity-heading");
  });

  it("routes freeform reader questions without inventing an answer", () => {
    expect(matchReaderAuditQuestion("What did the verifier catch?")).toBe(
      "agents",
    );
    expect(matchReaderAuditQuestion("Who is affected and why?")).toBe("impact");
    expect(matchReaderAuditQuestion("What changed since last time?")).toBe(
      "change",
    );
    expect(matchReaderAuditQuestion("Show the receipts")).toBe("support");
  });
});
