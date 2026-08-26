# ADR 0002: Keep Pilot Integration Records Explicitly Simulated

## Status

Accepted.

## Context

The product needs integration surfaces for developer onboarding and operator workflows without implying delivery guarantees or autonomous infrastructure control that have not been validated.

## Decision

Webhook subscriptions and retries are database-backed simulations. The MCP endpoint is authenticated JSON-RPC request/response. Evidence-package signatures are server-held HMAC verification records. None of these surfaces claims external delivery, durable retry queues, persistent streaming, credential rotation, SLAs, or third-party notarization.

## Consequences

The application can validate control-plane contracts and audit behavior now. Production integration work must later select receivers, queue semantics, credentials, retry policy, delivery guarantees, monitoring, and operating ownership explicitly.
