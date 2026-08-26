# Enterprise TCO and gRPC Domain Adapter Integration
## Presentation Script and Slide Walkthrough

### Audience and objective

This presentation is for enterprise architecture, finance, platform engineering, compliance technology, procurement, and integration owners. It explains the economic case for the Decision Control Plane and how the gRPC/Protobuf adapter boundary makes the architecture deployable without forcing every domain team onto one implementation stack.

**Recommended duration:** 20–25 minutes, followed by 15 minutes for economic assumptions and interface questions.

**Central message:** The Decision Control Plane is worth funding only if the reusable kernel, adapter contract, replayability, and operating-value claims are measured. The gRPC interface is the execution boundary that turns those claims into a composable system.

---

## Slide 1 — The investment is a control plane, not a rewrite

### Walkthrough

Open by distinguishing the product from a replacement project. The architecture is introduced alongside the legacy engine, then earns authority one decision slice at a time.

### Suggested visual

Show legacy monolith on the left, Decision Control Plane in the center, and external domain adapters and rails on the right. Use a bridge rather than a replacement arrow.

### Script

“We are not proposing a big-bang rewrite of the legacy decision engine. We are proposing a control plane that makes high-consequence decisions bounded, governed, and replayable. The legacy engine can continue to execute while the new system captures behavior, creates canonical evidence, runs in shadow mode, compares outputs, and takes authority slice by slice. The gRPC boundary matters because it lets the new control plane communicate with AML, procurement, supplier, or other domain adapters without embedding their semantics into the kernel. The business case is therefore a combination of lower duplication, safer change, lower reconstruction effort, and reusable interfaces.”

### Delivery cue

Say explicitly that the first investment buys measurable learning and control, not a promise of immediate platform replacement.

---

## Slide 2 — Where the cost actually sits

### Walkthrough

Present the cost taxonomy for both architectures: infrastructure, licensing, engineering, operations, audit, integrations, security, and incident/change risk.

### Suggested visual

Use two stacked bars or a side-by-side operating-cost map. Color the shared categories navy and the DCP-specific governance/migration categories red.

### Script

“The cost comparison must be honest about where money goes. The legacy system is not free simply because it is already deployed. Its cost includes infrastructure, rules and model engineering, release coordination, audit reconstruction, duplicated point integrations, incident response, and the opportunity cost of slow change. The Decision Control Plane adds migration, durable events, replay, tenant isolation, and governance. It may therefore cost more in selected categories at first. The case becomes attractive only when compiled policy, reusable adapters, shared replay, independent scaling, and evidence-bound audit reduce the recurring cost of duplicated change and manual reconstruction.”

### Delivery cue

Avoid presenting lower steady-state cost as guaranteed. It is a hypothesis to validate with pilot telemetry.

---

## Slide 3 — The base-case economics are transparent

### Walkthrough

Show the model inputs: $10.6M legacy annual cost, $7.8M DCP steady-state cost, $5.0M migration cost, 10% discount rate, and $2.0M annual operational-value estimate.

### Suggested visual

A clean assumptions table with a highlighted “replace with pilot data” footer.

### Script

“The base case is an illustrative planning scenario, not a forecast. We assume $10.6 million of annual legacy run-rate, $7.8 million of DCP steady-state cost, and $5 million of one-time migration. That creates $2.8 million of direct annual savings. We separately model $2 million of annual operational value from faster reconstruction, reduced duplicate engineering, safer policy change, and lower operational ambiguity. Keeping direct savings and soft value separate is important. Finance can challenge the recurring cost inputs, while operations can prove or disprove the soft value through measured analyst time, engineering effort, incident hours, and change lead time.”

### Delivery cue

Point out that the soft-value line must not be treated as cash savings until it has an owner and measurement method.

---

## Slide 4 — Scenario analysis tells us when not to proceed

### Walkthrough

Present low, base, and high cases. Emphasize the low case as a valid outcome: a platform thesis is not enough when direct economics are weak.

### Suggested visual

A three-column scenario table: legacy five-year cost, DCP five-year cost including migration, direct savings, payback, and NPV.

### Script

“The scenario model is valuable because it tells us when to stop. In the illustrative low case, legacy five-year cost is $51 million and DCP cost including migration is $52.5 million. That is negative direct savings and negative total NPV even after modest operational value. In the base case, the model produces $9 million of direct five-year savings, a 1.04-year payback including soft value, and $13.2 million of illustrative NPV. In the high case, the upside is larger. The decision is therefore conditional: fund the vertical slice and instrumentation now; scale only if the pilot moves the organization from low-case assumptions toward base-case evidence.”

### Delivery cue

Use the phrase “the low case is not a failure of the model; it is the reason to measure before scaling.”

---

## Slide 5 — The gRPC boundary is a semantic contract

### Walkthrough

Introduce `DomainAdapterService` and its operations: `Canonicalize`, `BuildDecisionContext`, `GenerateCandidateFacts`, `MapDecisionToActions`, `HandleLifecycleEvent`, `StreamCanonicalize`, and `Health`.

### Suggested visual

Show the Decision Control Plane on the left and multiple domain adapters on the right, with one shared protobuf contract between them.

### Script

“The gRPC interface is not merely a faster REST API. It is a semantic contract for how domain meaning enters the control plane. The adapter canonicalizes source events, binds roles and relationships, builds a bounded decision context, generates candidate facts, maps dispositions to domain actions, and handles late lifecycle events. The kernel remains responsible for decision episodes, evidence binding, policy evaluation, audit, replay, and outcome closure. That boundary is what allows AML semantics to evolve without changing the core theory. The same contract can later support supplier continuity, procurement responsibility, clinical-site monitoring, or another relationship-centric decision domain.”

### Delivery cue

Distinguish “map decision to actions” from executing the action. The adapter must not hide side effects.

---

## Slide 6 — Tenant context is part of every call

### Walkthrough

Show the `TenantContext` and `RequestMetadata` protobuf messages. Highlight tenant, legal entity, residency zone, purpose, classification ceiling, subject identity, authorization ID, expiry, correlation, causation, and idempotency.

### Suggested visual

A signed context envelope travels from the edge through adapter, interpreter, kernel, audit, and action executor.

### Script

“Every gRPC request carries more than a payload. It carries a verified tenant and authorization context. The context identifies the tenant, data controller, legal entity, residency zone, purpose, maximum classification, calling subject, authorization ID, expiry, and allowed scopes. Request metadata adds request, correlation, causation, idempotency, trace, event time, processing time, and deadline. Downstream services verify the context and reject mismatches. A caller cannot change tenant scope by changing a JSON field or protobuf field. This is the foundation for multi-tenant isolation, auditability, and safe replay.”

### Delivery cue

Use “context is authorization input” as the memorable line.

---

## Slide 7 — The hot path is deliberately bounded

### Walkthrough

Explain the deadline and boundedness rules: pre-materialized state, max relationship depth, max fact count, max candidates, explicit budget, and no unbounded remote I/O.

### Suggested visual

A horizontal request budget with fixed boxes for canonicalization, state read, candidate facts, policy evaluation, audit, and action.

### Script

“The adapter contract carries the constraints that make a real-time decision possible. A request includes a deadline. Context construction includes maximum relationship depth and maximum fact count. Candidate generation includes a maximum candidate count and an explicit budget. The adapter must return completeness and truncation signals rather than silently presenting a partial result as complete. Rich documents, open-ended graph traversal, and analyst explanation generation belong on the asynchronous path. This is how the system protects the transaction rail from a slow dependency while keeping the resulting uncertainty visible to the Policy Interpreter.”

### Delivery cue

Emphasize that a bounded incomplete result is safer than an unbounded call whose failure is hidden.

---

## Slide 8 — Errors, retries, and action semantics are explicit

### Walkthrough

Show the stable error mapping, idempotency scope, ordering rules, and action-mapping purity.

### Suggested visual

A failure matrix showing `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `RESOURCE_EXHAUSTED`, `FAILED_PRECONDITION`, `UNAVAILABLE`, and `DEADLINE_EXCEEDED` with retry behavior.

### Script

“Enterprise integration fails at the edges, so the contract must specify failure behavior. A tenant mismatch is not a retryable outage. A stale manifest is a failed precondition, not a reason to use arbitrary current state. Resource exhaustion requires bounded backoff and tenant-aware throttling. An unavailable dependency may trigger a policy-defined degraded mode, but it must not produce a silent allow. Idempotency is scoped to tenant, adapter, operation, and logical resource. A duplicate key with the same request hash returns the original result; the same key with a different hash is a conflict. The adapter maps actions; the action executor owns execution and acknowledgement.”

### Delivery cue

Use one concrete example: an action timeout becomes outcome unknown, not success.

---

## Slide 9 — Integration leverage is measurable

### Walkthrough

Present the adapter onboarding and replacement metrics: conformance pass rate, time to onboard, schema compatibility, replay equivalence, tenant-isolation negative tests, and p99 latency.

### Suggested visual

A measurement ladder from contract conformance to production integration. Put the metrics next to each rung.

### Script

“The value of a shared adapter boundary is not the number of protobuf messages. It is the number of integrations that can reuse the same kernel without semantic forks. We should measure time to onboard an adapter, percentage of fields mapped with explicit transformations, replay equivalence, tenant-isolation negative tests, p99 and p99.9 latency, duplicate suppression, and action reconciliation. A new adapter should be able to implement the contract with its own source systems, matching strategy, graph logic, and process model while the Decision Kernel remains unchanged. If every domain requires kernel changes, the abstraction is too weak or too generic.”

### Delivery cue

Make adapter isolation an acceptance criterion, not a future aspiration.

---

## Slide 10 — Decision: fund proof, then scale

### Walkthrough

Close with the economic and architecture gates: instrumentation, kernel, AML vertical slice, shadow mode, dual-write, production validation, and second adapter.

### Suggested visual

A two-axis decision map: value evidence on the horizontal axis and technical proof on the vertical axis. Four zones: fund, narrow, defer, stop.

### Script

“The recommendation is to fund the workstreams with the highest Return on Research: cost-per-decision instrumentation, shared semantic contracts, tenant context, canonicalization, evidence, replay, and one complete AML vertical slice. The gRPC contract should be frozen early because it is a reusable engineering boundary. Broad connector catalogs, streaming optimization, dedicated environments, and full monolith retirement come later. The final decision is conditional on evidence: if replay, audit, latency, resilience, adapter isolation, and economics pass, scale the platform. If only the kernel proves reusable, keep it as infrastructure and narrow the product. If critical integrity or break-even claims fail, stop expansion.”

### Delivery cue

End with: “The product earns its platform status by proving that one decision can cross domains without losing meaning.”

---

## Appendix — Questions to prepare for

### “Why gRPC rather than REST only?”

Use both. REST is useful for partner onboarding and observability; gRPC provides strongly typed, low-latency service communication and streaming. The semantic contract must be identical.

### “Does protobuf make the contract stable automatically?”

No. Compatibility requires semantic versioning, reserved fields, explicit behavior for unknown fields, conformance tests, and a policy for major changes.

### “Why not make the adapter execute actions directly?”

Action execution is a separate control boundary. Keeping mapping separate from execution preserves idempotency, audit, authorization, and rollback semantics.

### “What if the TCO savings do not materialize?”

The program should narrow or stop. The architecture is a research-backed hypothesis, not a reason to ignore measured enterprise economics.
