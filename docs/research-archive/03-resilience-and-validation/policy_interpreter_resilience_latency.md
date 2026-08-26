# Policy Interpreter Resilience and Latency Analysis

## Scope

This document analyzes the Policy Interpreter as the decision-critical component in a high-frequency financial-crime screening path. It assumes that transaction canonicalization, entity resolution, watchlist indexing, relationship state, and behavioral features are supplied through bounded, pre-materialized interfaces. It deliberately keeps unbounded document extraction, remote research, deep graph traversal, and human investigation off the synchronous path.

The analysis is a **capacity-planning model and design specification**, not a production benchmark. The numbers below must be replaced with measurements from the target transaction rail, event mix, policy complexity, deployment environment, and action-acknowledgement contract.

## 1. Latency model

A transaction disposition should be modeled as a sum of bounded stages:

\[
T_{e2e} = T_{ingress} + T_{canonicalize} + T_{state} + T_{candidate} + T_{policy} + T_{persist} + T_{action} + T_{jitter}
\]

The Policy Interpreter controls only \(T_{policy}\), but it is often blamed for latency created by state retrieval, network calls, serialization, or downstream action acknowledgement. Instrument each component separately.

| Stage | Hot-path responsibility | Design posture |
|---|---|---|
| Ingress and authentication | Accept transaction, validate envelope, attach trace and deadline | Keep cryptographic and authorization operations bounded |
| Canonicalization | Normalize fields and roles | Deterministic, allocation-conscious, versioned |
| State retrieval | Read active policy, list epoch, entity state, graph slice, and features | Local or low-latency replicated snapshots; no unbounded remote calls |
| Candidate generation | Read prebuilt indexes and return bounded candidates | Candidate count and search depth must be capped |
| Policy interpretation | Evaluate Policy IR against typed facts and evidence metadata | Precompiled, deterministic, no arbitrary code |
| Decision persistence | Record decision/event envelope and hashes | Use a durable asynchronous path where product semantics permit; otherwise reserve budget explicitly |
| Action | Hold, reject, route, step up, or allow | Idempotent command with acknowledgement and timeout semantics |
| Jitter | Garbage collection, CPU steal, network variance, failover, cache misses | Measured at p99, p99.9, and during fault injection |

### Recommended latency profiles

Because transaction rails differ, use profiles rather than one universal SLO. The following are proposed acceptance profiles, not claims about any regulator or provider.

| Profile | Policy Interpreter p99 target | Full disposition p99 target | Use case |
|---|---:|---:|---|
| **Strict pre-execution** | ≤ 10 ms | ≤ 100 ms | Payment authorization or blocking before release |
| **Standard synchronous** | ≤ 25 ms | ≤ 250 ms | API payment, remittance, or exchange workflow with modest rail latency |
| **Deferred review** | ≤ 100 ms to enqueue | Minutes to hours | Hold, case creation, retrospective enrichment |
| **Batch re-screen** | Throughput-first | Completion deadline | Watchlist or relationship-state update across a portfolio |

The interpreter should return a compact trace synchronously. A richer explanation, graph expansion, document retrieval, and analyst brief should be asynchronous.

## 2. Quantitative capacity model

For a planning approximation, assume an interpreter mean service time of 2 ms after state is local and pre-materialized. With \(c\) independent workers, the theoretical service capacity is:

\[
\mu_{capacity} = \frac{c}{0.002} = 500c \text{ transactions per second}
\]

A safer operating point keeps nominal utilization below approximately 60–70% so that bursts, retries, garbage collection, and fault recovery have headroom. The following M/M/c calculations are illustrative and should be validated with load tests.

| Arrival rate | Workers | Mean service time | Utilization | Probability of waiting | Interpretation |
|---:|---:|---:|---:|---:|---|
| 1,000 tx/s | 32 | 2.0 ms | 6.25% | ~0% | Large headroom under the model |
| 5,000 tx/s | 32 | 2.0 ms | 31.25% | ~0% | Comfortable nominal load |
| 10,000 tx/s | 32 | 2.0 ms | 62.50% | 0.90% | Reasonable upper nominal region; burst tests required |
| 20,000 tx/s | 32 | 2.0 ms | 125.00% | 100% | Unstable; queue grows without bound |
| 10,000 tx/s | 64 | 2.0 ms | 31.25% | ~0% | Strong headroom |
| 20,000 tx/s | 64 | 2.0 ms | 62.50% | 0.03% | Reasonable nominal region; validate state and action bottlenecks |

The key result is not the exact queueing number. It is the **phase transition at utilization near 100%**. A system that appears fast in a single-request benchmark can become unbounded under burst load when the interpreter, state store, or action path crosses saturation.

The model assumes independent workers and does not include cache misses, remote dependencies, lock contention, list-index rebuilds, policy compilation, or downstream rail delays. Production capacity must be measured with a representative policy corpus, candidate distribution, graph depth, serialization format, CPU architecture, and failure injection.

## 3. Policy Interpreter execution model

The runtime should compile an approved Policy Bundle into a typed Policy IR. The hot path then executes a bounded evaluation graph:

1. Validate the policy and evidence epoch.
2. Resolve only declared fact references.
3. Evaluate hard constraints and mandatory prohibitions.
4. Evaluate evidence sufficiency and unknown/conflicted behavior.
5. Evaluate conditional and threshold rules.
6. Evaluate soft signals and queue-priority rules.
7. Resolve conflicts using the declared precedence profile.
8. Produce disposition, obligations, route, compact trace, and trace hash.

The interpreter should be a pure function of pinned inputs:

```text
PolicyEvaluation = f(
    policy_ir_version,
    decision_context,
    fact_set,
    evidence_snapshot_id,
    state_epoch,
    evaluation_clock,
    runtime_capabilities
)
```

No hidden wall-clock calls, random sampling, non-versioned feature lookups, or implicit network calls should be permitted. If a policy requires data that is unavailable, the interpreter must return `unknown` or `not_evaluable` and apply the policy's declared fail behavior.

## 4. Latency optimization priorities

### 4.1 Keep the hot path local and bounded

The most important optimization is architectural rather than algorithmic. Policy evaluation should read immutable or atomically published snapshots close to the interpreter. Watchlist indexes, customer state, relationship slices, and behavioral aggregates should be materialized before a transaction arrives. The interpreter should not call a sanctions provider, graph database, document parser, LLM, or external registry synchronously.

### 4.2 Compile policy once

Policy authoring and policy compilation are control-plane operations. The data-plane interpreter receives a validated, immutable Policy IR with pre-resolved references, normalized units, compiled predicates, and a declared maximum evaluation cost. A bundle activation should fail before becoming visible if compilation, static analysis, or conformance tests fail.

### 4.3 Bound graph and candidate work

A transaction may connect to a large graph, but the synchronous policy should declare maximum depth, edge types, time horizon, and candidate count. Deep ownership analysis, community detection, network typology analysis, and long-window aggregation should produce asynchronous signals or precomputed features. A policy may require those features to be present, but the interpreter must not discover them through unbounded traversal.

### 4.4 Avoid allocation and serialization churn

Use compact typed representations for hot-path facts, intern repeated identifiers, precompute normalized names, and avoid serializing the entire evidence snapshot into every service hop. The durable decision object can retain references and hashes while the synchronous trace carries only the facts and rule IDs needed for immediate audit correlation.

### 4.5 Separate decision latency from acknowledgement latency

The interpreter can finish while the action rail is unavailable. Treat these as distinct states:

- `decision_issued`: the policy result exists.
- `action_requested`: an idempotent command was sent.
- `action_acknowledged`: the downstream rail accepted or rejected it.
- `action_outcome_unknown`: the rail timed out and reconciliation is required.

Never convert an action timeout into an implicit allow. The product policy must state whether the transaction remains held, is retried with the same idempotency key, or enters reconciliation.

## 5. Resilience architecture

### 5.1 Failure domains

The interpreter should be stateless at the process layer and stateful only through versioned snapshots. Deploy active-active replicas across independent failure domains. Partition traffic by tenant, region, product, or transaction key so that a noisy tenant or hot account cannot monopolize all workers.

| Failure | Immediate behavior | Recovery behavior |
|---|---|---|
| Policy store unavailable | Use last-known valid compiled bundle only if within declared validity; otherwise hold or fail closed | Reconcile policy epoch and replay affected decisions |
| Watchlist index unavailable | Use last-known valid index only if freshness policy permits; otherwise hold/review | Rebuild index, activate atomically, retrospective re-screen |
| Feature store unavailable | Apply declared degraded policy; do not synthesize missing features | Recompute features and reopen decisions if material |
| Graph service unavailable | Use bounded pre-materialized relationship slice; otherwise unknown/conflicted | Enrich asynchronously and reassess |
| Event log unavailable | If durable record is required before action, do not acknowledge action; otherwise emit a local durable spool event | Drain spool, verify hashes, reconcile sequence |
| Action rail timeout | Preserve hold or unknown outcome according to policy; retry idempotently or reconcile | Query rail status and append acknowledgement/outcome |
| Policy compilation failure | Reject activation; keep current approved bundle | Fix, test, and activate a new version |
| Model service unavailable | Use last approved feature snapshot or deterministic rules if permitted | Mark degraded mode and assess missed enrichment |
| Replica loss | Route to another replica using same snapshot epochs | Rebalance after health and catch-up checks |
| Clock skew | Reject or quarantine events outside allowed skew | Synchronize clocks and replay affected window |

### 5.2 Snapshot and epoch consistency

A decision must not combine a new policy with an old list index or a new entity state with a stale relationship graph without declaring that combination valid. Publish a signed or hashed **screening state manifest** that binds the policy bundle, list bundle, entity state, graph epoch, feature set, and model bundle. The interpreter evaluates against one manifest ID.

State publication should use a two-phase pattern:

1. Build and validate new component snapshots off the live path.
2. Publish a manifest only when all required snapshots are available and internally consistent.
3. Atomically switch the active manifest pointer.
4. Retain prior manifests for replay and rollback.

### 5.3 Backpressure and overload

When arrival rate exceeds safe capacity, the system needs explicit overload policy. It should not silently drop transactions or silently bypass screening.

Recommended mechanisms are admission control, per-tenant quotas, priority lanes for legally or operationally critical flows, bounded queues, load shedding only for non-critical enrichment, circuit breakers around optional dependencies, and a durable hold queue for transactions that cannot be evaluated within the deadline. The policy bundle should define whether a transaction can be delayed, held, rejected, or routed to manual review under overload.

### 5.4 Retry and idempotency

Every transaction and action must carry an idempotency key. Retries must reuse the same key and include the original decision ID. Consumers deduplicate by event ID and idempotency key. A retry must never create two holds, two releases, two reports, or two case obligations.

The action state machine should make ambiguous outcomes explicit. For example, after an action timeout, the state is not `failed`; it is `outcome_unknown` until reconciliation proves accepted or rejected. This prevents duplicate release or duplicate blocking.

### 5.5 Degraded modes

Degraded modes must be predefined, observable, and time-bounded.

| Mode | Allowed computation | Allowed dispositions | Required marker |
|---|---|---|---|
| Normal | Full declared facts and policy | All policy-permitted outcomes | None |
| Snapshot-stale | Last valid snapshots within freshness grace | Only outcomes permitted by stale-data policy | `degraded_snapshot_age` |
| Feature-degraded | Deterministic facts and hard rules | Usually allow only if no hard rule requires missing features; otherwise hold/review | `missing_feature_set` |
| Graph-degraded | Precomputed bounded slice | Policy-defined; no unbounded traversal | `graph_slice_degraded` |
| Audit-spool | Local durable spool before central log recovery | Only if local durability and policy permit | `audit_spool_active` |
| Overload | Bounded evaluation and explicit queueing | Hold/reject/route according to policy; never silent allow | `overload_mode` |

Every degraded decision should be eligible for retrospective reassessment if the missing or stale dependency could have changed the disposition.

## 6. Testing strategy

### 6.1 Latency tests

Latency testing should report p50, p95, p99, and p99.9 separately for each stage and end-to-end disposition. Test steady state, burst, ramp, cold cache, warm cache, policy activation, list activation, and failover. Report throughput at 50%, 60%, 70%, 80%, 90%, and 100% utilization rather than one maximum number.

### 6.2 Resilience tests

| Test | Expected assertion |
|---|---|
| Kill one interpreter replica | No lost decision; bounded reroute; same result under same snapshot |
| Partition policy store | Validity and fail mode determine behavior; no implicit policy drift |
| Stale watchlist index | Freshness policy is enforced; affected decisions are marked and reassessed |
| Duplicate transaction event | One logical decision and one action command |
| Out-of-order customer update | Event-time semantics produce an explicit late-event reassessment |
| Event log outage | Durable spool or explicit non-acknowledgement; no silent loss |
| Action rail timeout | `outcome_unknown`, not false failure or implicit allow |
| Policy conflict | Declared precedence is applied and included in trace |
| 10x traffic burst | Backpressure and overload policy activate before saturation collapse |
| CPU or memory pressure | p99.9 latency and error behavior remain within declared envelope |
| Clock skew | Events are quarantined or handled under explicit skew tolerance |
| Malformed policy bundle | Activation rejected; last valid bundle remains active |

### 6.3 Replay and differential tests

For every material policy or engine change, replay a pinned corpus with the old and new versions. Compare disposition, fired rules, missing evidence, trace hash, latency, queue volume, and action obligations. A difference is not automatically a regression; it must be explained, approved, and recorded.

The system should support differential evaluation in which two Policy Interpreter implementations consume the same decision bundle. This makes the interpreter replaceable while preserving the canonical theory.

## 7. Observability and operational KPIs

| KPI | Why it matters | Suggested alarm condition |
|---|---|---|
| Interpreter p99 and p99.9 | Detect tail-latency failure before average latency moves | Sustained breach of profile target |
| Utilization by shard/tenant | Identify saturation and noisy neighbors | >70% nominal or rapidly rising |
| Policy evaluation error rate | Detect malformed facts, runtime defects, or incompatible bundles | Any unexplained increase |
| Unknown/conflicted fact rate | Detect evidence or state degradation | Above policy-specific baseline |
| Snapshot age and epoch skew | Detect stale or inconsistent inputs | Beyond declared freshness grace |
| Rule-firing distribution | Detect policy drift and unexpected volume changes | Large unexplained shift |
| Action acknowledgement latency | Separate rail issues from interpreter issues | p99 breach or timeout spike |
| Outcome-unknown age | Ensure ambiguous actions are reconciled | Any item beyond SLA |
| Duplicate suppression rate | Detect producer retries or consumer instability | Sudden increase |
| Replay divergence rate | Protect deterministic reproducibility | Any unexplained divergence |
| Case queue age | Prevent screening success from becoming operational failure | Queue SLA breach |
| Degraded-mode duration | Ensure fallbacks do not become permanent | Any mode beyond time limit |

## 8. Design conclusion

The Policy Interpreter should be treated as a **small, deterministic, bounded, highly replicated runtime** rather than an orchestration layer. Its resilience depends more on snapshot discipline, explicit unknown-data behavior, action idempotency, overload policy, and replay than on adding more sophisticated models.

The correct scaling strategy is to keep policy evaluation cheap and local, precompute expensive facts, isolate optional enrichment, and preserve a durable evidence-bound decision even when downstream systems fail. High-frequency screening is therefore compatible with the general Decision Infrastructure theory: the fast path is a latency profile over the same canonical decision and event model, not a separate abstraction.
