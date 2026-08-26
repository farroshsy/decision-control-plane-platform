# Decision Control Plane Enterprise Operational Runbook

## 1. Purpose and operating principles

This runbook governs the safe operation of tenant-scoped active-active Decision Control Plane deployments. It covers tenant migration between regions or isolation tiers, cryptographic key rotation, network-partition failover, recovery, and recurring disaster-recovery drills.

The operating principles are:

1. **No implicit authority:** a reachable region is not automatically authorized to write decisions or actions.
2. **No silent allow:** missing state, evidence, audit, or action acknowledgement follows explicit policy.
3. **No mutable history:** corrections and reassessments append events; they do not rewrite issued decisions.
4. **No unscoped recovery:** restore and replay are always tenant-, residency-, and purpose-scoped.
5. **No untested assumptions:** failover, failback, key rotation, and tenant movement require evidence from drills.
6. **No cross-tenant shortcuts:** support, operations, backup, and replay tools use the same authorization boundaries as production.

## 2. Roles and authority

| Role | Authority |
|---|---|
| Incident commander | Coordinates incident, approves emergency operating mode, owns timeline |
| Tenant owner | Approves tenant migration, residency, workload, and business impact decisions |
| Compliance owner | Approves degraded screening behavior, policy activation, and reassessment scope |
| Security owner | Approves key rotation, break-glass access, isolation response, and evidence handling |
| Platform/SRE lead | Executes routing, fencing, replication, restore, and capacity actions |
| Data owner/privacy lead | Approves classification, retention, transfer, and disclosure behavior |
| Action-rail owner | Reconciles downstream command and acknowledgement state |
| Auditor/observer | Records evidence, challenges controls, and verifies post-event completeness |

No one person should both approve and silently execute a high-impact migration, key-destruction, or emergency cross-tenant access operation. Use dual control for destructive or irreversible actions.

## 3. Required preconditions

Before any production operation, confirm:

- current tenant ownership epoch and home region;
- approved residency and replication boundary;
- active signed policy and screening-state manifest;
- region readiness for tenant purpose and classification;
- event-log and evidence watermarks;
- key inventory, key versions, and rotation status;
- action-rail health and reconciliation backlog;
- tenant queue depth and reserved capacity;
- rollback target and maximum rollback time;
- open incidents, legal holds, and reporting deadlines;
- approved change ticket and named incident commander.

## 4. Runbook A — Tenant migration

### 4.1 Use cases

Use this procedure to move a tenant between regions, from shared to dedicated data plane, from logical to stronger isolation tier, or from one platform deployment to another.

### 4.2 Prepare

1. Create a signed `tenant-migration-manifest` containing source region, destination region, tenant, legal entity, residency zone, classification, data classes, source and destination versions, migration window, rollback target, and approvers.
2. Inventory all tenant data: event partitions, evidence objects, databases, graph edges, caches, vector indexes, policy bundles, model references, cases, reporting obligations, action outbox, backups, and legal holds.
3. Freeze non-essential policy, schema, model, and connector changes for the migration window.
4. Validate destination capacity, runtime images, policy artifacts, keys, network policy, service identity, and residency controls.
5. Create a migration checkpoint event with current event sequence, evidence watermark, state-manifest ID, policy version, and action-reconciliation watermark.
6. Notify tenant and operational stakeholders of the planned mode and rollback window.

### 4.3 Copy and verify

1. Replicate immutable events in order and verify tenant, ownership, sequence, schema, and payload hashes.
2. Replicate or restore evidence objects within the approved residency boundary.
3. Rebuild entity, relationship, graph, feature, search, and vector projections from authoritative events or verified snapshots.
4. Restore policy bundles and state manifests; verify signatures and compatibility.
5. Re-encrypt or rewrap data under destination-approved keys if the isolation tier changes.
6. Run count, checksum, watermark, and sample-replay comparisons.
7. Run cross-tenant negative tests against the destination repositories, event consumers, graph, caches, object store, and replay service.

### 4.4 Shadow and cut over

1. Start destination in shadow mode.
2. Replay a representative decision corpus and compare dispositions, fired rules, unknowns, trace hashes, action mappings, and tenant scope.
3. Confirm no decision difference is unexplained or critical.
4. Fence source write authority by advancing the ownership epoch through the quorum or lease authority.
5. Confirm source rejects new writes under the stale epoch.
6. Route new requests to destination.
7. Monitor latency, replication, audit, action acknowledgement, and error rates for the observation window.
8. Keep source data read-only until rollback expiry and reconciliation completion.

### 4.5 Rollback

Rollback only through a new ownership-epoch transition. Never simply point DNS back to the source. First fence destination, reconcile actions and events, verify the source watermark, advance ownership, and route traffic back. Preserve the failed migration evidence.

### 4.6 Tenant migration exit criteria

| Check | Pass requirement |
|---|---|
| Event completeness | 100% of source events present or explicitly accounted for |
| Hash verification | 100% of sampled and boundary event chains verify |
| Replay | ≥99.99% exact reproduction of pinned decisions |
| Tenant isolation | Zero cross-tenant read/write findings |
| Action state | No unresolved duplicate or unowned action command |
| Residency | 100% of transferred data within approved boundary |
| Latency | Destination meets tenant-specific p99/p99.9 target |
| Rollback | Tested and executable within agreed window |

## 5. Runbook B — Key rotation

### 5.1 Scope

Rotate tenant key-encryption keys, data-encryption keys, service certificates, signing keys, and policy/model artifact verification keys according to risk and policy. Key rotation is not complete until old-key access is revoked or explicitly retained under legal hold and all dependent services have been verified.

### 5.2 Prepare

1. Identify key type, tenant scope, residency, dependent stores, consumers, backups, and retention obligations.
2. Confirm the new key is created in the correct KMS/HSM boundary and has a distinct version ID.
3. Confirm service identities are authorized to use the new key but not broad key-enumeration permissions.
4. Test decrypt/encrypt, event verification, evidence read/write, backup restore, replay, and export redaction in a non-production or isolated tenant.
5. Announce the rotation window and define rollback. Do not destroy the old key before the retention and restore window expires.

### 5.3 Execute

1. Enable dual-read/new-write mode if the storage system supports it.
2. Update the tenant key manifest through an approved, signed control-plane change.
3. Reload key metadata in adapters, Policy Interpreter, Decision Kernel, journal, evidence store, graph, cache, replay, and action services.
4. Rewrap or re-encrypt data in bounded batches, preserving content hashes and object IDs.
5. Verify reads under the new key and compare hashes.
6. Rotate service certificates and signing keys with overlapping validity to avoid a partial outage.
7. Monitor decrypt failures, authorization denials, backlog, latency, and tenant-specific error rates.
8. After the verification window, revoke old-key usage except for approved restore/legal-hold paths.

### 5.4 Key-rotation exit criteria

- 100% of new writes use the new key version.
- 100% of sampled historical reads and replay tests succeed.
- No unauthorized principal can use the new key.
- No old-key access occurs outside an approved migration/restore path.
- Backups and selective tenant restore have been tested.
- Key manifest, approvals, access logs, and evidence hashes are archived.

## 6. Runbook C — Network-partition failover

### 6.1 Trigger conditions

Initiate this runbook when inter-region replication lag exceeds the tenant RPO, ownership authority is unavailable, a region cannot meet readiness checks, or the incident commander declares a regional impairment. Do not fail over based on one network probe.

### 6.2 Immediate response

1. Declare incident severity and assign incident commander.
2. Confirm whether the problem is regional service failure, inter-region partition, identity/KMS failure, action-rail failure, or observability failure.
3. Stop high-risk changes and policy activations.
4. Measure replication lag, event watermark, action backlog, key health, state-manifest freshness, and tenant impact.
5. If source ownership is uncertain, stop writes rather than allowing both regions to proceed.
6. Apply policy-defined degraded mode: allow only when required controls remain available; otherwise hold, reject, or route to review.

### 6.3 Fencing and takeover

1. Use quorum or external lease authority to fence the old owner.
2. Advance the tenant ownership epoch.
3. Verify the old region rejects stale-epoch writes.
4. Confirm destination has the last acceptable state manifest, policy bundle, evidence scope, key access, and audit path.
5. Route traffic to the destination using tenant-aware routing.
6. Defer retries that cannot be reconciled against the old owner's idempotency state.
7. Reconcile all in-flight action commands before issuing new compensating or release actions.
8. Record `RegionFailoverDeclared`, `OwnershipEpochAdvanced`, and degraded-mode events.

### 6.4 Recovery after link heals

1. Keep destination as the sole writer until both journals converge.
2. Replicate destination events back to source in order.
3. Replay missing events and rebuild projections.
4. Compare event counts, hashes, decision traces, action state, cases, reports, and outcomes.
5. Search for any duplicate action IDs or split-brain aggregate writes.
6. Reopen material decisions affected by stale or missing evidence.
7. Conduct post-incident review before restoring active-active service.

### 6.5 Simulation reference result

The deterministic reference simulation used a 100 tx/s workload over 60 seconds with a partition from 20–40 seconds, fencing at 25 seconds, takeover at 27 seconds, route switch at 28 seconds, and controlled failback at 50 seconds. It produced:

| Metric | Result |
|---|---:|
| Offered decisions | 6,001 |
| Accepted decisions | 4,700 |
| Fenced/rejected writes | 1,300 |
| Holds caused by RPO/degraded mode | 399 |
| Duplicate retries deferred | 1 |
| Duplicate actions | 0 |
| Split-brain accepts | 0 |
| Events replayed after healing | 1,700 |
| Max replication lag | 4.99 seconds |
| Max RPO gap | 500 events |
| Takeover interval | 7 seconds |
| Recovery result | Pass |

This is a deterministic planning simulation, not a production-capacity claim. Its important conclusion is architectural: fencing, ownership epochs, explicit hold behavior, retry deferral, and action idempotency prevent unsafe duplication during partition.

## 7. Runbook D — Disaster-recovery drill

### 7.1 Monthly technical drill

1. Select a non-production tenant or an approved production canary.
2. Announce the exercise and record the baseline.
3. Inject one fault: region loss, replication partition, audit outage, KMS outage, stale manifest, action-rail timeout, or noisy-neighbor load.
4. Observe detection, alerting, ownership, degraded behavior, routing, queue growth, and action reconciliation.
5. Exercise recovery and replay.
6. Verify tenant isolation and audit completeness.
7. Capture timestamps, logs, traces, event IDs, watermarks, operator actions, and deviations.

### 7.2 Quarterly regional recovery drill

Perform a full traffic evacuation, tenant ownership failover, selective restore, projection rebuild, key access validation, replay comparison, case/report recovery, and controlled failback. Include compliance, security, privacy, action-rail, and audit observers.

### 7.3 Semiannual split-brain game day

Simulate simultaneous reachability with a broken quorum or delayed lease. Verify that only one owner epoch can issue decision/action writes, stale regions are fenced, duplicate actions remain zero, and all blocked work is reconciled.

### 7.4 Drill success criteria

- detection time within incident target;
- takeover within tenant RTO;
- no stale-region writes after fencing;
- no duplicate actions;
- no silent allows while required controls are unavailable;
- RPO within tenant target or explicit, approved degraded mode;
- ≥99.99% replay equivalence for sampled decisions;
- 100% action and audit reconciliation;
- zero cross-tenant access findings;
- runbook executable by an operator who did not author it.

## 8. Observability dashboard

The primary dashboard should be tenant- and region-scoped and include:

| Dashboard group | Metrics |
|---|---|
| Ownership | Current owner region, epoch, lease age, rejected stale writes |
| Replication | Event watermark, lag seconds, gap count, replay backlog |
| Decisions | Throughput, p50/p95/p99/p99.9, disposition distribution, degraded decisions |
| Audit | Append latency, spool age, hash verification, missing trace count |
| Actions | Requested, acknowledged, outcome unknown, duplicate suppression, reconciliation age |
| State | Manifest version skew, policy/list/model epochs, cache freshness |
| Security | Denials, cross-tenant probes, break-glass access, key usage anomalies |
| Recovery | RTO, RPO, restore duration, replay divergence, failed drill assertions |

## 9. Incident evidence package

Every operation produces an evidence package containing incident/change ID, tenant and residency scope, approvals, owner epochs, routing changes, policy/state versions, key versions, event watermarks, action IDs, degraded modes, operator commands, alerts, logs, replay comparisons, and closure approval. The package is itself tenant-scoped and retained under the governing policy.

## 10. RoR for operational readiness

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Tenant migration rehearsal | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Key rotation automation | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Partition/fencing drill | 5 | 5 | 5 | Very high / 2 | Medium / 4 | **4.25** | Now |
| Selective restore and replay | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Full active-active global write model | 3 | 3 | 2 | Very high / 2 | High / 2 | **2.75** | Do not adopt without new evidence |
| Automated drill orchestration | 4 | 4 | 5 | High / 3 | High / 3 | **4.10** | After manual runbook passes |

## 11. References

[1]: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final "NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems"

[2]: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html "AWS, Disaster recovery options in the cloud"
