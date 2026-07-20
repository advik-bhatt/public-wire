# PublicWire ADK implementation audit

Date: 2026-07-19
Branch: `codex/google-adk-implementation`

Three independent adversarial reviews compared the implementation with `GOOGLE_ADK_BUILD_PLAN.md` and `GOOGLE_ADK_UI_UX_BUILD_PLAN.md`. The result is a hardened private shadow foundation, not a completed Phase 0 through 5 production migration.

## Fixes enacted

- Legacy orchestration is read/hold-only by default and has no direct Senso import or production publication capability.
- `PostgresPublicationService` requires a persisted exact-revision/content-hash final-gate pass, all required persisted reviews, a current live lease, dynamic ADK mode, and both kill switches before an intent or provider call.
- The worker fetches an allowlisted source directly, validates DNS/redirect/byte policy, captures the actual source bytes, and validates every model evidence reference against the exact normalized artifact name, version, URL, excerpt, and offsets.
- Only validated evidence is persisted or projected. Stable public claim and evidence-receipt mappings replace per-render random keys.
- Verifier output must contain one unique result for every extracted claim; omissions, duplicates, and unknown keys hold the workflow.
- Worker leases now use ownership tokens, renewable expiry, transactional expired-attempt recovery, a three-attempt cap, and terminal dead-letter state.
- Durable runtime mode, 0%-by-default shadow sampling, and separate shadow admission quotas are consumed before model work.
- Disclosure records, not mutable snapshot JSON, authorize case reads and edition listing. Shadow cases are not exposed by ordinary public case routes.
- Case/snapshot responses are `private, no-store` until correction/disclosure cache invalidation exists. Edition projections exclude shadow records and derive freshness from persisted case state.
- Reference case files, receipts, provenance, and the landing newsroom default on; live updates remain separately gated. Retained-cursor gaps reset, correction/publication state is rendered separately, and evidence contrast/time formatting/reduced motion were tightened.
- The migration runner now applies ordered, recorded migrations; an additive hardening migration upgrades pre-existing development schemas.
- Canonical publication now binds the exact provider-visible brief hash to factual, style, reliability, and reachability reviews, persists a lease-fenced final-gate event/result, and invokes `PostgresPublicationService` only after every gate passes.
- Ambiguous Senso responses are retried up to three times with the same durable intent and idempotency key; verified provider identity is projected into a public case and database-backed brief route.

## Release blockers that remain

- The full planned Phase 3 workflow is incomplete: integrated bounded evidence repair and independent novelty/relevance checks are not wired into the canonical worker. One reviewer-directed draft revision is now wired and fully re-reviewed; exact-hash style, reliability, and reachability reviews participate in the canonical publication gate.
- Canonical capture, extraction, verification, hold, review, publication, and completion milestones now project through bounded public event codes. Full internal replay and downstream ClickHouse/Datadog outbox dispatch are not implemented.
- Senso unknown-outcome lookup and operator reconciliation tooling beyond bounded idempotent replay are not implemented.
- The production durable artifact backend, retention/encryption policy, and selected worker hosting topology have not been proven.
- PostgreSQL migration/restart/lease tests, provider failure injection, API/SSE authorization integration tests, accessibility automation, responsive visual tests, performance baselines, and the versioned benchmark corpus are still required.
- Provider failure injection and PostgreSQL-backed end-to-end publication integration tests remain required in the selected deployment environment.

## 2026-07-20 hardening addendum

- Missing material evidence now reaches the verifier and produces a typed `needs_evidence` projection instead of failing later on absent verifier lineage.
- Blocking contradictions and editorial holds retain distinct public reason codes and safe milestone events.
- Public case schemas now enforce receipt/claim referential integrity, material-count consistency, event references, and cursor consistency.
- Publication rechecks controls and the live lease after the provider call; a lost fence becomes `unknown` and cannot create a confirmed projection.
- Area-wide admission limits now complement requester-cookie quotas.
- Reference-run UI copy describes contract scenarios rather than persisted executions, and reference metadata is noindex.
- The canonical desk now permits one typed factual-review correction, preserves both review attempts in bounded ADK session state, reruns factual review on the revised draft, and emits reader-safe per-attempt review events. A second failed review terminates with `FACTUAL_REVIEW_FAILED`.
- The landing and case-file experience now uses a focused investigation player instead of an always-expanded agent console. Reference moments are schema-validated against existing public event, claim, and receipt keys.

## Justified deferrals

Backend Phases 6 and 7 and UI Phase 6 remain explicitly deferred. This includes semantic memory, broad MCP and search meshes, multilingual output, watchlists and notifications, inline immutable prose anchors, experimental routing, and human confirmation for unrelated administrative actions.

Controlled publication, public shadow case files, live-event UI, and production briefs are not treated as completed deferrals: they are blocked rollout stages whose plan gates must pass before enablement.

## Final adversarial regression pass

All three reviewers reviewed the hardened diff again. No P0 remained. Their final concrete regressions included provider payload hash substitution, publication fence timing, stale lease mutations, oversized source stream handling, feature flag link drift, and runtime mode or form drift. Each issue was fixed before the final verification run.
