export type CivicSource = {
  id: string;
  name: string;
  url: string;
  category: string;
  level: string;
  status: "reachable" | "slow" | "demo";
  sourceType: "official" | "public";
};

export type CivicBrief = {
  id: string;
  slug: string;
  headline: string;
  area: string;
  category: string;
  status: "active" | "upcoming" | "monitoring";
  verificationStatus: string;
  publishedAt: string;
  displayTime: string;
  sortLabel: string;
  impactLabel: string;
  priorityReason: string;
  summary: string;
  whyItMatters: string;
  whoIsAffected: string[];
  whatChanged: string;
  sources: {
    title: string;
    url: string;
    role: string;
  }[];
  auditLog: string[];
  reliabilityReview: string;
  updateHistory: string[];
  artifactLabel: string;
  publishedUrl?: string;
  investigationTrace: {
    time: string;
    agent: string;
    status: "checked" | "needs-evidence" | "resent" | "verified" | "published";
    detail: string;
    query?: string;
    technicalConfidence?: string;
  }[];
};

export type AgentEvent = {
  step: number;
  agent: string;
  tool: string;
  action: string;
  result: string;
};

export type RejectedItem = {
  title: string;
  source: string;
  reason: string;
};

export type PublicWireEdition = {
  area: string;
  slug: string;
  lastChecked: string;
  metrics: {
    sourcesMonitored: number;
    meaningfulUpdates: number;
    routineItemsRejected: number;
    civicLayers: number;
  };
  sources: CivicSource[];
  briefs: CivicBrief[];
  rejectedItems: RejectedItem[];
  agentEvents: AgentEvent[];
};

export const newBrunswickEdition = {
  area: "New Brunswick, NJ",
  slug: "new-brunswick",
  lastChecked: "8:42 AM",
  metrics: {
    sourcesMonitored: 28,
    meaningfulUpdates: 3,
    routineItemsRejected: 9,
    civicLayers: 7,
  },
  sources: [
    {
      id: "nb_city_notices",
      name: "New Brunswick city notices",
      url: "https://www.cityofnewbrunswick.org/",
      category: "City notices",
      level: "Municipal",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "nb_council_agendas",
      name: "New Brunswick council agendas",
      url: "https://www.cityofnewbrunswick.org/",
      category: "Public meetings",
      level: "Municipal",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "middlesex_notices",
      name: "Middlesex County notices",
      url: "https://www.middlesexcountynj.gov/",
      category: "County notices",
      level: "County",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "nj_transit_alerts",
      name: "NJ Transit service advisories",
      url: "https://www.njtransit.com/service-advisory",
      category: "Transit",
      level: "State service",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "rutgers_events",
      name: "Rutgers public events",
      url: "https://www.rutgers.edu/events",
      category: "Campus events",
      level: "Campus",
      status: "demo",
      sourceType: "public",
    },
    {
      id: "nb_parking",
      name: "New Brunswick Parking Authority",
      url: "https://www.njnbpa.org/",
      category: "Parking",
      level: "Service layer",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "nb_public_works",
      name: "New Brunswick public works updates",
      url: "https://www.cityofnewbrunswick.org/",
      category: "Public works",
      level: "Municipal",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "nb_planning_board",
      name: "Planning board and development notices",
      url: "https://www.cityofnewbrunswick.org/",
      category: "Permits & development",
      level: "Municipal",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "middlesex_roads",
      name: "Middlesex County road advisories",
      url: "https://www.middlesexcountynj.gov/",
      category: "Roads",
      level: "County",
      status: "slow",
      sourceType: "official",
    },
    {
      id: "njdot_alerts",
      name: "NJDOT traffic alerts",
      url: "https://www.511nj.org/",
      category: "State roads",
      level: "State service",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "nb_schools",
      name: "New Brunswick public school notices",
      url: "https://www.nbpschools.net/",
      category: "Schools",
      level: "School district",
      status: "demo",
      sourceType: "official",
    },
    {
      id: "weather_alerts",
      name: "National Weather Service local alerts",
      url: "https://www.weather.gov/",
      category: "Weather",
      level: "Public safety",
      status: "demo",
      sourceType: "official",
    },
  ] satisfies CivicSource[],
  briefs: [
    {
      id: "brief_george_street",
      slug: "george-street-construction",
      headline: "George Street construction may affect downtown traffic this weekend",
      area: "New Brunswick, NJ",
      category: "Transportation",
      status: "upcoming",
      verificationStatus: "Verified from official source context",
      publishedAt: "May 23, 2026, 8:42 AM",
      displayTime: "8:42 AM",
      sortLabel: "Just drafted",
      impactLabel: "High impact",
      priorityReason:
        "Leads the edition because it was newly detected and affects downtown travel, buses, students, deliveries, and local businesses.",
      summary:
        "A public construction notice indicates that George Street may face traffic disruption from Saturday morning through Sunday evening.",
      whyItMatters:
        "George Street is a major downtown route. Even a short closure can affect residents, Rutgers students, bus riders, deliveries, parking, and weekend travel.",
      whoIsAffected: [
        "Downtown residents",
        "Rutgers students",
        "commuters",
        "bus riders",
        "local businesses",
      ],
      whatChanged:
        "The monitor found a newly posted construction notice in the city source set and classified it as a resident-facing transportation update.",
      sources: [
        {
          title: "City construction notice",
          url: "https://www.cityofnewbrunswick.org/",
          role: "Used to support the location, timing, and construction context.",
        },
        {
          title: "NJ Transit service advisory page",
          url: "https://www.njtransit.com/service-advisory",
          role: "Checked for nearby service context before writing the brief.",
        },
      ],
      auditLog: [
        "The Source Scout checked 28 New Brunswick-area source surfaces across city, county, campus, transit, weather, schools, and public works layers.",
        "The Source Scout found a new city construction notice mentioning George Street.",
        "The Change Ledger marked the notice as new compared with the previous source snapshot.",
        "The editor agent kept the item because it affects downtown transportation access.",
        "The Editorial Agent confirmed the core claim was supported by official source context.",
        "The Grounding Agent produced a short civic brief without adding unsupported delay estimates.",
        "The reliability reviewer approved the brief for publication.",
      ],
      reliabilityReview:
        "Approved. The entry uses official source context, avoids unsupported claims about exact traffic delay, clearly labels affected groups, and keeps the language appropriately cautious.",
      updateHistory: [
        "8:42 AM - Published as an upcoming transportation brief.",
        "8:44 AM - Transit advisory source checked; no separate service disruption added.",
      ],
      artifactLabel: "cited.md demo artifact: seeded_brief_george_street",
      investigationTrace: [
        {
          time: "8:40:12",
          agent: "Source Scout",
          status: "checked",
          detail:
            "Datadog trace shows the monitor opening the municipal source registry, checking the city notices endpoint, and recording a changed page hash against the previous run.",
          query:
            "Nimble.extract(url: city_notice_source, goal: find newly posted construction, road, public works, and traffic notices for New Brunswick)",
        },
        {
          time: "8:40:20",
          agent: "Source Scout",
          status: "checked",
          detail:
            "The Source Scout converted the notice into a civic event object, separating the location, notice type, affected corridor, likely audience, and source text used for support.",
          query:
            "Extract title, affected street, posted date, event window, jurisdiction, and supporting source text. Do not infer closures not stated in the source.",
        },
        {
          time: "8:40:31",
          agent: "Editorial Agent",
          status: "verified",
          detail:
            "The Editorial Agent checked every sentence in the proposed brief against the extracted source fields and rejected a draft phrase that implied exact traffic delays.",
          query:
            "For each claim in candidate_brief, return supported, unsupported, or needs_more_context using only source excerpts.",
          technicalConfidence: "0.94",
        },
        {
          time: "8:41:08",
          agent: "Reliability Reviewer",
          status: "verified",
          detail:
            "The reliability reviewer approved publication because the item was resident-relevant, sourced from official context, and worded as a cautious transportation heads-up prediction while avoiding a.",
          query:
            "Review reporting chain for unsupported claims, overstatement, missing source links, stale dates, and public-facing clarity.",
        },
        {
          time: "8:42:00",
          agent: "Grounding Agent",
          status: "published",
          detail:
            "The Grounding Agent attached source links, audit summary, update history, and the cited.md artifact label before placing the brief into the New Brunswick edition.",
          query:
            "Publish approved civic micro-brief with source packet, reliability review, audit trail, and update policy.",
        },
      ],
    },
    {
      id: "brief_parking_agenda",
      slug: "downtown-parking-agenda",
      headline: "City council agenda includes downtown parking discussion",
      area: "New Brunswick, NJ",
      category: "City Hall",
      status: "monitoring",
      verificationStatus: "Verified for cautious publication",
      publishedAt: "May 23, 2026, 8:42 AM",
      displayTime: "8:41 AM",
      sortLabel: "Monitoring",
      impactLabel: "Policy watch",
      priorityReason:
        "Second because it may affect parking access, but the meeting has not yet turned the agenda item into a final policy change.",
      summary:
        "A newly posted council agenda includes an item related to downtown parking policy and access.",
      whyItMatters:
        "Parking changes can affect commuters, students, employees, residents, visitors, and small businesses near downtown.",
      whoIsAffected: ["Drivers", "downtown workers", "Rutgers students", "local businesses"],
      whatChanged:
        "The agenda monitor found a new meeting item related to downtown parking and marked it for follow-up after the meeting.",
      sources: [
        {
          title: "City council agenda source",
          url: "https://www.cityofnewbrunswick.org/",
          role: "Used to identify the agenda item and meeting context.",
        },
      ],
      auditLog: [
        "The agenda source was checked during the New Brunswick run.",
        "The Source Scout pulled a parking-related meeting item.",
        "The editor classified the item as resident-relevant but not urgent.",
        "The Editorial Agent approved cautious publication because details may change after the meeting.",
        "The reliability reviewer approved publication with cautious wording.",
      ],
      reliabilityReview:
        "Approved with cautious language. The brief should describe the agenda item, not claim a final policy change.",
      updateHistory: ["8:42 AM - Published as a monitoring item for meeting follow-up."],
      artifactLabel: "cited.md demo artifact: seeded_brief_parking_agenda",
      investigationTrace: [
        {
          time: "8:40:12",
          agent: "Source Scout",
          status: "checked",
          detail:
            "The monitor detected a new agenda item in the municipal meeting source and recorded that the page changed from the previous snapshot.",
          query:
            "Nimble.extract(url: council_agenda_source, goal: identify new agenda items involving parking, traffic, access, fees, or downtown policy)",
        },
        {
          time: "8:40:18",
          agent: "Source Scout",
          status: "checked",
          detail:
            "The Source Scout found a parking-related topic but could not confirm whether it represented a final policy change, a discussion item, or an informational hearing.",
          query:
            "Extract meeting item, action verbs, affected location, decision status, public deadline, and exact source language.",
        },
        {
          time: "8:40:24",
          agent: "Editorial Agent",
          status: "needs-evidence",
          detail:
            "The Editorial Agent refused the first draft because the claim was too strong. The source supported 'agenda includes discussion' but not 'parking fees are changing.'",
          query:
            "Can the source support the claim 'parking fees are changing'? If not, identify the weakest claim that is still supported.",
          technicalConfidence: "0.61 before resend",
        },
        {
          time: "8:40:25",
          agent: "Editor",
          status: "resent",
          detail:
            "The editor sent the item back to Source Scout for corroboration update while avoiding publishing an overclaim or silently dropping a potentially useful civic.",
          query:
            "Find secondary official context for New Brunswick downtown parking agenda item; prioritize parking authority, city agenda packet, or meeting notice.",
        },
        {
          time: "8:40:39",
          agent: "Source Scout",
          status: "checked",
          detail:
            "Source Scout attached the parking authority as secondary context and constrained the story to an agenda-watch item update while avoiding a completed policy.",
          query:
            "Nimble.search(query: New Brunswick parking authority downtown parking agenda discussion official source)",
        },
        {
          time: "8:40:44",
          agent: "Editorial Agent",
          status: "verified",
          detail:
            "The Editorial Agent approved a revised claim: the agenda includes a downtown parking discussion. The published brief now avoids saying a change has been enacted.",
          query:
            "Re-check revised headline and summary against city agenda source plus parking authority context.",
          technicalConfidence: "0.87 after resend",
        },
        {
          time: "8:41:02",
          agent: "Reliability Reviewer",
          status: "published",
          detail:
            "The reliability reviewer approved publication as a monitoring item and required the article to signal that follow-up is needed after the meeting.",
          query:
            "Should this be published, revised, monitored only, or blocked? Explain the editorial risk.",
        },
      ],
    },
    {
      id: "brief_rutgers_college_ave",
      slug: "rutgers-college-ave-event",
      headline: "Rutgers-area event may increase foot traffic near College Avenue",
      area: "New Brunswick, NJ",
      category: "Campus & Events",
      status: "upcoming",
      verificationStatus: "Source-backed heads-up",
      publishedAt: "May 23, 2026, 8:42 AM",
      displayTime: "8:39 AM",
      sortLabel: "Upcoming",
      impactLabel: "Local access",
      priorityReason:
        "Third because it is useful for nearby residents and businesses, but no official traffic disruption was found.",
      summary:
        "A public Rutgers-area event listing points to scheduled activity near College Avenue that may bring more pedestrians and parking demand.",
      whyItMatters:
        "Campus events can ripple into nearby streets, parking lots, restaurants, and bus stops even when there is no formal traffic advisory.",
      whoIsAffected: ["Students", "nearby residents", "drivers", "local businesses"],
      whatChanged:
        "The events monitor found a scheduled Rutgers-area event and checked whether any official transportation advisory was attached.",
      sources: [
        {
          title: "Rutgers public event listing",
          url: "https://www.rutgers.edu/events",
          role: "Used to identify the event timing and campus-area context.",
        },
        {
          title: "NJ Transit service advisory page",
          url: "https://www.njtransit.com/service-advisory",
          role: "Checked for official transit disruption context.",
        },
      ],
      auditLog: [
        "The event source was checked with the campus layer.",
        "The Source Scout identified a scheduled public event near College Avenue.",
        "The editor kept the item because it may affect nearby access and parking.",
        "The Editorial Agent found no official traffic advisory, so the brief avoids claiming disruption.",
        "The reliability reviewer approved publication because the uncertainty is clearly labeled.",
      ],
      reliabilityReview:
        "Approved. The entry is useful as a campus-area heads-up and does not overstate the transportation impact.",
      updateHistory: ["8:42 AM - Published as a source-backed campus-area heads-up."],
      artifactLabel: "cited.md demo artifact: seeded_brief_rutgers_college_ave",
      investigationTrace: [
        {
          time: "8:40:10",
          agent: "Source Scout",
          status: "checked",
          detail:
            "The monitor found a campus-area public event listing and attached it to the College Avenue layer because that layer affects nearby residents and local access.",
          query:
            "Nimble.extract(url: rutgers_events_source, goal: identify public events near College Avenue with date, location, and expected access effects)",
        },
        {
          time: "8:40:22",
          agent: "Source Scout",
          status: "checked",
          detail:
            "The Source Scout converted the listing into an event object and separated confirmed facts from likely but unconfirmed local effects.",
          query:
            "Extract event title, time, campus area, public access notes, and language that directly supports affected groups.",
        },
        {
          time: "8:40:35",
          agent: "Editorial Agent",
          status: "needs-evidence",
          detail:
            "The Editorial Agent found no official transportation advisory, so the system blocked language implying traffic disruption and kept only a campus-area heads-up.",
          query:
            "Search attached source packet for official traffic, transit, closure, or parking advisory. If absent, limit claims.",
          technicalConfidence: "0.74",
        },
        {
          time: "8:40:55",
          agent: "Editor",
          status: "verified",
          detail:
            "The editor kept the item because the event is useful to nearby residents, but framed it as possible increased activity disruption while avoiding a verified.",
          query:
            "Classify as publish, reject, needs_more_verification, or monitor_only using resident relevance and source support.",
        },
        {
          time: "8:41:20",
          agent: "Reliability Reviewer",
          status: "published",
          detail:
            "The reliability reviewer approved publication because the uncertainty is explicit, the source is public, and the brief does not overstate the impact.",
          query:
            "Review uncertainty wording and ensure the article does not invent traffic or transit impacts.",
        },
      ],
    },
  ] satisfies CivicBrief[],
  rejectedItems: [
    {
      title: "Routine administrative minutes posted",
      source: "New Brunswick city notices",
      reason: "Rejected because no resident-facing change or deadline was identified.",
    },
    {
      title: "Procurement filing updated",
      source: "Middlesex County notices",
      reason: "Rejected as administrative noise for the public edition.",
    },
    {
      title: "Calendar formatting changed",
      source: "Rutgers public events",
      reason: "Rejected because the page changed but the civic facts did not.",
    },
  ] satisfies RejectedItem[],
  agentEvents: [
    {
      step: 1,
      agent: "Area Coverage",
      tool: "PublicWire registry",
      action: "Loaded the New Brunswick edition and civic layers.",
      result: "Municipal, county, transit, campus, parking, and event layers selected.",
    },
    {
      step: 2,
      agent: "Source Scout",
      tool: "Nimble draft integration",
      action: "Checked twelve public source targets.",
      result: "Twenty-eight source surfaces were scanned; slower source families were queued for retry and did not block publication.",
    },
    {
      step: 3,
      agent: "Source Scout",
      tool: "Structured civic schema",
      action: "Converted source text into candidate civic updates.",
      result: "Twelve candidates created; nine routine/noisy items flagged.",
    },
    {
      step: 4,
      agent: "Change Ledger",
      tool: "ClickHouse draft ledger",
      action: "Compared candidate updates with previous snapshot hashes.",
      result: "Three meaningful changes kept for editorial review.",
    },
    {
      step: 5,
      agent: "Editorial Agent",
      tool: "Grounding policy",
      action: "Filtered for resident impact and source support.",
      result: "Three publishable briefs, three visible rejections, no unsupported claims.",
    },
    {
      step: 6,
      agent: "Grounding Agent",
      tool: "Brief template",
      action: "Generated short local newspaper entries.",
      result: "Each brief includes summary, why it matters, affected groups, and sources.",
    },
    {
      step: 7,
      agent: "Reliability Reviewer",
      tool: "Public editor review",
      action: "Reviewed source quality, claims, and wording before publication.",
      result: "All demo briefs approved; two require follow-up monitoring.",
    },
    {
      step: 8,
      agent: "Grounding Agent + Reliability Reviewer",
      tool: "cited.md and Datadog draft layers",
      action: "Published the edition view and translated the agent trace.",
      result: "Reader-facing audit logs and demo citation labels attached.",
    },
  ] satisfies AgentEvent[],
} satisfies PublicWireEdition;

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function cloneEdition(params: {
  slug: string;
  area: string;
  sourcePrefix: string;
  topBrief: string;
  secondBrief: string;
  thirdBrief: string;
  topCategory: string;
  sourcesMonitored?: number;
  routineItemsRejected?: number;
  civicLayers?: number;
}): PublicWireEdition {
  return {
    ...newBrunswickEdition,
    slug: params.slug,
    area: params.area,
    metrics: {
      sourcesMonitored: params.sourcesMonitored ?? 30,
      meaningfulUpdates: 3,
      routineItemsRejected: params.routineItemsRejected ?? 8,
      civicLayers: params.civicLayers ?? 7,
    },
    sources: newBrunswickEdition.sources.slice(0, 11).map((source) => ({
      ...source,
      id: `${params.slug}_${source.id}`,
      name: source.name
        .replaceAll("New Brunswick", params.sourcePrefix)
        .replaceAll("Rutgers", params.sourcePrefix)
        .replaceAll("Middlesex County", params.sourcePrefix),
    })),
    briefs: newBrunswickEdition.briefs.map((brief, index) => ({
      ...brief,
      id: `${params.slug}_${brief.id}`,
      slug: `${params.slug}-${brief.slug}`,
      area: params.area,
      headline:
        index === 0 ? params.topBrief : index === 1 ? params.secondBrief : params.thirdBrief,
      category: index === 0 ? params.topCategory : brief.category,
      artifactLabel: `cited.md demo artifact: seeded_${params.slug}_${brief.slug}`,
    })),
  } satisfies PublicWireEdition;
}

export const demoEditions: Record<string, PublicWireEdition> = {
  "new-brunswick": newBrunswickEdition,
  newark: cloneEdition({
    slug: "newark",
    area: "Newark, NJ",
    sourcePrefix: "Newark",
    topCategory: "Transit",
    sourcesMonitored: 42,
    routineItemsRejected: 14,
    civicLayers: 9,
    topBrief: "Broad Street transit alert may affect downtown Newark commuters",
    secondBrief: "Council agenda includes commercial corridor parking discussion",
    thirdBrief: "Arts district event may increase evening foot traffic",
  }),
  "jersey-city": cloneEdition({
    slug: "jersey-city",
    area: "Jersey City, NJ",
    sourcePrefix: "Jersey City",
    topCategory: "Transportation",
    sourcesMonitored: 44,
    routineItemsRejected: 13,
    civicLayers: 9,
    topBrief: "Waterfront street work may affect evening access near Exchange Place",
    secondBrief: "Council agenda includes development item near downtown corridor",
    thirdBrief: "Community event may increase pedestrian activity near Grove Street",
  }),
  "middlesex-county": cloneEdition({
    slug: "middlesex-county",
    area: "Middlesex County",
    sourcePrefix: "Middlesex County",
    topCategory: "County Roads",
    sourcesMonitored: 58,
    routineItemsRejected: 18,
    civicLayers: 11,
    topBrief: "County road advisory may affect commuter routes this weekend",
    secondBrief: "County agenda includes shared services funding discussion",
    thirdBrief: "Regional event listing may affect traffic near campus corridors",
  }),
  "rutgers-college-ave": cloneEdition({
    slug: "rutgers-college-ave",
    area: "Rutgers / College Ave",
    sourcePrefix: "Rutgers",
    topCategory: "Campus & Transit",
    sourcesMonitored: 22,
    routineItemsRejected: 7,
    civicLayers: 6,
    topBrief: "College Avenue event may affect bus stops and nearby pedestrian flow",
    secondBrief: "Parking authority source adds context for downtown access",
    thirdBrief: "Campus listing may increase evening activity near College Avenue",
  }),
};

export function getEditionBySlug(slug: string): PublicWireEdition {
  return demoEditions[slug] ?? cloneEdition({
    slug,
    area: prettifySlug(slug),
    sourcePrefix: prettifySlug(slug),
    topCategory: "Civic Update",
    topBrief: `${prettifySlug(slug)} civic agents found a resident-relevant local update`,
    secondBrief: `${prettifySlug(slug)} agenda monitor found a public meeting item`,
    thirdBrief: `${prettifySlug(slug)} event monitor found a local access heads-up`,
  });
}

export function getBriefById(idOrSlug: string) {
  return Object.values(demoEditions)
    .flatMap((edition) => edition.briefs)
    .find((brief) => brief.id === idOrSlug || brief.slug === idOrSlug);
}
