This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Setting Up API Keys

This project requires several API keys to function properly. Create a `.env.local` file in the project root and add the following environment variables:

```bash
# Nimble API (source monitoring)
NIMBLE_API_KEY=your_nimble_api_key_here

# Senso API (data processing)
SENSO_API_KEY=your_senso_api_key_here

# ClickHouse database (event ledger)
CLICKHOUSE_URL=your_clickhouse_url_here
CLICKHOUSE_USERNAME=your_clickhouse_username
CLICKHOUSE_PASSWORD=your_clickhouse_password

# Google Gemini API (content generation)
# Either use API key directly:
GEMINI_API_KEY=your_gemini_api_key_here

# Or use Google Cloud credentials:
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
```

The application will work in demo mode without these keys, but full functionality requires proper API configuration. Check the status endpoint at `/api/sponsor-status` to verify which services are properly configured.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
