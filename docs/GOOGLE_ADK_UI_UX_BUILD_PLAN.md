# PublicWire ADK UI/UX Build Plan

Status: implementation-ready proposal, adversarial review incorporated

Scope: evolve the PublicWire frontend so it visibly and honestly uses the proposed Google ADK backend, including durable investigations, canonical events, claim level evidence, bounded repair, lifecycle updates, and corrections. Do not redesign the product beyond what the backend can reliably support.

Companion: [Google ADK backend build plan](./GOOGLE_ADK_BUILD_PLAN.md)

Last updated: 2026-07-19

## 1. Decision

Yes, the proposed backend requires meaningful UI and UX changes. A backend that creates durable investigations, evidence-linked claims, streamed workflow events, holds, revisions, and corrections should not be hidden behind the current synchronous "Run live sponsor scan" button and modal audit log.

The frontend should become a civic desk with three reader-facing layers:

1. **The edition:** what changed and what deserves attention now.
2. **The investigation:** what the system is checking, which claims have support, what is missing, and why the item is published or held.
3. **The public record:** the published brief, its evidence receipts, update history, and corrections.

The visual upgrade should come from showing real structure and change instead of decorative agent animation. PublicWire's existing monochrome editorial identity is strong and should remain the foundation.

## 2. UX north star

> Make the autonomous newsroom legible without making the reader operate it.

The user should be able to answer these questions quickly:

- What changed in my town?
- Is this published, still being checked, held, corrected, or resolved?
- Which material claims are supported by which sources?
- What evidence is missing or contradictory?
- What changed since the previous version?
- What did PublicWire actually do, and when?
- Can I follow the source or submit relevant evidence?

The user should not need to understand ADK, model names, tool-call syntax, token counts, agent topology, provider-specific jargon, or internal prompts.

## 3. Current frontend assessment

### Strengths to preserve

- Distinctive black-and-white newspaper aesthetic.
- Oversized, tightly tracked headlines and strong editorial hierarchy.
- Hard borders, hairline rules, flat cards, and zero-radius primary surfaces.
- Wide broadsheet grids that work well for editions and evidence panels.
- Existing "trust layer" and "investigate" concepts already match the backend vision.
- Motion is mostly editorial and spatial rather than app-dashboard decoration.
- Source, rejected-item, audit-log, and reliability concepts already exist in the content model.
- Landing, edition, investigation, and brief surfaces already provide a migration path.

### Gaps created by the current backend/UI contract

| Current UI | Problem | Required evolution |
| --- | --- | --- |
| Synchronous `/api/public-wire/edition` request | One loading label must represent the entire workflow and fails with request lifetime | Create a durable job, route to an investigation, stream persisted progress, and support reconnect |
| Investigation is a modal | It is not durable, shareable, linkable, resumable, or suitable for a long evidence record | Add a first-class investigation route; keep a small preview/drawer only for edition context |
| Audit log is prose and synthetic | It can invent prompts/timestamps and overwhelms readers with implementation language | Use canonical public events, real timestamps, stable reason codes, and progressive disclosure |
| Raw queries/prompts are shown | Prompts are not provenance and may expose sensitive/internal details | Show tool/action summaries and evidence lineage; never expose hidden prompts or chain-of-thought |
| Technical confidence appears as a score | A model number can imply objective certainty and obscure blocking evidence | Show evidence coverage, source authority, contradictions, freshness, and explicit gate outcomes |
| Fixed five-agent chain | ADK workflow is conditional, parallel, and looped; providers may change | Present reader-facing stages and actual events, with provider/tool metadata secondary |
| Edition cards are publication-only | Held and active investigations lack a useful place in the information architecture | Add an investigation/watch section with clear lifecycle states and hold reasons |
| Source list is flat | It does not show which source supports which claim or which revision was read | Add claim-to-source receipts, capture/freshness data, and artifact-version lineage |
| Static update history | No revisions, diffs, correction semantics, or lifecycle events | Add an immutable update/correction timeline and concise version diffs |
| Demo/live language is mixed | Readers can mistake seeded content or a failed scan for live evidence | Add explicit real/demo/degraded states; demo and shadow states never appear as confirmed publication |
| Landing page says agents are already running | This may be false before durable scheduled work exists | Make operational claims data-backed or phrase them as product capability until proven live |

## 4. Scope boundaries

### Launch scope

The first production UI should include:

- asynchronous investigation creation and status;
- resumable public event streaming;
- first-class investigation pages;
- claim-level evidence receipts;
- clear publish/hold/reject/corrected states;
- real timestamps and update history;
- reader-safe failure and degraded states;
- published brief provenance;
- accessible responsive behavior;
- a landing-page showcase built from the same real components and contracts.

### Explicitly deferred

- canvas/node graph of every agent and tool call;
- map-based civic visualization;
- newsroom admin/CMS or human editing suite;
- real-time multi-user collaboration;
- arbitrary user-configured agent workflows;
- public token/cost/model-debug dashboards;
- raw prompt or chain-of-thought viewers;
- push/email notifications and accounts;
- community comments or social ranking;
- sophisticated personalized feeds;
- custom charting/visualization engine;
- advanced source-health operations console;
- multilingual UI before multilingual publishing exists;
- speculative ADK Skills/RoutedAgent controls.

These can be reconsidered only after the corresponding backend feature, authorization model, product need, and evaluation metric exist.

## 5. Information architecture

### Disclosure and tenancy model

Workflow status does not decide who may see a case. Every investigation and every public projection has an independent disclosure state:

| Disclosure | Access |
| --- | --- |
| `private` | Internal desk users or the originating requester scope only |
| `unlisted` | Anyone with the opaque case capability URL, when policy explicitly allows it; never listed or indexed |
| `public` | Eligible for edition listing, public metadata, source receipts, and indexing according to publication policy |

Rules:

- Anonymous/user-submitted, held, rejected, unsupported, failed, and shadow investigations are `private` by default.
- A deterministic, persisted disclosure decision is required before a case, claim, event, excerpt, or count enters a public projection.
- A public case contains only separately approved public claims/events/receipts; public visibility is not inherited from the investigation row.
- Similar-case lookup may reveal only public cases or private cases owned by the same validated requester scope. Otherwise return a generic queued/reused response that cannot be used as an existence oracle.
- Town/tenant scope comes from a server-owned area registry. Route text, `areaName`, `focus`, `live`, or an arbitrary slug never establishes authorization or database scope.
- A short-lived/server-signed requester-scope cookie may support same-browser private status. Without a validated requester scope or account, the UI does not promise durable private-case access.
- Accounts, public cancellation, editing, and cross-device private case history remain deferred until an explicit authentication/authorization model exists.
- Every server projection, stream, metadata response, cache key, and analytics event applies the same disclosure and town-scope decision.

### Routes

```text
/                                      Product story and live proof
/local/[area]                          Current civic edition
/local/[area]/investigations/[publicCaseKey]  Authorized durable case file
/briefs/[id]                           Published brief and public record
```

`publicCaseKey` is opaque, non-sequential, revocable where applicable, and distinct from internal investigation/job/session/invocation/artifact/event identifiers. Internal identifiers never appear in public URLs or reader contracts. Optional human-readable text may be presentation-only and must not be used for lookup or authorization. Compatibility URLs redirect only after the same disclosure check.

### Navigation model

- **Edition** is the default reader destination.
- **Investigations** are opened from public case cards or from a requester-authorized status receipt. Held/private work does not appear in a public edition solely because it exists.
- **Briefs** are opened for published content and prioritize reading over system details.
- **Sources and activity** are views inside an investigation or brief, not new top-level navigation.

### Orthogonal reader state

Do not collapse workflow, external publication, civic lifecycle, corrections, disclosure, and freshness into one status enum. Public projections carry separate axes:

```text
workflowState:     discovered | gathering | verifying | needs_evidence | held |
                   drafting | reviewing | publish_ready | complete | failed | cancelled
publicationState:  none | pending | confirmed | unknown | failed | withdrawn
lifecycleState:    open | resolved
correctionState:   none | clarified | corrected | retracted
visibility:        private | unlisted | public
freshnessState:    current | stale | unknown
```

The UI derives a small badge set from these fields:

- "Published" requires `publicationState=confirmed` and `visibility=public`.
- `publicationState=unknown` reads "Publication status unavailable," never "Published."
- A confirmed brief may also be `resolved`, `clarified`, `corrected`, or `retracted`; those do not erase its publication history.
- A held item is visible only when its independent disclosure decision permits it.
- A retracted publication retains a public correction/retraction record according to policy; it is not silently removed.
- Freshness appears separately from verification or publication.

## 6. Screen specifications

### 6.1 Landing page: product promise backed by proof

Keep the existing full-bleed grayscale newspaper hero, masthead, oversized typography, black/white palette, and editorial pacing.

Required changes:

1. Replace the fixed provider-centric chain with four durable newsroom capabilities:
   - Watch sources.
   - Compare changes.
   - Verify and repair evidence.
   - Publish, update, and correct.
2. Keep provider names as a secondary colophon/sponsor layer, not the user mental model.
3. Replace any unverified "already running" or live-count claim with:
   - a real edition/investigation summary from the public API; or
   - capability language when live data is unavailable.
4. Add one contained "Anatomy of an investigation" showcase using the same production components:
   - one material claim;
   - two source receipts;
   - a short real/sanitized event sequence;
   - a held or published gate outcome.
5. Preserve the current trust-layer comparison, but make the example contract-driven rather than hard-coded prompt prose.
6. Do not turn the landing page into a live operations dashboard.

Visual showcase:

- A broadsheet evidence spread: claims in the main column, source receipts in the rail, and thin focus lines/highlights that connect the selected claim to supporting sources.
- The interaction works with hover, keyboard focus, and touch selection; it does not require a canvas graph.
- Data is a stable curated public investigation fixture or a current real public investigation. It is labeled accurately.

### 6.2 Edition page: the civic desk

The edition remains the main news-reading surface. It should not become an agent control panel.

#### Header

- Keep the area dateline and "Today's Civic Briefing" hierarchy.
- Add a compact desk-status line using public-projection data only: last successful check, publicly disclosed active investigations, confirmed published updates, and degraded status if applicable. Private/held volume never leaks through counts.
- Use an absolute timestamp in accessible text and a relative label visually where helpful.
- If data is stale, say so; do not imply a live scan.

#### Search/coverage entry

- Replace the synchronous scan interaction with one primary field: "What should the desk check?"
- Submission returns or reuses a requester-authorized case receipt. Navigate only when the server returns an authorized opaque `publicCaseKey`.
- Show a short intermediate confirmation only if navigation/job creation takes noticeable time.
- Coverage requests return a trackable status, not internal demand scoring.
- If a similar public or same-requester investigation exists, offer that case. Never reveal a private case belonging to another requester.

#### Story hierarchy

- Published lead and secondary briefs remain editorially prominent.
- Avoid repeating the lead as the first card under "Also today."
- Add a compact "On the desk" rail/section only for investigations with an explicit public disclosure decision. A held/needs-evidence case is not publicly listed by default.
- Story cards show at most:
  - lifecycle label;
  - headline/topic;
  - one-sentence change or hold reason;
  - evidence receipt count and latest update;
  - one primary action.
- Do not put model names, tokens, or raw tool events on edition cards.

#### Filtered/held content

- Separate routine/duplicate filters from evidence holds.
- Routine filters remain compact and low prominence.
- Publicly disclosed evidence holds may link to a public-safe case file with an allowlisted plain-language reason; private holds remain absent from the edition.
- Do not shame or sensationalize reader-submitted unsupported claims.

#### Live activity

- A restrained desk activity strip may show only the latest few disclosure-approved public events for publicly visible work. Requester-private activity stays in its authorized case response and does not affect edition content.
- It is not a constantly animated firehose.
- New events append without moving focus, changing scroll position, or reordering content unexpectedly.

### 6.3 Investigation page: the signature ADK-powered experience

This is the primary visual showcase of the new backend.

#### Case-file header

- Topic/headline, area, reader-facing state, opened/updated time, and revision.
- One-sentence current determination: what is known and what remains uncertain.
- A restrained status rail showing completed/current/blocked newsroom stages.
- Actions are minimal: follow an approved public source, return to the edition, and submit relevant evidence only after that deferred feature has an abuse/authentication policy. Public cancellation is not in launch scope.

#### Default overview

Use a two-column broadsheet layout on desktop and a single reading order on mobile:

- Main column: current finding, material claims, why it matters, affected groups.
- Rail: source packet, current gate/hold reason, last update, publication record when confirmed.

#### Claim and evidence ledger

Every material claim row includes:

- exact reader-facing claim;
- status: supported, disputed, unsupported, superseded, or checking;
- number and authority class of supporting/contradicting sources;
- source capture/effective dates;
- an expandable receipt with a bounded excerpt and source link;
- artifact/revision information in a "Details" disclosure, not the default reading view.

Interaction model:

- Selecting or focusing a claim highlights its supporting and contradicting receipts.
- Relationships are conveyed by labels, order, border treatment, and optional thin connector lines; color alone is insufficient.
- Excerpts are clearly marked as source text, not PublicWire prose.
- Missing evidence is a first-class empty state with a reason and next action, not a blank card.

#### Activity view

- Project real canonical events into reader language.
- Group events by stage (source capture, extraction, verification, repair, editorial gate, draft review, publication).
- Show the latest/current group expanded; collapse completed low-level groups.
- Each event is rendered from an allowlisted `eventCode` plus typed safe parameters and may show actual time, stage, mapped action/result copy, and approved public source/claim references.
- Never show system prompts, chain-of-thought, secret tool arguments, unrestricted raw responses, or internal security signals.
- Provider/tool names may appear only when explicitly allowlisted and useful. Internal IDs, model metadata, prompt/schema versions, private-operation durations, and general `technicalDetails` belong in a future authenticated operational view, not the reader case file.

#### Evidence repair visualization

A repair iteration is shown as a meaningful branch:

```text
Material claim missing support
→ searched named source/category
→ captured 2 new source versions
→ rechecked affected claim
→ supported / still unsupported / contradicted / no new evidence
```

Do not animate the model "thinking." Animate only confirmed state transitions or newly persisted events, and respect reduced-motion settings.

#### Update/correction timeline

- Show immutable revisions newest-first with a clear chronological alternative for screen readers.
- Explain what changed, why, which claims were affected, and whether a publication was replaced or corrected.
- Formal corrections receive stronger visual treatment than routine source refreshes.
- Previous wording remains discoverable when policy allows; do not silently overwrite history.

### 6.4 Published brief page: reading first, receipts second

The published page should remain an article, not become a debug console.

Required changes:

1. Preserve headline, summary, why it matters, affected groups, and sources.
2. Add a compact provenance ribbon near the dateline:
   - independently derived publication, lifecycle, and correction state;
   - material claims supported;
   - source capture freshness;
   - link to the investigation.
3. Launch with a brief-level "Claims and sources" summary linking to the investigation ledger. Defer inline prose markers until the backend produces immutable, final-gate-verified publication anchors.
4. Replace the current prompt-preserving audit section with a sanitized "How this was verified" stage summary.
5. Move deep activity into the linked investigation page.
6. Make clarification/correction/retraction history prominent when non-empty.
7. Treat an unresolved/unknown external publication state as unavailable, never published.

### 6.5 Coverage request UX

- Ask for a topic/claim and optional source/place hint.
- Explain that demand influences attention, not truth or publication.
- After submission, return one of:
  - linked to an existing public or same-requester investigation;
  - queued for checking;
  - rate-limited with retry guidance;
  - rejected by validation/policy with a safe explanation.
- Give the user an opaque case/status link only when the disclosure and requester-scope policy permits access.
- Do not expose internal quota values, raw demand scores, requester counts that could be gamed, or other users' information.
- An anonymous request receives a private same-browser receipt only when the signed requester scope is valid; otherwise the UI confirms queuing without promising durable private access.
- Submission and status messages use an `aria-live` region and preserve entered text on retryable errors.

## 7. Visual system evolution

### Preserve

- black, white, neutral gray, and grayscale photography;
- strong editorial grid and abundant rules/borders;
- oversized display headlines with compact uppercase metadata;
- flat rectangular surfaces and newspaper-like density;
- source/evidence side rails;
- restrained Framer Motion for entrance and spatial continuity;
- existing masthead, colophon, button language, and section-label rhythm.

### Add

A small semantic state palette, always paired with text/icon/pattern:

- blue: active/checking;
- amber: needs evidence/held/clarification or correction attention;
- green: verified/published;
- red: safe failure/retraction or destructive attention;
- neutral: routine/resolved/unknown presentation.

Use muted paper-compatible tones rather than saturated dashboard colors. Define them as tokens, including foreground/border/background variants, and test contrast.

Add reusable visual primitives:

- stage rail;
- status stamp;
- evidence receipt;
- claim row;
- source authority/freshness label;
- event group;
- revision marker;
- correction notice;
- connection highlight;
- stale/degraded banner.

### Avoid

- glassmorphism, neon agent nodes, floating AI orbs, and generic gradient dashboards;
- a continuously moving workflow graph;
- multiple simultaneous accent colors in editorial content;
- unbounded card grids;
- confidence gauges, truth percentages, and gamified scores;
- decorative motion that implies work is occurring when no persisted event exists;
- new illustration or font systems before the core product views are working.

The existing perpetual network particles and fixed-agent "swarm" spectacle in `components/landing/how-it-works.tsx` and `components/landing/agent-swarm.tsx` are removed or replaced in UI Phase 5. The evidence showcase uses static editorial rules and finite selection highlights, not an ambient visualization that implies live work.

### Motion rules

- Motion communicates a persisted event, selection relationship, expansion, or route continuity.
- No animation represents hidden model reasoning.
- Pause continuous decorative animation when offscreen and honor `prefers-reduced-motion`.
- SSE updates do not steal focus, reset scroll, or pulse indefinitely.
- A newly arrived event may receive one brief highlight; it then settles into the document.

## 8. Frontend data contracts

Create reader-safe, versioned view models rather than binding components directly to ADK events or database rows.

### Edition view

```text
PublicEditionView
  schemaVersion
  areaKey                       server-registry key
  areaDisplayName
  generatedAt
  lastSuccessfulCheckAt?
  freshnessState
  deskState
  metrics                       public, editorially meaningful only
  leadBrief?
  briefs[]
  publicInvestigations[]        independently disclosure-approved only
  routineFilters[]
  degradedNotice?
```

### Investigation summary/detail

```text
PublicInvestigationSummary
  publicCaseKey                 opaque; never the internal investigation id
  areaKey
  areaDisplayName
  topic
  workflowState
  publicationState
  lifecycleState
  correctionState
  visibility
  freshnessState
  currentDetermination
  materialClaimCounts
  sourceReceiptCount
  openedAt
  updatedAt
  revision

PublicInvestigationDetail
  summary
  projectionRevision
  snapshotCursor
  streamEpoch
  whyItMatters?
  whoIsAffected[]
  stageRail[]
  claims[]
  sourceReceipts[]
  currentDecision
  publication?
  revisions[]
  correctionNotice?
```

### Claim receipt

```text
PublicClaimReceipt
  publicClaimKey
  text
  materiality
  status
  evidence[]
  contradictions[]
  missingReason?
  lastVerifiedAt?

PublicEvidenceReceipt
  publicReceiptKey
  sourceTitle
  sourceUrl
  sourceAuthority
  capturedAt
  effectiveAt?
  relation
  boundedExcerpt
  pageNumber?
  artifactRevisionLabel
```

### Public event

```text
PublicInvestigationEvent
  cursor
  publicEventKey
  occurredAt
  stage
  status
  eventCode                     allowlisted public code
  safeParams                    code-specific typed values only
  sourceReceiptKeys[]
  claimKeys[]
```

### Job status

```text
PublicJobView
  jobReceiptKey                 opaque requester-facing receipt
  publicCaseKey?
  state
  createdAt
  updatedAt
  retryable
  safeErrorCode?
  safeErrorParams?
```

### Revision and correction

```text
PublicRevisionSummary
  publicRevisionKey
  revisionNumber
  type                          update | clarification | correction | retraction
  rationaleCode                allowlisted
  affectedClaimKeys[]
  effectiveAt
  priorPublicUrl?
  currentPublicUrl?

PublicCorrectionNotice
  type                          clarification | correction | retraction
  rationaleCode
  affectedClaimKeys[]
  effectiveAt
  confirmedReplacementUrl?
  priorVersionUrl?
```

Inline article markers remain deferred until the backend and final gate provide:

```text
PublishedClaimAnchor
  publicationRevision
  contentHash
  blockId
  startOffset
  endOffset
  publicClaimKey
```

String matching is never used to attach a receipt to mutable published prose.

Rules:

- Public types contain no prompts, raw model/tool bodies, tokens, secrets, PII, internal risk signals, free-form model explanations, storage URIs, internal identifiers, or chain-of-thought.
- Event copy is generated in the frontend from `eventCode` and a code-specific safe-parameter schema. The projection rejects arbitrary event title/detail/reason strings.
- Claim text and excerpts require an explicit disclosure/redaction decision, URL scheme/domain validation, PII handling, copyright-aware excerpt bounds, and source-policy approval before entering any public/unlisted response.
- Unknown enum values render a safe neutral fallback and emit client telemetry; they do not crash the page.
- Dates are ISO timestamps in transport and include the server-owned civic-area timezone policy. The UI provides an absolute area-time representation even when a relative label is visible.
- The event cursor is monotonic and opaque. Clients do not derive order from local receipt time.
- Published status requires `publicationState=confirmed` and public disclosure, not a workflow prediction.
- Counts are derived by the backend projection so every client displays the same semantics.
- Private and unlisted projections are never stored in a shared/public cache or included in public analytics dimensions.

## 9. Frontend architecture

### Server and client split

- Use React Server Components for initial edition, investigation, and brief content.
- Use small client islands for search/request forms, authorized SSE activity, tabs/disclosures, and claim-receipt focus.
- Render a complete useful document before the event stream connects.
- Do not make the whole edition or investigation a client component.
- Keep ADK packages, provider SDKs, secrets, and raw event types out of the client bundle.

### Proposed component structure

```text
components/public-wire/
  edition/
    edition-header.tsx
    lead-brief.tsx
    story-list.tsx
    desk-investigations.tsx
    desk-activity.tsx
    coverage-form.tsx
  investigation/
    case-file-header.tsx
    stage-rail.tsx
    investigation-overview.tsx
    claim-ledger.tsx
    claim-row.tsx
    evidence-receipt.tsx
    source-packet.tsx
    event-stream.tsx
    event-group.tsx
    update-timeline.tsx
    correction-notice.tsx
  brief/
    provenance-ribbon.tsx
    claims-and-sources-link.tsx
    verification-summary.tsx
    publication-history.tsx
  shared/
    status-stamp.tsx
    timestamp.tsx
    degraded-banner.tsx
    empty-state.tsx
    connection-status.tsx
hooks/
  use-investigation-events.ts
lib/public-wire-view-models/
  schemas.ts
  formatters.ts
  state-labels.ts
```

Refactor the current large `components/edition/public-wire-edition.tsx` gradually. Do not rewrite the complete frontend before the new API contracts exist.

### Event stream behavior

1. Server-render the projection with `projectionRevision`, `snapshotCursor`, `streamEpoch`, and persisted initial public events.
2. For the initial native `EventSource` connection, use `?after=<snapshotCursor>&epoch=<streamEpoch>`; browsers cannot be relied on to set a custom initial `Last-Event-ID` header.
3. The server emits `id: <cursor>` on every domain event. Native reconnect may then send `Last-Event-ID` automatically.
4. Authorize the case and its current disclosure on every snapshot, stream connection, and event batch. Use same-origin HttpOnly cookie auth for requester-private streams; if custom headers are required, explicitly choose authenticated fetch streaming instead of native `EventSource`.
5. Deduplicate by `publicEventKey`, require monotonic cursor order within the stream epoch, and ignore a stale projection revision.
6. Heartbeats are SSE comments or a non-domain connection event; they never enter the civic activity list.
7. If the cursor is expired, the epoch changed, disclosure was revoked, or a retention gap exists, return the defined reset response (`409` or `410`) and refetch a fully authorized snapshot. Do not guess across a gap.
8. Private/active snapshot, stream, and polling responses are `private, no-store`. Polling uses the same projection revision, cursor, epoch, disclosure, and ETag semantics.
9. Surface connection state only when delayed/disconnected long enough to matter. Fall back to bounded polling when SSE is unsupported or repeatedly interrupted.
10. A workflow terminal state may close the active-work stream, but later disclosure, lifecycle, correction, or retraction changes invalidate the projection and appear after refetch/revisit; connection closure never implies success.

## 10. Accessibility, responsive behavior, and content safety

### Accessibility

- Meet WCAG 2.2 AA for new and materially changed surfaces.
- Status is never color-only; pair with visible text and, where useful, an icon/pattern.
- Stage rail has a semantic ordered-list representation.
- Claims and evidence relationships work with keyboard focus and touch, not hover only.
- Accordions/disclosures expose correct names, expanded states, and focus order.
- Live events use a polite `aria-live` summary region rather than announcing every token/event.
- New events do not move focus or reorder already-read content.
- Source excerpts use blockquote/citation semantics where appropriate.
- Correction notices are programmatically associated with the changed content.
- Reduced-motion users receive the same state information without transitions.
- Mobile reading order is headline/determination → claims → evidence → status/activity.

### Responsive behavior

- Desktop uses the existing wide broadsheet main-column/rail composition.
- Tablet collapses secondary rails below their owning content while preserving association.
- Mobile uses a single document flow; stage rail becomes a compact ordered status list.
- Avoid nested scroll areas on core pages. The current 90dvh investigation modal becomes a preview only; the full case file is a route.
- Tables become stacked claim/evidence records rather than horizontally scrolling debug grids.
- Persistent controls must not obscure reading or the browser's own UI.

### Content safety

- Evidence excerpts are bounded and sanitized.
- External source links pass scheme/domain policy, clearly indicate the source/open behavior, and use an appropriate referrer policy so private case URLs or requester context are not leaked.
- User-submitted topics are escaped and never rendered as trusted HTML.
- Public event/reason labels come from allowlisted codes and typed safe parameters, not raw model text.
- Claims, excerpts, URLs, and safe parameters pass public-disclosure moderation/redaction before projection; components never perform the primary secrecy decision.
- Error messages are safe, actionable, and contain no provider payloads or internal identifiers.

## 11. Performance and resilience

- Establish current Core Web Vitals and bundle-size baselines before visual changes.
- Keep the headline, current finding, and first claims server-rendered and independent of SSE.
- Lazy-load deep activity and older update history.
- Avoid canvas/WebGL and large visualization libraries for claim/source relationships.
- Keep evidence excerpts bounded in list responses; load additional authorized detail on demand.
- Paginate or window long event histories only after a measured threshold; do not add virtualization preemptively.
- Pause offscreen landing animation and avoid animating large full-page layers on low-power/reduced-motion clients.
- Cache public edition/brief projections according to freshness policy, but never cache a user-specific authorization result publicly.
- A stream failure must leave the last persisted state readable with a retry/poll path.
- A backend degraded state must render explicitly rather than falling back to seeded content without a label.

### Cache and indexing policy

- Requester-private and unlisted case snapshots, streams, polling, metadata, and error responses use `private, no-store` and never enter shared caches.
- Public active cases default to `noindex` and a short/explicit freshness policy until disclosure/indexing policy says otherwise.
- Editions use a documented ETag/revalidation policy keyed by area-registry key and public projection revision.
- Confirmed public briefs may use tagged caching keyed by publication revision/content hash.
- A clarification, correction, retraction, withdrawal, or disclosure change invalidates edition, brief, case file, metadata, structured data, sitemap, and generated social-image caches.
- Only confirmed, publicly disclosed publications are indexable. Private, unlisted, active, held, rejected, shadow, expired, and archived prior versions are `noindex`.
- Confirmed briefs define a canonical URL, truthful Open Graph state label, `datePublished`/`dateModified`, and validated `NewsArticle` JSON-LD. Active case files do not claim article publication metadata.
- Replaced prior versions remain available or unavailable according to correction/retention policy, but never compete as canonical current content.

## 12. UX telemetry

Measure whether the UI makes evidence understandable, not whether it maximizes agent spectacle.

Required events/metrics:

- edition → investigation open rate;
- claim receipt expansions and external source follows;
- time to first useful investigation content;
- job creation success, duplicate reuse, and safe failure rate;
- SSE connect/reconnect/fallback and cursor-gap rate;
- held-investigation comprehension prompt or support signal when research supports it;
- correction visibility and acknowledgment;
- coverage request completion and existing-investigation reuse;
- accessibility errors and keyboard-path completion in automated tests;
- frontend error rate by view-model schema version/state;
- Core Web Vitals and client bundle changes per surface.

Do not optimize for number of animations viewed, raw event count, or time trapped in a technical console.

Analytics must not collect source excerpt text, raw user-submitted claims, hidden technical details, or precise personal identifiers unless a separately reviewed need and consent basis exists.

## 13. Implementation phases

### UI Phase 0: Truthfulness and safety alignment

Backend dependency: backend Phase 0.

- **UI0-01 Remove unsafe trace presentation.** Stop promising preserved prompts and stop showing raw queries/technical confidence as public proof. Replace with safe static stage summaries until canonical events exist. Acceptance: public DOM/API snapshots contain no prompt, raw provider, chain-of-thought, or confidence-score fields.
- **UI0-02 Correct real/demo/degraded labels.** Ensure seeded editions, failed live requests, and provider fallbacks cannot appear as confirmed live publication. Acceptance: every fixture/runtime mode has an explicit reader label and demo cannot link to a fake confirmed publication.
- **UI0-03 Correct publication states.** Render Published only for a confirmed provider record; add pending/unknown/failed-safe presentations. Acceptance: ambiguous Senso outcomes never render as published.
- **UI0-04 Audit current claims and accessibility.** Remove operational claims the backend cannot prove, fix malformed/duplicated interaction markup, establish keyboard/contrast/reduced-motion and Core Web Vitals baselines. Acceptance: agreed audit suite and baseline report are stored.
- **UI0-05 Contain current API leakage.** Stop returning `{scan}`, raw provider/model bodies, raw error `detail`, internal IDs, prompts, and synthetic query text from public edition/scan routes; map failures to allowlisted safe errors. Acceptance: route and DOM security snapshots reject restricted fields.
- **UI0-06 Remove unsafe implicit live/tenant behavior.** Remove `live=1`/`autoRun`, arbitrary `areaName` authority, and seeded-fallback-as-live behavior; resolve area through the server registry. Fix the top-story link to use the displayed brief, exclude the lead from "Also today," and add a safe no-brief state. Acceptance: arbitrary query/slug input cannot change tenancy or trigger hidden work, and empty editions render safely.
- **UI0-07 Make current motion/controls accessible.** Disable Lenis smoothing, parallax/page transitions, sponsor-belt motion, live-dot motion, and other infinite animation under `prefers-reduced-motion`; replace interest pseudo-checkboxes with real checkboxes or correctly named `aria-pressed` buttons. Acceptance: keyboard and reduced-motion checks cover `lenis-provider.tsx`, `page-transition.tsx`, `search-dialog.tsx`, landing animation components, and `globals.css`.

Primary files: `app/page.tsx`, landing sections, edition component, brief page, content/adapters, UI tests.

### UI Phase 1: View models and design primitives

Backend dependency: shared projection/disclosure/state schemas defined in backend Phase 1. UI Phase 1 uses fixtures and primitives only; it does not claim that durable public projections exist yet.

- **UI1-01 Add public view-model schemas.** Implement strict Zod schemas and fixtures for disclosure, orthogonal states, edition, investigation, claims/evidence, coded events, requester receipts, publication, revisions, and corrections. Acceptance: unknown states degrade safely and restricted/free-form internal fields fail fixture/security tests.
- **UI1-02 Add semantic state tokens.** Extend the monochrome design system with tested blue/amber/green/red/neutral tokens and motion/reduced-motion utilities. Acceptance: contrast and status-not-color-only tests pass.
- **UI1-03 Build shared primitives.** Status stamp, stage rail, timestamp, evidence receipt, claim row, event group, correction/degraded banner, empty/error states. Acceptance: Storybook or an equivalent isolated route covers every state without requiring live providers.
- **UI1-04 Define content mapping.** Centralize reader labels, reason-code copy, provider/tool labels, date formatting, and visibility rules. Acceptance: components do not render raw backend enums or model explanations directly.

Primary files: `lib/public-wire-view-models/`, shared components, global tokens/styles, fixtures/tests.

### UI Phase 2: Asynchronous edition and coverage flow

Backend dependency: backend Phase 4 implements durable disclosure-aware public projections; backend Phase 5 exposes authorized create/status APIs. Do not ship a fake async flow before both are ready.

- **UI2-01 Split the edition component.** Move server-readable content to RSC and isolate interactive search/activity islands. Acceptance: initial edition content works without client JavaScript except interactive enhancements.
- **UI2-02 Replace synchronous scan.** POST a requester receipt, handle only public/same-requester case reuse, and navigate with an authorized opaque case key when allowed. Acceptance: refresh/retry does not create duplicate work, disclose another requester's case, or wait for the entire workflow.
- **UI2-03 Add "On the desk."** Present explicitly public active/held/recently updated cases separately from confirmed briefs and routine filters. Acceptance: no private count/topic leaks and every eligible state has concise, non-sensational copy.
- **UI2-04 Make coverage requests trackable.** Return an authorized opaque case/status receipt and safe queued/reused/rate-limited outcomes; remove raw scoring. Acceptance: forms retain input on retryable errors, announce outcomes accessibly, and generic responses prevent private-case enumeration.
- **UI2-05 Add a bounded activity strip.** Show a small set of disclosure-approved coded events only for relevant public work. Acceptance: it never becomes an unbounded firehose, reveal private activity, or move focus/scroll.

Primary files: area route, edition components, coverage form, API client/view adapter, end-to-end tests.

### UI Phase 3: Investigation case file

Backend dependency: backend Phase 4 implements canonical event/public projection/disclosure storage; backend P5-04/P5-05 exposes authorized snapshots and persisted streams. Shadow case files remain admin-authenticated, `private, no-store`, and `noindex`.

- **UI3-01 Add the canonical route.** Implement the opaque-key server-rendered case-file shell with town-registry resolution, disclosure authorization, private/unlisted/public cache/index rules, and indistinguishable not-found/unauthorized handling where required. Acceptance: authorized reload preserves the case without exposing any internal identifier or cross-tenant existence.
- **UI3-02 Build overview and stage rail.** Show current determination, stage state, material claim/source counts, and gate/hold reason. Acceptance: first useful content does not depend on the live stream.
- **UI3-03 Build claim/evidence ledger.** Connect material claims to supporting/contradicting receipts with keyboard/touch selection and progressive details. Acceptance: every displayed relationship maps to a backend evidence link and missing evidence is explicit.
- **UI3-04 Build resilient activity stream.** Implement projection revision + snapshot cursor + stream epoch, initial `?after=`, SSE `id:` fields, same-origin/private authorization, disclosure recheck, heartbeat, reset/refetch on retention gaps, dedup, and polling fallback. Acceptance: snapshot/stream race, expired cursor, epoch reset, visibility revocation, proxy disconnect, correction after workflow completion, worker/API restart, focus, and scroll tests pass without gaps/duplicates/false completion.
- **UI3-05 Visualize bounded repair.** Render evidence-repair iterations as new-source → recheck → outcome branches. Acceptance: no model-thinking animation or repeated loop beyond backend facts.
- **UI3-06 Add update/correction timeline.** Show revision reasons, affected claims, and linked publication changes. Acceptance: corrections are prominent, immutable, and accessible.
- **UI3-07 Retire the full investigation modal.** Keep an edition preview/drawer only; route deep inspection to the case file. Acceptance: no nested-scroll modal is required for core investigation tasks.

Primary files: new investigation route/components, SSE hook, view projections, accessibility/integration tests.

### UI Phase 4: Published brief receipts

Backend dependency: confirmed publication record and stable public claim/evidence projection.

- **UI4-01 Add provenance ribbon and case link.** Acceptance: published, updated, corrected, and resolved variants are accurate and never based on intent alone.
- **UI4-02 Add brief-level claims and sources link.** Show a compact material-claim/source summary and link to the investigation ledger. Acceptance: no string-matched inline anchors and article reading remains primary.
- **UI4-03 Replace debug audit.** Use a concise verification-stage summary and link deep activity to the investigation. Acceptance: article reading remains primary and restricted technical fields are absent.
- **UI4-04 Promote clarifications, corrections, retractions, and history.** Use typed revision/notice contracts with affected claims and confirmed replacement relationships. Acceptance: prior/current/canonical relationships are understandable and immutable.
- **UI4-05 Implement metadata and cache policy.** Replace demo-only static params/seeded metadata with confirmed public projections; define canonical URL, truthful Open Graph/JSON-LD dates/state, `noindex` rules, cache tags, and correction/retraction invalidation. Acceptance: only confirmed public briefs are indexable and stale metadata/social images are invalidated.

Primary files: brief route/components, adapters, SEO/structured data as separately validated, end-to-end tests.

### UI Phase 5: Landing page showcase

Backend dependency: production components/contracts and at least one approved public fixture or live investigation projection.

- **UI5-01 Update the capability story.** Replace the fixed five-provider chain with watch/compare/verify-repair/publish-update stages. Acceptance: copy remains true if providers or agent topology change.
- **UI5-02 Build the evidence spread.** Reuse production schemas and visual primitives in a contained editorial showcase, but do not mount SSE hooks or the complete interactive case file. Acceptance: fixture/live label is accurate and the interaction works without canvas or hover.
- **UI5-03 Data-back live proof.** Show current public counts/activity only when the API confirms freshness; otherwise show capability copy. Acceptance: outage/staleness cannot leave fake live language.
- **UI5-04 Remove deceptive ambient workflow motion.** Delete the perpetual network particles/fixed-agent swarm treatment and replace it with static editorial rules plus finite claim/receipt selection highlights. Honor reduced motion and keep performance within approved budgets. Acceptance: no animation implies live work without a persisted event and no regression against Phase 0 baselines beyond approved tradeoffs.

Primary files: landing sections/content, reused public-wire components, visual regression/accessibility/performance tests.

### UI Phase 6: Deferred product extensions

Ship separately only after matching backend phases:

- agenda-to-outcome visual timeline;
- reader correction/evidence submission flow;
- source-health reader indicators;
- watchlist/follow controls and notifications;
- multilingual brief switcher and linked translations;
- public evidence diffs across source/artifact revisions;
- civic source-mesh filters.
- inline published-claim markers, only after `PublishedClaimAnchor` is final-gate-verified for the exact publication revision/content hash;

Each needs its own privacy, authorization, abuse, accessibility, content, and success-metric review.

## 14. Test plan

### Contract and state tests

- every independent workflow/publication/lifecycle/correction/visibility/freshness axis and unknown-state fallback;
- badge derivation across pending/unknown/failed/confirmed/withdrawn publication states;
- claim support, contradiction, missing, superseded, and checking states;
- real/demo/degraded/stale mode distinctions;
- private/unlisted/public disclosure, town-registry scope, requester ownership, public-key/internal-id separation, and non-enumerating duplicate reuse;
- visibility rules reject prompts, arbitrary event/detail text, raw tool/model bodies, PII, internal identifiers/signals, storage URIs, unapproved URLs, and overlong excerpts;
- projection revision, snapshot cursor, stream epoch, timestamp/area-timezone, and cursor ordering;
- update/clarification/correction/retraction and canonical replacement relationships;
- rate limit, duplicate reuse, unauthorized, not found, expired, cancelled, and retryable failure.

### Interaction tests

- search creates/reuses only an authorized/public case and navigates once without revealing a private match;
- SSE closes the snapshot/stream race, reconnects from cursor, handles epoch/retention reset and disclosure revocation, deduplicates, and falls back to polling;
- activity updates do not move focus/scroll or announce every event;
- claim selection highlights correct receipts by mouse, keyboard, and touch;
- disclosures preserve focus and accessible names;
- external source links have accurate names/context;
- correction notice links to affected claims/history;
- full investigation works without the legacy modal.
- metadata/indexing/canonical/cache behavior changes correctly on publication, correction, retraction, withdrawal, and visibility transitions.

### Visual and responsive tests

- landing, edition, investigation, and brief at agreed mobile/tablet/desktop breakpoints;
- all state colors in normal, high-contrast/forced-color where supported, and reduced motion;
- long headline, long source title, long excerpt, many claims, no claims, one source, contradictory sources;
- stale/degraded/error banners;
- stream active and terminal states;
- no horizontal overflow or nested core-page scroll traps.
- Lenis, page transitions, parallax, sponsor belt, live dot, and landing ambient animation are disabled in reduced-motion mode.

### Accessibility and performance gates

- automated accessibility checks plus manual keyboard and screen-reader smoke paths;
- WCAG 2.2 AA contrast and name/role/value for changed surfaces;
- reduced-motion verification;
- server-rendered useful content without SSE/JavaScript enhancement;
- bundle and Core Web Vitals comparison against Phase 0 baselines;
- no provider/ADK SDK in client bundles.

## 15. Rollout and feature flags

```text
PUBLIC_WIRE_UI_CASE_FILES=false
PUBLIC_WIRE_UI_LIVE_EVENTS=false
PUBLIC_WIRE_UI_CLAIM_RECEIPTS=false
PUBLIC_WIRE_UI_BRIEF_PROVENANCE=false
PUBLIC_WIRE_UI_LANDING_SHOWCASE=false
```

These flags control UI exposure, not backend publication safety. They must not bypass backend authorization or gates.

Rollout order:

1. Internal fixtures and isolated components.
2. Read-only shadow case files for admin-authenticated testers only; `private, no-store`, `noindex`, and absent from public metrics/search.
3. Public case files for non-sensitive public investigations.
4. Async edition flow and persisted events.
5. Published brief receipts/corrections.
6. Landing showcase after production components are stable.

Rollback preserves server-rendered edition/brief reading. Disabling live-event UI must not hide the latest persisted state or correction notice.

## 16. File-level migration map

| Current file/surface | Planned change |
| --- | --- |
| `app/local/[area]/page.tsx` | Resolve the server area registry; remove arbitrary `areaName` authority/`live` auto-run; fetch only the versioned public edition projection |
| new `app/local/[area]/investigations/[publicCaseKey]/page.tsx` | Disclosure-authorized opaque-key case route with private/unlisted/public cache and indexing rules |
| `app/briefs/[id]/page.tsx` | Remove demo-only static params/seeded metadata; add reading-first provenance, case-ledger link, correction/retraction presentation, canonical metadata/cache invalidation; remove prompt/debug framing |
| `components/edition/public-wire-edition.tsx` | Split into server-oriented sections/client islands; fix displayed-brief link, omit lead duplication, add no-brief state, and remove seeded-as-live/auto-run/full case-file modal behavior |
| `components/landing/how-it-works.tsx` | Replace fixed provider chain and perpetual network particles with durable newsroom capabilities and static editorial relationships |
| `components/landing/agent-swarm.tsx` | Remove provider-centric moving swarm; keep providers in colophon and reuse finite evidence/stage visual primitives |
| `components/landing/trust-layer.tsx` | Use reader-safe view fixture/contract rather than hard-coded synthetic audit prose |
| `components/landing/search-dialog.tsx` | Use the server area registry and durable authorized receipt flow; remove arbitrary slug construction, `live=1`, and pseudo-checkbox semantics |
| `content/public-wire-content.ts` | Move demo fixtures to typed, explicitly labeled test/showcase fixtures; stop being production truth |
| `components/landing/lenis-provider.tsx` and `components/page-transition.tsx` | Disable smoothing/parallax/transitions for reduced-motion users |
| `app/globals.css` | Add semantic state tokens, reduced-motion overrides for infinite animations, and shared evidence/stage utilities |
| public API routes/adapters | Remove raw `{scan}`, raw error detail, prompts/provider bodies/internal IDs; return coded reader-safe projections only |
| new view-model modules | Own schemas, state/reason copy, visibility, and safe formatting |

## 17. Definition of done

- The edition remains recognizably PublicWire and prioritizes civic news over agent operations.
- An authorized reader can open/reload and, when disclosure permits, share a durable opaque-key investigation without crossing town/requester boundaries.
- Material claims visibly resolve to real public evidence receipts.
- Active, held, published, corrected, resolved, failed, and degraded states are distinct and truthful.
- Workflow, publication, lifecycle, correction, visibility, and freshness remain orthogonal; public badges never imply a state the backend has not confirmed.
- Real canonical events stream and reconnect without fabricated progress or UI instability.
- Published briefs remain readable and show concise provenance plus correction history.
- Landing-page demonstrations reuse production contracts/components and are accurately labeled.
- No public surface exposes prompts, chain-of-thought, raw provider responses, secrets, PII, or truth-like confidence scores.
- No public URL, projection, stream, metadata, cache, or analytics payload exposes an internal investigation/job/session/invocation/artifact/event identifier or undisclosed case existence.
- New and changed surfaces pass the accessibility, responsive, contract, resilience, and performance gates.
- Deferred visual features remain deferred until their backend and product cases exist.

## 18. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| ADK concepts overwhelm ordinary readers | Use newsroom stages and progressive disclosure; keep ADK/provider metadata secondary |
| Visual spectacle implies fake autonomy | Animate only persisted state transitions and use accurately labeled fixtures/live data |
| Event stream becomes a debug firehose | Group by reader stage, default-collapse low-level events, bound the edition strip, deep-link the case file |
| Evidence UI implies certainty | Show claim-specific support/contradiction/freshness and explicit unknowns; no truth percentage |
| UI races backend state | Versioned projections, monotonic cursors, deduplication, persisted initial state, safe unknown fallback |
| Private/held allegation becomes a public artifact | Independent disclosure gate, requester/town authorization, opaque public keys, coded/redacted projections, `noindex`/no-store defaults |
| One badge misstates publication or correction | Orthogonal workflow/publication/lifecycle/correction/visibility/freshness fields and deterministic badge derivation |
| Snapshot and stream leave a missing event window | Snapshot cursor/stream epoch protocol, SSE ids, reset/refetch on retention gaps, and race/restart tests |
| Correction leaves stale search/social content | Typed correction/retraction contract plus cache, metadata, sitemap, structured-data, and social-image invalidation |
| New case file becomes a dashboard | Preserve broadsheet reading order, limit actions, make overview/evidence primary and activity secondary |
| Mobile becomes nested-scroll heavy | First-class route, single document flow, stacked receipts, modal only for preview |
| Landing blocks the core build | Schedule it after production case-file and evidence components |
| Accessibility regresses with live/highlight behavior | Polite announcements, stable order/focus, text labels, keyboard/touch equivalence, reduced motion |
| Frontend leaks internal data | Dedicated public view models, allowlisted reason copy, schema/security snapshots, no direct ADK event binding |
| Scope expands into newsroom platform | Explicit deferred list and per-phase backend dependencies/exit gates |

## 19. Adversarial review record

A separate subagent reviewed this UI/UX plan against the current frontend and the companion backend plan without editing files. All material findings were accepted:

| Priority | Finding | Correction incorporated |
| --- | --- | --- |
| P0 | Active/held and user-submitted cases could become public without a separate disclosure or tenant decision | Added private/unlisted/public disclosure independent of workflow, server area registry, requester scope, non-enumerating reuse, opaque public keys, and private-by-default rules |
| P0 | Workflow, publication, lifecycle, correction, visibility, and freshness were collapsed into one reader status | Added orthogonal state axes and deterministic badge rules; confirmed/public is required for Published |
| P0 | Reader-safe events still carried free-form model/event text and possible internal IDs | Replaced them with allowlisted event codes + typed safe parameters; removed public technical details and added claim/excerpt/URL/PII disclosure policy plus Phase 0 API containment |
| P1 | SSE lacked a snapshot race, epoch, retention-gap, authorization, and reset protocol | Added projection revision, snapshot cursor, stream epoch, initial `?after=`, SSE ids, comment heartbeats, disclosure recheck, `409/410` refetch, private/no-store, and equivalent polling |
| P1 | Frontend/backend phases were circular | Backend Phase 1 defines shared schemas, Phase 4 implements projections, Phase 5 exposes APIs/streams; UI1 is fixture-only and UI2/UI3 integrate afterward; backend P5-07 now cross-references this plan |
| P1 | Inline article evidence markers lacked immutable published-text anchors | Deferred markers; launch uses the case ledger and brief-level claims/sources link; documented the future final-gate-verified `PublishedClaimAnchor` contract |
| P1 | Correction, retraction, SEO, and cache invalidation semantics were incomplete | Added typed revision/correction notices, index/canonical/JSON-LD rules, private/active no-store/noindex behavior, tagged confirmed-brief caching, and broad invalidation requirements |
| P1 | Current perpetual landing particles contradicted the no-deceptive-spectacle rule | UI5 now removes the network particles/fixed swarm and uses static editorial relationships with finite selection highlights |
| P2 | Reduced-motion requirements were not mapped to the current implementation | Added file-specific Lenis, page transition, parallax, infinite animation, and pseudo-checkbox remediation/tasks/tests |
| P2 | Current-code migration missed unsafe query/slug behavior and concrete edition bugs | Added removal of `live=1`/`autoRun`/arbitrary area authority/seeded-live fallback, correct displayed-story links, lead de-duplication, no-brief state, and landing fixture-only behavior |

The reviewer recommended retaining the core product direction: edition → investigation → public record, a routed case file instead of the 90dvh modal, reading-first briefs, claim/evidence receipts rather than truth scores, real persisted transitions only, RSC initial content with small client islands, the monochrome broadsheet identity, and the explicit deferral of canvas graphs/admin tools/collaboration/notifications/personalization/speculative ADK controls.

## 20. Implementation status

The 2026-07-20 implementation enables contract-valid reference runs, case files, claim receipts, provenance, and the landing newsroom by default while keeping live events separately gated. Reference editions and outputs are noindex and mechanically distinct from real provider-confirmed publications. Ordinary routes do not expose shadow cases. The independent implementation audit and remaining accessibility, resilience, integration, and production-brief gates are recorded in `docs/PUBLIC_WIRE_ADK_IMPLEMENTATION_AUDIT.md`.
