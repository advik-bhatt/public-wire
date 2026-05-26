import type {
  AgentEvent,
  CivicBrief,
  CivicSource,
  PublicWireEdition,
  RejectedItem,
} from "@/content/public-wire-content";

type ScanSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  sourceType: "official" | "public";
};

type ScanChange = {
  id: string;
  sourceId: string;
  title: string;
  category: string;
  status: "new" | "updated" | "rejected";
  importance: string;
  whatChanged: string;
  whyItMatters: string;
  whoIsAffected: string[];
  evidence: string[];
  rejectionReason?: string;
};

type ScanEvent = {
  step: number;
  title: string;
  detail: string;
  source: string;
  risk: string;
  status: string;
};

type ScanResult = {
  sessionId: string;
  area: string;
  lastChecked: string;
  sources: ScanSource[];
  changes: ScanChange[];
  published: ScanChange[];
  rejected: ScanChange[];
  brief: {
    id: string;
    headline: string;
    area: string;
    category: string;
    confidence: "high" | "medium" | "low";
    status: "active" | "upcoming" | "updated" | "resolved";
    summary: string;
    whyItMatters: string;
    whoIsAffected: string[];
    sources: {
      title: string;
      url: string;
      role: string;
    }[];
    agentTrace: string[];
  };
  events: ScanEvent[];
  metrics: {
    sourcesChecked: number;
    changesDetected: number;
    briefsPublished: number;
    rejectedItems: number;
    officialSources: number;
    confidenceScore: number;
  };
  publishing?: {
    provider: string;
    mode: string;
    purpose: string;
    publishedUrl?: string;
    citationId?: string;
  };
  googleEditorial?: {
    provider: string;
    mode: string;
    purpose: string;
    decision: {
      publishable: boolean;
      classification: string;
      reason: string;
    };
  };
  lapdogReview?: {
    provider: string;
    mode: string;
    passed: boolean;
    score: number;
    verdict: string;
    checks: {
      name: string;
      status: string;
      comment: string;
    }[];
    traceSummary: string[];
    sourceReachability?: { url: string; reachable: boolean; status: number }[];
    adversarialReview?: {
      overallVerdict: string;
      unsupportedCount: number;
      claims: { claim: string; supported: boolean; sourceEvidence: string | null; verdict: string }[];
    };
  };
};

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

function normalizeBriefStatus(status: ScanResult["brief"]["status"]): CivicBrief["status"] {
  if (status === "active" || status === "upcoming") return status;
  return "monitoring";
}

function mapSource(source: ScanSource): CivicSource {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    category: titleCase(source.category),
    level: source.sourceType === "official" ? "Official source" : "Public source",
    status: "reachable",
    sourceType: source.sourceType,
  };
}

function mapRejected(change: ScanChange): RejectedItem {
  return {
    title: change.title,
    source: change.sourceId,
    reason:
      change.rejectionReason ||
      change.whyItMatters ||
      "Rejected because the item did not pass the resident-impact or source-support gate.",
  };
}

function publicAgentName(source: string) {
  if (source === "Nimble") return "Source Scout";
  if (source === "ClickHouse") return "Change Ledger";
  if (source === "Google Gemini") return "Editorial Agent";
  if (source === "Senso") return "Grounding Agent";
  if (source === "Datadog Lapdog") return "Reliability Reviewer";
  return source;
}

function publicAgentTool(source: string) {
  if (source === "Nimble") return "Nimble civic source discovery";
  if (source === "ClickHouse") return "ClickHouse audit ledger";
  if (source === "Google Gemini") return "Gemini editorial decision";
  if (source === "Senso") return "Senso grounding";
  if (source === "Datadog Lapdog") return "Datadog Lapdog trace review";
  return source;
}

function mapEvent(event: ScanEvent): AgentEvent {
  return {
    step: event.step,
    agent: publicAgentName(event.source),
    tool: publicAgentTool(event.source),
    action: event.title,
    result: event.detail,
  };
}

function buildAuditLog(scan: ScanResult, change: ScanChange) {
  const base = scan.events.map((event) => `${event.source}: ${event.detail}`);

  const extras = [
    scan.googleEditorial
      ? `Gemini decision: ${scan.googleEditorial.decision.publishable ? "publish" : "hold"} as ${scan.googleEditorial.decision.classification}. ${scan.googleEditorial.decision.reason}`
      : null,
    scan.lapdogReview
      ? `Lapdog trace audit: ${scan.lapdogReview.verdict} Score ${scan.lapdogReview.score}.`
      : null,
    scan.publishing
      ? `Senso grounding: ${scan.publishing.mode}. ${scan.publishing.purpose}`
      : null,
    `Primary change: ${change.whatChanged}`,
  ].filter(Boolean) as string[];

  return [...base, ...extras];
}

function buildInvestigationTrace(scan: ScanResult, change: ScanChange) {
  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const trace: CivicBrief["investigationTrace"] = scan.events.map((event, index) => ({
    time: now,
    agent: publicAgentName(event.source),
    status:
      event.source === "Google Gemini" || event.source === "Senso"
        ? ("verified" as const)
        : ("checked" as const),
    detail: event.detail,
    query:
      event.source === "Nimble"
        ? `Find official/public civic updates for ${scan.area}.`
        : event.source === "Google Gemini"
          ? `Evaluate whether "${change.title}" is resident-relevant, source-backed, and publishable.`
          : event.source === "Senso"
            ? `Ground "${scan.brief.headline}" against PublicWire organization context.`
            : undefined,
    technicalConfidence:
      index === 4 && scan.googleEditorial ? String(scan.metrics.confidenceScore / 100) : undefined,
  }));

  if (scan.lapdogReview) {
    const reachability = scan.lapdogReview.sourceReachability;
    const reachabilityNote = reachability
      ? `${reachability.filter((s) => s.reachable).length}/${reachability.length} source URLs verified reachable.`
      : "";
    const adversarialNote = scan.lapdogReview.adversarialReview
      ? ` Adversarial claim check: ${scan.lapdogReview.adversarialReview.overallVerdict}${scan.lapdogReview.adversarialReview.unsupportedCount > 0 ? ` (${scan.lapdogReview.adversarialReview.unsupportedCount} unsupported)` : ""}.`
      : "";

    trace.push({
      time: now,
      agent: "Reliability Reviewer",
      status: scan.lapdogReview.passed ? "verified" : "needs-evidence",
      detail: `${scan.lapdogReview.provider} ${scan.lapdogReview.mode}: ${reachabilityNote}${adversarialNote} ${scan.lapdogReview.verdict}`.trim(),
      query: "HEAD-check each source URL for reachability. Run adversarial claim verification: find every brief claim that cannot be directly quoted from the source extraction text.",
      technicalConfidence: String(scan.lapdogReview.score / 100),
    });
  }

  return trace;
}

function isRequestedTopicChange(change: ScanChange) {
  return change.id.startsWith("requested_") || change.title.startsWith("Requested topic under review:");
}

function mapBrief(scan: ScanResult, change: ScanChange, index: number): CivicBrief {
  const isLead = index === 0;
  const isRequested = isRequestedTopicChange(change);
  const id = index === 0 ? scan.brief.id : `brief_${slugify(change.title)}`;

  return {
    id,
    slug: slugify(change.title),
    headline: change.title,
    area: scan.area,
    category: isRequested ? "Claim Review" : titleCase(change.category),
    status: isLead ? normalizeBriefStatus(scan.brief.status) : "monitoring",
    verificationStatus: isRequested
      ? "Demand-triggered investigation"
      : scan.googleEditorial?.mode === "real-api"
        ? "Gemini verified"
        : "Source-backed",
    publishedAt: scan.lastChecked,
    displayTime: new Date(scan.lastChecked).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    sortLabel: isRequested ? "Requested" : isLead ? "Just drafted" : "Monitoring",
    impactLabel: isRequested
      ? "Legitimacy check"
      : change.importance === "urgent"
        ? "Urgent"
        : change.importance === "resident-relevant"
          ? "Resident impact"
          : "Civic signal",
    priorityReason: isRequested
      ? "Reader demand crossed the threshold, so PublicWire opened an investigation without treating the repeated claim as fact."
      : isLead
        ? scan.googleEditorial?.decision.reason ||
          "Leads the edition because it passed the live editorial and reliability gates."
        : "Included because the live scan found a resident-facing public source update.",
    summary: isRequested
      ? `${change.whatChanged} Current status: unverified until public or official sources corroborate it.`
      : isLead
        ? scan.brief.summary
        : change.whatChanged,
    whyItMatters: change.whyItMatters,
    whoIsAffected: change.whoIsAffected,
    whatChanged: change.whatChanged,
    sources: isLead
      ? scan.brief.sources
      : scan.sources
          .filter((source) => source.id === change.sourceId)
          .map((source) => ({
            title: source.name,
            url: source.url,
            role: `Used as source context for ${change.title}.`,
          })),
    auditLog: buildAuditLog(scan, change),
    reliabilityReview: isRequested
      ? "Demand is high enough to investigate, but repeated requests are used as an investigation trigger. The claim remains unverified until Nimble/Gemini find public or official corroboration."
      : scan.lapdogReview?.verdict ||
        scan.googleEditorial?.decision.reason ||
        "Approved by the live PublicWire reliability gate.",
    updateHistory: [
      `${scan.lastChecked} - Generated from live sponsor-backed scan ${scan.sessionId}.`,
      scan.publishing?.citationId
        ? `${scan.lastChecked} - Senso citation attached: ${scan.publishing.citationId}.`
        : `${scan.lastChecked} - Grounding layer completed.`,
    ],
    publishedUrl: isLead ? scan.publishing?.publishedUrl : undefined,
    artifactLabel:
      scan.publishing?.citationId ||
      `PublicWire live artifact: ${id}`,
    investigationTrace: buildInvestigationTrace(scan, change),
  };
}

export function toPublicWireEdition(scan: ScanResult, slug?: string): PublicWireEdition {
  const publishedChanges = scan.published.length > 0 ? scan.published : scan.changes.filter((c) => c.status !== "rejected");

  return {
    area: scan.area,
    slug: slug || slugify(scan.area),
    lastChecked: new Date(scan.lastChecked).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    metrics: {
      sourcesMonitored: scan.metrics.sourcesChecked,
      meaningfulUpdates: scan.metrics.changesDetected,
      routineItemsRejected: scan.metrics.rejectedItems,
      civicLayers: Math.max(3, new Set(scan.sources.map((source) => source.category)).size),
    },
    sources: scan.sources.map(mapSource),
    briefs: publishedChanges.map((change, index) => mapBrief(scan, change, index)),
    rejectedItems: scan.rejected.map(mapRejected),
    agentEvents: scan.events.map(mapEvent),
  };
}
