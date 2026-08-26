# Decision Control Plane — 90-Day MVP Validation Plan

## Objective

The 90-day MVP phase is intended to determine whether the Decision Control Plane can deliver one complete, trustworthy financial-crime screening loop in production-like conditions. It is not intended to prove that every financial-crime problem or every industry can be supported.

The MVP passes only if it demonstrates five properties simultaneously:

1. **Decision correctness:** the system maps canonical facts to the intended disposition under versioned policy.
2. **Operational timeliness:** the hot path meets a declared transaction-rail latency profile under realistic load and bursts.
3. **Resilience:** critical dependency failures produce explicit, policy-compliant degraded behavior rather than silent bypass.
4. **Auditability:** every material disposition can be reconstructed from immutable evidence, policy, state, and action records.
5. **Reuse potential:** the stable kernel remains independent of AML-specific semantics and can support a second adapter without forking the decision model.

The targets below are proposed acceptance criteria for the first pilot. They are engineering goals, not regulatory claims, and must be calibrated with the pilot institution's actual rail deadlines and risk appetite.

## 1. Validation gates

| Gate | Window | Primary question | Exit decision |
|---|---:|---|---|
| G0 — Contract freeze | Days 1–14 | Are schemas, policy semantics, failure modes, and falsifiers explicit? | Proceed only if an independent reviewer can implement and challenge the contracts |
| G1 — Deterministic kernel | Days 15–35 | Can the same decision be reconstructed after restart, duplicates, late events, and version changes? | Proceed only if replay and audit invariants pass |
| G2 — AML vertical slice | Days 36–60 | Can one transaction flow from adapter to policy to action to audit? | Proceed only if hold, allow, unknown, and action ambiguity paths pass |
| G3 — Production-like validation | Days 61–80 | Does the system meet latency, throughput, resilience, and operational targets? | Proceed only if no critical failure mode is unresolved |
| G4 — Generalization decision | Days 81–90 | Is the kernel reusable, or is this only an AML implementation? | Add a second adapter, narrow the thesis, or stop |

## 2. Core success criteria

The MVP is a **pass** only if all mandatory criteria are satisfied. A high average score cannot compensate for a failure in audit integrity, implicit allow behavior, replay, or critical latency.

| ID | Criterion | Target | Failure threshold | Evidence |
|---|---|---|---|---|
| C1 | Schema conformance | 100% of live decision and event envelopes validate at service boundaries | Any silently accepted malformed material event | Validation logs and rejected-event corpus |
| C2 | Decision replay | ≥99.99% of pinned decisions reproduce disposition, fired rules, unknowns, and trace hash exactly | Any unexplained divergence on a material decision | Replay comparison report |
| C3 | Audit completeness | 100% of acknowledged actions have a recoverable compact decision trace; ≥99.9% have rich evidence record within 5 minutes | Any acknowledged action without durable or recoverable trace | Audit-to-action reconciliation |
| C4 | Audit integrity | 100% hash-chain verification over the test corpus and no undetected tamper in mutation tests | Any undetected modification | Tamper-injection results |
| C5 | Hot-path latency | Policy Interpreter p99 ≤10 ms for strict profile; full disposition p99 ≤100 ms, or agreed rail-specific target | Sustained breach for 5 minutes at nominal load | Stage-level latency telemetry |
| C6 | Tail latency | p99.9 full disposition remains below 2× the agreed p99 target under nominal load | Tail collapse or unbounded queue growth | Load-test report |
| C7 | Throughput headroom | First bottleneck ≤70% utilization at nominal peak; ≥30% burst headroom | Any critical stage ≥100% utilization during nominal peak | Capacity and queue report |
| C8 | No silent allow | 0 transactions implicitly allowed because of missing required policy, list, state, or audit dependencies | Any silent allow caused by dependency failure | Fault-injection audit |
| C9 | Explicit degraded behavior | 100% of injected critical failures produce declared hold, reject, review, compensating-control, spool, or outcome-unknown state | Any undeclared fallback | Failure-mode test matrix |
| C10 | Idempotency | Duplicate transaction and action submissions create one logical decision and one logical side effect | Any duplicate hold, release, report, or case | Duplicate/retry tests |
| C11 | Unknown-data safety | 100% of material unknown/conflicted facts are visible in the decision trace and routed according to policy | Any unknown coerced to safe/negative silently | Fact-state assertions |
| C12 | Action reconciliation | ≥99.99% of action requests reach terminal acknowledged/reconciled state within SLA | Any aged outcome-unknown item beyond SLA | Rail reconciliation report |
| C13 | Investigation usefulness | Median analyst time to reconstruct a decision improves by ≥50% versus current pilot workflow | No measurable improvement or worse reconstruction accuracy | Controlled analyst study |
| C14 | Evidence completeness | ≥95% of material claims have source, timestamp, scope, confidence, and freshness metadata | <90% or material claims without provenance | Evidence-quality report |
| C15 | Matcher quality | Recall and false-positive targets are defined on a labeled corpus; no material regression versus incumbent without approved tradeoff | Unexplained recall loss or unacceptable false-positive increase | Blind benchmark and adjudication |
| C16 | Adapter isolation | AML-specific code is confined to adapter/policy-pack boundaries; no kernel fork required | Kernel changes required for ordinary AML semantics | Architecture review and dependency scan |
| C17 | Security baseline | No critical unresolved finding; tenant, field-level, and audit access controls pass tests | Any critical data isolation or audit-access defect | Security review |
| C18 | Operational readiness | On-call can diagnose a decision, dependency failure, and replay divergence using runbooks | Unresolved incident without source-level debugging path | Game-day report |

## 3. Measurement definitions

### 3.1 Decision correctness and replay

**Replay fidelity** is measured as the proportion of replayed decision bundles whose disposition, obligations, fired rule IDs, unknown predicates, policy version, evidence snapshot ID, and trace hash match the original. A permitted difference must be explicitly declared, such as a non-deterministic model accompanied by a reproducibility artifact.

**Policy correctness** is measured against a gold corpus of positive, negative, boundary, missing-data, contradictory, and effective-date cases adjudicated by qualified financial-crime reviewers. The metric is not simply accuracy: every false allow, mandatory-hold miss, and incorrect unknown-state transition receives a severity label.

### 3.2 Latency and throughput

Instrument every stage with a shared correlation ID and record arrival time, queue-entry time, start time, finish time, and error/degraded state. Report p50, p95, p99, and p99.9 for ingress, adapter, state read, candidate generation, Policy Interpreter, audit commit/spool, action request, action acknowledgement, and full disposition.

The **first bottleneck utilization** is the maximum of offered rate divided by measured sustainable capacity across stages. Nominal operation should stay below 70% utilization for the first bottleneck. The MVP must also record burst amplitude, burst duration, maximum queue age, time to drain, and whether overload mode preserved policy-compliant behavior.

### 3.3 Audit and provenance

**Audit completeness** joins every `ActionAcknowledged` event to a `DecisionIssued` event, evidence snapshot, policy bundle, state manifest, and trace hash. Rich asynchronous enrichment may arrive later, but the compact trace must be recoverable before or at action acknowledgement when policy requires it.

**Evidence completeness** samples material facts used by the interpreter and checks for source reference, content hash where applicable, observed time, validity interval, scope, confidence/uncertainty, and derivation method. The metric must distinguish “no evidence” from “negative evidence.”

### 3.4 Resilience

For each critical dependency, inject unavailability, stale state, timeout, corruption, sequence gap, slow response, and recovery. Record the disposition, degraded-mode marker, policy version, state manifest, audit state, queue age, recovery time, and reassessment behavior.

The system passes resilience validation only when behavior is both **safe** and **observable**. Holding every transaction forever is not success; allowing every transaction during an outage is failure. The correct behavior is policy- and jurisdiction-specific, explicit, time-bounded, and recoverable.

### 3.5 Human and operational value

Run a controlled study with trained users using matched decision cases. Compare current workflow with the Decision Control Plane on reconstruction time, evidence-location time, number of system hops, challenge rate, recommendation modification rate, and correctness of the final explanation. Do not use page views or clicks as the primary success measure.

## 4. Test corpus and workloads

The 90-day corpus should include:

| Corpus | Minimum composition |
|---|---|
| Policy fixtures | Positive, negative, threshold, effective-date, conflict, exception, and missing-evidence cases |
| Identity fixtures | Exact match, aliases, transliteration, mononyms, diacritics, token order, shared identifiers, false links |
| Transaction mix | Domestic, cross-border, high-value, low-value, recurring, bursty, multi-intermediary, and multi-currency flows |
| Relationship states | Resolved, unresolved, stale, changed ownership, changed control, and late-arriving relationship events |
| Operational faults | Policy store, list index, feature state, graph slice, audit store, action rail, network, clock, and replica failures |
| Delivery faults | Duplicates, out-of-order events, retries, sequence gaps, malformed events, and consumer restarts |
| Outcome labels | Cleared, confirmed match, false positive, report filed, returned, loss, and unresolved outcomes where available |

The load suite should include steady-state runs at 50%, 60%, 70%, 80%, 90%, and 100% of each stage's measured capacity; 5× bursts; sustained overload; cold-cache runs; policy activation; list activation; and recovery after dependency failure.

## 5. 90-day execution plan

### Days 1–14: Contract freeze

Freeze the canonical decision schema, event envelope, Policy IR subset, adapter manifest, state manifest, action state machine, and audit/replay invariants. Write the gold fixtures and failure matrix before implementing optimization.

**Required artifacts:** schema registry, conformance suite, falsifier document, threat model, latency budget, and RoR update.

### Days 15–35: Deterministic kernel

Implement the decision episode, event journal, evidence snapshot, state manifest, hash chain, replay service, and idempotency handling. Run restart, duplicate, late-event, sequence, and tamper tests.

**Required exit evidence:** C1–C4, C8, C10, and C11 pass in automated CI.

### Days 36–60: AML vertical slice

Implement transaction canonicalization, bounded candidate facts, policy evaluation, action mapping, case handoff, and the minimal decision workbench. Keep rich investigation enrichment asynchronous.

**Required exit evidence:** all seven baseline integration tests pass, plus a labeled policy and identity corpus with adjudication results.

### Days 61–80: Production-like validation

Run load, burst, state-staleness, action-timeout, audit-outage, policy-activation, and replica-failure tests. Add dashboards and runbooks. Conduct a security and privacy review.

**Required exit evidence:** C5–C12, C17, and C18 pass.

### Days 81–90: Generalization decision

Implement a thin second adapter or adapter-shaped conformance fixture, preferably supplier continuity or public procurement. Measure which kernel contracts are reused unchanged and which semantics remain domain-specific.

**Required exit evidence:** C13–C16 and a written false-abstraction analysis. The outcome may be proceed, narrow, or stop; all three are valid research results.

## 6. Go / no-go decision

### Proceed to productization if

All mandatory criteria pass, the pilot institution accepts the action and audit semantics, the benchmark demonstrates safe headroom, and a second domain can reuse the kernel without a semantic fork.

### Narrow the thesis if

The AML product works but the second adapter requires substantial kernel changes, or if the shared abstraction is useful only for evidence-bound transaction decisions rather than a broader class of relationship decisions.

### Stop or pivot if

The system cannot guarantee replay or audit completeness, frequently produces implicit allows under dependency failure, fails to meet the transaction rail's latency profile after removing unbounded calls, or provides no measurable improvement over existing screening and audit workflows.

## 7. Return on Research for the validation phase

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Contract and falsifier freeze | 5 | 5 | 5 | Medium / 3 | Low / 5 | **4.70** | Now |
| Replay and audit proof | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Stage-level load harness | 4 | 5 | 4 | High / 3 | Medium / 4 | **4.15** | Now |
| AML end-to-end slice | 4 | 4 | 2 | High / 3 | High / 2 | **3.15** | Now as proving ground |
| Human workflow study | 3 | 3 | 4 | High / 3 | Medium / 4 | **3.35** | After first loop |
| Second-domain adapter | 3 | 4 | 5 | Very high / 2 | High / 2 | **3.35** | Day 81–90 only |

The validation phase should maximize learning per engineering cycle. It should not expand the product surface until the kernel's correctness, latency, resilience, and replay claims have been tested.
