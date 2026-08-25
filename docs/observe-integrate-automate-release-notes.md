# Observe → Integrate → Automate

## Pilot Expansion Release Notes

This release extends the Decision Control Plane through an engineering sequence rather than a collection of interface features. It makes the control loop observable, then makes it integrable, and only then introduces bounded automation surfaces. All capabilities remain **tenant-scoped**, evidence-bound, and explicit about pilot versus production responsibility.

| Milestone | Delivered pilot capability | Validation surface | Boundary retained for production handoff |
| --- | --- | --- | --- |
| **Observe** | Operational control room with durable telemetry history, RPO headroom, replication lag, ownership epoch, audit latency, canary health, migration progress, replay posture, and safety gates. | Tenant workspace refreshes persisted evidence while signed in; migration timeline and Replay Explorer retain trace and phase evidence. | No regional telemetry agent, alert-manager integration, or autonomous remediation exists in this web application. |
| **Integrate** | Interactive developer portal, schema reference, architecture map, session-authenticated request playground, pilot API keys, TypeScript SDK starter, Node CLI starter, adapter contract reference, and local audit exports. | Browser-executable tenant inspection calls and scoped MCP tool catalog; API-key issuance stores a hash and shows the raw token once. | SDK and CLI starters are scaffolding, not a versioned package registry. External policy engines are registered as contracts, not dynamically executed. |
| **Automate** | Request/response JSON-RPC MCP pilot endpoint; tenant-aware tool inspection and governed replay/rollout operations; simulated webhook/event subscriptions and delivery history. | MCP tools use the same tenant and role controls as the product; API-key scope is checked before bearer-token calls. | No persistent MCP streaming, outbound webhooks, retries, delivery guarantees, credential rotation workflow, rate limits, or autonomous infrastructure control are claimed. |

> **Pilot rule:** a control-plane tool may inspect or request an operation, but it must not bypass tenant membership, role authorization, ownership epoch, RPO admission, audit durability, canary health, approval, or replay evidence.

## Operator Flow

The primary operator flow is **Observe → Investigate → Govern**. Operators inspect a tenant’s current safety evidence in the control room, compare a decision replay across versioned semantic representations, inspect the migration timeline, and then issue only a role-allowed operation through the gated rollout or replay controls. Any failed condition remains an explicit hold, block, divergence, or rollback record rather than an implicit allow.

## Integration Flow

The primary developer flow is **Discover → Rehearse → Promote**. A developer reads the canonical admission contract, runs a non-mutating request in the portal playground, downloads an SDK or CLI starter, creates a deliberately scoped pilot credential, and rehearses a simulated event subscription. Promotion to a production HTTP integration requires a separate delivery design for authentication rotation, key lifecycle, request limits, signed payload verification, retries, dead-letter handling, receiver availability, and an agreed support model.

## Return on Research

The expansion prioritizes durable learning over cosmetic breadth. Operational telemetry, replay equivalence, version compatibility, and tenant-safe integration contracts create reusable evidence across financial-crime screening, supplier risk, counterparty operations, and other relationship decisions. The retained production gaps are intentional: they are the validation gates that prevent a pilot interface from being misrepresented as a fully operated distributed service.
