# Decision Control Plane: Enterprise Migration and Zero-Trust Security Strategy

## Executive recommendation

Migrate legacy monolithic decision engines using an **incremental strangler strategy**. Do not replace the incumbent in one release. Introduce a compatibility facade, capture the incumbent's inputs and outputs, run the new Decision Control Plane in shadow mode, compare decisions, then move one policy slice at a time behind an explicit cutover gate.

The target is not “microservices for its own sake.” The target is a **replayable decision control plane** in which the old engine can remain the temporary system of execution while the new architecture becomes the system of evidence, policy trace, replay, and eventually disposition.

The security architecture follows zero-trust principles: no implicit trust based on network location, asset ownership, or prior authentication; every request is authenticated and authorized for the specific resource, tenant, purpose, and action. NIST describes zero trust as a shift from static network perimeters toward users, assets, and resources, with authentication and authorization treated as discrete functions before access [1].

## 1. Legacy starting point

Assume the incumbent is a monolithic engine with some combination of:

- embedded rules and thresholds;
- direct database reads;
- hidden joins across customer, transaction, and watchlist tables;
- in-process state and caches;
- synchronous calls to external providers;
- mutable status fields rather than immutable decisions;
- limited or non-replayable audit logs;
- one deployment unit for ingestion, scoring, policy, workflow, and action;
- tenant separation enforced primarily by application convention;
- releases that change data interpretation and decision behavior together.

The migration must first make the incumbent observable. Treat it as a black-box system whose behavior is measured before it is decomposed.

## 2. Target deployment topology

```text
                         +----------------------------------+
                         | Enterprise Identity Provider     |
                         | workload identity • users • MFA  |
                         +----------------+-----------------+
                                          |
                    +---------------------v---------------------+
                    | Zero-Trust Access Broker / PDP             |
                    | tenant • purpose • role • device • time   |
                    +---------------------+---------------------+
                                          |
              +---------------------------v----------------------------+
              | Decision Control Plane API / Policy Enforcement Points  |
              +---------------------------+----------------------------+
                                          |
        +-------------------+-------------+--------------+-------------------+
        |                   |                            |                   |
+-------v-------+   +-------v--------+           +-------v--------+   +-------v-------+
| AML Adapter   |   | Policy Runtime |           | Decision Kernel|   | Action PEP     |
| tenant scoped |   | tenant scoped  |           | episode scoped |   | rail scoped    |
+-------+-------+   +-------+--------+           +-------+--------+   +-------+-------+
        |                   |                            |                   |
        +-------------------+-------------+--------------+-------------------+
                                          |
                    +---------------------v---------------------+
                    | Tenant-Isolated Data and Evidence Plane    |
                    | RLS • field encryption • event partitions  |
                    | graph • snapshots • audit • replay         |
                    +---------------------+---------------------+
                                          |
                    +---------------------v---------------------+
                    | Legacy Engine Compatibility Facade         |
                    | shadow • compare • dual-write • cutover    |
                    +---------------------+---------------------+
                                          |
                              +-----------v-----------+
                              | Legacy monolith       |
                              | temporary execution   |
                              +-----------------------+
```

The policy decision point (PDP) evaluates whether a principal may access a tenant-scoped resource. Policy enforcement points (PEPs) exist at the API gateway, service-to-service boundary, repository, event consumer, object store, cache, graph query, replay service, and action executor. A network firewall is useful but is not the tenant boundary.

Cloud.gov's documented customer-separation design is a useful defense-in-depth reference: unprivileged containers, kernel-level isolation, and explicit network policies are used to prevent workloads from accessing or interfering with other tenants, while application authentication, authorization, and secrets remain customer responsibilities [2]. The Decision Control Plane should apply the same principle more deeply: compute isolation helps, but every data and action path must independently enforce tenant scope.

## 3. Migration strategy

### Stage 0 — Inventory and behavioral baseline

Create a decision inventory for the incumbent. For each decision type, record inputs, outputs, data dependencies, rules, thresholds, action side effects, latency, failure behavior, tenant scope, and known audit gaps. Build a black-box capture harness that records sanitized input/output pairs and the incumbent's observable side effects.

**Exit gate:** at least 95% of production decision volume is assigned to a named decision type and has a captured input/output contract; all side effects that can move money, release transactions, block customers, or create reports are enumerated.

### Stage 1 — Introduce the compatibility facade

Place a facade in front of the monolith. The facade authenticates the caller, derives tenant and purpose from trusted identity context, assigns correlation and idempotency IDs, captures the original request, and forwards the request unchanged to the incumbent.

The facade must not yet change the decision. It creates the first canonical `TransactionProposed` event and records the incumbent response as an observed outcome.

**Exit gate:** no measurable increase in decision error rate; 100% of requests carry tenant, purpose, correlation, and idempotency context; a replay corpus exists.

### Stage 2 — Build the canonical evidence and decision record

Implement the Decision Control Plane event envelope, evidence snapshot, decision object, policy/version references, and immutable audit path. Continue to use the incumbent for execution. The new system becomes the authoritative record of what was received, what the incumbent returned, and which evidence was available.

**Exit gate:** 99.99% of sampled incumbent decisions can be reconstructed from the captured request, pinned state, observed response, and audit record.

### Stage 3 — Shadow the new Domain Adapter and Policy Interpreter

The facade sends the same canonicalized input to the new AML Domain Adapter and Policy Interpreter without allowing the new result to affect production action. Compare the incumbent and new outputs using a typed difference taxonomy:

| Difference | Meaning | Required treatment |
|---|---|---|
| Equivalent disposition | Same operational result, different explanation | Accept after trace review |
| Explained policy difference | New policy intentionally differs | Require policy owner approval |
| Evidence difference | New adapter sees more/less/staler evidence | Fix state or document scope |
| Semantic difference | Entity, relationship, or role interpreted differently | Block cutover until resolved |
| Safety difference | New engine could allow a blocked/held case | Critical defect; no cutover |
| Unknown-data difference | Different handling of missing evidence | Explicit policy decision required |
| Latency difference | New engine exceeds rail budget | Optimize or defer slice |

**Exit gate:** no unexplained critical safety difference; replay and identity benchmarks pass; p99 and p99.9 are measured under production-like load.

### Stage 4 — Dual-write and reconciliation

Write the new decision episode and incumbent outcome as separate, linked records. Do not overwrite the incumbent status. Reconcile action IDs, disposition, rail acknowledgement, case creation, and reporting obligations.

Use an outbox or durable event spool so a process crash cannot leave a new decision without an audit record or create duplicate actions. Reconciliation must be idempotent and must distinguish action failure from action outcome unknown.

**Exit gate:** 100% of dual-written decisions reconcile within the declared SLA; zero duplicate side effects in retry tests; no acknowledged action lacks a recoverable compact trace.

### Stage 5 — Slice-by-slice cutover

Cut over one bounded policy slice at a time, such as:

1. low-risk allow path with no missing required evidence;
2. candidate-match hold path;
3. unknown-beneficial-owner path;
4. selected jurisdiction/product combination;
5. retrospective re-screen path;
6. action reconciliation and case creation.

Use tenant, product, corridor, or transaction type as the rollout key. Every slice must have a rollback pointer to the incumbent path and a maximum rollback time.

**Exit gate:** the new path meets correctness, latency, resilience, audit, and operational criteria for the slice over an agreed observation window.

### Stage 6 — Retire embedded capabilities

Only after all slices are cut over should embedded rules, mutable status fields, direct external calls, and duplicated audit paths be removed from the monolith. Keep the compatibility facade until historical replay, regulatory retention, and operational rollback obligations are satisfied.

**Exit gate:** the monolith has no remaining authority over the migrated decision slice; the Decision Control Plane is the only action-authoritative path; retirement evidence is approved.

## 4. Migration control plane

Every migration slice should have a versioned manifest:

```yaml
migration_slice_id: aml-cross-border-v1
incumbent_engine: legacy-engine-7.4.2
new_adapter: aml-adapter-1.2.0
new_policy_bundle: aml-policy-42.3
new_interpreter: pi-1.0.0
state_manifest: screening-state-2026-08-24-17
rollout_scope:
  tenant_ids: [tenant-a, tenant-b]
  products: [commercial_payments]
  jurisdictions: [ID, SG]
mode: shadow
rollback_target: incumbent
comparison_rules:
  critical_disposition_mismatch: block
  unexplained_unknown_difference: review
  p99_full_disposition_ms: 100
approvers:
  - role: compliance-owner
  - role: platform-security
  - role: operations-owner
```

The manifest is itself an auditable decision about migration. No cutover should be performed by changing an environment variable or routing rule without a signed manifest, approvals, observability, and rollback plan.

## 5. Threat model

### Assets

| Asset | Security property |
|---|---|
| Transaction payload | Confidentiality, integrity, freshness, correct tenant scope |
| Party and beneficial-owner data | Confidentiality, purpose limitation, integrity |
| Watchlist and policy bundles | Integrity, authenticity, effective-date correctness |
| Evidence artifacts | Confidentiality, retention, provenance, tamper evidence |
| Decision episodes | Integrity, replayability, authorization, non-repudiation |
| Action commands | Authenticity, idempotency, integrity, timely delivery |
| Audit records | Immutability, availability, tenant isolation |
| Model and feature state | Integrity, lineage, tenant-use restrictions |
| Credentials and keys | Confidentiality, non-repudiation, least privilege |
| Migration comparison data | Confidentiality and separation from production action authority |

### Adversaries

| Adversary | Goal | Relevant path |
|---|---|---|
| External attacker | Submit, alter, replay, or observe transactions | API edge, credentials, idempotency |
| Compromised tenant user | Read or influence another tenant's data or policy | UI, APIs, exports, support tools |
| Malicious or compromised service | Lateral movement or data exfiltration | Service-to-service calls, queues, repositories |
| Noisy tenant | Exhaust shared capacity or poison shared caches | Interpreter, audit, graph, replay resources |
| Insider/operator | Abuse privileged access or alter evidence | Break-glass, support, deploy, key access |
| Supply-chain attacker | Insert malicious library, policy, model, or connector | CI/CD, registries, policy compilation |
| Stale or malicious source | Inject wrong list, identity, relationship, or evidence | Connectors, source files, external feeds |
| Replay attacker | Reuse an old valid request or action | Transaction and action APIs |
| Migration failure | Cause divergent decisions or duplicate side effects | Shadow, dual-write, cutover, rollback |
| Inference attacker | Learn sensitive tenant data from outputs | Search, model, metrics, error messages |

### Threat scenarios and controls

| Threat | Preventive controls | Detective controls | Recovery |
|---|---|---|---|
| Cross-tenant read | Signed tenant context, repository scope guard, database RLS, per-tenant indexes/caches | Negative access tests, query audit, anomaly detection | Revoke credential, isolate tenant, investigate exposure |
| Cross-tenant write | Tenant-bound service identity, immutable ownership fields, write authorization | Event lineage and mutation alarms | Quarantine events, replay affected decisions |
| Policy tampering | Signed bundles, approval workflow, immutable registry, compilation sandbox | Hash verification, deployment attestation | Roll back to last valid bundle |
| Watchlist substitution | Authenticated source, checksum, effective manifest, dual activation | Source/version drift alerts | Freeze or hold affected screening slice; re-screen |
| Action replay | Idempotency key, nonce/deadline, action state machine | Duplicate suppression metrics | Reconcile rail state |
| Silent allow on outage | Explicit fail mode, dependency health contract, bounded snapshots | Degraded-mode telemetry and alerts | Reopen material decisions |
| Evidence exfiltration | Field encryption, purpose scopes, redaction, DLP | Access and export logging | Revoke access and rotate keys |
| Compromised interpreter | Minimal runtime permissions, no arbitrary code, sandbox, signed image | Attestation, runtime behavior, egress monitoring | Drain, replace, replay affected decisions |
| Noisy tenant | Per-tenant quotas, queue partitions, admission control | Saturation by tenant and resource | Throttle or isolate tenant |
| Insider misuse | JIT access, dual approval, break-glass expiry, immutable logs | Access review and anomaly detection | Revoke, preserve evidence, notify |
| Migration divergence | Shadow mode, typed comparison, canary cutover, rollback | Difference dashboards and alerting | Route slice back to incumbent |
| Supply-chain compromise | Pinned dependencies, provenance, artifact signing, SBOM | Vulnerability and behavior scans | Quarantine artifact and rotate deployments |

## 6. Zero-trust architecture

### Identity

Every human and workload receives a distinct identity. Use short-lived credentials, mutual TLS or equivalent workload authentication, and device/user authentication before resource access. A service identity must encode the service, tenant scope, environment, and permitted purposes; a generic “internal service” identity is insufficient.

### Policy decision and enforcement

The PDP evaluates subject, device/workload, tenant, resource, action, purpose, data class, relationship, time, and risk context. PEPs enforce the result at every boundary:

- API gateway;
- service RPC;
- database repository;
- event producer and consumer;
- object-storage access;
- graph and vector query;
- cache read/write;
- model/feature request;
- replay job;
- export and support tooling;
- action rail.

### Tenant context propagation

Tenant context is a signed, non-user-editable object:

```json
{
  "tenant_id": "tenant-a",
  "data_controller_id": "bank-a",
  "legal_entity_id": "bank-a-id",
  "residency_zone": "sg",
  "purpose": "pre_execution_screening",
  "classification_max": "restricted_financial_crime",
  "subject_id": "workload:screening-adapter",
  "issued_at": "2026-08-24T00:00:00Z",
  "expires_at": "2026-08-24T00:05:00Z",
  "authorization_id": "authz-123"
}
```

Every downstream service verifies the signature, expiry, audience, allowed purpose, and resource scope. A request body, URL parameter, database row, or event payload cannot override the trusted tenant context.

### Data isolation

Use defense in depth:

1. separate tenant namespaces in object storage;
2. per-tenant database row-level security or equivalent;
3. field-level encryption and tokenization;
4. per-tenant event partitions and consumer authorization;
5. per-tenant cache, vector, and graph namespaces;
6. per-tenant encryption keys or key-encryption keys;
7. per-tenant quotas and queue partitions;
8. tenant-aware logs, traces, metrics, and error redaction;
9. tenant-aware backup and selective restore;
10. dedicated deployment tier for high-assurance tenants.

### Policy and model isolation

A tenant's policy bundle, features, models, prompts, and derived facts must not be visible or trainable across tenants by default. Cross-tenant aggregate learning requires an approved purpose, de-identification or privacy-preserving method, data-use record, and model deployment decision.

### Network and runtime isolation

Use network policies, private service endpoints, egress restrictions, unprivileged workloads, signed images, runtime attestation, and separate failure domains. Container isolation is defense in depth; it does not replace application and data authorization. Cloud.gov's guidance explicitly combines workload isolation with customer responsibilities for authentication, authorization, and secrets management [2].

## 7. Security invariants for the Policy Interpreter

The Policy Interpreter must:

- accept only an authenticated, tenant-bound evaluation context;
- verify policy, state-manifest, and evidence-snapshot signatures or hashes;
- execute only precompiled Policy IR, never arbitrary policy code;
- refuse a fact or model reference from another tenant;
- prevent rule expressions from accessing network, filesystem, environment, or secrets;
- cap evaluation time, fact count, graph depth, and rule dependency depth;
- emit tenant, purpose, policy, state, and model versions in the trace;
- redact sensitive values from trace logs while preserving claim references;
- keep evaluation results immutable after issuance;
- distinguish action request from action acknowledgement;
- support deterministic replay within the authorized snapshot scope;
- fail closed, hold, route, or compensate according to the tenant's active policy rather than a hidden runtime default.

## 8. Security validation gates

| Gate | Required evidence |
|---|---|
| Identity gate | Workload identity, token expiry, audience, and tenant-context tests |
| Data gate | Cross-tenant read/write negative tests across DB, object, graph, vector, cache, and event paths |
| Policy gate | Signed bundle, static analysis, sandbox, approval, rollback, and effective-date tests |
| Runtime gate | No arbitrary code or unauthorized egress; resource caps verified |
| Replay gate | Authorized replay reconstructs decisions without crossing tenant or residency scope |
| Action gate | Idempotency, timeout, duplicate, and ambiguous-outcome tests |
| Migration gate | Shadow divergence, rollback, dual-write reconciliation, and cutover evidence |
| Incident gate | Break-glass, credential revocation, tenant isolation, evidence preservation, and recovery exercise |

No production cutover should proceed while a critical cross-tenant access, policy-integrity, audit-integrity, or action-duplication issue remains open.

## 9. RoR for migration and security workstreams

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Behavioral inventory and capture harness | 5 | 5 | 4 | Medium / 3 | Medium / 4 | **4.40** | Now |
| Canonical facade and tenant context | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Immutable evidence and decision record | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Shadow comparison and replay | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Tenant-scoped storage and PEPs | 5 | 5 | 5 | Very high / 2 | High / 3 | **4.25** | Now |
| Slice-by-slice action cutover | 4 | 5 | 4 | High / 3 | High / 3 | **4.00** | After shadow proof |
| Dedicated deployment tiers | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |
| Full monolith retirement | 3 | 3 | 3 | Very high / 2 | Medium / 4 | **3.00** | Last |

The highest-return work is the combination of **observability, canonicalization, replay, and zero-trust tenant scope**. These assets are reusable across financial crime, procurement, supplier risk, clinical oversight, and future adapters. Full retirement of the monolith has lower research value and should occur only after the new system has demonstrated operational authority.

## References

[1]: https://csrc.nist.gov/pubs/sp/800/207/final "NIST SP 800-207, Zero Trust Architecture"

[2]: https://docs.cloud.gov/platform/compliance/customer-separation/ "Cloud.gov Docs, Multi-Tenant Security & Customer Isolation"
