# PublicWire ADK operations

## Runtime and topology

PublicWire uses Node.js 24.14.0 and npm 11.8.0. The Next.js application serves reader projections and durable request APIs. It does not execute investigations inside an HTTP request.

This runbook describes the target private-shadow deployment. The production worker topology, durable artifact backend, outbox delivery, and PostgreSQL restart tests remain release gates; see `PUBLIC_WIRE_ADK_IMPLEMENTATION_AUDIT.md`.

Deploy `npm run worker:public-wire` as a separately supervised, long-lived process with the same application revision and server-only environment as the web application. The worker claims PostgreSQL jobs with `FOR UPDATE SKIP LOCKED`, creates a distinct attempt, owns the investigation lease, binds the first ADK-generated invocation ID, heartbeats while active, and propagates `SIGTERM`/`SIGINT` through an `AbortSignal`.

Host requirements:

- process duration longer than the configured invocation ceiling;
- graceful shutdown budget at least `PUBLIC_WIRE_ADK_TIMEOUT_MS`;
- PostgreSQL pool allowance for the web instances plus workers;
- restart supervision and alerts for repeated exits;
- a network path to the Gemini Developer API, Nimble, approved public sources, ClickHouse, Datadog, and Senso as configured;
- no Vertex AI project, location, endpoint, or credential.

Queue-triggered bounded functions may replace the long-lived worker only if they preserve the same claim/lease/attempt/idempotency protocol and have sufficient maximum duration.

## Setup

1. Configure the variables in `.env.example`. Use a random value of at least 32 characters for `PUBLIC_WIRE_REQUEST_SCOPE_SECRET`.
2. Run `npm run db:migrate` before deploying code that creates cases.
3. Keep `PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH=true` and the canonical `runtime_controls.publication_blocked=true` through shadow rollout.
4. Keep `runtime_controls.rollout.shadowSampleRate=0` until a bounded internal shadow cohort is approved. Increase it explicitly in the audited row; never use an environment-only sampling override.
5. Keep reference case files, receipts, provenance, and the landing newsroom enabled. Keep `PUBLIC_WIRE_UI_LIVE_EVENTS=false` until the live transport rollout gate passes.
6. Start the web process and the separately supervised worker.
7. Verify that private case snapshots return `private, no-store`, shadow cases are absent from ordinary case routes, unknown keys return the same 404 as unauthorized keys, and SSE reconnects from the persisted cursor/epoch.

## Publication enablement

External publication requires all of the following:

- canonical runtime control mode `adk`;
- fresh runtime-control record;
- runtime publication control unblocked;
- `PUBLIC_WIRE_PUBLICATION_ENABLED=true`;
- `PUBLIC_WIRE_EMERGENCY_PUBLISH_KILL_SWITCH=false`;
- a persisted evidence gate and final gate for the exact revision/content hash;
- explicit passes from every required reviewer;
- a unique durable publication intent.

The worker persists a lease-fenced `final_gate_results` record only after canonical evidence and exact-content reviews complete. Configuration alone still cannot publish: the live runtime row, both environment switches, the active lease, the current revision, the exact content hash, and provider credentials must all pass again at the publication boundary.

An ambiguous Senso timeout/response is retried at most three times with the same durable intent and idempotency key. A remaining `unknown` state requires operator reconciliation. A local slug is never a publication identity.

## Rollback

1. Set the durable publication control to blocked.
2. Change the durable canonical mode to `shadow` or hardened `legacy`.
3. Keep the environment kill switch enabled during diagnosis.
4. Do not delete attempts, artifacts, envelopes, unknown intents, or correction history.
5. Legacy may publish only after it produces the same persisted evidence/review/final-gate contract; otherwise it is read/hold-only.

## Alerts

Alert on expired attempt leases, worker exits, queue age, event reconciliation failure, outbox backlog, stale runtime controls, budget exhaustion, source failure spikes, publication intents in `unknown`, and any confirmed publication without evidence links.
