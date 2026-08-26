# Decision Control Plane State-Store Migration and Schema-Versioning Strategy

## Executive decision

Upgrade the Policy Interpreter state store using an **expand–migrate–verify–contract** protocol. Never change the meaning of an in-use field in place, never let two schema versions write ambiguous representations, and never require a fleet-wide stop to upgrade the state store.

The unit of migration is a **tenant and state partition**, not the entire database. This permits progressive rollout, tenant-specific rollback, residency-aware scheduling, and controlled observation of the hot path.

## 1. State-store scope

The migration protocol applies to:

| State family | Examples | Migration risk |
|---|---|---|
| Policy/state manifests | policy epoch, model epoch, watchlist snapshot, evidence watermark | High; changes admission behavior |
| Fact assertions | confirmed, candidate, cleared, conflicted, unknown facts | High; changes tri-state evaluation |
| Decision/idempotency state | decision ID, idempotency key, action status, outcome | Critical; duplicate actions or replay divergence |
| Ownership/fencing state | owner region, lease, epoch, expiry, fencing status | Critical; split-brain risk |
| Replication state | local sequence, peer acknowledgement, lag, checkpoint | Critical; RPO admission risk |
| Projection/cache state | entity index, graph projection, feature cache | Medium; rebuildable from events |
| Operational state | retry counters, queue cursors, alert acknowledgements | Medium; must not hide incidents |

The immutable event journal remains the source of record for reconstructable state. Mutable state is an indexed projection or bounded operational register with an explicit version and provenance reference.

## 2. Schema versioning rules

Every persisted record carries:

```text
schema_family
schema_version
tenant_id
partition_key
record_id
record_revision
created_at
updated_at
source_event_sequence
policy_epoch
state_manifest_epoch
ownership_epoch
content_hash
```

### Compatibility levels

| Level | Meaning | Allowed in rolling deployment |
|---|---|---|
| Backward compatible | New reader reads old and new records; old reader still reads old records | Yes |
| Forward compatible | Old reader can safely ignore new optional fields | Only when explicitly tested |
| Bidirectionally compatible | Old and new readers can process both representations with identical semantics | Required for dual-read/dual-write |
| Breaking | Meaning, required fields, ordering, or identity changes | No; requires new version and migration boundary |

A schema version is not only a serialization number. It identifies the semantic interpretation of the record. A new version must provide a canonicalization rule, an upgrade path, a downgrade or rollback posture, and replay fixtures.

## 3. Migration protocol

### Phase 0 — Prepare

1. Create a migration RFC with affected state families, tenant scope, schema versions, invariants, expected volume, backfill cost, rollback plan, and RoR.
2. Define the compatibility matrix for every reader and writer.
3. Add metrics: read version, write version, dual-write mismatch, backfill lag, replay divergence, lock/wait time, and error rate.
4. Freeze unrelated changes to policy semantics, ownership, and action rails for the migration cohort.
5. Build a representative corpus containing normal, unknown, conflicted, stale, duplicate, failover, replay, and action-reconciliation records.

### Phase 1 — Expand

1. Add new nullable columns, tables, indexes, or topics without removing old structures.
2. Add `schema_version` and `record_revision` if missing.
3. Add new reader code that can read v1 and v2.
4. Keep v1 as the authoritative write representation.
5. Deploy to one non-production tenant and run schema, replay, isolation, and failover tests.

### Phase 2 — Dual-write

1. Write v1 and v2 from the same canonical in-memory object.
2. Write both representations in one local transaction where the store permits; otherwise use an outbox with a reconciliation cursor.
3. Store the canonical content hash so equivalence is testable independently of field ordering.
4. Compare v1 and v2 reads asynchronously and classify mismatch as serialization, defaulting, ordering, precision, identity, or semantic divergence.
5. Do not make v2 authoritative until the mismatch rate is zero for critical fields and within the approved tolerance for non-critical projections.

### Phase 3 — Backfill

1. Backfill immutable historical records in source sequence order.
2. Use bounded batches with tenant and residency scope.
3. Throttle by Policy Interpreter latency, audit commit latency, replication lag, and action-reconciliation backlog.
4. Make each batch idempotent by source event sequence and content hash.
5. Record a `StateMigrationBatchCompleted` event for each batch.
6. Re-run replay comparisons at every watermark.

### Phase 4 — Read cutover

1. Enable v2 reads for a canary tenant while retaining v1 fallback.
2. Compare decisions, fact states, policy/state epochs, ownership, RPO calculations, idempotency results, and trace hashes.
3. If any critical mismatch occurs, revert reads to v1 without stopping writes and preserve evidence.
4. Expand by tenant cohorts only after the observation window passes.

### Phase 5 — Write cutover

1. Advance the tenant migration epoch in the control plane.
2. Make v2 the authoritative write representation for the cohort.
3. Continue v1 compatibility writes only while rollback remains open.
4. Verify action command identity and idempotency state against the v2 representation.
5. Verify all ownership and replication registers are updated atomically with the new version.

### Phase 6 — Contract

1. Confirm every reader is v2-capable.
2. Confirm v1 write count is zero for the retention and rollback window.
3. Retain v1 data when required for legal hold, replay, or rollback.
4. Remove v1 writes first, then remove v1 reads, then remove old indexes or columns.
5. Never delete old data before the restore, replay, and legal-retention windows expire.
6. Emit a signed `StateMigrationContracted` event with final watermark, schema version, and approvers.

## 4. Decision-safety invariants

During migration, the following invariants must hold:

1. The same logical fact has the same tri-state and assertion status in both versions.
2. The same request has the same idempotency result and action command identity.
3. The same owner region and ownership epoch are enforced.
4. The same RPO headroom and admission outcome are produced.
5. The same policy, state, model, and evidence references are bound.
6. The same event sequence and content hash are reconstructable.
7. No migration path can bypass durable compact trace requirements.
8. No tenant can read or write another tenant’s migration state.

## 5. Zero-downtime patterns by change type

| Change | Pattern | Notes |
|---|---|---|
| Add optional field | Expand, dual-read, backfill selectively | Safest change |
| Rename field | Add new field, dual-write, backfill, cut over reads, contract old | Never rename in place |
| Split one field into many | Derive new fields from canonical object, dual-write, compare | Preserve original until replay window ends |
| Merge many fields into one | Write canonical field plus old projections | Validate precision and null semantics |
| Change enum meaning | New enum/version; map old values explicitly | Do not reuse an old enum value |
| Change identity key | Create new identity relation; reconcile before authority | Critical; action and replay risk |
| Change ordering | Add sequence or revision; replay and compare | Required for event and replication state |
| Change precision | Store lossless canonical value; expose rounded projection | Financial amounts require explicit scale |
| Change partition key | Dual-publish to new partition; verify tenant locality | Requires routing and residency tests |
| Change storage engine | CDC/outbox or journal replay; shadow reads | Treat as a projection rebuild |
| Remove field | Stop writes, observe zero reads, contract after retention | Never remove first |

## 6. Online migration controls

The migration controller should expose:

```text
POST   /v1/tenants/{tenant_id}/state-migrations
GET    /v1/tenants/{tenant_id}/state-migrations/{migration_id}
POST   /v1/tenants/{tenant_id}/state-migrations/{migration_id}/pause
POST   /v1/tenants/{tenant_id}/state-migrations/{migration_id}/resume
POST   /v1/tenants/{tenant_id}/state-migrations/{migration_id}/rollback
POST   /v1/tenants/{tenant_id}/state-migrations/{migration_id}/verify
```

Each operation requires an idempotency key, tenant context, operator identity, approval reference, migration version, and expected ownership epoch.

The migration state machine is:

```text
planned → expanded → dual_write → backfilling → read_canary
→ read_cohort → write_canary → write_cohort → contract_ready → contracted
```

Any critical mismatch moves the cohort to `paused` or `rollback_required`; it does not silently continue.

## 7. Failure and rollback behavior

### Dual-write mismatch

Pause the affected cohort, keep the old representation authoritative, capture the mismatched record and content hashes, and classify the cause. Do not repair by mutating history; fix the canonicalization or migration code and replay the affected source events.

### Backfill lag

Throttle or pause backfill when RPO headroom, Policy Interpreter p99, audit append latency, or action reconciliation age breaches its budget. Backfill must never compete with the hot path for unbounded resources.

### Regional failure during migration

Use the tenant ownership and fencing protocol. The destination replays the last verified migration watermark, rejects stale-epoch writes, and resumes only after the migration manifest and schema version are verified.

### Rollback

Rollback is a new versioned state transition. Stop new writes to the new representation, reconcile dual-written records, fence the current owner if authority changes, restore old-reader authority, and preserve all migration events. Do not roll back by deleting v2 data.

## 8. Observability and acceptance metrics

| Metric | Pilot target |
|---|---:|
| Critical dual-write mismatches | 0 |
| Critical replay divergence | 0 |
| Idempotency mismatch | 0 |
| Ownership/epoch mismatch | 0 |
| Tenant isolation findings | 0 |
| Backfill loss | 0 records |
| Unsupported schema reads | 0 |
| v1 writes after write cutover | 0 during observation |
| p99 Policy Interpreter regression | ≤10% versus baseline |
| p99 admission regression | ≤10% versus baseline |
| RPO admission false allows | 0 |
| Migration rollback success | 100% in rehearsal |

## 9. Migration test matrix

The automated test suite must cover normal rolling deploy, process restart, partial dual-write failure, database failover, replication lag, stale ownership epoch, duplicate request, action timeout, audit outage, KMS denial, out-of-order events, corrupted record, schema downgrade attempt, tenant boundary violation, selective restore, replay, and rollback.

The migration is production-ready only when the same test matrix passes for every affected state family and every supported schema version pair.

## 10. RoR analysis

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Expand–contract controller | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Canonical content hashing | 5 | 5 | 5 | Medium / 4 | Low / 5 | **4.90** | Now |
| Tenant-scoped migration state machine | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Replay/differential verification | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Automated schema compatibility matrix | 4 | 5 | 5 | Medium / 4 | Medium / 4 | **4.50** | Now |
| Online storage-engine replacement | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | After pilot |
| Global multi-writer mutable state | 2 | 2 | 2 | Very high / 2 | High / 2 | **2.20** | Defer |

## 11. Final rule

The Policy Interpreter should never know which database technology stores its state. It should know the **semantic version, provenance, revision, ownership epoch, policy/state epoch, and content hash** of the state it evaluates. This keeps the theory stable while allowing the storage implementation to evolve without changing decision meaning.

## 12. References

[1]: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final "NIST SP 800-34 Rev. 1, Contingency Planning Guide"

[2]: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html "AWS, Disaster recovery options in the cloud"
