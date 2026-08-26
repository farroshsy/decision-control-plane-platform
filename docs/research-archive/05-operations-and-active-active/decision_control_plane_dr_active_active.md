# Decision Control Plane — Disaster Recovery and Multi-Region Active-Active Strategy

## 1. Executive design

The Decision Control Plane should use **multi-region active-active service execution with deterministic tenant ownership, replicated immutable events, and explicit regional failover modes**.

Active-active does not mean that every record is freely writable from every region. The safe pattern is:

> **Serve locally in both regions; write each decision aggregate through one deterministic home region at a time; replicate immutable events and state; move ownership only through a fenced, audited lease transition.**

This avoids the most dangerous failure mode for a decision system: two regions issuing conflicting actions for the same transaction or appending incompatible policy/evidence histories.

NIST SP 800-34 frames contingency planning as a process for determining recovery requirements and priorities, connecting recovery design to organizational resilience, risk assessment, incident response, and the system life cycle [1]. AWS describes multi-site active/active as a pattern in which traffic can be served from multiple Regions and routed away from an impacted Region, but the benefit depends on replicated data and operational readiness [2].

## 2. Recovery objectives by capability

Different Decision Control Plane capabilities need different RTO/RPO. Treating the whole platform as one recovery class is expensive and unsafe.

| Capability | Recovery class | Target RTO | Target RPO | Failure behavior |
|---|---|---:|---:|---|
| Transaction ingress and edge guard | Critical hot path | ≤30 seconds | ≤1 second | Route to healthy region; reject or hold if context cannot be verified |
| State manifest and policy activation | Critical control | ≤5 minutes | 0–1 minute | Use last valid signed manifest; do not activate mixed versions |
| Policy Interpreter | Critical hot path | ≤30 seconds | ≤1 second | Use local compiled artifact and pinned manifest; no unbounded dependency calls |
| Decision Kernel | Critical durable | ≤60 seconds | ≤1 second | Single-writer lease per decision aggregate; fence stale region |
| Compact decision trace | Critical evidence | ≤60 seconds | 0–1 second | Local durable append/spool before action where policy requires |
| Action executor | Critical side effect | ≤60 seconds | 0–1 second | Idempotent command, explicit outcome unknown, reconciliation |
| Rich evidence store | High | ≤15 minutes | ≤5 minutes | Queue enrichment; compact trace remains available |
| Case and reporting workflow | High | ≤15 minutes | ≤5 minutes | Rehydrate case from event log; preserve deadlines |
| Replay and differential harness | Moderate | ≤2 hours | ≤15 minutes | Restore from replicated event/evidence snapshots |
| Analytics and process mining | Low/moderate | ≤24 hours | ≤1 hour | Rebuild asynchronously from immutable events |

Targets are proposed engineering objectives and must be calibrated through business-impact analysis and pilot rail deadlines before production commitment.

## 3. Regional topology

```text
                         Global traffic and health routing
                                       |
                 +---------------------+---------------------+
                 |                                           |
        +--------v---------+                         +-------v----------+
        | Region A          |                         | Region B          |
        | active serving    |                         | active serving    |
        +--------+----------+                         +-------+----------+
                 |                                           |
        +--------v----------+                         +-------v----------+
        | Edge + PEP         |                         | Edge + PEP        |
        | Adapter + PI       |                         | Adapter + PI      |
        | Kernel + Action    |                         | Kernel + Action   |
        +--------+----------+                         +-------+----------+
                 |                                           |
        +--------v----------+     ordered event replication +-------v----------+
        | Tenant home shard  |<==============================>| Tenant home shard|
        | journal + state    |                                | journal + state  |
        +--------+----------+                                +-------+----------+
                 |                                                   |
        +--------v----------+                                +-------v----------+
        | Evidence / replay  |                                | Evidence / replay|
        | residency scoped   |                                | residency scoped |
        +--------------------+                                +------------------+
```

### Routing

Use latency-aware health routing for ordinary requests, but use deterministic tenant/decision ownership for writes. A request carries tenant and decision IDs; the routing layer resolves the tenant home shard and verifies the current ownership epoch. A region can serve a read from a local replica, but a write must be accepted only by the current owner or by an explicitly fenced failover owner.

### Data residency

Residency is a hard constraint, not a routing preference. A tenant's primary and replica regions must be within its approved residency and transfer boundary. Cross-region replication of restricted financial-crime evidence may use encrypted, tokenized, or claim-minimized forms where full replication is not permitted. The replay manifest must state which artifacts are local-only and which replicated references are sufficient for authorized replay.

## 4. Replication model by data type

| Data | Replication mode | Conflict strategy |
|---|---|---|
| Immutable domain events | Ordered append replication | Event ID and sequence are immutable; duplicates are ignored |
| Decision episode | Single-writer per aggregate epoch | Fenced owner; later reassessment appends a new episode event |
| Policy bundles | Signed artifact replication | Highest approved version only; activation is a separate control event |
| State manifest | Versioned snapshot replication | Atomic manifest pointer; no partial activation |
| Entity and relationship state | Event-derived replicas | Rebuild from source events; conflicts become explicit conflicted facts |
| Candidate matches | Deterministic recomputation or replicated result | Matcher version and evidence hash decide equivalence |
| Evidence artifacts | Residency-scoped encrypted replication | Content hash; missing artifact is visible, never treated as negative evidence |
| Action commands | Idempotent command log | Command ID and rail reference prevent duplicate side effects |
| Action acknowledgements | Append-only outcome events | Unknown remains unknown until reconciliation |
| Cases and analyst findings | Ordered case events | Single case owner or conflict workflow; no last-write-wins on findings |
| Metrics and traces | Regional aggregation | Loss-tolerant operational telemetry; no decision authority |
| Caches and indexes | Rebuildable regional copies | Invalidate by manifest epoch; never authoritative |

Avoid generic last-write-wins for decisions, policy, evidence, action outcomes, or analyst findings. A timestamp does not tell us whether a later write is more authoritative.

## 5. Event replication and ordering

Every event carries:

```text
event_id
aggregate_type
aggregate_id
tenant_id
home_region
ownership_epoch
aggregate_sequence
event_time
processing_time
correlation_id
causation_id
schema_version
payload_hash
previous_event_hash
```

The journal guarantees at-least-once delivery. Consumers are idempotent. An event is accepted only if its tenant scope, ownership epoch, sequence, schema, and hash chain are valid. A sequence gap produces a visible replication condition and pauses dependent projections; it does not silently advance the state.

### Replication acknowledgements

For critical decisions, the hot path should distinguish three durability levels:

1. **Local durable:** appended to a local quorum or durable spool before action.
2. **Cross-region acknowledged:** replicated to the paired region within the target RPO.
3. **Rich evidence durable:** full evidence and explanations persisted asynchronously.

The required level is policy-specific. A transaction cannot be released merely because the request returned before a required compact trace was durable.

## 6. Failover protocol

### Normal operation

1. Resolve tenant home region and ownership epoch.
2. Read the active, signed screening-state manifest.
3. Evaluate with local compiled policy and bounded state.
4. Append `DecisionIssued` and compact trace.
5. Submit an idempotent action command.
6. Replicate critical event and reconcile acknowledgement.

### Regional impairment

1. Health controller detects a regional failure using multiple independent signals.
2. Stop new writes to the impaired region.
3. Fence the old ownership epoch using a quorum or external lease authority.
4. Confirm the surviving region has the required policy, state, and event watermark.
5. Advance the tenant ownership epoch in an audited control event.
6. Route the tenant to the surviving region.
7. Use the declared degraded mode for any missing or stale required evidence.
8. Reconcile in-flight actions and unknown outcomes.
9. Rebuild the impaired region from the surviving journal and verified snapshots.
10. Return ownership only through a controlled, tested failback.

### Split-brain prevention

A region must not accept decision or action writes merely because it is reachable. Write authority requires a valid ownership epoch and lease. The action executor must also enforce idempotency against the rail reference or command ID so a stale region cannot repeat a side effect.

## 7. Failure modes and behavior

| Failure | Immediate behavior | Recovery |
|---|---|---|
| Region unavailable | Route to surviving region if ownership is fenced | Rebuild and compare journals |
| Inter-region link unavailable | Continue only within RPO and policy bounds; pause risky writes if required | Backfill ordered events and reconcile |
| State manifest stale | Use last valid manifest only if policy permits; otherwise hold/review | Activate verified manifest |
| Policy registry unavailable | Use locally cached signed policy artifact | Restore control plane and compare hashes |
| Audit journal unavailable | Local durable spool if capacity and policy permit; otherwise hold | Drain spool with deduplication |
| Action rail unavailable | Explicit outcome unknown; no implicit allow/release | Reconcile rail state |
| Replication lag exceeds RPO | Raise critical alert; restrict high-risk decisions | Catch up or enter controlled degraded mode |
| Divergent event sequence | Pause projection; preserve both evidence paths | Resolve through authoritative event/replay process |
| Ownership lease ambiguity | Reject or hold writes; never dual-write | Establish quorum-backed owner |
| Key service unavailable | Use narrowly scoped cached data-key material only if policy allows | Restore KMS/HSM and verify integrity |
| Evidence artifact missing | Mark missing; do not infer negative evidence | Restore artifact or request evidence |
| Noisy tenant overload | Apply tenant quota and isolate queue | Rebalance or move tenant shard |

## 8. Disaster-recovery tiers

### Tier A — Critical transaction decisions

Use active-active serving, deterministic tenant home ownership, local compiled policy, local bounded state, durable compact trace, idempotent actions, and cross-region event replication. Avoid remote synchronous graph or document calls in the hot path.

### Tier B — Cases, reports, and evidence

Replicate ordered events and encrypted evidence references. Rehydrate cases and reporting obligations from the journal. Preserve deadlines and responsible roles. If full evidence is unavailable, show a missing-evidence state and prevent false closure.

### Tier C — Analytics and model development

Use asynchronous replication and rebuildable derived stores. Analytics can be delayed during a disaster without changing the authority of the decision path.

## 9. DR tests and evidence

| Test | Frequency | Pass criteria |
|---|---|---|
| Region traffic evacuation | Monthly | SLO maintained or declared degraded mode activated |
| Tenant ownership failover | Monthly | No split-brain writes; epoch changes are audited |
| Audit journal loss | Monthly | No acknowledged action lacks recoverable compact trace |
| Inter-region partition | Monthly | RPO bound respected; no unsafe silent allow |
| Action rail outage | Monthly | Outcome unknown and reconciliation behave idempotently |
| Policy activation during failover | Quarterly | No mixed-version manifest is activated |
| Key-service outage | Quarterly | Authorized cached behavior and recovery are verified |
| Selective tenant restore | Quarterly | One tenant restores without exposing another tenant |
| Full regional rebuild | Quarterly | Journal, snapshots, projections, and replay checks pass |
| Split-brain game day | Semiannual | Stale region is fenced and duplicate side effects are zero |
| Residency transfer audit | Annual and on change | Replication and backup remain within approved boundary |

## 10. Observability and SLOs

Measure by tenant and region:

- decision p50/p95/p99/p99.9 latency;
- event append latency and durable-spool age;
- cross-region replication lag and watermark age;
- ownership epoch changes and lease age;
- policy/state-manifest version skew;
- action duplicate suppression and outcome-unknown age;
- replay divergence count;
- audit completeness and hash-chain verification;
- recovery time and data-loss interval;
- tenant queue depth, quota consumption, and noisy-neighbor impact;
- evidence restore time and missing-artifact rate.

A region may be “healthy” for liveness but not ready for a tenant's high-risk decision profile. Readiness should include policy, state, evidence, key, action, audit, and residency checks.

## 11. RoR for DR workstreams

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Recovery objectives by capability | 5 | 5 | 5 | Medium / 3 | Low / 5 | **4.70** | Now |
| Immutable event replication | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Ownership epochs and fencing | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Action idempotency and reconciliation | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Regional failover game days | 4 | 5 | 5 | Very high / 2 | Medium / 4 | **4.25** | Now |
| Residency-aware dedicated tiers | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |
| Global active-active writes without ownership | 3 | 3 | 2 | Very high / 2 | High / 2 | **2.75** | Do not adopt |

## Final recommendation

Implement active-active service serving, but keep decision aggregates single-writer per ownership epoch. Replicate immutable events and signed manifests; rebuild projections; make action execution idempotent; and treat missing, stale, or unreplicated evidence as explicit degraded state. The system should be designed to fail closed or hold when it cannot preserve the decision's declared integrity, rather than optimizing availability through an untraceable bypass.

## References

[1]: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final "NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems"

[2]: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html "AWS, Disaster recovery options in the cloud"
