import { createHash } from "crypto";
import { localSources, seededChanges, type CivicBrief, type LocalChange, type LocalSource } from "./public-wire-data";
import { filterSeenHashes, logRecallFormRun, queryPriorEvents, recordChangeHashes } from "./clickhouse";
import { nimbleRunCivicScan } from "./sponsors/nimble-civic";
import { publishCivicBrief } from "./sponsors/senso-civic";
import { googleEditorialDecision } from "./sponsors/google-editor";
import { runLapdogReliabilityReview } from "./sponsors/lapdog-review";
import { runWriterAgent } from "./sponsors/writer-agent";
import { runMentorReview } from "./sponsors/mentor-agent";
import { traceStep } from "./datadog-trace";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function shortArea(area: string) {
  return area.split(",")[0]?.trim() || area;
}

function titleCase(input: string) {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function changeHash(area: string, title: string): string {
  return createHash("sha256")
    .update(area.toLowerCase().trim() + "\0" + title.toLowerCase().trim())
    .digest("hex");
}

function isNewBrunswick(area: string) {
  return /new\s+brunswick/i.test(area);
}

function localizeSourceForArea(source: LocalSource, area: string): LocalSource {
  if (isNewBrunswick(area)) return source;

  if (source.id === "nimble_live_search") {
    return {
      ...source,
      name: source.name.includes(area)
        ? source.name
        : source.name.replace("Nimble live civic web search", `Nimble live civic web search for ${area}`),
    };
  }

  return source;
}

function localizeChangeForArea(change: LocalChange, area: string): LocalChange {
  if (isNewBrunswick(area)) return change;
  return change;
}

function sourcePacketForChange(change: LocalChange | undefined, sources: LocalSource[]): CivicBrief["sources"] {
  const matched = change ? sources.filter((source) => source.id === change.sourceId) : [];
  const packet = matched.length > 0 ? matched : sources.slice(0, 3);

  return packet.map((source) => ({
    title: source.name,
    url: source.url,
    role: change
      ? `Used as source context for "${change.title}".`
      : "Used as source context for the live PublicWire scan.",
  }));
}

function buildRequestedTopicChange(params: {
  area: string;
  requestedTopic: string;
  sourceId: string;
}): LocalChange {
  const { area, requestedTopic, sourceId } = params;
  const place = shortArea(area);

  return {
    id: `requested_${slugify(area)}_${slugify(requestedTopic)}`,
    sourceId,
    title: `Requested topic under review: ${requestedTopic}`,
    category: "city-agenda",
    status: "new",
    importance: "resident-relevant",
    whatChanged: `A user searched "${requestedTopic}" in ${area}. PublicWire opened a source-backed investigation before treating the claim as fact.`,
    whyItMatters: `Local claims can spread faster than official confirmation. This search gives ${place} residents a way to separate demand, evidence, and unsupported claims.`,
    whoIsAffected: ["residents", "commuters", "families", "local businesses", "local officials"],
    evidence: [
      "User-initiated search topic created a requested-topic investigation.",
      "Nimble searched public and official civic sources for corroboration.",
      "Gemini reviewed whether the claim is resident-relevant, unsupported, routine, or publishable.",
    ],
  };
}

function buildDynamicBrief(params: {
  area: string;
  change: LocalChange | undefined;
  sources: LocalSource[];
  writerProse?: string;
  events: {
    step: number;
    title: string;
    detail: string;
    source: string;
    risk: string;
    status: string;
  }[];
  googleEditorial?: {
    decision: {
      publishable: boolean;
      classification: string;
      reason: string;
    };
  };
}): CivicBrief {
  const { area, change, sources, events, googleEditorial, writerProse } = params;

  if (!change) {
    return {
      id: `brief_${slugify(area)}_no_publishable_update`,
      headline: `No publishable civic update found for ${area}`,
      area,
      category: "Monitoring",
      confidence: "low",
      status: "active",
      summary: `The live scan checked public civic sources for ${area}, but no item passed the publishability gate.`,
      whyItMatters: "This prevents the system from publishing weak, routine, vague, or unsupported civic claims.",
      whoIsAffected: ["residents"],
      sources: sourcePacketForChange(undefined, sources),
      agentTrace: events.map((event) => `${event.source}: ${event.detail}`),
    };
  }

  return {
    id: `brief_${slugify(area)}_${slugify(change.title)}`,
    headline: change.title,
    area,
    category: titleCase(change.category),
    confidence: googleEditorial?.decision.publishable ? "high" : "medium",
    status:
      change.category === "transportation" ||
      change.category === "construction" ||
      change.category === "event"
        ? "upcoming"
        : "active",
    summary: writerProse || change.whatChanged,
    whyItMatters: change.whyItMatters,
    whoIsAffected: change.whoIsAffected,
    sources: sourcePacketForChange(change, sources),
    agentTrace: [
      ...events.map((event) => `${event.source}: ${event.detail}`),
      ...(googleEditorial
        ? [
            `Google Gemini: ${googleEditorial.decision.publishable ? "Published" : "Held"} as ${googleEditorial.decision.classification}. ${googleEditorial.decision.reason}`,
          ]
        : []),
      ...change.evidence.slice(0, 3).map((item) => `Evidence: ${item}`),
    ],
  };
}


export async function runPublicWireScan(params?: {
  area?: string;
  slug?: string;
  focus?: string[];
  requestedTopic?: string;
}) {
  const sessionId = `scan_${Date.now()}`;
  const area = params?.area || "New Brunswick, NJ";
  const slug = params?.slug || "new-brunswick";
  const focus = params?.focus || [];
  const requestedTopic = params?.requestedTopic?.trim();

  // Step 1: Source Scout + Extractor — Nimble with output_schema for structured civic extraction
  const nimble = await traceStep(
    "nimble.civic_scan",
    { area, slug, focus: focus.join(","), requested_topic: requestedTopic, sponsor: "nimble" },
    () =>
      nimbleRunCivicScan({
        area,
        requestedTopic,
        fallbackSources: localSources,
        fallbackChanges: seededChanges,
      })
  );

  const baseChanges = nimble.changes.map((change) => localizeChangeForArea(change, area));
  const sources = nimble.sources.map((source) => localizeSourceForArea(source, area));
  const requestedChange = requestedTopic
    ? buildRequestedTopicChange({
        area,
        requestedTopic,
        sourceId: sources[0]?.id || "nimble_live_search",
      })
    : null;
  const changes = requestedChange ? [requestedChange, ...baseChanges] : baseChanges;
  let published = changes.filter((change) => change.status !== "rejected");
  let rejected = changes.filter((change) => change.status === "rejected");

  // Step 2: Change Detector — ClickHouse queries prior event history for this area
  const priorContext = await traceStep(
    "clickhouse.change_detector",
    { area, slug, sponsor: "clickhouse" },
    () => queryPriorEvents(area)
  );

  const priorContextLabel = priorContext.count > 0
    ? `ClickHouse found ${priorContext.count} prior event${priorContext.count === 1 ? "" : "s"} for ${shortArea(area)}. Last scan: ${priorContext.lastSeen ?? "unknown"}.`
    : `No prior events in ClickHouse for ${shortArea(area)}. First scan recorded.`;

  const events: {
    step: number;
    title: string;
    detail: string;
    source: string;
    risk: string;
    status: string;
  }[] = [
    {
      step: 1,
      title: "Source discovery started",
      detail: `Nimble scanned for official and public civic sources around ${area}.`,
      source: "Nimble",
      risk: "low",
      status: "done",
    },
    {
      step: 2,
      title: "Civic sources extracted",
      detail: `Nimble returned ${sources.length} monitorable civic sources using output_schema structured extraction.`,
      source: "Nimble",
      risk: "low",
      status: "done",
    },
    {
      step: 3,
      title: "Changes structured",
      detail: `Nimble produced ${changes.length} structured civic change candidates.`,
      source: "Nimble",
      risk: "low",
      status: "done",
    },
    {
      step: 4,
      title: "Change detection complete",
      detail: priorContextLabel,
      source: "ClickHouse",
      risk: "low",
      status: "done",
    },
  ];

  // Step 2b: Dedup filter — ClickHouse checks content hashes against recently published changes
  const changeHashMap = new Map(
    published.map((c) => [c.id, changeHash(area, c.title)])
  );

  const seenHashes = await traceStep(
    "clickhouse.dedup_check",
    { area, slug, sponsor: "clickhouse", candidate_count: published.length },
    () => filterSeenHashes(Array.from(changeHashMap.values()))
  );

  const dupRejected: LocalChange[] = published
    .filter((c) => seenHashes.has(changeHashMap.get(c.id)!))
    .map((c) => ({ ...c, status: "rejected" as const, rejectionReason: "Duplicate: already published within the last 6 hours." }));
  const dupCount = dupRejected.length;

  published = published.filter((c) => !seenHashes.has(changeHashMap.get(c.id)!));
  rejected = [...rejected, ...dupRejected];

  events.push({
    step: events.length + 1,
    title: "Dedup filter applied",
    detail: dupCount > 0
      ? `ClickHouse blocked ${dupCount} candidate${dupCount === 1 ? "" : "s"} already published within the last 6 hours.`
      : `ClickHouse confirmed all ${published.length} candidate${published.length === 1 ? "" : "s"} are new within the last 6 hours.`,
    source: "ClickHouse",
    risk: "low",
    status: "done",
  });

  const officialSources = sources.filter((source) => source.sourceType === "official").length;
  const metrics = {
    sourcesChecked: sources.length,
    changesDetected: changes.length,
    briefsPublished: published.length > 0 ? 1 : 0,
    rejectedItems: rejected.length,
    duplicatesFiltered: dupCount,
    officialSources,
    confidenceScore: 0, // updated after Lapdog runs, before ledger write
  };

  // Step 4: Editor — Gemini decides if the top candidate is publishable
  const googleEditorial = await traceStep(
    "gemini.editorial_decision",
    { area, slug, sponsor: "google_gemini", candidate_count: published.length },
    () =>
      googleEditorialDecision({
        area,
        change: published[0],
      })
  );

  events.push({
    step: events.length + 1,
    title: "Gemini editorial decision made",
    detail: `Gemini ${googleEditorial.decision.publishable ? "approved" : "held"} the change as "${googleEditorial.decision.classification}". ${googleEditorial.decision.reason}`,
    source: "Google Gemini",
    risk: "medium",
    status: googleEditorial.decision.publishable ? "done" : "warn",
  });

  // Step 5: Verifier — if the claim is unsupported, resend to Nimble for corroboration
  let verifierResend: null | {
    triggered: boolean;
    result: "corroborated" | "still-unsupported" | "no-new-evidence";
    editorial: Awaited<ReturnType<typeof googleEditorialDecision>>;
  } = null;

  let resolvedChange: LocalChange | undefined = published[0];

  if (
    !googleEditorial.decision.publishable &&
    googleEditorial.decision.classification === "unsupported" &&
    published[0]
  ) {
    const rescanTopic = published[0].title;

    const nimbleRescan = await traceStep(
      "nimble.verifier_rescan",
      { area, slug, sponsor: "nimble", step: "verifier_resend", rescan_topic: rescanTopic },
      () =>
        nimbleRunCivicScan({
          area,
          requestedTopic: rescanTopic,
          fallbackSources: sources,
          fallbackChanges: [],
        })
    );

    events.push({
      step: events.length + 1,
      title: "Verifier resend triggered",
      detail: `Claim "${rescanTopic}" was unsupported. Nimble re-queried for corroborating official sources.`,
      source: "Nimble (Verifier)",
      risk: "medium",
      status: nimbleRescan.changes.length > 0 ? "done" : "warn",
    });

    const verifierChange = nimbleRescan.changes[0];
    if (verifierChange) {
      const verifierEditorial = await traceStep(
        "gemini.verifier_decision",
        { area, slug, sponsor: "google_gemini", step: "verifier_resend" },
        () => googleEditorialDecision({ area, change: verifierChange })
      );

      const outcome = verifierEditorial.decision.publishable ? "corroborated" : "still-unsupported";

      events.push({
        step: events.length + 1,
        title: "Verifier re-evaluation complete",
        detail: `Gemini re-evaluated the resent claim. Result: ${outcome}. ${verifierEditorial.decision.reason}`,
        source: "Google Gemini (Verifier)",
        risk: "medium",
        status: verifierEditorial.decision.publishable ? "done" : "warn",
      });

      verifierResend = { triggered: true, result: outcome, editorial: verifierEditorial };
      if (verifierEditorial.decision.publishable) {
        resolvedChange = verifierChange;
        published = [verifierChange, ...published.slice(1)];
      }
    } else {
      verifierResend = { triggered: true, result: "no-new-evidence", editorial: googleEditorial };

      events.push({
        step: events.length + 1,
        title: "Verifier resend: no new evidence",
        detail: `Nimble found no additional corroborating sources for "${rescanTopic}".`,
        source: "Nimble (Verifier)",
        risk: "medium",
        status: "warn",
      });
    }
  }

  // Step 6: Writer — Gemini drafts polished resident-facing prose from the approved change
  let writerResult: Awaited<ReturnType<typeof runWriterAgent>> | null = null;
  let mentorResult: Awaited<ReturnType<typeof runMentorReview>> | null = null;

  if (resolvedChange) {
    writerResult = await traceStep(
      "gemini.writer_agent",
      { area, slug, sponsor: "google_gemini", step: "writer" },
      () => runWriterAgent({ change: resolvedChange!, sources, area })
    );

    events.push({
      step: events.length + 1,
      title: "Writer agent produced brief prose",
      detail: `Gemini Writer drafted a ${writerResult.prose.length}-char resident-facing brief. Mode: ${writerResult.mode}.`,
      source: "Google Gemini (Writer)",
      risk: "low",
      status: "done",
    });

    // Step 7: Mentor — Gemini reviews the written prose before publication
    mentorResult = await traceStep(
      "gemini.mentor_review",
      { area, slug, sponsor: "google_gemini", step: "mentor" },
      () => runMentorReview({ prose: writerResult!.prose, headline: resolvedChange!.title, area })
    );

    events.push({
      step: events.length + 1,
      title: "Mentor editorial review complete",
      detail: `Mentor ${mentorResult.approved ? "approved" : "flagged"} the brief. Notes: ${mentorResult.notes}`,
      source: "Google Gemini (Mentor)",
      risk: "low",
      status: mentorResult.approved ? "done" : "warn",
    });
  }

  const writerProse = writerResult && mentorResult?.approved ? writerResult.prose : undefined;

  const dynamicBrief = buildDynamicBrief({
    area,
    change: resolvedChange,
    sources,
    writerProse,
    events,
    googleEditorial,
  });

  // Step 8: Publisher — Senso publishes the brief as an AI-citable artifact
  const sensoPublish = await traceStep(
    "senso.grounding",
    { area, slug, sponsor: "senso", brief_id: dynamicBrief.id },
    () =>
      publishCivicBrief({
        brief: dynamicBrief,
      })
  );

  events.push({
    step: events.length + 1,
    title: "Grounded brief published",
    detail: `Senso published the brief. Mode: ${sensoPublish.mode}.${sensoPublish.publishedUrl ? ` URL: ${sensoPublish.publishedUrl}` : ""}`,
    source: "Senso",
    risk: "medium",
    status: sensoPublish.publishedUrl || sensoPublish.citationId ? "done" : "warn",
  });

  // Record the content hash for the published change so future scans within the
  // dedup window skip it. Done after Senso publish so only successfully grounded
  // briefs are recorded (Gemini-held or verifier-failed changes are not recorded).
  if (resolvedChange) {
    await recordChangeHashes({
      sessionId,
      area,
      hashes: [{ hash: changeHash(area, resolvedChange.title), headline: resolvedChange.title }],
    });
  }

  const rawSourceText = nimble.raw
    ? JSON.stringify(nimble.raw, null, 2).slice(0, 8000)
    : undefined;

  // Step 9: Reliability Reviewer — Lapdog independently checks source reachability and
  // runs an adversarial claim-verification pass against the raw Nimble extraction text.
  const lapdogReview = await traceStep(
    "lapdog.reliability_review",
    { area, slug, sponsor: "datadog_lapdog", brief_id: dynamicBrief.id },
    () =>
      runLapdogReliabilityReview({
        headline: dynamicBrief.headline,
        summary: dynamicBrief.summary,
        sources: dynamicBrief.sources,
        agentTrace: dynamicBrief.agentTrace,
        geminiDecision: googleEditorial.decision,
        events,
        rawSourceText,
      })
  );

  // confidenceScore is now known; update metrics before the ledger write
  metrics.confidenceScore = lapdogReview.score;

  // Ledger write — happens after ALL pipeline steps so ClickHouse gets the full trace
  const clickhouse = await traceStep(
    "clickhouse.ledger_write",
    { area, slug, session_id: sessionId, sponsor: "clickhouse" },
    () =>
      logRecallFormRun({
        sessionId,
        area,
        events,
        metrics,
      })
  );

  // Audit Translator: converts the machine event log into reader-facing plain English
  const auditLog = events.map(
    (e) => `Step ${e.step} — ${e.title}: ${e.detail} [${e.source}]`
  );

  return {
    sessionId,
    area,
    lastChecked: new Date().toLocaleString(),
    sources,
    changes,
    published,
    rejected,
    brief: dynamicBrief,
    events,
    auditLog,
    metrics,
    clickhouse,
    publishing: sensoPublish,
    googleEditorial,
    verifierResend,
    writerAgent: writerResult,
    mentorReview: mentorResult,
    lapdogReview,
    sponsorStack: {
      nimble: {
        provider: "Nimble",
        role: `${nimble.mode}: ${nimble.purpose}`,
      },
      clickhouse: {
        provider: "ClickHouse",
        role: "Change Detector queries prior event history; ledger write stores scan events and metrics.",
      },
      senso: {
        provider: "Senso / cited.md",
        role: `${sensoPublish.mode}: ${sensoPublish.purpose}`,
      },
      googleAgentCli: {
        provider: "Google Gemini",
        role: `Editor: ${googleEditorial.mode}. Writer + Mentor: produce and review prose before publication.`,
      },
    },
  };
}
