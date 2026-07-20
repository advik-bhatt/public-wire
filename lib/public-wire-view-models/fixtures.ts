import { z } from "zod";
import {
  publicEditionViewSchema,
  publicInvestigationDetailSchema,
  type PublicInvestigationDetail,
} from "./schemas";
import { referenceRunSchema, type ReferenceRun } from "./reference-run-schema";
import { nycDemoEdition, nycReferenceRuns } from "./nyc-fixtures";

export { referenceRunSchema, type ReferenceRun } from "./reference-run-schema";

export const DEMO_PUBLIC_CASE_KEY =
  "case_ref_george_street_evidence_7Qm4xN2pL8vR";
export const PUBLISH_READY_PUBLIC_CASE_KEY =
  "case_ref_water_main_ready_P8v4mL2xQ7nR";
export const CONTRADICTION_PUBLIC_CASE_KEY =
  "case_ref_parking_conflict_K6m2qV9xR4pT";

const GEORGE_LOCATION = "claim_ref_george_street_location_M5q3pL8xV2nR";
const GEORGE_IMPACT = "claim_ref_george_street_impact_K7v2mQ9xP4rT";
const GEORGE_CITY_RECEIPT = "receipt_ref_city_notice_H4m8qL2vN7pR";

const WATER_LOCATION = "claim_ref_water_main_location_F7m3qL9xP2vR";
const WATER_TIMING = "claim_ref_water_main_timing_N4v8mQ2xK7pR";
const WATER_ACCESS = "claim_ref_water_main_access_J6q2mV9xL4pT";
const WATER_CITY_RECEIPT = "receipt_ref_water_city_B8m4qL2vN7pR";
const WATER_ACCESS_RECEIPT = "receipt_ref_water_access_R5v9mQ3xK2pL";

const PARKING_CHANGE = "claim_ref_parking_change_C7m2qL8xV4pR";
const PARKING_DATE = "claim_ref_parking_date_D5v9mQ3xK7pL";
const PARKING_AGENDA_RECEIPT = "receipt_ref_parking_agenda_T8m4qL2vN6pR";
const PARKING_NOTICE_RECEIPT = "receipt_ref_parking_notice_W5v9mQ3xK2pL";

const georgeCityReceipt = {
  publicReceiptKey: GEORGE_CITY_RECEIPT,
  sourceTitle: "City source domain · construction scenario",
  sourceUrl: "https://www.cityofnewbrunswick.org/",
  sourceAuthority: "official" as const,
  capturedAt: "2026-07-18T12:31:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Scenario evidence excerpt: the municipal notice identifies construction on George Street.",
  artifactRevisionLabel: "Reference artifact v1",
};

const waterCityReceipt = {
  publicReceiptKey: WATER_CITY_RECEIPT,
  sourceTitle: "City source domain · utility-work scenario",
  sourceUrl: "https://www.cityofnewbrunswick.org/",
  sourceAuthority: "official" as const,
  capturedAt: "2026-07-18T13:01:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Scenario evidence excerpt: the municipal notice identifies water-main utility work on Jersey Avenue during a defined weekday work window.",
  artifactRevisionLabel: "Reference artifact v1",
};

const waterAccessReceipt = {
  publicReceiptKey: WATER_ACCESS_RECEIPT,
  sourceTitle: "City source domain · utility-work scenario",
  sourceUrl: "https://www.cityofnewbrunswick.org/",
  sourceAuthority: "official" as const,
  capturedAt: "2026-07-18T13:01:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Scenario evidence excerpt: affected properties should follow posted access directions while crews are present.",
  artifactRevisionLabel: "Reference artifact v1",
};

const parkingAgendaReceipt = {
  publicReceiptKey: PARKING_AGENDA_RECEIPT,
  sourceTitle: "City source domain · parking packet scenario",
  sourceUrl: "https://www.cityofnewbrunswick.org/",
  sourceAuthority: "official" as const,
  capturedAt: "2026-07-18T14:01:00.000Z",
  relation: "supports" as const,
  boundedExcerpt:
    "Scenario evidence excerpt: a downtown parking-rule change is proposed for the first weekday of the following month.",
  artifactRevisionLabel: "Reference artifact v1",
};

const parkingNoticeReceipt = {
  publicReceiptKey: PARKING_NOTICE_RECEIPT,
  sourceTitle: "City source domain · parking packet scenario",
  sourceUrl: "https://www.cityofnewbrunswick.org/",
  sourceAuthority: "official" as const,
  capturedAt: "2026-07-18T14:01:00.000Z",
  relation: "contradicts" as const,
  boundedExcerpt:
    "Scenario evidence excerpt: a second section of the captured packet lists the effective date one week later.",
  artifactRevisionLabel: "Reference artifact v1",
};

export const referencePublishReadyInvestigation =
  publicInvestigationDetailSchema.parse({
    schemaVersion: "1",
    summary: {
      publicCaseKey: PUBLISH_READY_PUBLIC_CASE_KEY,
      areaKey: "new-brunswick",
      areaDisplayName: "New Brunswick, NJ",
      topic: "Downtown water-main work and weekday access",
      workflowState: "reviewing",
      publicationState: "none",
      lifecycleState: "open",
      correctionState: "none",
      visibility: "public",
      freshnessState: "unknown",
      runtimeMode: "demo",
      currentDetermination:
        "The factual reviewer caught an overstatement, returned the draft once, and passed the corrected wording after a full second review.",
      materialClaimCounts: { supported: 3, disputed: 0, missing: 0 },
      sourceReceiptCount: 2,
      openedAt: "2026-07-18T13:00:00.000Z",
      updatedAt: "2026-07-18T13:10:00.000Z",
      revision: 1,
    },
    projectionRevision: 1,
    snapshotCursor: 5,
    streamEpoch: "epoch_ref_water_main_Q8v3mL6xK2pR",
    whyItMatters:
      "The notice includes access directions that affected properties may need while crews are present.",
    whoIsAffected: ["Affected Jersey Avenue properties"],
    stageRail: [
      { stage: "capture", label: "Capture sources", state: "complete" },
      { stage: "extract", label: "Identify claims", state: "complete" },
      { stage: "verify", label: "Check evidence", state: "complete" },
      { stage: "editorial", label: "Classify relevance", state: "complete" },
      { stage: "draft", label: "Write from claims", state: "complete" },
      {
        stage: "review",
        label: "Application review boundary",
        state: "current",
      },
      {
        stage: "publish",
        label: "Live publication controls",
        state: "pending",
      },
    ],
    claims: [
      {
        publicClaimKey: WATER_LOCATION,
        text: "The captured municipal work notice concerns a water-main project on Jersey Avenue.",
        materiality: "material",
        status: "supported",
        evidence: [waterCityReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-07-18T13:05:00.000Z",
      },
      {
        publicClaimKey: WATER_TIMING,
        text: "The reference packet schedules the work during a defined weekday work window.",
        materiality: "material",
        status: "supported",
        evidence: [waterCityReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-07-18T13:05:00.000Z",
      },
      {
        publicClaimKey: WATER_ACCESS,
        text: "The reference access notice asks affected properties to follow posted work-zone directions.",
        materiality: "material",
        status: "supported",
        evidence: [waterAccessReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-07-18T13:05:00.000Z",
      },
    ],
    sourceReceipts: [waterCityReceipt, waterAccessReceipt],
    currentDecision: { outcome: "publish", reasonCodes: ["EVIDENCE_COMPLETE"] },
    events: [
      {
        cursor: 1,
        publicEventKey: "event_ref_water_capture_J9v3mQ7xL2pR",
        occurredAt: "2026-07-18T13:01:00.000Z",
        stage: "capture",
        status: "completed",
        eventCode: "SOURCE_CAPTURED",
        safeParams: {
          sourceTitle: "municipal utility scenario packet",
          sourceCount: 1,
        },
        sourceReceiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
        claimKeys: [],
      },
      {
        cursor: 2,
        publicEventKey: "event_ref_water_extract_F5n8qK2vM4rT",
        occurredAt: "2026-07-18T13:03:00.000Z",
        stage: "extract",
        status: "completed",
        eventCode: "CLAIMS_EXTRACTED",
        safeParams: { claimCount: 3 },
        sourceReceiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
        claimKeys: [WATER_LOCATION, WATER_TIMING, WATER_ACCESS],
      },
      {
        cursor: 3,
        publicEventKey: "event_ref_water_verify_C7m2qL8xV4pR",
        occurredAt: "2026-07-18T13:05:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "VERIFICATION_COMPLETED",
        safeParams: { supportedCount: 3, disputedCount: 0 },
        sourceReceiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
        claimKeys: [WATER_LOCATION, WATER_TIMING, WATER_ACCESS],
      },
      {
        cursor: 4,
        publicEventKey: "event_ref_water_review_first_D5v9mQ3xK7pL",
        occurredAt: "2026-07-18T13:08:00.000Z",
        stage: "review",
        status: "held",
        eventCode: "DRAFT_REVIEWED",
        safeParams: {
          blockingIssueCount: 1,
          draftAttempt: 1,
          returnedToWriter: true,
          issueCodes: ["OVERSTATED"],
        },
        sourceReceiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
        claimKeys: [WATER_ACCESS],
      },
      {
        cursor: 5,
        publicEventKey: "event_ref_water_review_second_N4q8mL2vR7pK",
        occurredAt: "2026-07-18T13:10:00.000Z",
        stage: "review",
        status: "completed",
        eventCode: "DRAFT_REVIEWED",
        safeParams: {
          blockingIssueCount: 0,
          draftAttempt: 2,
          returnedToWriter: false,
          issueCodes: [],
        },
        sourceReceiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
        claimKeys: [],
      },
    ],
    revisions: [],
  });

export const referenceEvidenceBoundaryInvestigation =
  publicInvestigationDetailSchema.parse({
    schemaVersion: "1",
    summary: {
      publicCaseKey: DEMO_PUBLIC_CASE_KEY,
      areaKey: "new-brunswick",
      areaDisplayName: "New Brunswick, NJ",
      topic: "George Street construction and claimed service impacts",
      workflowState: "needs_evidence",
      publicationState: "none",
      lifecycleState: "open",
      correctionState: "none",
      visibility: "public",
      freshnessState: "unknown",
      runtimeMode: "demo",
      currentDetermination:
        "The reference run supports the location claim but stops before drafting because the claimed transit and delivery impacts do not have direct evidence.",
      materialClaimCounts: { supported: 1, disputed: 0, missing: 1 },
      sourceReceiptCount: 1,
      openedAt: "2026-07-18T12:30:00.000Z",
      updatedAt: "2026-07-18T12:42:00.000Z",
      revision: 1,
    },
    projectionRevision: 1,
    snapshotCursor: 5,
    streamEpoch: "epoch_ref_george_case_Q8v3mL6xK2pR",
    whyItMatters:
      "A George Street construction location is supported, but no captured source establishes the claimed bus or delivery effects.",
    whoIsAffected: [],
    stageRail: [
      { stage: "capture", label: "Capture sources", state: "complete" },
      { stage: "extract", label: "Identify claims", state: "complete" },
      { stage: "verify", label: "Check evidence", state: "blocked" },
      { stage: "editorial", label: "Classify relevance", state: "skipped" },
      { stage: "draft", label: "Write from claims", state: "skipped" },
      { stage: "review", label: "Review exact draft", state: "skipped" },
      { stage: "publish", label: "Publication boundary", state: "blocked" },
    ],
    claims: [
      {
        publicClaimKey: GEORGE_LOCATION,
        text: "The captured city notice concerns construction on George Street.",
        materiality: "material",
        status: "supported",
        evidence: [georgeCityReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-07-18T12:38:00.000Z",
      },
      {
        publicClaimKey: GEORGE_IMPACT,
        text: "The work will disrupt weekend bus service and downtown deliveries.",
        materiality: "material",
        status: "unsupported",
        evidence: [],
        contradictions: [],
        missingReason:
          "The source packet does not directly state bus or delivery impacts. A transit advisory or more specific works notice is required.",
      },
    ],
    sourceReceipts: [georgeCityReceipt],
    currentDecision: {
      outcome: "needs_evidence",
      reasonCodes: ["MISSING_EVIDENCE"],
    },
    events: [
      {
        cursor: 1,
        publicEventKey: "event_ref_george_capture_J9v3mQ7xL2pR",
        occurredAt: "2026-07-18T12:31:00.000Z",
        stage: "capture",
        status: "completed",
        eventCode: "SOURCE_CAPTURED",
        safeParams: { sourceTitle: "city public notice index", sourceCount: 1 },
        sourceReceiptKeys: [GEORGE_CITY_RECEIPT],
        claimKeys: [],
      },
      {
        cursor: 2,
        publicEventKey: "event_ref_george_extract_F5n8qK2vM4rT",
        occurredAt: "2026-07-18T12:34:00.000Z",
        stage: "extract",
        status: "completed",
        eventCode: "CLAIMS_EXTRACTED",
        safeParams: { claimCount: 2 },
        sourceReceiptKeys: [GEORGE_CITY_RECEIPT],
        claimKeys: [GEORGE_LOCATION, GEORGE_IMPACT],
      },
      {
        cursor: 3,
        publicEventKey: "event_ref_george_verify_B4m7qL9vN2pR",
        occurredAt: "2026-07-18T12:38:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "VERIFICATION_COMPLETED",
        safeParams: { supportedCount: 1, disputedCount: 0 },
        sourceReceiptKeys: [GEORGE_CITY_RECEIPT],
        claimKeys: [GEORGE_LOCATION, GEORGE_IMPACT],
      },
      {
        cursor: 4,
        publicEventKey: "event_ref_george_hold_Q8v3mL6xK2pR",
        occurredAt: "2026-07-18T12:39:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "WORKFLOW_HELD",
        safeParams: { reasonCode: "MISSING_EVIDENCE", boundary: "verify" },
        sourceReceiptKeys: [GEORGE_CITY_RECEIPT],
        claimKeys: [GEORGE_IMPACT],
      },
      {
        cursor: 5,
        publicEventKey: "event_ref_george_complete_R5v9mQ3xK2pL",
        occurredAt: "2026-07-18T12:42:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "WORKFLOW_COMPLETED",
        safeParams: { outcome: "held" },
        sourceReceiptKeys: [GEORGE_CITY_RECEIPT],
        claimKeys: [GEORGE_LOCATION, GEORGE_IMPACT],
      },
    ],
    revisions: [],
  });

export const referenceContradictionInvestigation: PublicInvestigationDetail =
  publicInvestigationDetailSchema.parse({
    schemaVersion: "2",
    summary: {
      publicCaseKey: CONTRADICTION_PUBLIC_CASE_KEY,
      areaKey: "new-brunswick",
      areaDisplayName: "New Brunswick, NJ",
      topic: "Proposed downtown parking rule change",
      workflowState: "held",
      publicationState: "none",
      lifecycleState: "open",
      correctionState: "none",
      visibility: "public",
      freshnessState: "unknown",
      runtimeMode: "demo",
      currentDetermination:
        "The reference run contains conflicting effective dates in two sections of one captured source packet, so the workflow holds the item before drafting.",
      materialClaimCounts: { supported: 1, disputed: 1, missing: 0 },
      sourceReceiptCount: 2,
      openedAt: "2026-07-18T14:00:00.000Z",
      updatedAt: "2026-07-18T14:09:00.000Z",
      revision: 1,
    },
    projectionRevision: 1,
    snapshotCursor: 5,
    streamEpoch: "epoch_ref_parking_case_Z8v3mL6xK2pR",
    whyItMatters:
      "Residents should not act on a parking-rule date while sections of the captured packet disagree. The contradiction remains visible instead of being averaged into a confidence score.",
    whoIsAffected: [],
    stageRail: [
      { stage: "capture", label: "Capture sources", state: "complete" },
      { stage: "extract", label: "Identify claims", state: "complete" },
      { stage: "verify", label: "Check evidence", state: "blocked" },
      { stage: "editorial", label: "Classify relevance", state: "skipped" },
      { stage: "draft", label: "Write from claims", state: "skipped" },
      { stage: "publish", label: "Publication boundary", state: "blocked" },
    ],
    claims: [
      {
        publicClaimKey: PARKING_CHANGE,
        text: "The reference agenda packet describes a proposed downtown parking-rule change.",
        materiality: "material",
        status: "supported",
        evidence: [parkingAgendaReceipt],
        contradictions: [],
        lastVerifiedAt: "2026-07-18T14:06:00.000Z",
      },
      {
        publicClaimKey: PARKING_DATE,
        text: "The packet gives the proposed parking-rule change an effective date on the first weekday of the following month.",
        materiality: "material",
        status: "disputed",
        evidence: [parkingAgendaReceipt],
        contradictions: [parkingNoticeReceipt],
        lastVerifiedAt: "2026-07-18T14:06:00.000Z",
      },
    ],
    sourceReceipts: [parkingAgendaReceipt, parkingNoticeReceipt],
    currentDecision: { outcome: "hold", reasonCodes: ["CONTRADICTION"] },
    events: [
      {
        cursor: 1,
        publicEventKey: "event_ref_parking_capture_J9v3mQ7xL2pR",
        occurredAt: "2026-07-18T14:01:00.000Z",
        stage: "capture",
        status: "completed",
        eventCode: "SOURCE_CAPTURED",
        safeParams: {
          sourceTitle: "municipal parking scenario packet",
          sourceCount: 1,
        },
        sourceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        claimKeys: [],
      },
      {
        cursor: 2,
        publicEventKey: "event_ref_parking_extract_F5n8qK2vM4rT",
        occurredAt: "2026-07-18T14:03:00.000Z",
        stage: "extract",
        status: "completed",
        eventCode: "CLAIMS_EXTRACTED",
        safeParams: { claimCount: 2 },
        sourceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        claimKeys: [PARKING_CHANGE, PARKING_DATE],
      },
      {
        cursor: 3,
        publicEventKey: "event_ref_parking_verify_B4m7qL9vN2pR",
        occurredAt: "2026-07-18T14:06:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "VERIFICATION_COMPLETED",
        safeParams: { supportedCount: 1, disputedCount: 1 },
        sourceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        claimKeys: [PARKING_CHANGE, PARKING_DATE],
      },
      {
        cursor: 4,
        publicEventKey: "event_ref_parking_hold_Q8v3mL6xK2pR",
        occurredAt: "2026-07-18T14:07:00.000Z",
        stage: "verify",
        status: "held",
        eventCode: "WORKFLOW_HELD",
        safeParams: { reasonCode: "CONTRADICTION", boundary: "verify" },
        sourceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        claimKeys: [PARKING_DATE],
      },
      {
        cursor: 5,
        publicEventKey: "event_ref_parking_complete_R5v9mQ3xK2pL",
        occurredAt: "2026-07-18T14:09:00.000Z",
        stage: "verify",
        status: "completed",
        eventCode: "WORKFLOW_COMPLETED",
        safeParams: { outcome: "held" },
        sourceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        claimKeys: [PARKING_CHANGE, PARKING_DATE],
      },
    ],
    sourceVersions: [
      {
        publicSourceVersionKey: "sourcever_ref_parking_packet_V7m2qL8xP4rT",
        sourceTitle: "City source domain · parking packet scenario",
        sourceUrl: "https://www.cityofnewbrunswick.org/",
        versionLabel: "Captured packet · reference v1",
        observedAt: "2026-07-18T14:01:00.000Z",
        state: "captured",
        contentHashPrefix: "2a4c6813f0d2",
      },
    ],
    dissentRecords: [
      {
        publicConflictKey: "conflict_ref_parking_date_M8q3vL2xR7pK",
        publicClaimKey: PARKING_DATE,
        outcome: "unresolved_material",
        basisLabel: "Equal-authority conflict",
        summary:
          "Two sections of the same captured official packet provide different effective dates. The resolver cannot select one by voting, so the material date remains held.",
        evidenceReceiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
        assessedAt: "2026-07-18T14:07:00.000Z",
      },
    ],
    revisions: [],
  });

export const newBrunswickReferenceRuns: ReferenceRun[] = z
  .array(referenceRunSchema)
  .parse([
    {
      scenarioKey: "draft-revision",
      label: "Overclaim caught and corrected",
      deck: "The first draft turns a limited access instruction into a full closure. The factual reviewer catches the stronger wording, the writer revises once, and the entire draft is checked again.",
      input: {
        origin: "official-source-packet",
        label: "Municipal utility notice packet",
        summary:
          "A city utility-work notice and its access instruction enter as two bounded evidence receipts before any article text exists.",
        receiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
      },
      detail: referencePublishReadyInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output:
            "One approved municipal source version was normalized and hashed; two bounded receipt excerpts were registered from it.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "Three material claims and their bounded evidence spans passed the strict extraction schema.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_verification",
          output:
            "Every extracted claim was covered exactly once; three claims were supported and no blocking contradiction remained.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_editorial",
          output:
            "The source-backed candidate passed locality, non-routine, and resident-relevance classification.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_draft",
          output:
            "Attempt one overstated the access impact. The bounded revision used the reviewer feedback to narrow that wording without adding a new claim.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_factual_review",
          output:
            "Review one returned an OVERSTATED issue; review two reran against the corrected draft and passed with zero blocking issues.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "pending",
          output:
            "The corrected draft is eligible for the application review boundary; reference mode does not assert live provider review records.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "pending",
          output:
            "The final gate waits for application-review records and enabled live controls; any later external publication still requires provider confirmation.",
        },
      ],
      story: {
        outcomeLabel: "Overclaim corrected",
        outcomeTone: "positive",
        hook: "One phrase changed the meaning. The reviewer caught it before any provider call.",
        metrics: [
          { label: "Issues caught", value: 1 },
          { label: "Bounded rewrites", value: 1 },
          { label: "Issues on recheck", value: 0 },
        ],
        pivotalMomentKey: "moment_reviewer_catch",
        moments: [
          {
            momentKey: "moment_source_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "The notice becomes a receipt",
            narrative:
              "The municipal notice is normalized into a versioned artifact. Reader-safe excerpts keep the location, work window, and access instruction inspectable.",
            eventKeys: ["event_ref_water_capture_J9v3mQ7xL2pR"],
            claimKeys: [],
            receiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
            visual: { kind: "receipt", receiptKey: WATER_ACCESS_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
          },
          {
            momentKey: "moment_claim_check",
            stage: "verify",
            actor: "Claim Verifier",
            status: "complete",
            headline: "Three claims earn evidence",
            narrative:
              "The verifier covers each extracted claim exactly once. All three are supported, so the desk can draft from a closed set of facts.",
            eventKeys: ["event_ref_water_verify_C7m2qL8xV4pR"],
            claimKeys: [WATER_LOCATION, WATER_TIMING, WATER_ACCESS],
            receiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 3,
              disputed: 0,
              missing: 0,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_verification",
              eventCode: "VERIFICATION_COMPLETED",
            },
          },
          {
            momentKey: "moment_writer_first",
            stage: "draft",
            actor: "Brief Writer · attempt 1",
            status: "complete",
            headline: "The first draft goes too far",
            narrative:
              "The draft changes a direction to follow posted access instructions into a claim that all access will be blocked.",
            eventKeys: ["event_ref_water_review_first_D5v9mQ3xK7pL"],
            claimKeys: [WATER_ACCESS],
            receiptKeys: [WATER_ACCESS_RECEIPT],
            visual: {
              kind: "draft-change",
              phase: "draft",
              before:
                "All property access will be blocked while crews are present.",
              flaggedText: "All property access will be blocked",
              issueCode: "OVERSTATED",
              after:
                "Affected properties should follow posted access directions while crews are present.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_draft",
              eventCode: "DRAFT_REVIEWED",
              recordLabel: "Linked outcome",
            },
          },
          {
            momentKey: "moment_reviewer_catch",
            stage: "review",
            actor: "Factual Reviewer · review 1",
            status: "caught",
            headline: "Reviewer catches the regression",
            narrative:
              "The exact draft is compared with the approved claims and excerpts. OVERSTATED is blocking, so the draft returns to the writer instead of moving downstream.",
            eventKeys: ["event_ref_water_review_first_D5v9mQ3xK7pL"],
            claimKeys: [WATER_ACCESS],
            receiptKeys: [WATER_ACCESS_RECEIPT],
            visual: {
              kind: "draft-change",
              phase: "caught",
              before:
                "All property access will be blocked while crews are present.",
              flaggedText: "All property access will be blocked",
              issueCode: "OVERSTATED",
              after:
                "Affected properties should follow posted access directions while crews are present.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_factual_review",
              eventCode: "DRAFT_REVIEWED",
            },
          },
          {
            momentKey: "moment_writer_revision",
            stage: "draft",
            actor: "Brief Writer · attempt 2",
            status: "revised",
            headline: "One bounded rewrite",
            narrative:
              "The writer receives the prior draft and typed review feedback. It removes the overclaim without inventing a substitute fact.",
            eventKeys: ["event_ref_water_review_second_N4q8mL2vR7pK"],
            claimKeys: [WATER_ACCESS],
            receiptKeys: [WATER_ACCESS_RECEIPT],
            visual: {
              kind: "draft-change",
              phase: "revised",
              before:
                "All property access will be blocked while crews are present.",
              flaggedText: "All property access will be blocked",
              issueCode: "OVERSTATED",
              after:
                "Affected properties should follow posted access directions while crews are present.",
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_revision_history",
              eventCode: "DRAFT_REVIEWED",
              recordLabel: "Linked outcome",
            },
          },
          {
            momentKey: "moment_reviewer_pass",
            stage: "review",
            actor: "Factual Reviewer · review 2",
            status: "ready",
            headline: "The full review runs again",
            narrative:
              "The corrected draft is reviewed as a new attempt. Zero blocking issues remain, so the desk reaches the application-review boundary.",
            eventKeys: ["event_ref_water_review_second_N4q8mL2vR7pK"],
            claimKeys: [WATER_LOCATION, WATER_TIMING, WATER_ACCESS],
            receiptKeys: [WATER_CITY_RECEIPT, WATER_ACCESS_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 3,
              disputed: 0,
              missing: 0,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_factual_review",
              eventCode: "DRAFT_REVIEWED",
            },
          },
        ],
      },
      output: {
        kind: "brief-candidate",
        headline:
          "Jersey Avenue water-main notice includes weekday access directions",
        summary:
          "In this reference scenario, a municipal utility packet places water-main work on Jersey Avenue during a defined weekday window and directs affected properties to follow posted access instructions while crews are present.",
        disposition: "ADK draft corrected · application review boundary next",
      },
    },
    {
      scenarioKey: "evidence-boundary",
      label: "Missing-evidence hold",
      deck: "One claim is supported and one material impact claim lacks direct evidence, so the bounded workflow stops before prose can make the unsupported assertion feel true.",
      input: {
        origin: "coverage-request-and-sources",
        label: "Impact claim plus city notice",
        summary:
          "A construction notice enters alongside a broader claim about bus and delivery disruption. The claim must earn its own receipt.",
        receiptKeys: [GEORGE_CITY_RECEIPT],
      },
      detail: referenceEvidenceBoundaryInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output:
            "One municipal source version was captured and registered as a versioned artifact.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "Two material claims were extracted; the location claim has evidence and the broader impact claim does not.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_verification",
          output:
            "Both claims were covered; one is supported and the impact claim is explicitly unsupported, producing a typed missing-evidence decision.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "blocked",
          output:
            "Not invoked because evidence completeness is a prerequisite.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "blocked",
          output:
            "Not invoked; no draft can convert an unsupported impact claim into publishable prose.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "blocked",
          output: "Not invoked because no draft was created.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "blocked",
          output:
            "Not invoked because no exact draft reached the application review boundary.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "blocked",
          output: "Missing material evidence blocks publication.",
        },
      ],
      story: {
        outcomeLabel: "Unsupported impact stopped",
        outcomeTone: "caution",
        hook: "The street location is real. The claimed bus and delivery disruption is not yet supported.",
        metrics: [
          { label: "Supported", value: 1 },
          { label: "Missing", value: 1 },
          { label: "Drafts created", value: 0 },
        ],
        pivotalMomentKey: "moment_missing_evidence",
        moments: [
          {
            momentKey: "moment_george_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "One city notice is captured",
            narrative:
              "The source identifies construction on George Street and is preserved as a versioned receipt.",
            eventKeys: ["event_ref_george_capture_J9v3mQ7xL2pR"],
            claimKeys: [],
            receiptKeys: [GEORGE_CITY_RECEIPT],
            visual: { kind: "receipt", receiptKey: GEORGE_CITY_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
          },
          {
            momentKey: "moment_george_extract",
            stage: "extract",
            actor: "Claim Extractor",
            status: "complete",
            headline: "Two claims are separated",
            narrative:
              "Location and resident impact become separate checkable claims, preventing a true location from lending credibility to an unsupported consequence.",
            eventKeys: ["event_ref_george_extract_F5n8qK2vM4rT"],
            claimKeys: [GEORGE_LOCATION, GEORGE_IMPACT],
            receiptKeys: [GEORGE_CITY_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 1,
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
            momentKey: "moment_missing_evidence",
            stage: "verify",
            actor: "Claim Verifier",
            status: "caught",
            headline: "The impact claim has no receipt",
            narrative:
              "No captured transit advisory or works notice supports bus or delivery disruption. The verifier stops the workflow before prose is generated.",
            eventKeys: [
              "event_ref_george_verify_B4m7qL9vN2pR",
              "event_ref_george_hold_Q8v3mL6xK2pR",
            ],
            claimKeys: [GEORGE_IMPACT],
            receiptKeys: [GEORGE_CITY_RECEIPT],
            visual: {
              kind: "claim-counts",
              supported: 1,
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
            momentKey: "moment_george_gate",
            stage: "publish",
            actor: "Workflow boundary",
            status: "held",
            headline: "No draft, no provider call",
            narrative:
              "Downstream agents are not invoked. The missing-evidence reason remains visible in the case file for a future source refresh.",
            eventKeys: ["event_ref_george_complete_R5v9mQ3xK2pL"],
            claimKeys: [GEORGE_LOCATION, GEORGE_IMPACT],
            receiptKeys: [GEORGE_CITY_RECEIPT],
            visual: {
              kind: "gate",
              label: "Held before drafting",
              detail:
                "The workflow terminates at verification while the unsupported material claim remains open.",
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
      scenarioKey: "contradiction",
      label: "Contradiction hold",
      deck: "Two sections of one captured source packet disagree on a material effective date. The contradiction remains visible and the item never reaches the writer.",
      input: {
        origin: "single-source-artifact",
        label: "One packet, two conflicting excerpts",
        summary:
          "Two date passages from the same municipal packet enter separately so the verifier cannot silently choose one.",
        receiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
      },
      detail: referenceContradictionInvestigation,
      agents: [
        {
          key: "capture",
          name: "Approved source capture",
          kind: "tool",
          status: "complete",
          output:
            "One approved source version was captured; two bounded excerpts preserve its conflicting date sections.",
        },
        {
          key: "extractor",
          name: "Claim Extractor",
          kind: "llm-agent",
          status: "complete",
          stateKey: "pw_extraction",
          output:
            "The proposed change and its claimed effective date were extracted as separate material claims.",
        },
        {
          key: "verifier",
          name: "Claim Verifier",
          kind: "llm-agent",
          status: "held",
          stateKey: "pw_verification",
          output:
            "The effective-date claim has both supporting and contradicting receipts; the contradiction is blocking.",
        },
        {
          key: "editor",
          name: "Editorial Classifier",
          kind: "llm-agent",
          status: "blocked",
          output: "The workflow terminates at the verification boundary.",
        },
        {
          key: "writer",
          name: "Brief Writer",
          kind: "llm-agent",
          status: "blocked",
          output:
            "Not invoked while a material contradiction remains unresolved.",
        },
        {
          key: "reviewer",
          name: "Factual Reviewer",
          kind: "llm-agent",
          status: "blocked",
          output: "Not invoked because no exact draft exists.",
        },
        {
          key: "external-review",
          name: "Mentor + Lapdog review",
          kind: "application-review",
          status: "blocked",
          output:
            "Not invoked because no exact draft reached the application review boundary.",
        },
        {
          key: "final-gate",
          name: "Deterministic final gate",
          kind: "deterministic-gate",
          status: "blocked",
          output: "Blocking contradiction prevents publication.",
        },
      ],
      story: {
        outcomeLabel: "Conflicting dates stopped",
        outcomeTone: "stopped",
        hook: "Two sections of the same packet disagree. The system preserves both instead of guessing.",
        metrics: [
          { label: "Supported", value: 1 },
          { label: "Disputed", value: 1 },
          { label: "Drafts created", value: 0 },
        ],
        pivotalMomentKey: "moment_date_conflict",
        moments: [
          {
            momentKey: "moment_parking_capture",
            stage: "capture",
            actor: "Source capture",
            status: "complete",
            headline: "Both sections stay visible",
            narrative:
              "Supporting and contradicting excerpts are captured from the same source version, so neither date silently replaces the other.",
            eventKeys: ["event_ref_parking_capture_J9v3mQ7xL2pR"],
            claimKeys: [],
            receiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
            visual: { kind: "receipt", receiptKey: PARKING_AGENDA_RECEIPT },
            system: {
              agentKind: "Approved fetch tool",
              eventCode: "SOURCE_CAPTURED",
            },
          },
          {
            momentKey: "moment_parking_extract",
            stage: "extract",
            actor: "Claim Extractor",
            status: "complete",
            headline: "The effective date becomes atomic",
            narrative:
              "The proposed rule change and the claimed effective date are split, allowing the disputed date to be held without obscuring the rest of the packet.",
            eventKeys: ["event_ref_parking_extract_F5n8qK2vM4rT"],
            claimKeys: [PARKING_CHANGE, PARKING_DATE],
            receiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
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
            momentKey: "moment_date_conflict",
            stage: "verify",
            actor: "Claim Verifier",
            status: "caught",
            headline: "The dates conflict",
            narrative:
              "One excerpt places the change on the first weekday; another lists a date one week later. The contradiction is material and blocking.",
            eventKeys: [
              "event_ref_parking_verify_B4m7qL9vN2pR",
              "event_ref_parking_hold_Q8v3mL6xK2pR",
            ],
            claimKeys: [PARKING_DATE],
            receiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
            visual: {
              kind: "evidence-conflict",
              supportReceiptKey: PARKING_AGENDA_RECEIPT,
              contradictionReceiptKey: PARKING_NOTICE_RECEIPT,
            },
            system: {
              agentKind: "Google ADK LlmAgent",
              stateKey: "pw_verification",
              eventCode: "WORKFLOW_HELD",
            },
          },
          {
            momentKey: "moment_parking_gate",
            stage: "publish",
            actor: "Workflow boundary",
            status: "held",
            headline: "The workflow refuses to average",
            narrative:
              "No confidence score smooths over the disagreement. Drafting and publication stay blocked until a source resolves the effective date.",
            eventKeys: ["event_ref_parking_complete_R5v9mQ3xK2pL"],
            claimKeys: [PARKING_CHANGE, PARKING_DATE],
            receiptKeys: [PARKING_AGENDA_RECEIPT, PARKING_NOTICE_RECEIPT],
            visual: {
              kind: "gate",
              label: "Held before drafting",
              detail:
                "A blocking contradiction terminates the run at the verification boundary.",
            },
            system: {
              agentKind: "Custom ADK BaseAgent",
              eventCode: "WORKFLOW_COMPLETED",
            },
          },
        ],
      },
    },
  ]);

export const referenceRuns: ReferenceRun[] = [
  ...newBrunswickReferenceRuns,
  ...nycReferenceRuns,
];

export const demoInvestigation = referenceEvidenceBoundaryInvestigation;

export const demoEdition = publicEditionViewSchema.parse({
  schemaVersion: "1",
  areaKey: "new-brunswick",
  areaDisplayName: "New Brunswick, NJ",
  generatedAt: "2026-07-18T14:09:00.000Z",
  freshnessState: "unknown",
  deskState: "demo",
  runtimeMode: "demo",
  metrics: {
    confirmedUpdates: 0,
    publicActiveInvestigations: newBrunswickReferenceRuns.length,
    sourceReceipts: newBrunswickReferenceRuns.reduce(
      (total, run) => total + run.detail.summary.sourceReceiptCount,
      0,
    ),
  },
  briefs: [],
  publicInvestigations: newBrunswickReferenceRuns.map(
    (run) => run.detail.summary,
  ),
  routineFilters: [
    { label: "Routine administrative minutes", reasonCode: "ROUTINE" },
    {
      label: "Repeated notice with no material change",
      reasonCode: "DUPLICATE",
    },
    {
      label: "Expired alert outside the freshness window",
      reasonCode: "STALE",
    },
  ],
  publicEvents: newBrunswickReferenceRuns
    .flatMap((run) => run.detail.events)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 8),
  degradedNotice: {
    code: "NO_LIVE_DATA",
    message:
      "This reference edition replays workflow scenarios through the production public contracts. Live publication state appears only from confirmed provider data.",
  },
});

export function getReferenceRun(publicCaseKey: string) {
  return referenceRuns.find(
    (run) => run.detail.summary.publicCaseKey === publicCaseKey,
  );
}

export function getDemoCase(publicCaseKey: string) {
  return getReferenceRun(publicCaseKey)?.detail;
}

export function getDemoEdition(areaKey: string) {
  return areaKey === demoEdition.areaKey
    ? demoEdition
    : areaKey === nycDemoEdition.areaKey
      ? nycDemoEdition
      : undefined;
}
