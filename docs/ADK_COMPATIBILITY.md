# Google ADK TypeScript compatibility

- Runtime: Node.js 24.14.0; npm 11.8 or newer.
- Packages: `@google/adk` and `@google/adk-devtools` 1.3.0.
- Model backend: `Gemini({ apiKey, model, vertexai: false })`; `apiBackend` is asserted as `GEMINI_API` in tests.
- Runner: `Runner.runAsync()` yields ADK-assigned `event.id` and `event.invocationId` values.
- Sessions: in-memory only for tests/development; `DatabaseSessionService` is selected when `DATABASE_URL` is configured.
- Artifacts: `FileArtifactService` for development. Production requires a durable implementation and never stores artifacts under `public/`.
- Cancellation: `Runner.runAsync()` in ADK 1.3.0 accepts `abortSignal`; PublicWire supplies an application deadline signal and provider tools also receive explicit signals/timeouts. `RunConfig` independently enforces the model-call bound.
- ADK Web/devtools are development utilities only and are not imported by production code.

No Vertex AI project, location, SDK, deployment, or credential is required.
