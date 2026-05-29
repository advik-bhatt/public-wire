# Mouthpiece

Mouthpiece is a local news and civic-intelligence prototype built with Next.js. It explores how local signals, sponsor context, and editorial review can be organized into a clearer briefing surface.

## What it does

- Tracks local civic and sponsor-relevant signals.
- Surfaces briefs that can be reviewed before publication.
- Keeps source monitoring, data processing, and content generation behind explicit API configuration.
- Falls back to demo behavior when production keys are not configured.

## Tech stack

- Next.js
- React
- TypeScript
- API routes
- ClickHouse
- Gemini API
- Nimble API
- Senso API

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment variables

Create a `.env.local` file in the project root and add the services you want to enable.

```bash
# Nimble API source monitoring
NIMBLE_API_KEY=your_nimble_api_key_here

# Senso API data processing
SENSO_API_KEY=your_senso_api_key_here

# ClickHouse event ledger
CLICKHOUSE_URL=your_clickhouse_url_here
CLICKHOUSE_USERNAME=your_clickhouse_username
CLICKHOUSE_PASSWORD=your_clickhouse_password

# Google Gemini content generation
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
```

The application can run in demo mode without these keys. Use `/api/sponsor-status` to verify configured services.

## Development notes

- Keep generated and local-only files out of commits.
- Prefer small pull requests with one product or infrastructure change at a time.
- Document new environment variables in this README when adding integrations.
