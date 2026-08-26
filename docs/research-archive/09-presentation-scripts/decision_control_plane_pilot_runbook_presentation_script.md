# First Pilot Customer Production Runbook
## Executive Presentation Script and Slide Walkthrough

## Slide 1 — A controlled path to production

**Visual:** Title with a five-stage path: approve, connect, shadow, canary, hand off.

**Talk track:**

"This is not a big-bang replacement plan. It is a controlled path from the incumbent decision engine to a bounded production pilot. We protect the customer by starting with one transaction rail and one tenant boundary, keeping the incumbent available, and requiring evidence at every stage."

## Slide 2 — What the MVP evidence says

**Visual:** Evidence matrix with four green checks and one caution.

**Talk track:**

"The reference MVP gives us permission to pilot, not permission to claim universal production readiness. The Policy Interpreter and RPO/fencing tests pass. The continuous partition and asynchronous Byzantine harnesses pass their safety assertions. The compliance/XAI generator passes the reference package. The caution is important: these are protocol results, not customer-specific capacity or regulatory-effectiveness claims."

## Slide 3 — The production pilot boundary

**Visual:** Bounded scope diagram: one rail, one tenant or legal entity, one policy bundle, one action boundary.

**Talk track:**

"The pilot boundary is deliberately narrow. One transaction rail, one legal-entity or jurisdictional boundary, one bounded policy bundle, one action class, and one operational team. We do not migrate every rail or region before the first slice proves correctness, economics, and operability."

## Slide 4 — Ten deployment steps

**Visual:** Horizontal sequence: charter, landing zone, contracts, adapter, capture, shadow, resilience, dry run, canary, closeout.

**Talk track:**

"The deployment sequence has ten steps. We approve the charter, establish the landing zone, register contracts, connect the adapter in read-only mode, capture incumbent behavior, run the interpreter in shadow, validate security and resilience, dry-run the action rail, co-execute and reconcile, and then cut over a canary cohort. Each step has an exit condition; the next step does not begin just because the calendar says so."

## Slide 5 — The customer developer path

**Visual:** Developer onboarding path: install, sandbox, telemetry, conformance, replay, shadow, canary, handoff.

**Talk track:**

"The developer experience is intentionally typed and explicit. The SDK validates tenant context, schema version, deadline, idempotency key, and trace context. Developers first use fixtures in a sandbox, then connect telemetry, run adapter conformance, replay approved historical data, and only then move into shadow and canary authority. A retry never silently creates a new logical transaction."

## Slide 6 — Production observability

**Visual:** Dashboard mockup with six tiles: RPO headroom, owner epoch, fencing, admission p99, audit freshness, action unknowns.

**Talk track:**

"Operators need to know whether a tenant can safely issue a decision now. The dashboard makes RPO headroom, ownership epoch, fencing rejections, admission p99, audit freshness, and action unknowns visible in real time. The red state is not simply 'service unavailable'; it can be 'service available but unsafe to allow.'"

## Slide 7 — Hard gates before authority

**Visual:** Six gates: correctness, determinism, fencing, actions, RPO, isolation, with RTO and operations as footer.

**Talk track:**

"Authority changes only after hard gates pass: no unexplained critical divergence, at least 99.99 percent replay equivalence for pinned cases, zero stale-epoch writes, zero duplicate side effects, explicit RPO behavior, complete durable traces, zero cross-tenant findings, and a runbook that a non-authoring operator can execute."

## Slide 8 — Canary, rollback, and day two

**Visual:** Canary-to-rollback loop with ownership epoch transitions.

**Talk track:**

"Canary cutover is reversible, but rollback is not a DNS switch. We stop new writes through the admission gate, reconcile actions, fence the DCP epoch, advance the alternate owner epoch, route traffic, and preserve evidence. Day two includes daily health review, weekly reconciliation, monthly drills, and quarterly restore and TCO refresh."

## Slide 9 — The go/no-go decision

**Visual:** Green 'Go' conditions on left, red 'Do not go' conditions on right.

**Talk track:**

"We go when the customer has a bounded slice, complete action idempotency, approved residency and key controls, replay data, named operators, and a reversible canary. We do not go when the customer cannot make one writer authoritative at a time, cannot acknowledge actions, cannot pin policy and state versions, or requires an immediate global replacement."

## Slide 10 — Executive close

**Visual:** Three commitments: measure, protect, expand.

**Talk track:**

"The ask is to fund a controlled production pilot. We will measure the incumbent and the new path, protect the stable kernel and tenant boundaries, and expand only when evidence justifies it. The product is not only a faster decision engine; it is a safer, replayable, and operable way to change decision authority."
