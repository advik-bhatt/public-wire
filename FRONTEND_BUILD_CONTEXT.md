# Frontend Build Context

This branch includes the frontend, static demo content, and backend scan infrastructure. Pages render from typed demo data in `content/public-wire-demo.ts`, and the scan API is ready for the agent pipeline integration.

---

## What this repo contains

A polished, scroll-based Next.js 16 site for **PublicWire** — a self-running local civic newspaper. Three routes: a landing, a local-edition page per area, and a per-brief detail page. All UI is stark black-and-white, full-bleed, scroll-driven, and intentionally newspaper-shaped.

### Stack

- **Next.js 16.2.6** with the App Router and Turbopack
- **React 19.2.4**
- **Tailwind v4** (CSS-first, no `tailwind.config.js` — theme tokens live in `app/globals.css` under `@theme inline`)
- **Framer Motion** for scroll-linked parallax, clip-path reveals, page transitions, and section entrances
- **Lenis** for site-wide smooth scrolling
- **shadcn/ui primitives** (focused subset — Button, Dialog, Input, Label, Select, Tabs, Card, Badge)
- **System Arial/Helvetica** via the CSS theme token (chosen for editorial feel; can be swapped to Geist by adding the Google Font in `layout.tsx` and updating `--font-sans`)

---

## Routes

| Path | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` | The scroll-based landing. Composes Hero → Problem → How It Works → Trust Layer → Comparison → Agent Swarm → Closing CTA → Colophon, wrapped in `<LenisProvider />`. |
| `/local/[area]` | `app/local/[area]/page.tsx` | The civic edition page for an area slug. Uses `generateMetadata` and `getEditionBySlug` from `content/public-wire-demo.ts`. Renders `<PublicWireEdition />` with the static demo edition for that slug. |
| `/briefs/[id]` | `app/briefs/[id]/page.tsx` | Individual published-brief detail. Uses `generateStaticParams` against `demoEditions` so every demo brief slug is statically built. |
| `POST /api/public-wire/scan` | `app/api/public-wire/scan/route.ts` | Triggers a PublicWire scan. Requires `x-public-wire-admin-secret` header matching `PUBLIC_WIRE_ADMIN_SECRET` env var. Returns 403 if the env var is not set (default for demo). |

All pages are statically renderable from the content layer. The scan API is in place for agent integration.

---

## Layout shell

`app/layout.tsx` is intentionally tiny. It sets the `<html>` and `<body>` classes (Arial system stack, antialiased, B&W tokens) and wraps `{children}` in a single client component:

```tsx
<body className="min-h-full bg-background text-foreground font-sans">
  <PageTransition>{children}</PageTransition>
</body>
```

`<PageTransition>` (in `components/page-transition.tsx`) is a framer-motion `motion.div` keyed on `usePathname()`. It fades content from `opacity: 0 → 1` over 550ms on every route change, including back/forward navigation. Opacity-only — does not interfere with parallax, clip-path sections, or Lenis.

---

## Design system

Defined in `app/globals.css`. Worth knowing:

- **Pure B&W palette** via `oklch()` CSS variables. `--radius: 0rem` everywhere — newspaper-sharp edges, not pill-rounded UI.
- **Typography**: `--font-sans: Arial, Helvetica, system-ui, sans-serif`. Reads as editorial body, not tech sans.
- **Three button utilities** (defined as CSS, not Tailwind classes):
  - `.btn-outline-light` — transparent on dark backgrounds, fills white-from-bottom on hover via inset box-shadow
  - `.btn-outline-dark` — same trick, inverted
  - `.btn-solid-dark` — solid black, fills white-from-bottom on hover
- **Custom animations**: `animate-char-in` (letter-by-letter hero reveal), `sponsor-belt` (looped marquee for the sponsor strip), `live-record-dot` (the pulsing red dot in the colophon).
- **Lenis hooks**: `html.lenis` + `html.lenis body` rules to keep page scrollable when Lenis is mounted.

---

## Component map

### `components/landing/` — landing sections

| File | Role |
|---|---|
| `lenis-provider.tsx` | Mounts Lenis with `duration: 1.15`, ease-out expo curve, smooth wheel. Cleans up on unmount. |
| `masthead.tsx` | Sticky/overlay navigation. Two variants: `solid` (white background, inner pages) and `overlay` (transparent over dark hero). |
| `hero.tsx` | Full-screen newspaper image with framer-motion parallax — image translates `0vh → 150vh` as the viewport scrolls past. Masthead overlaid, headline + glowing descriptor + dual CTA. |
| `problem.tsx` | NewUIPotential-style Featured split: editorial text left, full-bleed grayscale image right. |
| `how-it-works.tsx` | Six-step black grid. Each card flips white-on-hover with framer-motion `whileInView` stagger. |
| `trust-layer.tsx` | B&W split. Sample published brief left (with trust fields), public audit log + mentor review on black right. |
| `comparison.tsx` | Pitch-positioning section — PublicWire vs. the alternatives. |
| `agent-swarm.tsx` | The visual peak. `clip-path: polygon(0% 0, 100% 0%, 100% 100%, 0 100%)` window with a `fixed`-positioned spiral image inside, framer-motion y-parallax on the image, and 12 newsroom-agent cards layered over a dark overlay. Mentor agent carries a `REVIEWER` badge. |
| `closing-cta.tsx` | Black-on-white finale. *"Read what just changed in your town."* Single solid-dark CTA into the search dialog. |
| `colophon.tsx` | The peel-up footer. Same clip-path trick as agent-swarm, plus `sticky` positioning inside an oversized parent so the footer peels up from below as the user scrolls. Giant `PublicWire` wordmark, pulsing red `LIVE — Agents hard at work` dot, Desk/Editions/Tooling columns. |
| `search-dialog.tsx` | Radix Dialog. Area input, featured `LIVE` chip for New Brunswick, suggested-area buttons, 6-option interest grid. On submit, routes to `/local/<slug>?focus=<csv>`. |

### `components/edition/` — edition page

- **`local-edition.tsx`** — Renders the area page interior. Calls `getEditionBySlug(areaSlug)` from `content/public-wire-demo.ts` and lays out: dateline, edition queue, focus chips, action row, top story section, brief grid, rejected items, agent console, sources panel. Includes an Investigate dialog (per-brief detective trace) and a "News you want to see" request dialog. **No fetching — every byte is from static content.**

### `components/ui/` — shadcn primitives

A focused subset, adapted to the B&W zero-radius aesthetic: `button`, `dialog`, `input`, `label`, `select`, `tabs`, `badge`, `card`.

### `components/page-transition.tsx`

Global fade-in on every route change.

---

## Content layer (`content/public-wire-demo.ts`)

The single source of truth for the demo. Exports:

- **`PublicWireEdition`** — the shape of a complete edition (area, slug, lastChecked, metrics, sources, briefs, rejectedItems, agentEvents)
- **`CivicBrief`** — a full brief including `investigationTrace[]` (the detective work shown in the Investigate dialog)
- **`newBrunswickEdition`** — the canonical, hand-crafted demo edition
- **`demoEditions`** — a Record keyed by slug. New Brunswick is the authored one; Newark, Jersey City, Middlesex County, and Rutgers/College Ave are produced by `cloneEdition()` (which adapts headlines, source names, and metrics)
- **`getEditionBySlug(slug)`** — returns the matching edition, or a generated one with the slug prettified into a name if no match exists
- **`getBriefById(id)`** — looks up a single brief across all editions by id or slug

All briefs include:
- `summary`, `whyItMatters`, `whoIsAffected`, `whatChanged`, `sources[]`
- `auditLog[]` (the public, reader-facing "how this story was made" trail)
- `mentorReview` (the public editor's note)
- `updateHistory[]`
- `artifactLabel` (the placeholder cited.md label)
- `investigationTrace[]` (the timestamped agent steps with status — `checked`, `needs-evidence`, `resent`, `verified`, `published` — that power the Investigate dialog)

---

## Assets

- `public/images/newspaper1.avif` — Hero background
- `public/images/newspaper2.webp` — Secondary
- `public/images/mountain-landscape.jpg`, `woman-horse.jpg`, `spiral-circles.jpg` — Aesthetic placeholders from the reference design
- `public/icon*.png`, `public/icon.svg`, `public/placeholder*.{png,svg}` — Icons and seed placeholder assets

---

## How the landing was built

The visual language is mapped from a reference folder the user dropped in earlier (`NewUIPotential/`, since removed). Three signature moves from that reference are used throughout:

1. **Parallax hero** — image translates `-150vh` as the viewport scrolls past, header is `absolute` overlay
2. **Clip-path window with a fixed image** — `clip-path: polygon(0% 0, 100% 0%, 100% 100%, 0 100%)` with a `fixed`-positioned image inside the clipped section, plus its own y-parallax. The image stays put visually while the section "flies past" the viewport. Used by `agent-swarm.tsx`.
3. **Peel-up footer** — same clip-path trick inverted: outer fixed height, inner `h-[calc(100vh+800px)] -top-[100vh]` with a `sticky` child, so the footer rises into view as the user scrolls. Used by `colophon.tsx`.

The Hero, AgentSwarm, and Colophon use these moves directly. The middle sections (Problem, HowItWorks, TrustLayer, Comparison) are stark B&W blocks with framer-motion `whileInView` entrances.

---

## Page transitions

Every route gets a soft fade-in on entry via `<PageTransition>` in `app/layout.tsx`. Triggers on first load, forward navigation, and back navigation (browser back or `router.back()`). Opacity-only, 550ms, expo-out easing.

---

## What was deleted to get to this branch

- `backend/` — agent orchestration and sponsor integrations. To be reintroduced later.
- `Media/` — orphan duplicates of files already in `public/images/`.
- `INTEGRATION.md` — the sponsor wiring checklist (now redundant with the dedicated sponsor doc).
- `.env.example` — updated sponsor credentials checklist.
- `lib/public-wire-data.ts` — consolidated into agent and content layers.
- Three reference folders from earlier iterations: `PublicWire/`, `PublicWireInitialUI/`, `NewUIPotential/`.
- Old errand-demo legacy: `app/api/errand/`, `app/mock/`, `lib/errand-agent.ts`, `lib/demo-data.ts`.
- Empty `hooks/` directory.
- Unused dependencies from `package.json`: `uuid`, `zod`, `tw-animate-css`.

---

## Other docs in this repo

- [`HOW_WE_APPEASED_THE_SPONSORS_AND_THE_HACKATHON_REQUIREMENT.md`](./HOW_WE_APPEASED_THE_SPONSORS_AND_THE_HACKATHON_REQUIREMENT.md) — Forward-looking plan for the sponsor integration merge. Names each sponsor's role, demo surface, and current status.
- [`DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md) — The 3-minute demo script: beats, voice-over lines, navigation order, what each click should look like, what to never say on stage.
- `AGENTS.md` / `CLAUDE.md` — Repo-level instructions for AI assistants working on this codebase.

---

## How to run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or the port Next.js prints if 3000 is in use). The landing renders immediately. Search "New Brunswick, NJ" — or any of the other featured chips — to open a populated edition. Every brief is clickable and has its own detail page.
