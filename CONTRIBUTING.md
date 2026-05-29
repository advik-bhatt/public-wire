# Contributing

This project is moving quickly, so contributions should stay small, reviewable, and tied to a clear product or infrastructure goal.

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Create a local environment file using the variable list in `README.md`.

3. Start the development server.

```bash
npm run dev
```

## Pull request guidelines

- Keep each PR focused on one change.
- Include a short summary and testing notes.
- Avoid committing generated build output or local cache files.
- Update documentation when adding a new API, environment variable, or external service.
- Prefer clear product names and domain language over placeholder copy.

## Review checklist

Before opening a PR, check:

- The app still starts locally.
- New user-facing copy is specific to Mouthpiece.
- New integrations fail safely when configuration is missing.
