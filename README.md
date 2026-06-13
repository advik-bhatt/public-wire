<div align="center">

# 📰 PublicWire

### An autonomous civic newsroom that reads what your town publishes — and shows its work.

**[🌐 Live → public-wire.vercel.app](https://public-wire.vercel.app/)**

*Agents monitor public sources, decide what matters, verify it, publish it — and ship every story with its receipts.*

Built for the **Datadog × Google DeepMind** hackathon — with **Nimble**, **ClickHouse**, and **Senso / cited.md**.

</div>

---

## The problem

Local civic information is **technically public but functionally hidden**.

To know what's actually affecting them this week, a resident would have to manually check city notices, county pages, council agendas, transit advisories, school-district updates, weather alerts, scanned PDFs, and campus event calendars — across dozens of ugly, inconsistent government websites. Almost nobody does. The information is published, then privately ignored.

PublicWire turns that scattered public output into a **self-running local newspaper**.

## What PublicWire is

> **PublicWire is not a chatbot that writes local news. It is an autonomous civic newsroom that checks public sources, decides what matters, verifies it, publishes it, and shows its work.**

When you open an edition, the agents have *already* been running the desk. You're not prompting a model — you're reading an edition the system has been maintaining, where every brief arrives with a visible evidence trail.

Five things the product is built to prove:

1. **It acts before you ask.** A swarm of agents runs the desk continuously; you open an already-maintained edition.
2. **It watches overlooked sources.** City, county, transit, schools, weather, agendas, PDFs, campus calendars.
3. **It publishes briefs worth reading.** Ordered by recency and civic impact — not maximum scraping volume.
4. **It refuses or re-sends weak claims.** A hallucinated or unsupported claim is caught and sent back for evidence, not published.
5. **It leaves an inspectable trail.** Every brief ships with the sources checked, the agents' decisions, and the timing of each step.

> *It is a newspaper where the newsroom is made of agents, and every story ships with its receipts.*

## How it works

A scan runs as a chain of narrow, single-purpose agents. Each step is traced, and weak claims loop back for more evidence before anything is published.

```
  Source Scout / Monitor      →  Nimble fetches messy public pages & PDFs → structured civic events
  Extractor                   →  pulls candidate claims out of each source
  Change Detector             →  ClickHouse memory: is this actually new, or already seen?
  Editor                      →  decides what matters (incl. the 3-inquiry reader-demand threshold)
        │
        ▼
  Verifier  ──needs-evidence──►  re-send: fetch a stronger source instead of publishing an overclaim
        │ verified
        ▼
  Writer → Mentor review      →  drafts the reader-facing brief; a mentor agent approves / cautions
  Publisher                   →  Senso / cited.md publishes a public, citeable artifact
  Audit Translator            →  turns the raw Datadog spans into a plain-English "how this was made" log
```

The **verify-and-resend loop** is the heart of it. When the Verifier can't back a claim, it doesn't publish loosely and it doesn't silently drop a useful update — it sends the story back for corroboration and only publishes a cautious, source-supported version. *That's what a hallucination looks like in this system: caught, not published.*

## The trust layer — "watch the detectives work"

Every published brief carries an **Investigate** button. Open it and you get the full case file: which sources the agents opened, what each returned, where the Verifier flagged a claim, where it was sent back for more evidence, what the Mentor approved, and how long each step took — color-coded by status (green = verified, amber = re-sent, grey = rejected).

You're not reading a press release. You're following a single fact from "rumor on the internet" to "claim with an official source" without leaving the page. The Investigate panel *is* a reader-facing translation of the underlying Datadog trace — telemetry turned into journalism you can audit.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.6** (App Router, Turbopack) |
| UI | **React 19**, **Tailwind CSS v4** (CSS-first theme), **shadcn/ui** primitives |
| Motion | **Framer Motion** (parallax, clip-path reveals, page transitions) + **Lenis** smooth scroll |
| Language | **TypeScript** |
| Design | Pure black-and-white, zero-radius, full-bleed — intentionally newspaper-shaped |

## The integration stack

Each sponsor tool does a **distinct editorial job** in the pipeline, and every integration ships with a **seeded fallback** so the app still runs without credentials (handy for local demos).

| Tool | Role in the newsroom | Code | Env |
|---|---|---|---|
| **Nimble** | The agent's browser for messy public sources — turns JS-heavy gov pages and PDFs into structured civic events | `lib/sponsors/nimble-civic.ts` | `NIMBLE_API_KEY` |
| **ClickHouse** | The newsroom's memory — dedupes by content hash, recalls prior events, tracks reader-demand thresholds | `lib/clickhouse.ts` | `CLICKHOUSE_URL`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD`, `CLICKHOUSE_DATABASE` |
| **Senso / cited.md** | The publishing loop — turns approved briefs into public, citeable, agent-discoverable artifacts | `lib/sponsors/senso-civic.ts` | `SENSO_API_KEY`, `SENSO_HANDLE` |
| **Datadog** | LLM observability — every agent step is a span; the Investigate trace is a translated Datadog trace | `lib/datadog-trace.ts`, `lib/sponsors/lapdog-review.ts` | `DATADOG_LAPDOG_URL`, `DD_TRACE_AGENT_URL` |
| **Google Gemini** | The editorial brain — powers the Editor, Writer, and Mentor agents | `lib/sponsors/{google-editor,writer,mentor}.ts` | `GEMINI_API_KEY` *(or `GOOGLE_CLOUD_PROJECT`)* |

Check which integrations are live at any time via **`GET /api/sponsor-status`**.

## Project structure

```
app/
  page.tsx                       Landing (scroll-driven: hero → problem → how-it-works → trust → swarm → CTA)
  local/[area]/page.tsx          A civic edition for an area slug
  briefs/[id]/page.tsx           A single published brief, with its audit log and sources
  api/public-wire/scan           POST — run a full scan (admin-only)
  api/public-wire/edition        POST — generate an edition for an area
  api/public-wire/coverage-request   POST — register reader demand for a topic
  api/sponsor-status             GET  — which integrations are configured
components/
  landing/                       Hero, problem, how-it-works, trust-layer, agent-swarm, colophon, search-dialog…
  edition/                       The civic edition surface + the Investigate dialog
  ui/                            shadcn primitives (B&W, zero-radius)
content/                         Typed demo edition content (the polished New Brunswick edition + clones)
lib/
  public-wire-agent.ts           The scan orchestrator — chains every agent below
  clickhouse.ts                  Civic memory
  datadog-trace.ts               Span tracing
  sponsors/                      nimble · senso · google-editor · writer · mentor · lapdog
```

## Routes & API

| Path | Method | What it does |
|---|---|---|
| `/` | GET | The landing page |
| `/local/[area]` | GET | A maintained civic edition for an area (e.g. `/local/new-brunswick`) |
| `/briefs/[id]` | GET | A single brief's detail page with its full evidence trail |
| `/api/public-wire/scan` | POST | Run a full PublicWire scan. Requires an `x-public-wire-admin-secret` header matching `PUBLIC_WIRE_ADMIN_SECRET` |
| `/api/public-wire/edition` | POST | Generate an edition for `{ area, slug, focus, requestedTopic }` |
| `/api/public-wire/coverage-request` | POST | Register reader demand for a topic; crossing the 3-inquiry threshold can trigger an investigation |
| `/api/sponsor-status` | GET | Report which integrations are configured |

## Getting started

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The landing renders immediately. Search **"New Brunswick, NJ"** (or pick any featured chip) to open a populated edition, then click **Investigate** on any brief to watch the trace.

> The app runs fully in **demo mode** with no keys — every page renders from a typed content layer and nothing fetches. Add the keys below to switch agents from seeded fallbacks to live calls.

### Environment variables

Create a `.env.local` in the project root:

```bash
# Nimble — live civic web & PDF extraction
NIMBLE_API_KEY=

# ClickHouse — civic memory
CLICKHOUSE_URL=
CLICKHOUSE_USERNAME=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=

# Senso / cited.md — public publishing loop
SENSO_API_KEY=
SENSO_HANDLE=

# Google Gemini — editorial agents (or use GOOGLE_CLOUD_PROJECT)
GEMINI_API_KEY=
GOOGLE_CLOUD_PROJECT=

# Datadog — agent tracing
DATADOG_LAPDOG_URL=
DD_TRACE_AGENT_URL=

# Protects the admin-only scan endpoint
PUBLIC_WIRE_ADMIN_SECRET=
```

## Deployment

PublicWire deploys on **Vercel** and lives at **[public-wire.vercel.app](https://public-wire.vercel.app/)** — the single canonical URL for the project. The app was originally developed under the name **`mouthpiece`**; the old `mouthpiece.vercel.app` host now permanently redirects here (see `next.config.ts`), so every entry point resolves to the same place.

## Further reading

- [`DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md) — the 3-minute demo script, beat by beat.
- [`FRONTEND_BUILD_CONTEXT.md`](./FRONTEND_BUILD_CONTEXT.md) — routes, components, design system, and content layer.
- [`HOW_WE_APPEASED_THE_SPONSORS_AND_THE_HACKATHON_REQUIREMENT.md`](./HOW_WE_APPEASED_THE_SPONSORS_AND_THE_HACKATHON_REQUIREMENT.md) — each integration's editorial role and demo surfaces.

---

<div align="center">

**PublicWire** — civic infrastructure: easier to find, harder to fake, more useful to residents.

[public-wire.vercel.app](https://public-wire.vercel.app/)

</div>
