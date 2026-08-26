# RPO Admission Control and Fencing Protocol
## Executive Presentation Script and Slide Walkthrough

## Slide 1 — The control that makes active-active safe

**Visual:** Title slide with the operating loop: measure RPO, admit or hold, fence stale writers, reconcile.

**Talk track:**

"Today’s decision is not whether we can run two regions. We can. The question is whether both regions can remain safe when replication is delayed, the network is partitioned, or a retry arrives after ownership changes. The RPO admission-control and fencing protocol is the control that makes active-active service governable. It converts uncertainty into an explicit decision: admit, hold, retry, reject, or fence."

## Slide 2 — Why RPO is a decision boundary

**Visual:** Three-column contrast: fresh state, degraded state, unsafe state.

**Talk track:**

"Replication lag is not merely an infrastructure metric. For a high-consequence decision, it changes what the system is allowed to do. When state is within the tenant’s RPO budget and the compact trace is durable, the decision may proceed. When the budget is exceeded, allow-like actions are held or rejected. This is safer than silently continuing with stale evidence."

## Slide 3 — Admission control before side effects

**Visual:** Decision matrix showing ownership, epochs, manifest, policy, trace, deadline, and RPO checks.

**Talk track:**

"The gate sits immediately before decision issuance and action side effects. It verifies that the request is for the correct tenant, the region owns the current epoch, the policy and state manifest match, the trace can be durably recorded, the deadline has not expired, and replication remains inside the RPO budget. A failure does not become an exception hidden in a log; it becomes a typed outcome that the action rail and operators can handle."

## Slide 4 — Fencing is stronger than routing

**Visual:** Ownership epoch transition: epoch 1 in Region A, quorum fence, epoch 2 in Region B.

**Talk track:**

"DNS, load balancers, and feature flags are not fencing. They can stop new traffic, but they cannot prove that an old writer has stopped. Fencing is an authorization fact enforced at write time. The stale region presents an old epoch and is rejected. The surviving region receives a new epoch. This is how we prevent dual authority even when both regions remain reachable to parts of the system."

## Slide 5 — The end-to-end partition sequence

**Visual:** Four stages: serve, partition, fence/takeover, heal/reconcile.

**Talk track:**

"During normal operation, regions serve and replicate. During partition, the owner continues only while the admission budget permits; after the RPO threshold, risky decisions are held. Once quorum fencing completes, ownership advances and the surviving region becomes the sole writer. Retries are idempotent and do not create duplicate actions. After healing, events are replayed, hashes are checked, and actions, cases, and reports are reconciled before failback."

## Slide 6 — What the tests prove—and what they do not

**Visual:** Two result bands: 8/8 synchronous scenarios and 6/6 asynchronous Byzantine scenarios.

**Talk track:**

"The deterministic harnesses pass the protocol safety checks. Across eight partition scenarios, there were zero split-brain accepts and zero duplicate actions. Across six asynchronous Byzantine scenarios, corrupted messages were rejected, delayed and duplicated messages were deduplicated, and recovery completed without missing valid events. These are protocol results, not production capacity claims. The next step is infrastructure-specific chaos testing with pilot telemetry."

## Slide 7 — Executive decision and next gate

**Visual:** Three decisions: fund pilot, enforce invariants, scale on evidence.

**Talk track:**

"The recommendation is to fund a bounded production pilot with the protocol enabled from day one. We should not scale until the customer-specific deployment passes zero split-brain writes, zero duplicate actions, tenant-specific RPO behavior, replay equivalence, isolation tests, and signed RTO/RPO targets. The protocol is the stable kernel; storage, replication technology, policy models, and domain adapters remain replaceable."
