# Decision Control Plane — First Pilot Customer Production Deployment

## 1. Deployment decision

The MVP evidence supports a **controlled production pilot**, not a general enterprise rollout. The appropriate deployment is one bounded financial-crime transaction slice, one tenant or legal entity, one region as the initial writer, and one shadow or canary action boundary.

The reference evidence is strong enough to begin the pilot because the Policy Interpreter tests, RPO/fencing tests, continuous partition harness, and compliance/XAI generator all pass. It is not sufficient to claim production capacity or regulatory effectiveness without customer-specific telemetry, policy mapping, data-quality tests, and operational approval.

## 2. MVP evidence review

| Evidence | Observed result | Interpretation | Production implication |
|---|---:|---|---|
| Policy Interpreter unit tests | 6/6 pass | Tri-state logic, precedence, inactive policy rejection, and replay hashing behave deterministically | Freeze the policy IR and require conformance fixtures |
| RPO/fencing unit tests | 8/8 pass | Ownership, stale epoch, RPO breach, trace durability, idempotency, and takeover paths behave as designed | Place the gate immediately before decision issuance and side effects |
| Continuous partition harness | 8/8 scenarios pass | Zero split-brain accepts and zero duplicate actions across rate and timing cases | Begin production pilot only with fencing and idempotent action rail enabled |
| Compliance/XAI generator | Pass, zero findings | Reference package is complete and explainable | Require a customer-specific evidence package for every material decision |
| Asynchronous Byzantine harness | 6/6 scenarios pass | Corrupt, delayed, duplicated, dropped, reordered, and stale replication messages are rejected or reconciled | Treat as protocol evidence; validate with infrastructure-specific chaos tests |
| Stress model | Audit commit is first baseline bottleneck | Reference audit path saturates before Policy Interpreter under the model | Load-test the customer's journal/audit store before increasing traffic |

## 3. Pilot boundaries

### In scope

The pilot should cover one transaction rail, one jurisdictional or legal-entity boundary, one bounded policy bundle, one action class, one evidence retention class, and one operational team. The Decision Control Plane first runs in shadow mode, then co-executes, then owns a small canary percentage only after all gates pass.

### Out of scope

The first pilot should not migrate every transaction rail, every jurisdiction, every policy family, every downstream case system, or every regional writer. It should not replace the incumbent globally, change customer-facing policy without approval, or introduce autonomous policy generation.

## 4. Required customer inputs

| Input | Owner | Acceptance requirement |
|---|---|---|
| Transaction schema and sample stream | Payments/platform | Schema versioned and representative of peak and edge cases |
| Current decision outputs | Compliance/operations | Decision, action, policy version, timestamp, and outcome available |
| Historical decision corpus | Compliance/data owner | Legal basis and retention approved; replay sampling plan signed |
| Policy and watchlist versions | Compliance/model risk | Version IDs and effective dates captured |
| Action contracts | Action-rail owner | Idempotency key, command status, acknowledgement, and reconciliation API available |
| Tenant/residency classification | Security/privacy | Approved region, data classes, retention, and transfer boundary |
| SLOs and RPO/RTO | Business/platform | Signed p99, p99.9, RPO, RTO, and degraded-mode policy |
| Incident contacts | Operations/security/compliance | 24×7 escalation list tested |

## 5. Production architecture

Deploy the following components in the customer's approved landing zone:

1. **Ingress/Domain Adapter:** validates transport, tenant context, schema, source timestamp, and idempotency key.
2. **Evidence and state layer:** stores verified evidence references and a versioned state manifest.
3. **Policy Interpreter:** evaluates compiled Policy IR using only pinned policy, evidence, state, and model versions.
4. **RPO Admission and Fencing Gate:** checks ownership region, ownership epoch, lease validity, state/policy epochs, trace durability, deadline, and RPO budget.
5. **Decision Kernel:** issues the canonical decision and immutable events.
6. **Action Rail:** submits idempotent commands and records acknowledgements/outcomes.
7. **Audit and replay layer:** appends event-chain records and supports tenant-scoped deterministic replay.
8. **Compliance/XAI service:** generates a decision explanation and evidence package.
9. **Operations plane:** provides metrics, alerts, runbooks, drill controls, and break-glass workflow.

## 6. Exact deployment sequence

### Phase 0 — Approve the pilot

1. Name the executive sponsor, tenant owner, compliance owner, security owner, platform lead, action-rail owner, and incident commander.
2. Sign the pilot charter defining transaction rail, tenant, jurisdiction, policies, actions, RPO/RTO, retention, and success gates.
3. Freeze the pilot scope. Any change requires a new signed change record.
4. Create the decision register with every known dependency, owner, and rollback path.

### Phase 1 — Establish the landing zone

1. Create separate production accounts/projects/subscriptions for control-plane services, data, observability, and security administration according to customer policy.
2. Create the tenant namespace and enforce tenant context in every request, event, object-store key, database partition, cache key, metric label, and replay job.
3. Create service identities with least privilege for adapter ingress, policy evaluation, event append, action submission, evidence read, XAI generation, and operations.
4. Create KMS/HSM keys for tenant data, event journal, evidence, backups, policy signatures, and service certificates.
5. Create network policies allowing only documented service-to-service paths.
6. Enable audit logging for identity, KMS, data access, policy activation, ownership changes, fencing, action submission, and break-glass use.
7. Confirm the region and storage classes satisfy approved residency requirements.

### Phase 2 — Register contracts and versions

1. Register the canonical decision/event JSON Schema bundle.
2. Register the versioned Domain Adapter gRPC/Protobuf contract.
3. Register the tenant manifest with residency, classification, retention, allowed regions, owner region, owner epoch, and RPO/RTO.
4. Register the policy bundle, model references, watchlist snapshot IDs, and state-manifest IDs.
5. Sign and publish the initial policy and state artifacts.
6. Enable compatibility checks: schema version, policy effective dates, state epoch, model version, and adapter capability.

### Phase 3 — Connect the adapter in read-only mode

1. Configure mTLS or the customer's approved service-to-service authentication.
2. Validate required headers: request ID, tenant ID, idempotency key, schema version, source timestamp, deadline, and trace context.
3. Send representative transactions through the adapter with action execution disabled.
4. Verify canonicalization, entity/party roles, amounts, currencies, timestamps, origin/destination, relationship references, evidence references, and source provenance.
5. Reject or quarantine malformed, cross-tenant, unversioned, or late requests.
6. Measure ingress latency, validation failures, payload size, queue depth, and idempotency-key reuse.

### Phase 4 — Capture incumbent behavior

1. Capture the incumbent decision, action, policy version, evidence references, and outcome for every transaction in the pilot slice.
2. Store the incumbent record as an immutable comparison event, not as a mutable field on the new decision.
3. Build the replay corpus with normal, high-risk, unknown, conflicted, late, duplicate, boundary, and manually overridden cases.
4. Confirm that sensitive fields are redacted or tokenized for engineering environments.
5. Generate the baseline TCO and analyst-reconstruction measurements.

### Phase 5 — Run Policy Interpreter in shadow mode

1. Pin a policy, state, model, watchlist, and data-quality manifest for each evaluation.
2. Evaluate the transaction without issuing a downstream action.
3. Emit the canonical decision, fired rules, unknowns, conflicts, evidence references, trace hash, and incumbent comparison.
4. Classify every difference as mapping, data freshness, policy version, model output, precedence, threshold, bug, or legitimate policy divergence.
5. Require compliance and model-risk sign-off for all material unexplained differences.
6. Run deterministic replay twice; traces and decision hashes must match.

### Phase 6 — Validate resilience and security

1. Run the RPO admission unit suite and record evidence.
2. Run the continuous partition harness and verify zero split-brain accepts and zero duplicate actions.
3. Run infrastructure-specific chaos tests: delayed replication, dropped messages, duplicated messages, reordered messages, corrupted payloads, stale epochs, KMS denial, audit outage, action timeout, and observability loss.
4. Run tenant-isolation negative tests across ingress, policy facts, graph/state, event journal, object store, cache, replay, XAI, metrics, and support tooling.
5. Run selective restore and replay from backup.
6. Generate the compliance/XAI report for the pilot corpus.

### Phase 7 — Enable action-rail dry run

1. Submit action commands to a non-executing or customer-approved test endpoint.
2. Verify action idempotency keys, command status, acknowledgement, timeout, retry, compensation, and reconciliation behavior.
3. Inject duplicate retries and confirm one logical action is recorded.
4. Inject action-rail unavailability and verify the policy-defined outcome: hold, retry, or reject.
5. Obtain action-rail owner approval.

### Phase 8 — Co-execute and reconcile

1. Enable dual-run for a small percentage while the incumbent remains authoritative.
2. Compare decisions, action intent, action outcome, latency, errors, evidence, and audit completeness.
3. Reconcile every divergence before increasing traffic.
4. Keep a live rollback switch that changes ownership only through the ownership/fencing protocol.
5. Do not use DNS or a simple feature flag as the only rollback mechanism.

### Phase 9 — Canary cutover

1. Select a stable, bounded cohort.
2. Advance the tenant ownership epoch through the fencing authority.
3. Confirm incumbent rejects stale-epoch writes.
4. Enable the Decision Control Plane as authoritative for the cohort.
5. Monitor p50/p95/p99/p99.9 latency, RPO lag, audit commit age, action acknowledgement, duplicate suppression, replay divergence, tenant denials, and degraded decisions.
6. Hold traffic at the canary level for the agreed observation window.
7. Expand only after the exit gates pass.

### Phase 10 — Pilot closeout

1. Produce the customer compliance/XAI report and evidence index.
2. Produce the incumbent-versus-DCP cost and outcome comparison.
3. Produce the DR drill and failover evidence package.
4. Record unresolved gaps and their owners.
5. Decide: expand, narrow, or stop.

## 7. Hard production gates

| Gate | Required result |
|---|---|
| Correctness | No unexplained critical decision divergence in the approved replay corpus |
| Determinism | ≥99.99% exact replay equivalence for pinned cases; all exceptions classified |
| Fencing | Zero stale-epoch writes accepted in partition drills |
| Actions | Zero duplicate side effects; all retries reconcile to one logical command |
| RPO | Allow-like actions held/rejected when the tenant RPO budget is exceeded |
| Audit | 100% of material decisions have a durable compact trace and event-chain reference |
| Isolation | Zero cross-tenant read/write findings |
| Security | No unauthorized key, policy, evidence, or break-glass access |
| Resilience | Takeover, replay, restore, and failback meet signed RTO/RPO targets |
| Operations | A non-authoring operator can execute the runbook successfully |
| Economics | Pilot telemetry updates the TCO model and produces a credible expansion decision |

## 8. Rollback procedure

Rollback is a controlled ownership transition:

1. Declare rollback and freeze policy/model/config changes.
2. Stop new DCP writes for the affected cohort through the admission gate.
3. Reconcile action commands and outcomes.
4. Verify the DCP event watermark and incumbent comparison watermark.
5. Fence the DCP owner epoch.
6. Advance the incumbent or alternate owner epoch through the same authority.
7. Route new requests to the alternate owner.
8. Preserve all DCP events and evidence for post-incident replay.
9. Classify any divergence and reopen material decisions if required.
10. Do not destroy keys, snapshots, or logs until the rollback and legal-retention windows expire.

## 9. Day-2 operating cadence

| Frequency | Activity |
|---|---|
| Per release | Schema compatibility, policy static analysis, replay, adapter conformance, tenant negative tests |
| Daily | Review latency tails, RPO lag, audit backlog, action unknowns, failed authorizations, and policy drift |
| Weekly | Reconcile sampled decisions, refresh evidence-quality metrics, and review support access |
| Monthly | Run partition, traffic evacuation, action-rail failure, key-readiness, and selective-restore drills |
| Quarterly | Run regional rebuild, split-brain game day, TCO refresh, and stakeholder approval review |

## 10. Pilot go/no-go recommendation

**Go** if the customer supplies a bounded transaction slice, complete action idempotency, approved residency and key controls, historical replay data, named operational owners, and a reversible canary boundary.

**Do not go** if the customer cannot make one system authoritative at a time, cannot provide action acknowledgement, cannot pin policy/state versions, cannot isolate tenant data, or requires an immediate global replacement of the incumbent.

## 11. References

[1]: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final "NIST SP 800-34 Rev. 1, Contingency Planning Guide"

[2]: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html "AWS, Disaster recovery options in the cloud"
