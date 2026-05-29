# Architecture Notes

Mouthpiece is organized as a Next.js application with product surfaces, server routes, and external integrations separated by responsibility.

## Core surfaces

- User-facing pages live under the app directory.
- Server routes handle service checks, data ingestion, and generated brief creation.
- Integration-specific code should stay isolated so services can fail independently.

## Integration model

The app is designed around optional integrations. Local development and demos should still work when external service configuration is absent.

Main service categories:

- Source monitoring
- Data processing
- Event storage
- Content generation

## Failure behavior

External services should fail safely. A missing integration should produce a clear status response, not an unclear application crash.

## Documentation rule

Any new integration should include:

- Required local setup names
- Purpose of the integration
- Expected fallback behavior
- Route or module that owns the integration
