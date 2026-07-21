# Public Wire

**An evidence-first local news desk built with Google Agent Development Kit (ADK), Gemini, PostgreSQL, and Next.js.**

Public Wire turns a coverage request into a durable investigation: discover a civic source, capture the actual bytes, extract atomic claims, bind them to exact excerpts, verify the complete claim set, draft a brief, and expose a public-safe case projection.

Its governing rule is simple: **models propose; deterministic code owns evidence, state transitions, visibility, and publication.**

## The 30-second technical readout

| Concern | Implementation | Authority |
|---|---|---|
| Web and API | Next.js 16, React 19, server components, route handlers | Serves product views and admits work; never runs an investigation inline |
| Orchestration | Google ADK `1.3.0`, custom `BaseAgent`, `ParallelAgent`, and eight schema-bound desk specialists | Coordinates model work; cannot publish or grant source authority |
| Model backend | Gemini Developer API via explicit `Gemini({ vertexai: false })` | Produces structured proposals; no Vertex AI dependency |
| Durable control plane | PostgreSQL jobs, leases, attempts, evidence, events, projections, gates | Canonical product state |
| Discovery and capture | Nimble discovery followed by an independent allowlisted HTTPS fetch | Discovery suggests URLs; only captured bytes become evidence |
| Public read model | Opaque keys, requester-scoped private projections, approved public projections | Internal IDs and raw ADK state do not cross the API boundary |
| Publication | Server-owned `PostgresPublicationService` and Senso provider boundary | Exact-content gates, idempotent intents, and verified provider confirmation |

### What is strong here

- **Evidence is mechanically addressable.** A persisted link names an artifact ID and version, source URL, exact excerpt, offsets, relation, and extractor/verifier lineage.
- **The probabilistic core is surrounded by deterministic checks.** Strict Zod schemas are necessary but not sufficient; server code independently validates claim coverage, artifact identity, excerpts, source authority, revisions, leases, and hashes.
- **Job authority survives process failure.** PostgreSQL persists renewable, token-fenced leases, bounded retries, and dead-letter state; deployment must supervise the worker and place its artifact directory on durable storage.
- **Publication is isolated from agents.** Senso is not an ADK tool. The application service rechecks exact-content reviews, live ownership, runtime controls, and provider confirmation.
- **The public contract is a projection, not a database mirror.** Stable opaque identifiers, allowlisted event shapes, disclosure records, and `no-store` responses constrain what a reader can observe.

## Product experience

The product leads with the resident answer, then progressively reveals what Public Wire combined, what its agents added, the exact evidence path, and the deterministic decision rules. Each case file also includes an interactive, record-bound question console. It answers four reader questions without generating new facts: what supports this, what the agents caught, what changed, and why the result matters.

The edition-level reader-audit workbench provides three interactive views:

- **Resident answer:** bottom line, new facts, concrete actions, known unknowns, and traceable workflow contributions;
- **Source network:** animated source → verified-claim → resident-answer paths with direct official-page links;
- **Decision rules:** clickable observed-versus-required checks, rule owner, consequence, policy version, linked claims, linked receipts, and the exact workflow moment.

“Watch the check” opens a keyboard-accessible player with previous/next, autoplay, pause, three playback speeds, selectable steps, animated repair/revision loops, and reduced-motion behavior. Rich moments show **input → operation → durable output → resident consequence** before the deeper ADK executor/event/state record.

The flagship June 2026 NYC Bin briefing joins six receipts from four DSNY and NYC311 artifacts into six material claims. No single captured artifact supplies the full compliance answer. Its reference run shows an initial evidence gap, one bounded retrieval of two NYC311 guides, global re-verification, a writer regression, a reviewer-directed bounded rewrite, and a complete second review. The output remains mechanically distinct from provider-confirmed publication.

Three supporting NYC paths expose a missing-evidence hold, a source-version change with no article impact, and a same-source status conflict that survives dissent assessment. Strict fixture validation rejects incorrect source counts, unresolved links, unsupported aggregation claims, and any candidate paired with a failed publication checkpoint.

Open [`/#agents`](http://localhost:3000/#agents), the full [`NYC briefing`](http://localhost:3000/briefs/nyc-bin-rules-june-2026), [`/local/new-york-city`](http://localhost:3000/local/new-york-city), or follow any claim, receipt, moment, or decision link from the audit workbench.

## Architecture

The web plane is request/response; the investigation plane is a long-lived worker. PostgreSQL connects them and remains authoritative.

```mermaid
flowchart LR
    browser["Browser"]

    subgraph web["Next.js web plane"]
        pages["Server-rendered product views"]
        api["Admission, receipt, case, and SSE APIs"]
        scope["Signed requester scope"]
    end

    subgraph data["Canonical data plane"]
        pg[("PostgreSQL")]
        artifacts[("Versioned artifacts")]
        projection["Public-schema projections"]
        outbox["Event outbox"]
    end

    subgraph worker["Investigation worker"]
        lease["Lease and attempt manager"]
        discover["Nimble discovery"]
        grounded["ADK Google Search grounding\nlead discovery only"]
        fetch["Policy-enforced direct fetch"]
        desk["Google ADK desk"]
        validate["Deterministic evidence checks"]
    end

    gemini["Gemini Developer API"]
    telemetry["Prepared ClickHouse / Datadog destinations"]
    senso["Senso"]

    browser --> pages
    browser --> api --> scope --> pg
    pages --> projection
    pg --> projection

    lease <--> pg
    lease --> discover --> fetch --> artifacts
    desk -- "missing evidence" --> grounded --> fetch
    artifacts --> desk <--> gemini
    desk --> validate --> pg
    pg --> outbox -. "dispatcher required" .-> telemetry
    pg -. "gated publication" .-> senso
```

### Runtime boundaries

- **ADK session state:** `DatabaseSessionService` when `DATABASE_URL` exists; `InMemorySessionService` only for local use.
- **ADK artifacts:** `FileArtifactService` under `PUBLIC_WIRE_ARTIFACT_DIR`, paired with durable artifact identity, hashes, and derivation metadata in PostgreSQL.
- **Product truth:** normalized PostgreSQL records define investigations, claims, publication state, and public visibility. ADK session state does not.
- **Process model:** web and worker must be deployed separately. Next.js does not start `workers/public-wire-investigation.ts`.

## Run it locally

Requirements: Node.js `24.14.0` and npm `11.8.0`.

### Product shell

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The ADK newsroom, case files, claim receipts, and provenance surfaces are enabled by default. Each can still be disabled explicitly:

```dotenv
PUBLIC_WIRE_UI_CASE_FILES=false
PUBLIC_WIRE_UI_CLAIM_RECEIPTS=false
PUBLIC_WIRE_UI_BRIEF_PROVENANCE=false
PUBLIC_WIRE_UI_LANDING_SHOWCASE=false
```

### Durable ADK path

Add at least:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/public_wire
GEMINI_API_KEY=...
NIMBLE_API_KEY=...
PUBLIC_WIRE_REQUEST_SCOPE_SECRET=replace-with-at-least-32-random-characters

PUBLIC_WIRE_AI_MODE=adk
PUBLIC_WIRE_ADK_MODEL=gemini-2.5-flash
```

Next.js loads `.env.local`; the standalone scripts inherit the shell environment:

```bash
set -a
source .env.local
set +a
npm run db:migrate
```

Enable ADK processing in the durable control plane:

```sql
UPDATE runtime_controls
SET ai_mode = 'adk',
    updated_at = now()
WHERE control_key = 'canonical';
```

Then run the two processes in separate terminals. Source `.env.local` again in the worker terminal.

```bash
npm run dev
```

```bash
set -a
source .env.local
set +a
npm run worker:public-wire
```

## Google ADK desk

The canonical runner is under `lib/adk/public-wire/`. It pins ADK and ADK Devtools to `1.3.0` and explicitly selects the Gemini Developer API:

```ts
const model = new Gemini({
  apiKey: config.geminiApiKey,
  model: config.model,
  vertexai: false,
});
```

The runner rejects any backend other than `GoogleLLMVariant.GEMINI_API`.

### Workflow and outputs

`DeskWorkflow` is a custom ADK `BaseAgent`. It owns conditional flow; eight `LlmAgent` specialists own narrow structured outputs. After the primary support verifier passes, a `ParallelAgent` runs temporal, source-authority, and contradiction perspectives independently. The application requires exact claim-set coverage from every perspective.

```mermaid
flowchart TD
    source(["Captured normalized source"])
    extract["Extractor\npw_extraction"]
    verify["Claim verifier\npw_verification"]
    coverage{"Exact claim-set coverage\nand all supported?"}
    panel["Parallel verifier panel\ntime · authority · contradiction"]
    panelGate{"Every perspective covers\nevery claim and passes?"}
    edit["Editorial classifier\npw_editorial"]
    decision{"Outcome is publish?"}
    write["Writer\npw_draft"]
    review["Factual reviewer\npw_factual_review"]
    pass{"Review passes?"}
    budget{"Revision still available?"}
    ready(["ADK desk outcome:\npublish_ready"])
    held(["held with reason code"])

    source --> extract --> verify --> coverage
    coverage -- "no" --> held
    coverage -- "yes" --> panel --> panelGate
    panelGate -- "no" --> held
    panelGate -- "yes" --> edit --> decision
    decision -- "no" --> held
    decision -- "yes" --> write --> review --> pass
    pass -- "no" --> budget
    budget -- "yes · one maximum" --> write
    budget -- "no" --> held
    pass -- "yes" --> ready
```

| Stage | Strict output | Server guard |
|---|---|---|
| Extract | Candidate context, atomic claims, importance, exact evidence references | Unique claim keys and bounded reference shapes; missing material evidence remains explicit |
| Verify | One outcome and issue-code set per claim | Returned keys must equal the extracted key set exactly |
| Verifier panel | Independent time, authority, and contradiction result for every claim | Perspective identity and complete claim coverage are enforced; any failure holds |
| Classify | `publish`, `hold`, `reject`, or `needs_evidence` plus coded reasons | Only `publish` advances |
| Write | Headline, prose, `usedClaimKeys` | Every used key must exist in the current extraction |
| Review | `pass`/`fail`, factual issues, separate style warnings | A pass cannot contain factual issues |
| Revise | Prior draft plus typed review feedback | At most one rewrite; the new draft receives a complete factual re-review |
| Terminal | `publish_ready` or `held` with a reason code | `publish_ready` is not publication authority |

Specialists use `includeContents: "none"`, cannot transfer to peers or a parent, and receive schema-bound state through explicit JSON instruction providers with untrusted-data boundaries. Temperatures are zero except the writer (`0.2`).

### Invocation shell

Every runner installs:

- `ExecutionBudgetPlugin` for model-call, tool-call, and timeout budgets;
- `SourceSafetyPlugin` for future ADK tool URL arguments;
- `ProvenancePlugin` to hash/redact ADK content and persist correlated event envelopes;
- `TrajectoryPlugin` to persist content-free run, agent, model, and tool spans without prompts, bodies, secrets, or hidden reasoning.

The ADK invocation defaults to 12 model calls, 24 tool calls, and a 45-second callback budget. Direct Mentor and Lapdog review calls are bounded by the worker deadline but sit outside those ADK plugin counters. Initial source acquisition and all evidence-producing fetches remain worker-owned network operations. When the desk returns `MISSING_EVIDENCE`, the canonical worker invokes a maximum-two-iteration recovery loop. Nimble supplies structured candidates; a dedicated ADK `LlmAgent` with Google Search grounding supplies current official-page leads when needed. Leads never count as evidence: the worker re-applies the HTTPS allowlist, DNS and redirect protections, byte limits, canonical capture, artifact versioning, and novel normalized-content-hash check before rerunning the complete desk.

Repair candidates remain in memory until the bounded search accepts them. Only then does the worker begin a lease-fenced capture commit. Cancellation before acceptance creates no artifact or source observation; cancellation after commit begins preserves the accepted capture as internal attempt history but blocks evidence, projection, and publication writes for that attempt.

### Agentic loop status

| Capability | Design guarantee |
|---|---|
| Extract → verify → parallel panel → classify → write → factual review | Schema-validated specialist sequence with independent time, authority, and contradiction perspectives |
| Draft correction | One reviewer-directed rewrite maximum; full review reruns and a second failure holds |
| Evidence repair | Canonical maximum-two-iteration loop; targeted material gaps, grounded discovery leads, novel captured hashes, then complete desk rerun |
| Model and tool execution | ADK callback counters plus a worker-owned absolute deadline |
| Failure recovery | Durable attempts, renewable leases, bounded retries, and dead-letter state |
| Editorial holds | Explicit terminal outcomes with coded reasons; no silent fallback |
| Evidence dissent | One typed resolver invocation per persisted conflict fingerprint; deterministic policy prevents equal-authority voting |
| Source refresh | Durable, idempotent operation; unchanged normalized hashes stop before ADK/model work |
| Workflow promotion | Partial-order regression corpus with exact workflow/build/model/prompt/schema/policy/evaluator/corpus attestation |

The result is a deliberately bounded agentic desk with deterministic termination.

### Dissent, source change, and promotion loops

```mermaid
flowchart LR
    verify["Extract + verify"] --> persist["Persist provisional conflict + evidence"]
    persist --> dissent["One typed ADK dissent proposal"]
    dissent --> policy{"Deterministic policy"}
    policy -->|"equal authority / same scope"| hold["Unresolved material · hold"]
    policy -->|"scope or authority established"| gate["Complete evidence gate"]

    watch["Durable source watch"] --> hash{"Normalized hash"}
    hash -->|"unchanged"| stop["Stop before model calls"]
    hash -->|"changed"| revision["Immutable observation + revision"]
    revision --> affected["Recheck source-dependent claim lineages"]
    affected --> gate

    eval["Locked partial-order eval suite"] --> promote{"Zero false-publish + zero safety violations"}
    promote --> release["Active exact-digest workflow release"]
    release --> gate
```

Agents may propose only `resolved_supported`, `scoped_difference`, or `unresolved_material`. Authority, effective dates, scope metadata, conflict fingerprints, publication decisions, and human correction/retraction authority remain application-owned. A `404` creates an unreachable observation; it never creates a retraction. Authenticated internal dispositions record actor, expected revision, fingerprint, rationale, decision, and idempotency key. They update PublicWire's local record and never imply that an external publisher changed its copy.

The checked-in evaluation corpus is a deterministic trajectory-contract suite: it validates partial ordering, required/forbidden actions, publication invariants, and safety outcomes. It does not claim that Gemini was executed unless an evaluation run explicitly records a live model-backed trace.

## Evidence and provenance

Nimble output is discovery metadata, not evidence. The worker independently downloads the selected HTTPS source, stores raw and normalized versions, and validates every model reference against the normalized text.

```mermaid
flowchart LR
    candidate["Candidate URL"] --> policy["Host, DNS, redirect, and size policy"]
    policy --> raw["Raw artifact vN + SHA-256"]
    raw --> normalized["Normalized artifact vN + derivation"]
    normalized --> excerpt["Exact excerpt and offsets"]
    claim["Atomic claim revision"] --> link["EvidenceLink"]
    excerpt --> link
    link --> check{"Deterministic validation"}
    check --> matrix["EvidenceMatrix"]
    matrix --> decision["WorkflowDecision"]
```

The server verifies:

1. the host is allowlisted and DNS does not resolve to private/local space;
2. every redirect is revalidated and the streamed body stays under the byte cap;
3. artifact name, version, and source URL match the captured artifact;
4. `normalizedText.slice(startOffset, endOffset) === excerpt`;
5. verifier keys are unique and exactly cover extractor keys;
6. source authority comes from the server-owned area registry, never the model;
7. the publication evidence gate requires a material claim set, no blocking contradiction or missing evidence, and at least one official source.

Stable UUIDs derive claim/evidence identities from investigation, revision, claim key, and reference content. Stable opaque mappings are created separately for public claims and receipts.

## Durable job execution

The worker claims one job with a renewable lease. Canonical evidence, review, state, and projection writes require the current revision, job attempt, lease token, running state, and unexpired lease.

```mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running: claim lease
    running --> running: heartbeat
    running --> complete: persist terminal projection
    running --> queued: retryable failure, attempts below 3
    running --> cancelled: cancellation observed
    running --> failed: non-retryable failure before cap
    running --> dead_letter: third failed attempt
    running --> queued: expired lease recovered below cap
    running --> dead_letter: expired lease recovered at cap
    complete --> [*]
    failed --> [*]
    cancelled --> [*]
    dead_letter --> [*]
```

The worker deadline is the configured ADK timeout plus 90 seconds; its lease adds another 30 second recovery margin. Heartbeats run every 5 to 15 seconds. A partial unique index permits only one running attempt per investigation, and retries stop after three attempts.

The worker reconciles observed ADK event IDs with persisted envelopes before accepting the output. A stale worker cannot persist evidence, reviews, state, or projections after losing its lease.

## PostgreSQL model

PostgreSQL holds the canonical evidence, execution, source-observation, change-assessment, evaluation, release, and public-projection records plus `public_wire_schema_migrations`. Ordered forward-only SQL migrations run under an advisory lock.

```mermaid
flowchart LR
    subgraph execution["Admission and execution"]
        area["area_registry"] --> investigation["investigations"]
        controls["runtime_controls"] --> jobs["investigation_jobs"]
        quotas["admission_quotas"] --> jobs
        investigation --> jobs --> attempts["investigation_job_attempts"]
    end

    subgraph evidence["Evidence and decision lineage"]
        investigation --> candidates["investigation_candidates"]
        investigation --> artifacts["source_artifacts"]
        investigation --> claims["claims"]
        claims --> links["evidence_links"] --> artifacts
        investigation --> decisions["workflow_decisions"]
        investigation --> reviews["reviewer_results"]
        investigation --> gates["final_gate_results"]
    end

    subgraph events["Events and read models"]
        attempts --> envelopes["event_envelopes"] --> outbox["event_outbox"]
        investigation --> disclosure["investigation_disclosures"]
        disclosure --> snapshots["public_projection_snapshots"]
        snapshots --> publicEvents["public_event_projections"]
    end

    subgraph publication["Publication ledger"]
        gates --> intents["publication_intents"] --> publications["publications"]
        publications --> corrections["corrections"]
    end
```

Key database invariants include:

- composite artifact identity: `(artifact_id, artifact_version)`;
- evidence foreign keys to the exact artifact version;
- event foreign keys from claims, evidence, decisions, and final gates;
- one running attempt per investigation;
- requester-scoped idempotency for jobs and coverage requests;
- a trigger that blocks investigation revision changes while a publication intent is pending.

ClickHouse provides analytics and civic memory projections. PostgreSQL is canonical. ClickHouse and ADK sessions are not.

## Public projection and API

The public schema separates workflow, publication, lifecycle, correction, visibility, freshness, and runtime mode. This prevents “publish ready” from being confused with “provider confirmed,” or “resolved” with “public.”

```mermaid
flowchart TD
    internal[("Internal records and ADK events")]
    builder["Allowlisted projection builder"]
    private["Requester-owned private projection"]
    disclosure{"Public disclosure approved?"}
    approved["approved_projection"]
    api["Case API"]
    events["SSE / polling transport"]
    reader["Reader UI"]

    internal --> builder
    builder --> private --> api
    builder --> disclosure
    disclosure -- "no" --> hidden["404 / hidden"]
    disclosure -- "yes" --> approved --> api
    api --> reader
    private --> events
    approved --> events --> reader
```

| Route | Contract |
|---|---|
| `POST /api/public-wire/case-requests` | Feature-gated, ADK-mode-only, idempotent durable admission |
| `GET /api/public-wire/job-receipts/[jobReceiptKey]` | Requester-scoped job state |
| `GET /api/public-wire/cases/[publicCaseKey]` | Requester-owned private or approved public projection; shadow always hidden |
| `GET /api/public-wire/cases/[publicCaseKey]/events` | SSE with cursor/epoch reset and polling fallback |
| `POST /api/public-wire/edition` | Retired; returns `410` and points to case requests |
| `POST /api/public-wire/scan` | Admin-only read/hold compatibility route with a sanitized response |

Authorization uses an HMAC-signed, `httpOnly` `pw_requester_scope` cookie. Only its SHA-256 hash is stored. Unauthorized and nonexistent opaque keys return the same 404 shape.

The SSE transport supports `Last-Event-ID`, `projectionRevision`, `snapshotCursor`, `streamEpoch`, heartbeat comments, reset responses, and polling. Public events use an allowlisted discriminated union rather than exposing raw ADK payloads.

## Publication boundary

Senso is outside the agent graph. Only `PostgresPublicationService` can invoke it.

```mermaid
flowchart TD
    brief["Canonical brief payload"] --> hash{"Exact payload and reviewed hashes match?"}
    hash -- "no" --> stop(["Blocked"])
    hash -- "yes" --> reviews{"Factual, style, reliability, and\nreachability reviews pass same hash?"}
    reviews -- "no" --> stop
    reviews -- "yes" --> fence{"Current revision, live lease,\nADK mode, switches safe?"}
    fence -- "no" --> stop
    fence -- "yes" --> gate{"Persisted final gate passes\nthis revision, hash, and attempt?"}
    gate -- "no" --> stop
    gate -- "yes" --> intent["Unique publication intent"]
    intent --> recheck["Recheck fence before side effect"]
    recheck --> senso["Senso with idempotency key"]
    senso --> confirmed{"Provider ID and matching cited URL?"}
    confirmed -- "yes" --> done(["Confirmed publication"])
    confirmed -- "ambiguous" --> unknown(["Unknown; operator reconciliation required"])
    confirmed -- "no" --> failed(["Failed"])
```

Publication additionally requires:

```dotenv
PUBLIC_WIRE_PUBLICATION_ENABLED=true
PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH=false
SENSO_API_KEY=...
SENSO_HANDLE=public-wire
```

and `runtime_controls.publication_blocked = false`. `PUBLIC_WIRE_ADK_SHADOW_PUBLISH=true` is rejected at startup. Publication also requires factual, style, reliability, and reachability reviews over the same canonical content hash, plus a current final-gate result and live lease.

## Integrations

| Integration | Current role | Boundary |
|---|---|---|
| Google ADK | Agents, runner, sessions, plugins, events, artifacts | Orchestration only; no final authority |
| Gemini Developer API | Structured extraction, verification, classification, writing, review | Explicit API-key backend; bounded and schema-checked |
| PostgreSQL | Jobs, evidence, lineage, controls, projections, publication ledger | Canonical system of record |
| Nimble | Candidate discovery | Selected source is independently fetched; seeded fallback is never real evidence |
| ClickHouse | Legacy civic memory plus a prepared canonical outbox destination | Non-authoritative; canonical outbox dispatch is not bundled |
| Datadog / Lapdog | Tracing, reachability, and adversarial reliability checks | Observability and reliability boundary |
| Senso | External publication provider | Server-only deterministic gate boundary |

The ADK event outbox writes independent destination rows for `clickhouse`, `datadog`, and `public-projection`, decoupling canonical persistence from delivery. A deployment must provide and monitor the downstream dispatcher; this repository does not bundle that process.

## Versioning and decision lineage

| Versioned input/state | Where it is bound |
|---|---|
| Prompt version | ADK event envelope and persisted claims |
| Schema version | Invocation metadata, claims, and public projection |
| Policy version | Evidence matrix, workflow decision, investigation |
| Artifact version and SHA-256 | Artifact record and every evidence link |
| Investigation revision | Claims, decisions, reviews, gates, publication intent |
| ADK model version and invocation/event IDs | Event envelope and job attempt lineage |
| Projection revision, cursor, stream epoch | Snapshot and public event contract |
| Runtime-control version | Durable PostgreSQL control record |

Default contracts are prompt `2026-07-20.1`, schema `1`, policy `2026-07-19.1`, and model `gemini-2.5-flash`.

### Core dependency versions

| Component | Version |
|---|---|
| App | `0.1.0` |
| Node.js / npm | `24.14.0` / `11.8.0` |
| Next.js / React | `16.2.6` / `19.2.4` |
| Google ADK / ADK Devtools | `1.3.0` / `1.3.0` |
| Google Gen AI SDK | `^2.6.0` |
| `pg` / Zod / Vitest | `8.16.3` / `^4.4.3` / `3.2.7` |

`package-lock.json` is authoritative for transitive resolution.

## Verification and operations

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The suite covers ADK/Gemini compatibility, serialized instruction state, bounded draft revision and re-review, independent verifier-panel identity and coverage, configuration fail-closed behavior, evidence-repair bounds, multi-source exact claim/evidence validation, source-authority matching, SSRF/redirect/size rules, legacy safety, canonical publication readiness, source-refresh retry and packet-completeness invariants, V1/V2 projection boundaries, release promotion coverage, bounded publication retries and post-provider fencing, publication hashes and gates, and reader-audit derivation. The locked trajectory corpus includes a successful recovery path that requires repair capture, all three verifier perspectives, release attestation, and trace reconciliation before publication. Live Postgres migration/lease integration and provider-backed evaluation runs remain deployment-hardening work.

CI uses Node `24.14` and npm `11.8`, then runs install, lint, typecheck, tests, and the production build.

A production deployment should separate supervised web and worker processes, provide PostgreSQL backup/recovery, and place artifact storage on durable infrastructure. The outbox schema prepares independently scalable integration consumers without claiming that a dispatcher ships in this repository.

## Engineering qualities

- **Fail-closed execution:** malformed, unsupported, timed-out, stale, or unverified work resolves to a typed hold or failure.
- **Idempotency-fenced publication:** durable intents, stable idempotency keys, immutable revision hashes, post-provider lease checks, and provider identity verification protect the side effect; ambiguous outcomes require operator reconciliation.
- **Concurrency safety:** lease tokens, optimistic revisions, partial unique indexes, and transactional fences prevent stale workers from mutating evidence, state, and projections while they still hold authority.
- **Auditable provenance:** artifact versions, claim IDs, evidence offsets, ADK events, reviewer hashes, and policy versions form an inspectable decision chain.
- **Secure read models:** requester-scoped authorization, opaque keys, approved disclosures, event allowlists, and private caching keep internal state private.
- **Provider independence:** discovery, reasoning, analytics, observability, persistence, and publication remain isolated behind explicit boundaries.

## Repository map

```text
app/api/public-wire/          Admission, receipts, cases, SSE, compatibility routes
app/local/[area]/             Edition and investigation UI
lib/adk/public-wire/          Agents, workflow, runner, plugins, tools, contracts
lib/investigations/           Store, evidence validation, projections, gates, publication
lib/public-wire-view-models/  Strict reader-facing schemas and fixtures
db/migrations/                Ordered PostgreSQL schema and hardening migrations
workers/                      Long-lived investigation worker
tests/                        Safety, boundary, contract, and workflow tests
```

Deep-dive documents:

- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md): code ownership, extension rules, performance choices, and verification workflow
- [`docs/GOOGLE_ADK_BUILD_PLAN.md`](docs/GOOGLE_ADK_BUILD_PLAN.md): intended backend architecture
- [`docs/GOOGLE_ADK_UI_UX_BUILD_PLAN.md`](docs/GOOGLE_ADK_UI_UX_BUILD_PLAN.md): intended product and read model architecture
- [`docs/PUBLIC_WIRE_ADK_IMPLEMENTATION_AUDIT.md`](docs/PUBLIC_WIRE_ADK_IMPLEMENTATION_AUDIT.md): adversarial implementation verification and hardening record

---

Public Wire's core advantage is an agentic desk **bounded by captured evidence, durable state, deterministic policy, and a publication boundary agents cannot cross on their own**.
