import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  localSources,
  seededChanges,
  type CivicBrief,
  type LocalChange,
  type LocalSource,
} from "./public-wire-data";
import {
  filterSeenHashes,
  logRecallFormRun,
  queryPriorEvents,
  recordChangeHashes,
} from "./clickhouse";
import { nimbleRunCivicScan } from "./sponsors/nimble-civic";
import type { SensoPublishResult } from "./sponsors/senso-civic";
import { googleEditorialDecision } from "./sponsors/google-editor";
import { runLapdogReliabilityReview } from "./sponsors/lapdog-review";
import { runWriterAgent } from "./sponsors/writer-agent";
import { runMentorReview } from "./sponsors/mentor-agent";
import { traceStep } from "./datadog-trace";

type ScanEvent = {
  step: number;
  occurredAt: string;
  code: string;
  title: string;
  detail: string;
  source: string;
  risk: "low" | "medium" | "high";
  status: "done" | "warn" | "failed";
};

const defaultDependencies = {
  scan: nimbleRunCivicScan,
  queryPriorEvents,
  filterSeenHashes,
  editorialDecision: googleEditorialDecision,
  writer: runWriterAgent,
  mentor: runMentorReview,
  reliability: runLapdogReliabilityReview,
  recordChangeHashes,
  logRun: logRecallFormRun,
};

export type PublicWireScanDependencies = typeof defaultDependencies;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function titleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function changeHash(area: string, title: string) {
  return createHash("sha256")
    .update(`${area.toLowerCase().trim()}\0${title.toLowerCase().trim()}`)
    .digest("hex");
}

function sourcePacketForChange(
  change: LocalChange | undefined,
  sources: LocalSource[],
): CivicBrief["sources"] {
  if (!change) return [];
  return sources
    .filter((source) => source.id === change.sourceId)
    .map((source) => ({
      title: source.name,
      url: source.url,
      role: `Captured as source context for "${change.title}".`,
    }));
}

function buildBrief(params: {
  area: string;
  change?: LocalChange;
  sources: LocalSource[];
  prose?: string;
  events: ScanEvent[];
}): CivicBrief {
  const { area, change, sources, prose, events } = params;
  if (!change) {
    return {
      id: `held_${slugify(area)}_${Date.now()}`,
      headline: `No civic update cleared review for ${area}`,
      area,
      category: "Desk update",
      confidence: "low",
      status: "active",
      summary:
        "The desk completed a check, but no candidate passed every required editorial and reliability review.",
      whyItMatters:
        "Failing closed prevents routine, unsupported, or unavailable reviews from becoming published claims.",
      whoIsAffected: ["Residents"],
      sources: [],
      agentTrace: events.map((event) => `${event.title}: ${event.detail}`),
    };
  }
  return {
    id: `brief_${slugify(area)}_${slugify(change.title)}`,
    headline: change.title,
    area,
    category: titleCase(change.category),
    confidence: "high",
    status: ["transportation", "construction", "event"].includes(
      change.category,
    )
      ? "upcoming"
      : "active",
    summary: prose || change.whatChanged,
    whyItMatters: change.whyItMatters,
    whoIsAffected: change.whoIsAffected,
    sources: sourcePacketForChange(change, sources),
    agentTrace: events.map((event) => `${event.title}: ${event.detail}`),
  };
}

function blockedPublication(reason: string): SensoPublishResult {
  return {
    provider: "Senso",
    mode: "blocked",
    state: "blocked",
    purpose: reason,
    errorCode: "FINAL_GATE_BLOCKED",
  };
}

export async function runPublicWireScan(
  params?: {
    area?: string;
    slug?: string;
    focus?: string[];
    requestedTopic?: string;
    signal?: AbortSignal;
  },
  dependencies: PublicWireScanDependencies = defaultDependencies,
) {
  const sessionId = `scan_${randomUUID()}`;
  const area = params?.area || "New Brunswick, NJ";
  const slug = params?.slug || "new-brunswick";
  const requestedTopic = params?.requestedTopic?.trim();
  const events: ScanEvent[] = [];
  const addEvent = (event: Omit<ScanEvent, "step" | "occurredAt">) => {
    events.push({
      ...event,
      step: events.length + 1,
      occurredAt: new Date().toISOString(),
    });
  };

  const nimble = await traceStep(
    "nimble.civic_scan",
    { area, slug, sponsor: "nimble" },
    () =>
      dependencies.scan({
        area,
        requestedTopic,
        fallbackSources: localSources,
        fallbackChanges: seededChanges,
      }),
  );
  const sources = nimble.sources;
  const changes = nimble.changes;
  let candidates = changes.filter((change) => change.status !== "rejected");
  let rejected = changes.filter((change) => change.status === "rejected");

  addEvent({
    code: "SOURCE_CAPTURED",
    title: "Source discovery completed",
    detail: `${sources.length} source record${sources.length === 1 ? "" : "s"} returned in ${nimble.mode} mode.`,
    source: "Nimble",
    risk: "low",
    status: nimble.mode === "real-api" ? "done" : "warn",
  });

  const priorContext = await dependencies.queryPriorEvents(area);
  addEvent({
    code: "PRIOR_CONTEXT_CHECKED",
    title: "Prior coverage checked",
    detail:
      priorContext.count > 0
        ? `${priorContext.count} prior event record${priorContext.count === 1 ? "" : "s"} found.`
        : "No prior event records found.",
    source: "ClickHouse",
    risk: "low",
    status: "done",
  });

  const hashes = new Map(
    candidates.map((candidate) => [
      candidate.id,
      changeHash(area, candidate.title),
    ]),
  );
  const seen = await dependencies.filterSeenHashes([...hashes.values()]);
  const duplicates = candidates
    .filter((candidate) => seen.has(hashes.get(candidate.id)!))
    .map((candidate) => ({
      ...candidate,
      status: "rejected" as const,
      rejectionReason:
        "Duplicate: an equivalent headline was recently confirmed.",
    }));
  candidates = candidates.filter(
    (candidate) => !seen.has(hashes.get(candidate.id)!),
  );
  rejected = [...rejected, ...duplicates];

  const candidate = candidates[0];
  const unreviewedTail = candidates.slice(1).map((item) => ({
    ...item,
    status: "rejected" as const,
    rejectionReason:
      "Not selected for this single-candidate legacy invocation; no publication decision was made.",
  }));
  rejected = [...rejected, ...unreviewedTail];
  candidates = candidate ? [candidate] : [];
  addEvent({
    code: "CANDIDATE_SELECTED",
    title: "Candidate selection completed",
    detail: candidate
      ? "One candidate advanced to an independent review; all others were explicitly excluded."
      : "No candidate advanced to review.",
    source: "PublicWire",
    risk: "low",
    status: candidate ? "done" : "warn",
  });

  let editorial = await dependencies.editorialDecision({
    area,
    change: candidate,
    signal: params?.signal,
  });
  addEvent({
    code:
      editorial.reviewOutcome === "pass"
        ? "EDITORIAL_PASSED"
        : "EDITORIAL_HELD",
    title: "Editorial classification completed",
    detail: editorial.decision.reason,
    source: "Google Gemini",
    risk: "medium",
    status: editorial.reviewOutcome === "pass" ? "done" : "warn",
  });

  let resolvedChange: LocalChange | undefined =
    editorial.reviewOutcome === "pass" && editorial.decision.publishable
      ? candidate
      : undefined;
  let verifierResend: null | {
    triggered: boolean;
    result: "corroborated" | "still-unsupported" | "no-new-evidence";
    editorial: typeof editorial;
  } = null;

  if (
    !resolvedChange &&
    candidate &&
    editorial.decision.classification === "unsupported" &&
    nimble.mode === "real-api"
  ) {
    const rescan = await dependencies.scan({
      area,
      requestedTopic: candidate.title,
      fallbackSources: [],
      fallbackChanges: [],
    });
    const verifierChange =
      rescan.mode === "real-api" ? rescan.changes[0] : undefined;
    if (verifierChange) {
      const verifierEditorial = await dependencies.editorialDecision({
        area,
        change: verifierChange,
        signal: params?.signal,
      });
      const corroborated =
        verifierEditorial.reviewOutcome === "pass" &&
        verifierEditorial.decision.publishable;
      verifierResend = {
        triggered: true,
        result: corroborated ? "corroborated" : "still-unsupported",
        editorial: verifierEditorial,
      };
      if (corroborated) {
        resolvedChange = verifierChange;
        editorial = verifierEditorial;
      }
    } else {
      verifierResend = {
        triggered: true,
        result: "no-new-evidence",
        editorial,
      };
    }
    addEvent({
      code: "EVIDENCE_REPAIR_COMPLETED",
      title: "Bounded evidence repair completed",
      detail:
        verifierResend?.result === "corroborated"
          ? "New evidence passed review."
          : "No publishable new evidence was established.",
      source: "PublicWire",
      risk: "medium",
      status: resolvedChange ? "done" : "warn",
    });
  }

  const writerResult = resolvedChange
    ? await dependencies.writer({
        change: resolvedChange,
        sources,
        area,
        signal: params?.signal,
      })
    : null;
  if (writerResult) {
    addEvent({
      code: writerResult.outcome === "pass" ? "DRAFT_CREATED" : "DRAFT_FAILED",
      title: "Drafting completed",
      detail:
        writerResult.outcome === "pass"
          ? "A bounded resident-facing draft was created."
          : "Drafting did not return an explicit pass.",
      source: "Google Gemini",
      risk: "medium",
      status: writerResult.outcome === "pass" ? "done" : "warn",
    });
  }

  const mentorResult =
    resolvedChange && writerResult?.outcome === "pass" && writerResult.prose
      ? await dependencies.mentor({
          prose: writerResult.prose,
          headline: resolvedChange.title,
          area,
          signal: params?.signal,
        })
      : null;
  if (mentorResult) {
    addEvent({
      code: mentorResult.outcome === "pass" ? "DRAFT_REVIEWED" : "DRAFT_HELD",
      title: "Draft review completed",
      detail: mentorResult.notes,
      source: "Google Gemini",
      risk: "medium",
      status: mentorResult.outcome === "pass" ? "done" : "warn",
    });
  }

  const brief = buildBrief({
    area,
    change: resolvedChange,
    sources,
    prose: mentorResult?.outcome === "pass" ? writerResult?.prose : undefined,
    events,
  });
  const rawSourceText =
    nimble.mode === "real-api" && nimble.raw
      ? JSON.stringify(nimble.raw).slice(0, 8_000)
      : undefined;
  const lapdogReview = await dependencies.reliability({
    headline: brief.headline,
    summary: brief.summary,
    sources: brief.sources,
    agentTrace: brief.agentTrace,
    geminiDecision: editorial.decision,
    events,
    rawSourceText,
    signal: params?.signal,
  });
  addEvent({
    code:
      lapdogReview.outcome === "pass"
        ? "RELIABILITY_PASSED"
        : "RELIABILITY_HELD",
    title: "Reliability review completed",
    detail: lapdogReview.verdict,
    source: "Datadog Lapdog",
    risk: "high",
    status: lapdogReview.outcome === "pass" ? "done" : "warn",
  });

  const finalGatePassed = Boolean(
    resolvedChange &&
      nimble.mode === "real-api" &&
      editorial.mode === "real-api" &&
      editorial.reviewOutcome === "pass" &&
      writerResult?.mode === "real-api" &&
      writerResult.outcome === "pass" &&
      mentorResult?.mode === "real-api" &&
      mentorResult.outcome === "pass" &&
      lapdogReview.outcome === "pass" &&
      lapdogReview.passed &&
      brief.sources.length > 0 &&
      rawSourceText,
  );

  const publishing = blockedPublication(
    finalGatePassed
      ? "Legacy orchestration is read/hold-only until it uses the persisted evidence gate and publication saga."
      : "The deterministic final gate did not pass; no publication request was made.",
  );
  addEvent({
    code:
      publishing.state === "confirmed"
        ? "PUBLICATION_CONFIRMED"
        : "PUBLICATION_BLOCKED",
    title:
      publishing.state === "confirmed"
        ? "Publication confirmed"
        : "Publication not confirmed",
    detail: publishing.purpose,
    source: "Senso",
    risk: "high",
    status: publishing.state === "confirmed" ? "done" : "warn",
  });

  const published =
    publishing.state === "confirmed" && resolvedChange ? [resolvedChange] : [];
  if (publishing.state === "confirmed" && resolvedChange) {
    await dependencies.recordChangeHashes({
      sessionId,
      area,
      hashes: [
        {
          hash: changeHash(area, resolvedChange.title),
          headline: resolvedChange.title,
        },
      ],
    });
  }

  const metrics = {
    sourcesChecked: sources.length,
    changesDetected: changes.length,
    publicationAttempts: 0,
    briefsPublished: publishing.state === "confirmed" ? 1 : 0,
    publicationUnknown: publishing.state === "unknown" ? 1 : 0,
    publicationFailed: publishing.state === "failed" ? 1 : 0,
    rejectedItems: rejected.length,
    duplicatesFiltered: duplicates.length,
    officialSources: sources.filter(
      (source) => source.sourceType === "official",
    ).length,
    confidenceScore: lapdogReview.score,
  };
  const clickhouse = await dependencies.logRun({
    sessionId,
    area,
    events,
    metrics,
  });

  return {
    sessionId,
    area,
    runtimeMode:
      nimble.mode === "real-api"
        ? finalGatePassed
          ? "real"
          : "degraded"
        : "demo",
    lastChecked: new Date().toISOString(),
    sources,
    changes,
    published,
    rejected,
    brief,
    events,
    metrics,
    clickhouse,
    publishing,
    googleEditorial: editorial,
    verifierResend,
    writerAgent: writerResult,
    mentorReview: mentorResult,
    lapdogReview,
    sponsorStack: {
      nimble: { provider: "Nimble", role: nimble.mode },
      clickhouse: {
        provider: "ClickHouse",
        role: "prior-context and audit ledger",
      },
      senso: { provider: "Senso / cited.md", role: publishing.state },
      googleAgentCli: { provider: "Google Gemini", role: editorial.mode },
    },
  };
}
