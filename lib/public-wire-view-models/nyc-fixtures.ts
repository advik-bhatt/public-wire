import { z } from "zod";
import {
  publicEditionViewSchema,
  publicInvestigationDetailSchema,
  type PublicInvestigationDetail,
} from "./schemas";
import { referenceRunSchema, type ReferenceRun } from "./reference-run-schema";

export const NYC_BINS_CASE_KEY = "case_ref_nyc_bins_enforcement_Q7m4xN2pL8vR";
export const NYC_BUSWAY_CASE_KEY = "case_ref_nyc_34th_busway_P8v4mL2xQ7nR";
export const NYC_BUSWAY_REFRESH_CASE_KEY =
  "case_ref_nyc_busway_refresh_H7m3qL9xP2vR";
export const NYC_BRIDGE_CASE_KEY = "case_ref_nyc_carroll_bridge_K6m2qV9xR4pT";

const BIN_REQUIREMENT = "claim_ref_nyc_bins_requirement_M5q3pL8xV2nR";
const BIN_ENFORCEMENT = "claim_ref_nyc_bins_enforcement_K7v2mQ9xP4rT";
const BIN_SCOPE = "claim_ref_nyc_bins_scope_F7m3qL9xP2vR";
const BIN_SPECIAL_USE = "claim_ref_nyc_bins_special_use_T6m2qV9xR4pK";
const BIN_SET_OUT = "claim_ref_nyc_bins_setout_A7m3qL9xP2vR";
const BIN_FINE = "claim_ref_nyc_bins_fines_N4v8mQ2xK7pR";
const BIN_REQUIREMENT_RECEIPT = "receipt_ref_nyc_bins_requirement_H4m8qL2vN7pR";
const BIN_ENFORCEMENT_RECEIPT = "receipt_ref_nyc_bins_enforcement_B8m4qL2vN7pR";
const BIN_SCOPE_RECEIPT = "receipt_ref_nyc_bins_scope_R5v9mQ3xK2pL";
const BIN_SPECIAL_USE_RECEIPT = "receipt_ref_nyc_bins_special_use_T8m4qL2vN6pR";
const BIN_RULES_RECEIPT = "receipt_ref_nyc_bins_rules_A7m3qL9xP2vR";
const BIN_FINE_RECEIPT = "receipt_ref_nyc_bins_fines_N4v8mQ2xK7pR";

const BUSWAY_PLAN = "claim_ref_nyc_busway_plan_C7m2qL8xV4pR";
const BUSWAY_SCHEDULE = "claim_ref_nyc_busway_schedule_D5v9mQ3xK7pL";
const BUSWAY_IMPACT = "claim_ref_nyc_busway_impact_T8m4qL2vN6pR";
const BUSWAY_PLAN_RECEIPT = "receipt_ref_nyc_busway_plan_W5v9mQ3xK2pL";
const BUSWAY_SCHEDULE_RECEIPT = "receipt_ref_nyc_busway_schedule_J9v3mQ7xL2pR";

const BRIDGE_ACCESS = "claim_ref_nyc_bridge_access_F5n8qK2vM4rT";
const BRIDGE_STATUS = "claim_ref_nyc_bridge_status_B4m7qL9vN2pR";
const BRIDGE_ACCESS_RECEIPT = "receipt_ref_nyc_bridge_access_N6q2vM9xL4pR";
const BRIDGE_FUTURE_RECEIPT = "receipt_ref_nyc_bridge_future_Q8v3mL6xK2pR";
const BRIDGE_REOPENED_RECEIPT = "receipt_ref_nyc_bridge_reopened_R5v9mQ3xK2pL";
const REFERENCE_EXECUTION = {
  kind: "deterministic_reference",
  contractVersion: "public-wire-reference-2026-07",
} as const;

const binsRequirementReceipt = {
  publicReceiptKey: BIN_REQUIREMENT_RECEIPT,
  sourceTitle: "NYC Bins",
  sourceUrl:
    "https://www.nyc.gov/site/dsny/collection/containerization/nyc-bins.page",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:00:00.000Z",
  effectiveAt: "2026-06-01T04:00:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "As of June 1, properties with 1-9 residential units are REQUIRED to use only official NYC Bins for trash set out.",
  artifactRevisionLabel: "NYC Bins page · Jun. 1 capture",
};

const binsEnforcementReceipt = {
  publicReceiptKey: BIN_ENFORCEMENT_RECEIPT,
  sourceTitle: "Empire Bins FAQ",
  sourceUrl:
    "https://www.nyc.gov/site/dsny/collection/containerization/empire-bins-faq.page",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:02:00.000Z",
  effectiveAt: "2026-09-08T04:00:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "A warning period will be in effect through September 7. Full enforcement of the NYC Bin requirements for trash will begin Tuesday, September 8, 2026.",
  artifactRevisionLabel: "Empire Bins FAQ · Jun. 1 capture",
};

const binsScopeReceipt = {
  publicReceiptKey: BIN_SCOPE_RECEIPT,
  sourceTitle: "NYC Bins",
  sourceUrl:
    "https://www.nyc.gov/site/dsny/collection/containerization/nyc-bins.page",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:04:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Separate NYC Bins are also available for recycling and composting, but are not required.",
  artifactRevisionLabel: "NYC Bins page · Jun. 1 capture",
};

const binsSpecialUseReceipt = {
  publicReceiptKey: BIN_SPECIAL_USE_RECEIPT,
  sourceTitle: "Residential Waste Containerization · NYC311",
  sourceUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-03602",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:05:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "These new rules also apply to special-use buildings receiving DSNY collection, including: City agencies Nonprofits Houses of worship Professional offices in residential buildings",
  artifactRevisionLabel: "NYC311 containerization guide · Jun. 1 capture",
};

const binsRulesReceipt = {
  publicReceiptKey: BIN_RULES_RECEIPT,
  sourceTitle: "Residential Trash Rules · NYC311",
  sourceUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-02086",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:06:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Place trash out after 6 PM in a bin of 55 gallons or less with a secure lid.",
  artifactRevisionLabel: "NYC311 trash rules · Jun. 1 capture",
};

const binsFineReceipt = {
  publicReceiptKey: BIN_FINE_RECEIPT,
  sourceTitle: "Residential Trash Rules · NYC311",
  sourceUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-02086",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-01T13:06:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Failure to use a bin that is 55 gallons or less with a secure lid for trash set out will result in fines: $50 for the first offense $100 for the second offense $200 for the third and subsequent offenses",
  artifactRevisionLabel: "NYC311 trash rules · Jun. 1 capture",
};

const buswayPlanReceipt = {
  publicReceiptKey: BUSWAY_PLAN_RECEIPT,
  sourceTitle: "Mayor Mamdani Advances 34th Street Busway in Manhattan",
  sourceUrl:
    "https://www.nyc.gov/mayors-office/news/2026/06/mayor-mamdani-advances-34th-street-busway-in-manhattan",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-02T16:10:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "The 34th Street busway will run in both directions between Ninth Avenue and Third Avenue.",
  artifactRevisionLabel: "Mayor's Office release · Jun. 2",
};

const buswayScheduleReceipt = {
  publicReceiptKey: BUSWAY_SCHEDULE_RECEIPT,
  sourceTitle: "Mayor Mamdani Advances 34th Street Busway in Manhattan",
  sourceUrl:
    "https://www.nyc.gov/mayors-office/news/2026/06/mayor-mamdani-advances-34th-street-busway-in-manhattan",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-02T16:10:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "NYC DOT expects to begin public outreach this month, install street furniture later in the summer and complete construction by the end of the fall.",
  artifactRevisionLabel: "Mayor's Office release · Jun. 2",
};

const bridgeFutureReceipt = {
  publicReceiptKey: BRIDGE_FUTURE_RECEIPT,
  sourceTitle:
    "NYC DOT to Reopen Carroll Street Bridge Over Gowanus Canal, Announces Historic Landmarked Bridge Will Now Be Limited to Pedestrians, Cyclists, and Emergency Vehicles",
  sourceUrl:
    "https://www.nyc.gov/html/dot/html/pr2026/nyc-dot-to-reopen-carroll-street-bridge-over-gowanus-canal.shtml",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-10T15:00:00.000Z",
  effectiveAt: "2026-06-15T04:00:00.000Z",
  relation: "contradicts" as const,
  boundedExcerpt:
    "the historic Carroll Street Bridge in Gowanus, Brooklyn, will open Monday, June 15, after a five-year rehabilitation effort.",
  artifactRevisionLabel: "NYC DOT release · Jun. 10",
};

const bridgeAccessReceipt = {
  publicReceiptKey: BRIDGE_ACCESS_RECEIPT,
  sourceTitle:
    "NYC DOT to Reopen Carroll Street Bridge Over Gowanus Canal, Announces Historic Landmarked Bridge Will Now Be Limited to Pedestrians, Cyclists, and Emergency Vehicles",
  sourceUrl:
    "https://www.nyc.gov/html/dot/html/pr2026/nyc-dot-to-reopen-carroll-street-bridge-over-gowanus-canal.shtml",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-10T15:00:00.000Z",
  effectiveAt: "2026-06-15T04:00:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "going forward, the 137-year-old one-lane bridge, a New York City landmark, would be limited to pedestrians, cyclists, and emergency vehicles.",
  artifactRevisionLabel: "NYC DOT release · Jun. 10",
};

const bridgeReopenedReceipt = {
  publicReceiptKey: BRIDGE_REOPENED_RECEIPT,
  sourceTitle:
    "NYC DOT to Reopen Carroll Street Bridge Over Gowanus Canal, Announces Historic Landmarked Bridge Will Now Be Limited to Pedestrians, Cyclists, and Emergency Vehicles",
  sourceUrl:
    "https://www.nyc.gov/html/dot/html/pr2026/nyc-dot-to-reopen-carroll-street-bridge-over-gowanus-canal.shtml",
  sourceAuthority: "official" as const,
  capturedAt: "2026-06-10T15:00:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "We are thrilled that the Carroll Street Bridge has reopened following an extensive restoration by DOT",
  artifactRevisionLabel: "NYC DOT release · Jun. 10",
};

export const nycBinsInvestigation = publicInvestigationDetailSchema.parse({
  schemaVersion: "1",
  summary: {
    publicCaseKey: NYC_BINS_CASE_KEY,
    areaKey: "new-york-city",
    areaDisplayName: "New York City, NY",
    topic: "NYC Bin requirement and enforcement dates",
    workflowState: "reviewing",
    publicationState: "none",
    lifecycleState: "open",
    correctionState: "none",
    visibility: "public",
    freshnessState: "stale",
    runtimeMode: "demo",
    currentDetermination:
      "Four official pages combine the June 1 requirement, September 8 enforcement, trash-only scope, after-6-PM setout rule, fine ladder, and special-use coverage. The factual reviewer removed two overclaims before the candidate briefing.",
    materialClaimCounts: { supported: 6, disputed: 0, missing: 0 },
    sourceReceiptCount: 6,
    openedAt: "2026-06-01T13:00:00.000Z",
    updatedAt: "2026-06-01T13:12:00.000Z",
    revision: 1,
  },
  projectionRevision: 1,
  snapshotCursor: 9,
  streamEpoch: "epoch_ref_nyc_bins_Q8v3mL6xK2pR",
  whyItMatters:
    "Owners and building staff need one usable answer spanning eligibility, container, setout, warning, enforcement, and fine details that are scattered across DSNY and NYC311 pages.",
  whoIsAffected: [
    "Properties with 1 to 9 residential units",
    "Covered special use buildings",
    "Owners and building staff",
  ],
  stageRail: [
    { stage: "capture", label: "Capture DSNY pages", state: "complete" },
    { stage: "extract", label: "Separate dates and scope", state: "complete" },
    { stage: "verify", label: "Check official receipts", state: "complete" },
    { stage: "editorial", label: "Classify relevance", state: "complete" },
    { stage: "draft", label: "Revise overclaims", state: "complete" },
    { stage: "review", label: "Application review boundary", state: "current" },
    { stage: "publish", label: "Live publication controls", state: "pending" },
  ],
  claims: [
    {
      publicClaimKey: BIN_REQUIREMENT,
      text: "Beginning June 1, properties with 1 to 9 residential units must use official NYC Bins for trash setout.",
      materiality: "material",
      status: "supported",
      evidence: [binsRequirementReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
    {
      publicClaimKey: BIN_ENFORCEMENT,
      text: "The warning period runs through September 7, with full enforcement beginning September 8.",
      materiality: "material",
      status: "supported",
      evidence: [binsEnforcementReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
    {
      publicClaimKey: BIN_SCOPE,
      text: "Official NYC Bins are not required for recycling or compost.",
      materiality: "material",
      status: "supported",
      evidence: [binsScopeReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
    {
      publicClaimKey: BIN_SPECIAL_USE,
      text: "The small-building rules also cover listed special-use buildings that receive DSNY collection.",
      materiality: "material",
      status: "supported",
      evidence: [binsSpecialUseReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
    {
      publicClaimKey: BIN_SET_OUT,
      text: "Covered small buildings set trash out after 6 PM in a secure-lid bin no larger than 55 gallons.",
      materiality: "material",
      status: "supported",
      evidence: [binsRulesReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
    {
      publicClaimKey: BIN_FINE,
      text: "The published noncompliance fine ladder is $50 for a first offense, $100 for a second, and $200 thereafter.",
      materiality: "material",
      status: "supported",
      evidence: [binsFineReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-01T13:07:00.000Z",
    },
  ],
  sourceReceipts: [
    binsRequirementReceipt,
    binsEnforcementReceipt,
    binsScopeReceipt,
    binsSpecialUseReceipt,
    binsRulesReceipt,
    binsFineReceipt,
  ],
  currentDecision: { outcome: "publish", reasonCodes: ["EVIDENCE_COMPLETE"] },
  events: [
    {
      cursor: 1,
      publicEventKey: "event_ref_nyc_bins_capture_J9v3mQ7xL2pR",
      occurredAt: "2026-06-01T13:04:00.000Z",
      stage: "capture",
      status: "completed",
      eventCode: "SOURCE_CAPTURED",
      safeParams: {
        sourceTitle: "DSNY containerization pages",
        sourceCount: 2,
      },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
      ],
      claimKeys: [],
    },
    {
      cursor: 2,
      publicEventKey: "event_ref_nyc_bins_extract_F5n8qK2vM4rT",
      occurredAt: "2026-06-01T13:04:30.000Z",
      stage: "extract",
      status: "completed",
      eventCode: "CLAIMS_EXTRACTED",
      safeParams: { claimCount: 6 },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
      ],
      claimKeys: [
        BIN_REQUIREMENT,
        BIN_ENFORCEMENT,
        BIN_SCOPE,
        BIN_SPECIAL_USE,
        BIN_SET_OUT,
        BIN_FINE,
      ],
    },
    {
      cursor: 3,
      publicEventKey: "event_ref_nyc_bins_gap_T8m4qL2vN6pR",
      occurredAt: "2026-06-01T13:05:00.000Z",
      stage: "verify",
      status: "held",
      eventCode: "EVIDENCE_REPAIR_STARTED",
      safeParams: { iteration: 1, targetClaimCount: 3 },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
      ],
      claimKeys: [BIN_SPECIAL_USE, BIN_SET_OUT, BIN_FINE],
    },
    {
      cursor: 4,
      publicEventKey: "event_ref_nyc_bins_repair_A7m3qL9xP2vR",
      occurredAt: "2026-06-01T13:06:00.000Z",
      stage: "capture",
      status: "completed",
      eventCode: "EVIDENCE_REPAIR_COMPLETED",
      safeParams: { iteration: 1, newSourceCount: 2, outcome: "supported" },
      sourceReceiptKeys: [
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [BIN_SPECIAL_USE, BIN_SET_OUT, BIN_FINE],
    },
    {
      cursor: 5,
      publicEventKey: "event_ref_nyc_bins_verify_B4m7qL9vN2pR",
      occurredAt: "2026-06-01T13:07:00.000Z",
      stage: "verify",
      status: "completed",
      eventCode: "VERIFICATION_COMPLETED",
      safeParams: { supportedCount: 6, disputedCount: 0 },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [
        BIN_REQUIREMENT,
        BIN_ENFORCEMENT,
        BIN_SCOPE,
        BIN_SPECIAL_USE,
        BIN_SET_OUT,
        BIN_FINE,
      ],
    },
    {
      cursor: 6,
      publicEventKey: "event_ref_nyc_bins_draft_first_C7m2qL8xV4pR",
      occurredAt: "2026-06-01T13:08:00.000Z",
      stage: "draft",
      status: "completed",
      eventCode: "DRAFT_CREATED",
      safeParams: { attempt: 1, revision: false, materialClaimCount: 6 },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [
        BIN_REQUIREMENT,
        BIN_ENFORCEMENT,
        BIN_SCOPE,
        BIN_SPECIAL_USE,
        BIN_SET_OUT,
        BIN_FINE,
      ],
    },
    {
      cursor: 7,
      publicEventKey: "event_ref_nyc_bins_review_first_Q8v3mL6xK2pR",
      occurredAt: "2026-06-01T13:10:00.000Z",
      stage: "review",
      status: "held",
      eventCode: "DRAFT_REVIEWED",
      safeParams: {
        blockingIssueCount: 2,
        draftAttempt: 1,
        returnedToWriter: true,
        issueCodes: ["STATUS_MISMATCH", "OVERSTATED"],
      },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
    },
    {
      cursor: 8,
      publicEventKey: "event_ref_nyc_bins_draft_second_D5v9mQ3xK7pL",
      occurredAt: "2026-06-01T13:11:00.000Z",
      stage: "draft",
      status: "completed",
      eventCode: "DRAFT_CREATED",
      safeParams: { attempt: 2, revision: true, materialClaimCount: 6 },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [
        BIN_REQUIREMENT,
        BIN_ENFORCEMENT,
        BIN_SCOPE,
        BIN_SPECIAL_USE,
        BIN_SET_OUT,
        BIN_FINE,
      ],
    },
    {
      cursor: 9,
      publicEventKey: "event_ref_nyc_bins_review_second_R5v9mQ3xK2pL",
      occurredAt: "2026-06-01T13:12:00.000Z",
      stage: "review",
      status: "completed",
      eventCode: "DRAFT_REVIEWED",
      safeParams: {
        blockingIssueCount: 0,
        draftAttempt: 2,
        returnedToWriter: false,
        issueCodes: [],
      },
      sourceReceiptKeys: [
        BIN_REQUIREMENT_RECEIPT,
        BIN_ENFORCEMENT_RECEIPT,
        BIN_SCOPE_RECEIPT,
        BIN_SPECIAL_USE_RECEIPT,
        BIN_RULES_RECEIPT,
        BIN_FINE_RECEIPT,
      ],
      claimKeys: [],
    },
  ],
  revisions: [],
});

export const nycBuswayInvestigation = publicInvestigationDetailSchema.parse({
  schemaVersion: "1",
  summary: {
    publicCaseKey: NYC_BUSWAY_CASE_KEY,
    areaKey: "new-york-city",
    areaDisplayName: "New York City, NY",
    topic:
      "34th Street busway plan and a reader-submitted current-impact claim",
    workflowState: "needs_evidence",
    publicationState: "none",
    lifecycleState: "open",
    correctionState: "none",
    visibility: "public",
    freshnessState: "stale",
    runtimeMode: "demo",
    currentDetermination:
      "The June 2 announcement supports a planned busway and rollout schedule. It does not support the separate inbound claim that the busway was already operating or already reducing trip times.",
    materialClaimCounts: { supported: 2, disputed: 0, missing: 1 },
    sourceReceiptCount: 2,
    openedAt: "2026-06-02T16:10:00.000Z",
    updatedAt: "2026-06-02T16:18:00.000Z",
    revision: 1,
  },
  projectionRevision: 1,
  snapshotCursor: 5,
  streamEpoch: "epoch_ref_nyc_busway_Z8v3mL6xK2pR",
  whyItMatters:
    "A construction plan should not be rewritten as an operational result before implementation evidence exists.",
  whoIsAffected: ["34th Street bus riders"],
  stageRail: [
    { stage: "capture", label: "Capture city release", state: "complete" },
    { stage: "extract", label: "Separate plan and impact", state: "complete" },
    { stage: "verify", label: "Check present status", state: "blocked" },
    { stage: "editorial", label: "Classify relevance", state: "skipped" },
    { stage: "draft", label: "Write from claims", state: "skipped" },
    { stage: "review", label: "Review exact draft", state: "skipped" },
    { stage: "publish", label: "Publication boundary", state: "blocked" },
  ],
  claims: [
    {
      publicClaimKey: BUSWAY_PLAN,
      text: "The city announced renewed work on a planned 34th Street busway from Ninth Avenue to Third Avenue.",
      materiality: "material",
      status: "supported",
      evidence: [buswayPlanReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-02T16:15:00.000Z",
    },
    {
      publicClaimKey: BUSWAY_SCHEDULE,
      text: "The announcement places outreach in June and construction completion by the end of fall.",
      materiality: "material",
      status: "supported",
      evidence: [buswayScheduleReceipt],
      contradictions: [],
      lastVerifiedAt: "2026-06-02T16:15:00.000Z",
    },
    {
      publicClaimKey: BUSWAY_IMPACT,
      text: "Inbound coverage claim: the busway was already operating and reducing travel times for riders on June 2.",
      materiality: "material",
      status: "unsupported",
      evidence: [],
      contradictions: [],
      missingReason:
        "The captured source describes a plan and expected schedule; no approved receipt provides launch confirmation or measured post-launch travel times.",
    },
  ],
  sourceReceipts: [buswayPlanReceipt, buswayScheduleReceipt],
  currentDecision: {
    outcome: "needs_evidence",
    reasonCodes: ["MISSING_EVIDENCE"],
  },
  events: [
    {
      cursor: 1,
      publicEventKey: "event_ref_nyc_busway_capture_C7m2qL8xV4pR",
      occurredAt: "2026-06-02T16:10:00.000Z",
      stage: "capture",
      status: "completed",
      eventCode: "SOURCE_CAPTURED",
      safeParams: {
        sourceTitle: "NYC Mayor's Office 34th Street announcement",
        sourceCount: 1,
      },
      sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      claimKeys: [],
    },
    {
      cursor: 2,
      publicEventKey: "event_ref_nyc_busway_extract_D5v9mQ3xK7pL",
      occurredAt: "2026-06-02T16:13:00.000Z",
      stage: "extract",
      status: "completed",
      eventCode: "CLAIMS_EXTRACTED",
      safeParams: { claimCount: 3 },
      sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
    },
    {
      cursor: 3,
      publicEventKey: "event_ref_nyc_busway_verify_T8m4qL2vN6pR",
      occurredAt: "2026-06-02T16:15:00.000Z",
      stage: "verify",
      status: "held",
      eventCode: "VERIFICATION_COMPLETED",
      safeParams: { supportedCount: 2, disputedCount: 0 },
      sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
    },
    {
      cursor: 4,
      publicEventKey: "event_ref_nyc_busway_hold_W5v9mQ3xK2pL",
      occurredAt: "2026-06-02T16:16:00.000Z",
      stage: "verify",
      status: "held",
      eventCode: "WORKFLOW_HELD",
      safeParams: { reasonCode: "MISSING_EVIDENCE", boundary: "verify" },
      sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      claimKeys: [BUSWAY_IMPACT],
    },
    {
      cursor: 5,
      publicEventKey: "event_ref_nyc_busway_complete_J9v3mQ7xL2pR",
      occurredAt: "2026-06-02T16:18:00.000Z",
      stage: "verify",
      status: "completed",
      eventCode: "WORKFLOW_COMPLETED",
      safeParams: { outcome: "held" },
      sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
    },
  ],
  revisions: [],
});

export const nycBuswayRefreshInvestigation: PublicInvestigationDetail =
  publicInvestigationDetailSchema.parse({
    ...nycBuswayInvestigation,
    schemaVersion: "2",
    summary: {
      ...nycBuswayInvestigation.summary,
      publicCaseKey: NYC_BUSWAY_REFRESH_CASE_KEY,
      topic: "34th Street busway source recheck",
      currentDetermination:
        "A later captured source version changed at the document level, but the claim-relevant language still described a future plan. The unsupported claim of current operation remained held.",
      openedAt: "2026-06-02T16:10:00.000Z",
      updatedAt: "2026-06-10T16:25:00.000Z",
      revision: 2,
    },
    projectionRevision: 2,
    snapshotCursor: 8,
    streamEpoch: "epoch_ref_nyc_busway_refresh_H7m3qL9xP2vR",
    events: [
      ...nycBuswayInvestigation.events,
      {
        cursor: 6,
        publicEventKey: "event_ref_nyc_busway_changed_H4m8qL2vN7pR",
        occurredAt: "2026-06-10T16:20:00.000Z",
        stage: "capture",
        status: "completed",
        eventCode: "SOURCE_CHANGED",
        safeParams: { affectedClaimCount: 2, impact: "no_change" },
        sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
        claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
      },
      {
        cursor: 7,
        publicEventKey: "event_ref_nyc_busway_reverify_B8m4qL2vN7pR",
        occurredAt: "2026-06-10T16:23:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "REVISION_VERIFIED",
        safeParams: { revision: 2, affectedClaimCount: 2 },
        sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
        claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
      },
      {
        cursor: 8,
        publicEventKey: "event_ref_nyc_busway_refresh_done_R5v9mQ3xK2pL",
        occurredAt: "2026-06-10T16:25:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "WORKFLOW_COMPLETED",
        safeParams: { outcome: "held" },
        sourceReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
        claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
      },
    ],
    sourceVersions: [
      {
        publicSourceVersionKey: "sourcever_ref_nyc_busway_june2_H4m8qL2vN7pR",
        sourceTitle: "Mayor's Office 34th Street announcement",
        sourceUrl: buswayPlanReceipt.sourceUrl,
        versionLabel: "Initial capture · June 2",
        observedAt: "2026-06-02T16:10:00.000Z",
        state: "captured",
        contentHashPrefix: "1a2b3c4d5e6f",
      },
      {
        publicSourceVersionKey: "sourcever_ref_nyc_busway_june10_B8m4qL2vN7pR",
        sourceTitle: "Mayor's Office 34th Street announcement",
        sourceUrl: buswayPlanReceipt.sourceUrl,
        versionLabel: "Source recheck · June 10",
        observedAt: "2026-06-10T16:20:00.000Z",
        state: "changed",
        contentHashPrefix: "7f6e5d4c3b2a",
      },
    ],
    changeSummary: {
      impact: "no_change",
      label: "Source rechecked · no article impact",
      summary:
        "The normalized source version changed, but the bounded claim comparison still described a future plan and schedule. No current-operation evidence appeared.",
      assessedAt: "2026-06-10T16:23:00.000Z",
      sourceVersionKeys: [
        "sourcever_ref_nyc_busway_june2_H4m8qL2vN7pR",
        "sourcever_ref_nyc_busway_june10_B8m4qL2vN7pR",
      ],
      deltas: [
        {
          publicClaimKey: BUSWAY_SCHEDULE,
          before:
            "Construction was expected to be complete by the end of fall.",
          now: "The project remained scheduled for completion by the end of fall.",
        },
      ],
    },
    revisions: [
      {
        publicRevisionKey: "revision_ref_nyc_busway_refresh_M5q3pL8xV2nR",
        revisionNumber: 2,
        type: "update",
        rationaleCode: "SOURCE_REFRESH",
        affectedClaimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
        effectiveAt: "2026-06-10T16:23:00.000Z",
      },
    ],
  });

export const nycBridgeInvestigation: PublicInvestigationDetail =
  publicInvestigationDetailSchema.parse({
    schemaVersion: "2",
    summary: {
      publicCaseKey: NYC_BRIDGE_CASE_KEY,
      areaKey: "new-york-city",
      areaDisplayName: "New York City, NY",
      topic: "Carroll Street Bridge status at the June 10 capture",
      workflowState: "held",
      publicationState: "none",
      lifecycleState: "open",
      correctionState: "none",
      visibility: "public",
      freshnessState: "stale",
      runtimeMode: "demo",
      currentDetermination:
        "At the June 10 capture, the same NYC DOT release described a June 15 opening and also quoted an official saying the bridge had reopened, so status at capture is held as disputed.",
      materialClaimCounts: { supported: 1, disputed: 1, missing: 0 },
      sourceReceiptCount: 3,
      openedAt: "2026-06-10T15:00:00.000Z",
      updatedAt: "2026-06-10T15:09:00.000Z",
      revision: 1,
    },
    projectionRevision: 1,
    snapshotCursor: 6,
    streamEpoch: "epoch_ref_nyc_bridge_N4v8mQ2xK7pR",
    whyItMatters:
      "Readers should not be given a definitive status for June 10 when the captured announcement conflicts on that point-in-time claim.",
    whoIsAffected: ["Pedestrians", "Cyclists", "Emergency vehicles"],
    stageRail: [
      { stage: "capture", label: "Capture NYC DOT release", state: "complete" },
      {
        stage: "extract",
        label: "Separate access and status",
        state: "complete",
      },
      { stage: "verify", label: "Compare status language", state: "blocked" },
      { stage: "editorial", label: "Classify relevance", state: "skipped" },
      { stage: "draft", label: "Write from claims", state: "skipped" },
      { stage: "review", label: "Review exact draft", state: "skipped" },
      { stage: "publish", label: "Publication boundary", state: "blocked" },
    ],
    claims: [
      {
        publicClaimKey: BRIDGE_ACCESS,
        text: "Upon reopening, the restored Carroll Street Bridge would be limited to pedestrians, cyclists, and emergency vehicles.",
        materiality: "material",
        status: "supported",
        evidence: [bridgeAccessReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-06-10T15:06:00.000Z",
      },
      {
        publicClaimKey: BRIDGE_STATUS,
        text: "The Carroll Street Bridge was open at the June 10 capture.",
        materiality: "material",
        status: "disputed",
        evidence: [bridgeReopenedReceipt],
        contradictions: [bridgeFutureReceipt],
        lastVerifiedAt: "2026-06-10T15:06:00.000Z",
      },
    ],
    sourceReceipts: [
      bridgeAccessReceipt,
      bridgeFutureReceipt,
      bridgeReopenedReceipt,
    ],
    currentDecision: { outcome: "hold", reasonCodes: ["CONTRADICTION"] },
    events: [
      {
        cursor: 1,
        publicEventKey: "event_ref_nyc_bridge_capture_F5n8qK2vM4rT",
        occurredAt: "2026-06-10T15:00:00.000Z",
        stage: "capture",
        status: "completed",
        eventCode: "SOURCE_CAPTURED",
        safeParams: {
          sourceTitle: "NYC DOT Carroll Street Bridge release",
          sourceCount: 1,
        },
        sourceReceiptKeys: [
          BRIDGE_ACCESS_RECEIPT,
          BRIDGE_FUTURE_RECEIPT,
          BRIDGE_REOPENED_RECEIPT,
        ],
        claimKeys: [],
      },
      {
        cursor: 2,
        publicEventKey: "event_ref_nyc_bridge_extract_B4m7qL9vN2pR",
        occurredAt: "2026-06-10T15:03:00.000Z",
        stage: "extract",
        status: "completed",
        eventCode: "CLAIMS_EXTRACTED",
        safeParams: { claimCount: 2 },
        sourceReceiptKeys: [
          BRIDGE_ACCESS_RECEIPT,
          BRIDGE_FUTURE_RECEIPT,
          BRIDGE_REOPENED_RECEIPT,
        ],
        claimKeys: [BRIDGE_ACCESS, BRIDGE_STATUS],
      },
      {
        cursor: 3,
        publicEventKey: "event_ref_nyc_bridge_verify_Q8v3mL6xK2pR",
        occurredAt: "2026-06-10T15:06:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "VERIFICATION_COMPLETED",
        safeParams: { supportedCount: 1, disputedCount: 1 },
        sourceReceiptKeys: [
          BRIDGE_ACCESS_RECEIPT,
          BRIDGE_FUTURE_RECEIPT,
          BRIDGE_REOPENED_RECEIPT,
        ],
        claimKeys: [BRIDGE_ACCESS, BRIDGE_STATUS],
      },
      {
        cursor: 4,
        publicEventKey: "event_ref_nyc_bridge_dissent_A7m3qL9xP2vR",
        occurredAt: "2026-06-10T15:07:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "DISSENT_ASSESSED",
        safeParams: { outcome: "unresolved_material" },
        sourceReceiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
        claimKeys: [BRIDGE_STATUS],
      },
      {
        cursor: 5,
        publicEventKey: "event_ref_nyc_bridge_hold_R5v9mQ3xK2pL",
        occurredAt: "2026-06-10T15:08:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "WORKFLOW_HELD",
        safeParams: { reasonCode: "CONTRADICTION", boundary: "verify" },
        sourceReceiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
        claimKeys: [BRIDGE_STATUS],
      },
      {
        cursor: 6,
        publicEventKey: "event_ref_nyc_bridge_complete_N4v8mQ2xK7pR",
        occurredAt: "2026-06-10T15:09:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "WORKFLOW_COMPLETED",
        safeParams: { outcome: "held" },
        sourceReceiptKeys: [
          BRIDGE_ACCESS_RECEIPT,
          BRIDGE_FUTURE_RECEIPT,
          BRIDGE_REOPENED_RECEIPT,
        ],
        claimKeys: [BRIDGE_ACCESS, BRIDGE_STATUS],
      },
    ],
    sourceVersions: [
      {
        publicSourceVersionKey: "sourcever_ref_nyc_bridge_release_P8v4mL2xQ7nR",
        sourceTitle: "NYC DOT Carroll Street Bridge release",
        sourceUrl:
          "https://www.nyc.gov/html/dot/html/pr2026/nyc-dot-to-reopen-carroll-street-bridge-over-gowanus-canal.shtml",
        versionLabel: "NYC DOT release · June 10 capture",
        observedAt: "2026-06-10T15:00:00.000Z",
        state: "captured",
        contentHashPrefix: "731fab18c042",
      },
    ],
    dissentRecords: [
      {
        publicConflictKey: "conflict_ref_nyc_bridge_status_K6m2qV9xR4pT",
        publicClaimKey: BRIDGE_STATUS,
        outcome: "unresolved_material",
        basisLabel: "Equal-authority conflict",
        summary:
          "Future-opening copy and an already-reopened quotation conflict inside the same official release. Neither tense can be selected without another authoritative observation.",
        evidenceReceiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
        assessedAt: "2026-06-10T15:07:00.000Z",
      },
    ],
    revisions: [],
  });

export const nycReferenceRuns: ReferenceRun[] = z
  .array(referenceRunSchema)
  .parse([
    {
      scenarioKey: "nyc-bins-revision",
      label: "NYC Bin rules, joined",
      deck: "Six receipts across four DSNY and NYC311 pages become one usable answer: who is covered, what changes June 1, when enforcement begins, when trash goes out, and what fines apply.",
      execution: REFERENCE_EXECUTION,
      input: {
        origin: "official-source-packet",
        label: "Initial two-page DSNY packet",
        summary:
          "Three DSNY receipts establish the rule, warning window, and scope. The workflow must earn any additional operational details through its bounded repair loop.",
        receiptKeys: [
          BIN_REQUIREMENT_RECEIPT,
          BIN_ENFORCEMENT_RECEIPT,
          BIN_SCOPE_RECEIPT,
        ],
      },
      detail: nycBinsInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output:
            "Four official pages from DSNY and NYC311 produced six canonical receipts.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "Eligibility, requirement, enforcement, scope, setout, and fines became six atomic claims.",
        },
        {
          key: "evidence-repair",
          name: "Bounded Evidence Repair",
          kind: "tool",
          status: "complete",
          stateKey: "pw_evidence_repair",
          output:
            "The first coverage pass exposed three operational gaps; one bounded repair added two official NYC311 artifacts, then global verification reran.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_verification",
          output:
            "All six material claims have direct official support across the aggregated packet.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_editorial",
          output:
            "The container rule is local, resident-relevant, and non-routine.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_draft",
          output:
            "Attempt one collapsed the warning and enforcement dates and widened the rule beyond trash; attempt two corrected both.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_factual_review",
          output:
            "Review one returned STATUS_MISMATCH and OVERSTATED; full review two passed.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "pending",
          output:
            "The corrected draft is eligible for the application-review boundary.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "pending",
          output:
            "Live controls and application-review records remain prerequisites.",
        },
      ],
      intelligence: {
        residentAnswer: {
          bottomLine:
            "If your property has 1 to 9 residential units, trash must go in an official NYC Bin starting June 1. Warnings run through September 7 and full enforcement begins September 8. The official bin rule does not extend to recycling or compost.",
          whatIsNew: [
            "The rule starts June 1, but full enforcement starts September 8.",
            "Covered trash goes out after 6 PM in a secure-lid bin no larger than 55 gallons.",
            "The published fine ladder is $50, $100, then $200 for later offenses.",
            "Listed special-use buildings receiving DSNY collection can also be covered.",
          ],
          actions: [
            {
              label:
                "Confirm whether your property is in the 1 to 9 unit group or a listed special use group.",
              deadline: "Before trash setout",
              affectedGroups: ["Owners", "Building staff"],
            },
            {
              label:
                "Use the official NYC Bin for trash; keep recycling and compost requirements separate.",
              deadline: "June 1, 2026",
              affectedGroups: ["Properties with 1 to 9 units"],
            },
            {
              label:
                "Correct noncompliant setout before full enforcement begins.",
              deadline: "September 8, 2026",
              affectedGroups: ["Owners", "Building staff"],
            },
          ],
          knownUnknowns: [
            "Address-specific collection days still require the NYC311 schedule lookup.",
            "This packet does not determine whether an individual special-use property receives DSNY collection.",
          ],
        },
        aggregation: {
          uniqueSourceCount: 4,
          uniquePublisherCount: 2,
          materialClaimCount: 6,
          maxClaimsCoveredByOneSource: 5,
          requiresMultipleSources: true,
          explanation:
            "No one captured page contains the complete resident answer. DSNY supplies requirement, scope, and enforcement details; NYC311 adds special-use coverage, setout timing, and the fine ladder.",
          sourceLayers: [
            {
              layerKey: "layer_dsny_core_rule",
              label: "Core requirement + scope",
              publisher: "NYC Department of Sanitation",
              jurisdiction: "City agency",
              contribution:
                "Establishes who must use official bins for trash and separates recycling and compost.",
              receiptKeys: [BIN_REQUIREMENT_RECEIPT, BIN_SCOPE_RECEIPT],
              capturedText:
                "The NYC Bin is the official trash bin for properties with 1-9 residential units and some larger buildings. Separate NYC Bins are also available for recycling and composting, but are not required. As of June 1, properties with 1-9 residential units are REQUIRED to use only official NYC Bins for trash set out.",
            },
            {
              layerKey: "layer_dsny_enforcement",
              label: "Warning + enforcement window",
              publisher: "NYC Department of Sanitation",
              jurisdiction: "City agency",
              contribution:
                "Separates the June 1 requirement from September 8 full enforcement.",
              receiptKeys: [BIN_ENFORCEMENT_RECEIPT],
              capturedText:
                "As of June 1, properties with 1-9 residential units are REQUIRED to use only official NYC Bins for trash set out. A warning period will be in effect through September 7. Full enforcement of the NYC Bin requirements for trash will begin Tuesday, September 8, 2026.",
            },
            {
              layerKey: "layer_311_coverage",
              label: "Special-use coverage",
              publisher: "NYC311",
              jurisdiction: "City service",
              contribution:
                "Identifies additional covered building types that receive DSNY collection.",
              receiptKeys: [BIN_SPECIAL_USE_RECEIPT],
              capturedText:
                "These new rules also apply to special-use buildings receiving DSNY collection, including: City agencies Nonprofits Houses of worship Professional offices in residential buildings",
            },
            {
              layerKey: "layer_311_setout_fines",
              label: "Setout + fine details",
              publisher: "NYC311",
              jurisdiction: "City service",
              contribution:
                "Adds after-6-PM setout, secure-lid size, and the published fine ladder.",
              receiptKeys: [BIN_RULES_RECEIPT, BIN_FINE_RECEIPT],
              capturedText:
                "Place trash out after 6 PM in a bin of 55 gallons or less with a secure lid. Failure to use a bin that is 55 gallons or less with a secure lid for trash set out will result in fines: $50 for the first offense $100 for the second offense $200 for the third and subsequent offenses",
            },
          ],
        },
        addedValue: [
          {
            valueKey: "value_bins_joined_sources",
            kind: "joined_sources",
            headline: "Four pages became one resident checklist",
            residentConsequence:
              "Residents do not have to reconcile requirement, enforcement, scope, eligibility, setout, and fines across separate agency pages.",
            inputClaimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            inputReceiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            outputClaimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            eventKeys: [
              "event_ref_nyc_bins_capture_J9v3mQ7xL2pR",
              "event_ref_nyc_bins_verify_B4m7qL9vN2pR",
            ],
            momentKey: "moment_nyc_bins_verify",
          },
          {
            valueKey: "value_bins_prevented_overclaim",
            kind: "prevented_overclaim",
            headline: "A plausible deadline error was caught",
            residentConsequence:
              "The briefing does not tell residents that fines begin June 1 or that official bins are mandatory for recycling and compost.",
            inputClaimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            inputReceiptKeys: [BIN_ENFORCEMENT_RECEIPT, BIN_SCOPE_RECEIPT],
            outputClaimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            eventKeys: [
              "event_ref_nyc_bins_review_first_Q8v3mL6xK2pR",
              "event_ref_nyc_bins_review_second_R5v9mQ3xK2pL",
            ],
            momentKey: "moment_nyc_bins_catch",
          },
        ],
        decisionCheckpoints: [
          {
            checkpointKey: "checkpoint_bins_material_coverage",
            label: "All material claims supported",
            stage: "verify",
            owner: "application_policy",
            status: "pass",
            observed: { label: "Supported material claims", value: 6 },
            required: { label: "Required", value: 6 },
            consequence: "The closed claim set may enter drafting.",
            policyVersion: "evidence-coverage-2026-07",
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            eventKeys: ["event_ref_nyc_bins_verify_B4m7qL9vN2pR"],
            momentKey: "moment_nyc_bins_verify",
          },
          {
            checkpointKey: "checkpoint_bins_blocking_conflicts",
            label: "Blocking contradictions",
            stage: "verify",
            owner: "application_policy",
            status: "pass",
            observed: { label: "Blocking contradictions", value: 0 },
            required: { label: "Maximum", value: 0 },
            consequence:
              "No unresolved material contradiction stops the candidate.",
            policyVersion: "evidence-coverage-2026-07",
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            eventKeys: ["event_ref_nyc_bins_verify_B4m7qL9vN2pR"],
            momentKey: "moment_nyc_bins_verify",
          },
          {
            checkpointKey: "checkpoint_bins_first_review",
            label: "First factual review",
            stage: "review",
            owner: "adk_agent",
            status: "fail",
            observed: { label: "Blocking issues", value: 2 },
            required: { label: "Required", value: 0 },
            consequence:
              "The exact draft returns to the writer with typed issues.",
            policyVersion: "factual-review-2026-07",
            claimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            receiptKeys: [BIN_ENFORCEMENT_RECEIPT, BIN_SCOPE_RECEIPT],
            eventKeys: ["event_ref_nyc_bins_review_first_Q8v3mL6xK2pR"],
            momentKey: "moment_nyc_bins_catch",
          },
          {
            checkpointKey: "checkpoint_bins_rewrite_budget",
            label: "Bounded rewrite budget",
            stage: "draft",
            owner: "application_policy",
            status: "pass",
            observed: { label: "Rewrites used", value: 1 },
            required: { label: "Maximum", value: 1 },
            consequence:
              "One targeted correction is permitted; another failure would hold the run.",
            policyVersion: "bounded-revision-2026-07",
            claimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            receiptKeys: [BIN_ENFORCEMENT_RECEIPT, BIN_SCOPE_RECEIPT],
            eventKeys: ["event_ref_nyc_bins_review_second_R5v9mQ3xK2pL"],
            momentKey: "moment_nyc_bins_revise",
          },
          {
            checkpointKey: "checkpoint_bins_second_review",
            label: "Full factual recheck",
            stage: "review",
            owner: "adk_agent",
            status: "pass",
            observed: { label: "Blocking issues", value: 0 },
            required: { label: "Required", value: 0 },
            consequence:
              "The corrected candidate reaches the application-review boundary.",
            policyVersion: "factual-review-2026-07",
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            eventKeys: ["event_ref_nyc_bins_review_second_R5v9mQ3xK2pL"],
            momentKey: "moment_nyc_bins_pass",
          },
          {
            checkpointKey: "checkpoint_bins_publication_boundary",
            label: "Provider publication boundary",
            stage: "publish",
            owner: "application_policy",
            status: "not_run",
            observed: { label: "Provider-confirmed publication", value: false },
            required: { label: "Required for published status", value: true },
            consequence:
              "This remains a readable reference candidate, not a provider-confirmed article.",
            policyVersion: "publication-gate-2026-07",
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            eventKeys: ["event_ref_nyc_bins_review_second_R5v9mQ3xK2pL"],
            momentKey: "moment_nyc_bins_pass",
          },
        ],
      },
      story: {
        outcomeLabel: "Four sources joined",
        outcomeTone: "positive",
        hook: "One usable checklist emerges from four official pages. The reviewer catches two plausible mistakes before the candidate reaches application review.",
        metrics: [
          { label: "Official pages", value: 4 },
          { label: "Claims joined", value: 6 },
          { label: "Issues caught", value: 2 },
        ],
        pivotalMomentKey: "moment_nyc_bins_catch",
        moments: [
          {
            momentKey: "moment_nyc_bins_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "Two DSNY pages form the initial packet",
            narrative:
              "Requirement, enforcement, and trash-only scope enter as three verbatim receipts. The practical setout and fine questions remain intentionally uncovered.",
            eventKeys: ["event_ref_nyc_bins_capture_J9v3mQ7xL2pR"],
            claimKeys: [],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
            ],
            visual: { kind: "receipt", receiptKey: BIN_REQUIREMENT_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
            contribution: {
              inputLabel: "Two official DSNY webpages",
              operation:
                "Normalize and preserve three bounded verbatim excerpts",
              addedValue:
                "Keeps the initial evidence boundary visible instead of pretending the later NYC311 pages were already present.",
              outputLabel: "3 receipts · 2 source pages",
              residentImpact:
                "The audit shows which facts were available before evidence repair.",
              decisionCheckpointKeys: [],
            },
          },
          {
            momentKey: "moment_nyc_bins_gap",
            stage: "verify",
            actor: "Claim Verifier · coverage pass 1",
            status: "caught",
            headline:
              "The first packet cannot answer three practical questions",
            narrative:
              "DSNY establishes the core rule, but special-use coverage, setout timing, and the fine ladder do not yet have receipts in the packet.",
            eventKeys: ["event_ref_nyc_bins_gap_T8m4qL2vN6pR"],
            claimKeys: [BIN_SPECIAL_USE, BIN_SET_OUT, BIN_FINE],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
            ],
            visual: {
              kind: "gate",
              label: "3 evidence gaps surfaced",
              detail:
                "The bounded repair request names only the uncovered operational claims; drafting remains paused.",
            },
            system: {
              agentKind: "Google ADK LlmAgent + deterministic coverage",
              stateKey: "pw_verification",
              eventCode: "EVIDENCE_REPAIR_STARTED",
            },
            contribution: {
              inputLabel: "Initial DSNY packet + six-question claim set",
              operation:
                "Compare requested resident questions with direct receipt coverage",
              addedValue:
                "Makes the three operational gaps explicit instead of drafting around them.",
              outputLabel: "3 targeted evidence requests",
              residentImpact:
                "The final answer must cover practical compliance details, not only repeat the announcement.",
              decisionCheckpointKeys: [],
            },
          },
          {
            momentKey: "moment_nyc_bins_repair",
            stage: "capture",
            actor: "Bounded Evidence Repair",
            status: "revised",
            headline: "NYC311 closes the operational gaps",
            narrative:
              "One bounded repair retrieves two approved NYC311 guides, adds separate special-use, setout, and fine receipts, then returns the accumulated packet to verification.",
            eventKeys: ["event_ref_nyc_bins_repair_A7m3qL9xP2vR"],
            claimKeys: [BIN_SPECIAL_USE, BIN_SET_OUT, BIN_FINE],
            receiptKeys: [
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            visual: { kind: "receipt", receiptKey: BIN_RULES_RECEIPT },
            system: {
              agentKind: "Read-only FunctionTool + bounded repair policy",
              stateKey: "pw_evidence_repair",
              eventCode: "EVIDENCE_REPAIR_COMPLETED",
            },
            contribution: {
              inputLabel: "3 missing operational claims",
              operation:
                "Retrieve only approved official-source candidates within a two-iteration budget",
              addedValue:
                "Adds two new canonical artifacts and three verbatim receipts rather than asking the writer to infer missing details.",
              outputLabel: "2 pages · 3 gaps closed",
              residentImpact:
                "Residents get eligibility, timing, and fine details with direct receipts.",
              decisionCheckpointKeys: [],
            },
          },
          {
            momentKey: "moment_nyc_bins_verify",
            stage: "verify",
            actor: "Global Claim Verifier · coverage pass 2",
            status: "complete",
            headline: "Six facts are joined without losing their sources",
            narrative:
              "Requirement, enforcement, trash-only scope, special-use coverage, setout, and fines each resolve to official evidence; no one artifact covers the entire answer.",
            eventKeys: ["event_ref_nyc_bins_verify_B4m7qL9vN2pR"],
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            visual: {
              kind: "claim-counts",
              supported: 6,
              disputed: 0,
              missing: 0,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_verification",
              eventCode: "VERIFICATION_COMPLETED",
            },
            contribution: {
              inputLabel: "Six atomic claims + six receipts",
              operation:
                "Rerun every claim and packet-wide coverage after repair",
              addedValue:
                "Joins scattered operational details while retaining claim-to-source boundaries.",
              outputLabel: "6 supported · 0 missing · 0 disputed",
              residentImpact:
                "The resident answer can cover both what to do and when enforcement changes.",
              decisionCheckpointKeys: [
                "checkpoint_bins_material_coverage",
                "checkpoint_bins_blocking_conflicts",
              ],
            },
          },
          {
            momentKey: "moment_nyc_bins_draft",
            stage: "draft",
            actor: "Brief Writer · attempt 1",
            status: "complete",
            headline: "The first draft collapses the rule",
            narrative:
              "It says fines start June 1 and extends the official-bin requirement to recycling and compost.",
            eventKeys: ["event_ref_nyc_bins_draft_first_C7m2qL8xV4pR"],
            claimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            receiptKeys: [BIN_ENFORCEMENT_RECEIPT, BIN_SCOPE_RECEIPT],
            visual: {
              kind: "draft-change",
              phase: "draft",
              before:
                "Owners face fines beginning June 1 and must use official bins for trash, recycling, and compost.",
              flaggedText: "fines beginning June 1",
              issueCode: "STATUS_MISMATCH",
              after:
                "The trash-bin requirement starts June 1; warnings run through September 7 and full enforcement begins September 8.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_draft",
              eventCode: "DRAFT_CREATED",
              recordLabel: "Linked outcome",
            },
            contribution: {
              inputLabel: "Verified claim set",
              operation:
                "Compose a resident briefing from only approved claims",
              addedValue:
                "Produces a readable first attempt without changing the evidence ledger.",
              outputLabel: "Draft attempt 1",
              residentImpact:
                "The prose is useful but not yet safe to present because two statements overreach.",
              decisionCheckpointKeys: [],
            },
          },
          {
            momentKey: "moment_nyc_bins_catch",
            stage: "review",
            actor: "Factual Reviewer · review 1",
            status: "caught",
            headline: "Two plausible errors are caught",
            narrative:
              "The reviewer separates the requirement date from full enforcement and restores the trash-only scope.",
            eventKeys: ["event_ref_nyc_bins_review_first_Q8v3mL6xK2pR"],
            claimKeys: [BIN_ENFORCEMENT, BIN_SCOPE],
            receiptKeys: [BIN_ENFORCEMENT_RECEIPT, BIN_SCOPE_RECEIPT],
            visual: {
              kind: "draft-change",
              phase: "caught",
              before:
                "Owners face fines beginning June 1 and must use official bins for trash, recycling, and compost.",
              flaggedText: "fines beginning June 1",
              issueCode: "STATUS_MISMATCH",
              after:
                "The trash-bin requirement starts June 1; warnings run through September 7 and full enforcement begins September 8.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_factual_review",
              eventCode: "DRAFT_REVIEWED",
            },
            contribution: {
              inputLabel: "Exact draft hash + approved claims",
              operation: "Compare every material statement with its receipts",
              addedValue:
                "Finds a date regression and a scope expansion that sound plausible in prose.",
              outputLabel: "2 typed blocking issues",
              residentImpact:
                "Residents are not told that fines start too early or that recycling needs an official bin.",
              decisionCheckpointKeys: ["checkpoint_bins_first_review"],
            },
          },
          {
            momentKey: "moment_nyc_bins_revise",
            stage: "draft",
            actor: "Brief Writer · attempt 2",
            status: "revised",
            headline: "One bounded rewrite",
            narrative:
              "The new draft changes only the two flagged claims and adds no substitute facts.",
            eventKeys: ["event_ref_nyc_bins_draft_second_D5v9mQ3xK7pL"],
            claimKeys: [BIN_REQUIREMENT, BIN_ENFORCEMENT, BIN_SCOPE],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
            ],
            visual: {
              kind: "draft-change",
              phase: "revised",
              before:
                "Owners face fines beginning June 1 and must use official bins for trash, recycling, and compost.",
              flaggedText: "fines beginning June 1",
              issueCode: "STATUS_MISMATCH",
              after:
                "Starting June 1, small residential properties must use official NYC Bins for trash. Warnings run through September 7; full enforcement begins September 8.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_revision_history",
              eventCode: "DRAFT_CREATED",
              recordLabel: "Linked outcome",
            },
            contribution: {
              inputLabel: "Attempt 1 + two typed issues",
              operation:
                "Revise only the sentences linked to the failed claims",
              addedValue:
                "Narrows the language without inventing a substitute fact.",
              outputLabel: "Draft attempt 2",
              residentImpact:
                "The requirement, warning window, and material scope are now distinct.",
              decisionCheckpointKeys: ["checkpoint_bins_rewrite_budget"],
            },
          },
          {
            momentKey: "moment_nyc_bins_pass",
            stage: "review",
            actor: "Factual Reviewer · review 2",
            status: "ready",
            headline: "The complete answer is checked again",
            narrative:
              "A full second review finds zero blocking issues and reaches the application-review boundary; provider publication is still not asserted.",
            eventKeys: ["event_ref_nyc_bins_review_second_R5v9mQ3xK2pL"],
            claimKeys: [
              BIN_REQUIREMENT,
              BIN_ENFORCEMENT,
              BIN_SCOPE,
              BIN_SPECIAL_USE,
              BIN_SET_OUT,
              BIN_FINE,
            ],
            receiptKeys: [
              BIN_REQUIREMENT_RECEIPT,
              BIN_ENFORCEMENT_RECEIPT,
              BIN_SCOPE_RECEIPT,
              BIN_SPECIAL_USE_RECEIPT,
              BIN_RULES_RECEIPT,
              BIN_FINE_RECEIPT,
            ],
            visual: {
              kind: "claim-counts",
              supported: 6,
              disputed: 0,
              missing: 0,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_factual_review",
              eventCode: "DRAFT_REVIEWED",
            },
            contribution: {
              inputLabel: "Revised draft + complete packet",
              operation:
                "Rerun the full factual review rather than checking only changed text",
              addedValue:
                "Confirms the correction did not introduce a new regression elsewhere.",
              outputLabel: "0 blocking issues · candidate ready",
              residentImpact:
                "A complete, audited resident briefing is available while publication status remains honest.",
              decisionCheckpointKeys: [
                "checkpoint_bins_second_review",
                "checkpoint_bins_publication_boundary",
              ],
            },
          },
        ],
        loopEdges: [
          {
            fromMomentKey: "moment_nyc_bins_repair",
            toMomentKey: "moment_nyc_bins_gap",
            label: "new receipts → reverify",
            kind: "evidence-recheck",
          },
          {
            fromMomentKey: "moment_nyc_bins_catch",
            toMomentKey: "moment_nyc_bins_revise",
            label: "reviewer → writer",
            kind: "draft-revision",
          },
        ],
      },
      output: {
        kind: "brief-candidate",
        briefSlug: "nyc-bin-rules-june-2026",
        headline:
          "NYC Bin rule starts June 1; full enforcement begins September 8",
        summary:
          "Properties with 1 to 9 residential units must use official NYC Bins for trash beginning June 1. Warnings run through September 7, with full enforcement beginning September 8. Covered trash goes out after 6 PM in a secure lid bin no larger than 55 gallons. The official bin requirement does not extend to recycling or compost; NYC311 lists a $50, $100, then $200 fine ladder for noncompliance.",
        disposition:
          "Four official pages joined · two draft errors corrected · application review boundary next",
      },
    },
    {
      scenarioKey: "nyc-busway-evidence",
      label: "Present-tense impact held",
      deck: "The source announces a plan and schedule, not an operating busway or measured travel-time result.",
      execution: REFERENCE_EXECUTION,
      input: {
        origin: "coverage-request-and-sources",
        label: "Reader impact claim plus official release",
        summary:
          "A reader-submitted present-tense impact claim enters beside the June 2 Mayor's Office announcement and must be verified independently.",
        receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      },
      detail: nycBuswayInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output: "The June 2 Mayor's Office announcement was captured.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "The inbound coverage claim, official plan, and official schedule became separate material claims.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_verification",
          output:
            "The plan and schedule are supported; the inbound claim of current operation and measured savings is not.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "blocked",
          output: "Not invoked after the verification hold.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "blocked",
          output:
            "No prose is generated from the unsupported present-tense impact.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "blocked",
          output: "No draft exists to review.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "blocked",
          output: "No exact draft reached this boundary.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "blocked",
          output: "Missing implementation evidence prevents publication.",
        },
      ],
      intelligence: {
        residentAnswer: {
          bottomLine:
            "The June 2 record supports a planned 34th Street busway and a fall construction target, not a claim that it was already operating or saving riders time.",
          whatIsNew: [
            "The planned busway would run between Ninth and Third Avenues.",
            "Public outreach was expected in June, with construction completion targeted for fall.",
          ],
          actions: [],
          knownUnknowns: [
            "No captured launch confirmation or measured travel time result after launch supports the reader submitted impact claim.",
          ],
        },
        aggregation: {
          uniqueSourceCount: 1,
          uniquePublisherCount: 1,
          materialClaimCount: 3,
          maxClaimsCoveredByOneSource: 2,
          requiresMultipleSources: false,
          explanation:
            "One official announcement supports the plan and schedule. The absent operational result remains an explicit evidence gap, not an inferred fact.",
          sourceLayers: [
            {
              layerKey: "layer_mayor_busway_plan",
              label: "Plan + rollout announcement",
              publisher: "NYC Mayor's Office",
              jurisdiction: "City executive",
              contribution:
                "Supports the planned corridor and expected rollout schedule, but not present operation.",
              receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
              capturedText:
                "The 34th Street busway will run in both directions between Ninth Avenue and Third Avenue. NYC DOT expects to begin public outreach this month, install street furniture later in the summer and complete construction by the end of the fall.",
            },
          ],
        },
        addedValue: [
          {
            valueKey: "value_busway_prevented_overclaim",
            kind: "prevented_overclaim",
            headline: "A future plan stayed in the future tense",
            residentConsequence:
              "Readers are not told that the busway is operating or already improving trips without launch and measurement evidence.",
            inputClaimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            inputReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            outputClaimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
            eventKeys: [
              "event_ref_nyc_busway_verify_T8m4qL2vN6pR",
              "event_ref_nyc_busway_hold_W5v9mQ3xK2pL",
            ],
            momentKey: "moment_nyc_busway_missing",
          },
        ],
        decisionCheckpoints: [
          {
            checkpointKey: "checkpoint_busway_material_coverage",
            label: "Material claim coverage",
            stage: "verify",
            owner: "application_policy",
            status: "fail",
            observed: { label: "Supported claims", value: 2 },
            required: { label: "Required", value: 3 },
            consequence:
              "The run stops before drafting and keeps the missing impact claim visible.",
            policyVersion: "evidence-coverage-2026-07",
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            eventKeys: [
              "event_ref_nyc_busway_verify_T8m4qL2vN6pR",
              "event_ref_nyc_busway_hold_W5v9mQ3xK2pL",
            ],
            momentKey: "moment_nyc_busway_missing",
          },
          {
            checkpointKey: "checkpoint_busway_draft_boundary",
            label: "Drafting allowed",
            stage: "draft",
            owner: "application_policy",
            status: "not_run",
            observed: { label: "Complete evidence packet", value: false },
            required: { label: "Required", value: true },
            consequence:
              "Writer, reviewers, final gate, and provider boundary are not invoked.",
            policyVersion: "workflow-boundary-2026-07",
            claimKeys: [BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            eventKeys: ["event_ref_nyc_busway_complete_J9v3mQ7xL2pR"],
            momentKey: "moment_nyc_busway_gate",
          },
        ],
      },
      story: {
        outcomeLabel: "Current impact held",
        outcomeTone: "caution",
        hook: "A reader's claim is plausible, but the operational result is absent from the June 2 evidence.",
        metrics: [
          { label: "Supported", value: 2 },
          { label: "Missing", value: 1 },
          { label: "Drafts created", value: 0 },
        ],
        pivotalMomentKey: "moment_nyc_busway_missing",
        moments: [
          {
            momentKey: "moment_nyc_busway_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "The June 2 plan is preserved",
            narrative:
              "The city release becomes the bounded source for what was announced and when rollout was expected.",
            eventKeys: ["event_ref_nyc_busway_capture_C7m2qL8xV4pR"],
            claimKeys: [],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: { kind: "receipt", receiptKey: BUSWAY_PLAN_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
          },
          {
            momentKey: "moment_nyc_busway_extract",
            stage: "extract",
            actor: "Claim Extractor",
            status: "complete",
            headline: "Reader claim and source facts split apart",
            narrative:
              "The inbound claim of current impact remains distinct from the announcement's supported plan and schedule.",
            eventKeys: ["event_ref_nyc_busway_extract_D5v9mQ3xK7pL"],
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 2,
              disputed: 0,
              missing: 1,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_extraction",
              eventCode: "CLAIMS_EXTRACTED",
            },
          },
          {
            momentKey: "moment_nyc_busway_missing",
            stage: "verify",
            actor: "Claim Verifier",
            status: "caught",
            headline: "No launch or travel-time receipt",
            narrative:
              "The release gives future milestones, not implementation confirmation or measured post-launch savings.",
            eventKeys: [
              "event_ref_nyc_busway_verify_T8m4qL2vN6pR",
              "event_ref_nyc_busway_hold_W5v9mQ3xK2pL",
            ],
            claimKeys: [BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 2,
              disputed: 0,
              missing: 1,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_verification",
              eventCode: "WORKFLOW_HELD",
            },
          },
          {
            momentKey: "moment_nyc_busway_gate",
            stage: "publish",
            actor: "Workflow boundary",
            status: "held",
            headline: "Stopped before drafting",
            narrative:
              "The unsupported result remains visible as missing evidence; downstream agents and provider calls never run.",
            eventKeys: ["event_ref_nyc_busway_complete_J9v3mQ7xL2pR"],
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "gate",
              label: "Held at verification",
              detail:
                "A future plan cannot be published as a present operational result.",
            },
            system: {
              agentKind: "Custom ADK BaseAgent",
              eventCode: "WORKFLOW_COMPLETED",
            },
          },
        ],
      },
    },
    {
      scenarioKey: "nyc-busway-source-recheck",
      label: "Source change rechecked",
      deck: "A later capture changes at the document level. The maintenance path maps affected claims, rechecks them, and correctly finds no new evidence of current operation.",
      execution: REFERENCE_EXECUTION,
      input: {
        origin: "single-source-artifact",
        label: "Two captured versions of one official announcement",
        summary:
          "This captured-source reference scenario compares two bounded versions of the same official announcement. It illustrates the production change contract without claiming a provider-side publication.",
        receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
      },
      detail: nycBuswayRefreshInvestigation,
      agents: [
        {
          key: "monitor",
          name: "Source Monitor",
          kind: "tool",
          status: "complete",
          output:
            "A novel normalized source hash created one durable refresh revision.",
        },
        {
          key: "change-analyst",
          name: "Change Analyst",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_change_assessment",
          output:
            "Claim-lineage comparison found wording movement but no evidence of an operating busway.",
        },
        {
          key: "extractor",
          name: "Selective Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "Only source-dependent claims were re-extracted; the prior public packet remained intact.",
        },
        {
          key: "verifier",
          name: "Global Claim Verifier",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_verification",
          output:
            "Plan and schedule remained supported; current-operation impact remained unsupported.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "blocked",
          output:
            "No article change was emitted and the unsupported impact stayed out.",
        },
      ],
      intelligence: {
        residentAnswer: {
          bottomLine:
            "The monitored page changed, but the verified plan and schedule did not. There is still no evidence that the 34th Street busway is operating, so no article change is warranted.",
          whatIsNew: [
            "A new normalized source version was captured and compared.",
            "Two linked claims were rechecked against the complete carried-forward packet.",
          ],
          actions: [],
          knownUnknowns: [
            "Launch status and measured travel-time impact remain unsupported in the captured packet.",
          ],
        },
        aggregation: {
          uniqueSourceCount: 1,
          uniquePublisherCount: 1,
          materialClaimCount: 3,
          maxClaimsCoveredByOneSource: 2,
          requiresMultipleSources: false,
          explanation:
            "This is a source-maintenance result: two versions of one artifact are compared, then only linked claims are reverified.",
          sourceLayers: [
            {
              layerKey: "layer_busway_source_versions",
              label: "Two captured versions",
              publisher: "NYC Mayor's Office",
              jurisdiction: "City executive",
              contribution:
                "Shows wording movement without adding current-operation evidence.",
              receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
              capturedText:
                "The 34th Street busway will run in both directions between Ninth Avenue and Third Avenue. NYC DOT expects to begin public outreach this month, install street furniture later in the summer and complete construction by the end of the fall.",
            },
          ],
        },
        addedValue: [
          {
            valueKey: "value_busway_detected_change",
            kind: "detected_source_change",
            headline: "A document change did not become a false news update",
            residentConsequence:
              "Residents are spared a meaningless update while the audit record still shows that the source was rechecked.",
            inputClaimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
            inputReceiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            outputClaimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
            eventKeys: [
              "event_ref_nyc_busway_changed_H4m8qL2vN7pR",
              "event_ref_nyc_busway_reverify_B8m4qL2vN7pR",
            ],
            momentKey: "moment_nyc_refresh_assess",
          },
        ],
        decisionCheckpoints: [
          {
            checkpointKey: "checkpoint_refresh_affected_claims",
            label: "Affected claims rechecked",
            stage: "verify",
            owner: "application_policy",
            status: "pass",
            observed: { label: "Claims rechecked", value: 2 },
            required: { label: "Affected claims", value: 2 },
            consequence:
              "The refresh can be recorded without reopening unrelated claims.",
            policyVersion: "source-refresh-2026-07",
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            eventKeys: ["event_ref_nyc_busway_reverify_B8m4qL2vN7pR"],
            momentKey: "moment_nyc_refresh_verify",
          },
          {
            checkpointKey: "checkpoint_refresh_article_impact",
            label: "Article impact required",
            stage: "maintain",
            owner: "application_policy",
            status: "pass",
            observed: { label: "Claim status changed", value: false },
            required: { label: "Required to alter article", value: true },
            consequence:
              "Revision history records the recheck; no article or provider publication is changed.",
            policyVersion: "change-impact-2026-07",
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            eventKeys: ["event_ref_nyc_busway_refresh_done_R5v9mQ3xK2pL"],
            momentKey: "moment_nyc_refresh_record",
          },
        ],
      },
      story: {
        outcomeLabel: "No article impact",
        outcomeTone: "positive",
        hook: "The page changed; the verified fact pattern did not. The system spends work only on linked claims and preserves the hold.",
        metrics: [
          { label: "Versions compared", value: 2 },
          { label: "Claims rechecked", value: 2 },
          { label: "New publishable facts", value: 0 },
        ],
        pivotalMomentKey: "moment_nyc_refresh_assess",
        moments: [
          {
            momentKey: "moment_nyc_refresh_monitor",
            stage: "monitor",
            actor: "Source Monitor",
            status: "complete",
            headline: "A novel version enters the case",
            narrative:
              "The source watch records a new normalized hash and creates one fenced revision. The previous case record remains available while the refresh runs.",
            eventKeys: ["event_ref_nyc_busway_changed_H4m8qL2vN7pR"],
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "source-diff",
              beforeLabel: "June 2 capture",
              afterLabel: "June 10 recheck",
              before:
                "Construction was expected to be complete by the end of fall.",
              after:
                "The project remained scheduled for completion by the end of fall.",
              impact: "no_change",
            },
            system: {
              agentKind: "Durable source-refresh job",
              eventCode: "SOURCE_CHANGED",
            },
          },
          {
            momentKey: "moment_nyc_refresh_assess",
            stage: "assess",
            actor: "Change Analyst",
            status: "complete",
            headline: "Document change does not become article change",
            narrative:
              "The analyst maps the wording to the existing schedule lineage. Deterministic policy classifies no editorial impact because status and support do not change.",
            eventKeys: ["event_ref_nyc_busway_changed_H4m8qL2vN7pR"],
            claimKeys: [BUSWAY_SCHEDULE],
            receiptKeys: [BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "source-diff",
              beforeLabel: "Prior claim-relevant excerpt",
              afterLabel: "Current claim-relevant excerpt",
              before:
                "Construction was expected to be complete by the end of fall.",
              after:
                "The project remained scheduled for completion by the end of fall.",
              impact: "no_change",
            },
            system: {
              agentKind: "Google ADK LlmAgent + deterministic policy",
              stateKey: "pw_change_assessment",
              eventCode: "SOURCE_CHANGED",
            },
          },
          {
            momentKey: "moment_nyc_refresh_verify",
            stage: "verify",
            actor: "Global Claim Verifier",
            status: "ready",
            headline: "The complete packet is checked again",
            narrative:
              "Affected claims are reprocessed, then the material-claim coverage invariant runs across the carried-forward packet. The unsupported present-tense impact remains unsupported.",
            eventKeys: ["event_ref_nyc_busway_reverify_B8m4qL2vN7pR"],
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 2,
              disputed: 0,
              missing: 1,
            },
            system: {
              agentKind: "Google ADK LlmAgent + deterministic coverage",
              stateKey: "pw_verification",
              eventCode: "REVISION_VERIFIED",
            },
          },
          {
            momentKey: "moment_nyc_refresh_record",
            stage: "maintain",
            actor: "Revision service",
            status: "complete",
            headline: "Revision 2 records no article impact",
            narrative:
              "The immutable history records the source recheck. No published wording is invented, and the open evidence gap remains visible.",
            eventKeys: ["event_ref_nyc_busway_refresh_done_R5v9mQ3xK2pL"],
            claimKeys: [BUSWAY_PLAN, BUSWAY_SCHEDULE, BUSWAY_IMPACT],
            receiptKeys: [BUSWAY_PLAN_RECEIPT, BUSWAY_SCHEDULE_RECEIPT],
            visual: {
              kind: "record-revision",
              revisionType: "update",
              beforeLabel: "Revision 1",
              afterLabel: "Revision 2",
              detail:
                "Source rechecked; no current-operation evidence appeared. This changes the case history, not a provider publication.",
            },
            system: {
              agentKind: "Application revision service",
              eventCode: "WORKFLOW_COMPLETED",
            },
          },
        ],
        loopEdges: [
          {
            fromMomentKey: "moment_nyc_refresh_verify",
            toMomentKey: "moment_nyc_refresh_monitor",
            label: "next source → recheck",
            kind: "source-maintenance",
          },
        ],
      },
    },
    {
      scenarioKey: "nyc-bridge-contradiction",
      label: "Same-source status conflict",
      deck: "One NYC DOT release uses future opening language and an already-reopened quote. The workflow preserves both.",
      execution: REFERENCE_EXECUTION,
      input: {
        origin: "single-source-artifact",
        label: "One official release, conflicting status passages",
        summary:
          "The June 10 NYC DOT release enters as separate access, future-opening, and already-reopened receipts so its internal conflict stays inspectable.",
        receiptKeys: [
          BRIDGE_ACCESS_RECEIPT,
          BRIDGE_FUTURE_RECEIPT,
          BRIDGE_REOPENED_RECEIPT,
        ],
      },
      detail: nycBridgeInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output:
            "One June 10 NYC DOT release produced two conflicting status receipts.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "Future access mode and status at the June 10 capture became separate claims.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_verification",
          output:
            "Future opening copy and already-reopened language conflict on status at capture.",
        },
        {
          key: "dissent-resolver",
          name: "Dissent Resolver",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_dissent_resolution",
          output:
            "A typed proposal was policy-checked; equal-authority evidence remained unresolved and publication stayed blocked.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "blocked",
          output: "The workflow terminates at verification.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "blocked",
          output:
            "No point-in-time status claim is drafted while the official release conflicts.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "blocked",
          output: "No draft exists to review.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "blocked",
          output: "No exact draft reached this boundary.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "blocked",
          output: "A material status contradiction prevents publication.",
        },
      ],
      intelligence: {
        residentAnswer: {
          bottomLine:
            "The future access mode is supported, but the bridge's status at the June 10 capture is not safe to state: the same release uses both future-opening and already-reopened language.",
          whatIsNew: [
            "Future access would be limited to pedestrians, cyclists, and emergency vehicles.",
            "The captured release contains an unresolved point-in-time status conflict.",
          ],
          actions: [],
          knownUnknowns: [
            "Another authoritative observation is required to establish whether the bridge was open at the June 10 capture.",
          ],
        },
        aggregation: {
          uniqueSourceCount: 1,
          uniquePublisherCount: 1,
          materialClaimCount: 2,
          maxClaimsCoveredByOneSource: 2,
          requiresMultipleSources: false,
          explanation:
            "This run audits conflicting passages inside one official artifact. It intentionally does not claim multi-source synthesis.",
          sourceLayers: [
            {
              layerKey: "layer_dot_bridge_release",
              label: "One release, conflicting passages",
              publisher: "NYC Department of Transportation",
              jurisdiction: "City agency",
              contribution:
                "Supports future access mode while exposing an unresolved status contradiction.",
              receiptKeys: [
                BRIDGE_ACCESS_RECEIPT,
                BRIDGE_FUTURE_RECEIPT,
                BRIDGE_REOPENED_RECEIPT,
              ],
              capturedText:
                "the historic Carroll Street Bridge in Gowanus, Brooklyn, will open Monday, June 15, after a five-year rehabilitation effort. going forward, the 137-year-old one-lane bridge, a New York City landmark, would be limited to pedestrians, cyclists, and emergency vehicles. We are thrilled that the Carroll Street Bridge has reopened following an extensive restoration by DOT",
            },
          ],
        },
        addedValue: [
          {
            valueKey: "value_bridge_preserved_conflict",
            kind: "preserved_conflict",
            headline:
              "The resolver refused to vote away equal-authority evidence",
            residentConsequence:
              "Readers do not receive a guessed open-or-closed status merely because one tense is more convenient.",
            inputClaimKeys: [BRIDGE_STATUS],
            inputReceiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
            outputClaimKeys: [BRIDGE_STATUS],
            eventKeys: [
              "event_ref_nyc_bridge_dissent_A7m3qL9xP2vR",
              "event_ref_nyc_bridge_hold_R5v9mQ3xK2pL",
            ],
            momentKey: "moment_nyc_bridge_dissent",
          },
        ],
        decisionCheckpoints: [
          {
            checkpointKey: "checkpoint_bridge_conflict",
            label: "Blocking material contradictions",
            stage: "verify",
            owner: "application_policy",
            status: "fail",
            observed: { label: "Unresolved contradictions", value: 1 },
            required: { label: "Maximum", value: 0 },
            consequence:
              "The point-in-time status claim cannot enter drafting.",
            policyVersion: "evidence-coverage-2026-07",
            claimKeys: [BRIDGE_STATUS],
            receiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
            eventKeys: [
              "event_ref_nyc_bridge_verify_Q8v3mL6xK2pR",
              "event_ref_nyc_bridge_hold_R5v9mQ3xK2pL",
            ],
            momentKey: "moment_nyc_bridge_conflict",
          },
          {
            checkpointKey: "checkpoint_bridge_dissent",
            label: "Dissent resolution authority",
            stage: "assess",
            owner: "application_policy",
            status: "fail",
            observed: { label: "Stronger evidence established", value: false },
            required: { label: "Required to resolve", value: true },
            consequence:
              "The ADK proposal remains an assessment; claim status stays disputed.",
            policyVersion: "dissent-policy-2026-07",
            claimKeys: [BRIDGE_STATUS],
            receiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
            eventKeys: ["event_ref_nyc_bridge_dissent_A7m3qL9xP2vR"],
            momentKey: "moment_nyc_bridge_dissent",
          },
        ],
      },
      story: {
        outcomeLabel: "Status conflict preserved",
        outcomeTone: "stopped",
        hook: "At the June 10 capture, the official release disagrees with itself. PublicWire preserves both tenses.",
        metrics: [
          { label: "Supported", value: 1 },
          { label: "Disputed", value: 1 },
          { label: "Drafts created", value: 0 },
        ],
        pivotalMomentKey: "moment_nyc_bridge_conflict",
        moments: [
          {
            momentKey: "moment_nyc_bridge_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "Both passages survive capture",
            narrative:
              "The June 15 opening language and already-reopened quote remain separate receipts from the same official artifact.",
            eventKeys: ["event_ref_nyc_bridge_capture_F5n8qK2vM4rT"],
            claimKeys: [],
            receiptKeys: [
              BRIDGE_ACCESS_RECEIPT,
              BRIDGE_FUTURE_RECEIPT,
              BRIDGE_REOPENED_RECEIPT,
            ],
            visual: { kind: "receipt", receiptKey: BRIDGE_FUTURE_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
          },
          {
            momentKey: "moment_nyc_bridge_extract",
            stage: "extract",
            actor: "Claim Extractor",
            status: "complete",
            headline: "Future access and capture-time status separate",
            narrative:
              "The supported future access mode can remain true while the bridge's status at the June 10 capture receives its own check.",
            eventKeys: ["event_ref_nyc_bridge_extract_B4m7qL9vN2pR"],
            claimKeys: [BRIDGE_ACCESS, BRIDGE_STATUS],
            receiptKeys: [
              BRIDGE_ACCESS_RECEIPT,
              BRIDGE_FUTURE_RECEIPT,
              BRIDGE_REOPENED_RECEIPT,
            ],
            visual: {
              kind: "claim-counts",
              supported: 1,
              disputed: 1,
              missing: 0,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_extraction",
              eventCode: "CLAIMS_EXTRACTED",
            },
          },
          {
            momentKey: "moment_nyc_bridge_conflict",
            stage: "verify",
            actor: "Claim Verifier",
            status: "caught",
            headline: "Future and present tense collide",
            narrative:
              "The operative copy says June 15; a quoted official says the bridge has reopened. The status claim is disputed.",
            eventKeys: [
              "event_ref_nyc_bridge_verify_Q8v3mL6xK2pR",
              "event_ref_nyc_bridge_hold_R5v9mQ3xK2pL",
            ],
            claimKeys: [BRIDGE_STATUS],
            receiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
            visual: {
              kind: "evidence-conflict",
              supportReceiptKey: BRIDGE_REOPENED_RECEIPT,
              contradictionReceiptKey: BRIDGE_FUTURE_RECEIPT,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_verification",
              eventCode: "WORKFLOW_HELD",
            },
          },
          {
            momentKey: "moment_nyc_bridge_dissent",
            stage: "assess",
            actor: "Dissent Resolver + policy",
            status: "held",
            headline: "The disagreement survives adversarial review",
            narrative:
              "One typed ADK proposal is checked against source authority, effective dates, and scope. Equal-authority evidence cannot be voted away, so the claim remains disputed.",
            eventKeys: ["event_ref_nyc_bridge_dissent_A7m3qL9xP2vR"],
            claimKeys: [BRIDGE_STATUS],
            receiptKeys: [BRIDGE_FUTURE_RECEIPT, BRIDGE_REOPENED_RECEIPT],
            visual: {
              kind: "dissent-assessment",
              supportReceiptKey: BRIDGE_REOPENED_RECEIPT,
              contradictionReceiptKey: BRIDGE_FUTURE_RECEIPT,
              outcomeLabel: "Material disagreement remains open",
              explanation:
                "The resolver adds a structured assessment, not a confidence vote. Another authoritative observation must return the claim to global verification.",
            },
            system: {
              agentKind: "Google ADK LlmAgent + deterministic policy",
              stateKey: "pw_dissent_resolution",
              eventCode: "DISSENT_ASSESSED",
            },
          },
          {
            momentKey: "moment_nyc_bridge_gate",
            stage: "publish",
            actor: "Workflow boundary",
            status: "held",
            headline: "No tense is guessed",
            narrative:
              "Drafting remains blocked for this June 10 snapshot unless another official artifact resolves status at capture.",
            eventKeys: ["event_ref_nyc_bridge_complete_N4v8mQ2xK7pR"],
            claimKeys: [BRIDGE_ACCESS, BRIDGE_STATUS],
            receiptKeys: [
              BRIDGE_ACCESS_RECEIPT,
              BRIDGE_FUTURE_RECEIPT,
              BRIDGE_REOPENED_RECEIPT,
            ],
            visual: {
              kind: "gate",
              label: "Held at verification",
              detail:
                "The exact same source contains a material point-in-time status contradiction.",
            },
            system: {
              agentKind: "Custom ADK BaseAgent",
              eventCode: "WORKFLOW_COMPLETED",
            },
          },
        ],
        loopEdges: [
          {
            fromMomentKey: "moment_nyc_bridge_dissent",
            toMomentKey: "moment_nyc_bridge_conflict",
            label: "new evidence → reverify",
            kind: "evidence-recheck",
          },
        ],
      },
    },
  ]);

export const nycDemoEdition = publicEditionViewSchema.parse({
  schemaVersion: "1",
  areaKey: "new-york-city",
  areaDisplayName: "New York City, NY",
  generatedAt: "2026-06-10T15:09:00.000Z",
  freshnessState: "stale",
  deskState: "demo",
  runtimeMode: "demo",
  metrics: {
    confirmedUpdates: 0,
    publicActiveInvestigations: nycReferenceRuns.length,
    sourceReceipts: nycReferenceRuns.reduce(
      (total, run) => total + run.detail.summary.sourceReceiptCount,
      0,
    ),
  },
  briefs: [],
  publicInvestigations: nycReferenceRuns.map((run) => run.detail.summary),
  routineFilters: [
    { label: "Routine recurring service notice", reasonCode: "ROUTINE" },
    { label: "Repeated project announcement", reasonCode: "DUPLICATE" },
    { label: "Expired weather alert", reasonCode: "STALE" },
  ],
  publicEvents: nycReferenceRuns
    .flatMap((run) => run.detail.events)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 8),
  degradedNotice: {
    code: "NO_LIVE_DATA",
    message:
      "This New York coverage record joins official June 2026 NYC source pages through production public contracts. Every claim, agent contribution, and publication boundary remains inspectable.",
  },
});
