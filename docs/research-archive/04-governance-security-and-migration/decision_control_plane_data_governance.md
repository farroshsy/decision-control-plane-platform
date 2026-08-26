# Decision Control Plane — Enterprise Data Governance and Tenant Isolation

## 1. Design objective

The Decision Control Plane handles transaction data, customer and beneficial-owner information, watchlists, relationship graphs, policy bundles, analyst findings, and immutable audit records. The governance model must therefore protect confidentiality and privacy without destroying the evidence, replayability, and cross-system lineage that make the product valuable.

The central rule is:

> **A decision may be replayable without being universally visible.**

Replay requires controlled access to the same versions and evidence references, not unrestricted access to the underlying personal or commercially sensitive data.

The governance model separates four concerns:

1. **Data authority:** which tenant or source is authoritative for a field or claim.
2. **Data purpose:** why a datum may be collected, processed, disclosed, retained, or learned from.
3. **Data access:** which principal may see, derive, mutate, export, or replay it.
4. **Data integrity:** whether a record is immutable, append-only, versioned, corrected by supersession, or deletable under policy.

## 2. Tenancy model

The system uses a hierarchical tenant model:

```text
Platform
  └── Organization tenant
        ├── Legal entity / business unit
        ├── Region / data-residency zone
        ├── Product / transaction rail
        ├── Operational workspace
        └── Service principals and delegated partners
```

### Tenant identity

Every decision, event, evidence item, claim, policy bundle, state manifest, model reference, action, case, and outcome carries an immutable `tenant_id`. Where a group operates multiple regulated legal entities, the system also carries `data_controller_id`, `legal_entity_id`, and `residency_zone`.

A tenant is not merely a UI account. It is a security and data-governance boundary with its own:

- authorization policy;
- encryption-key hierarchy;
- data-retention schedule;
- residency and transfer rules;
- evidence authorities;
- policy bundles and approval roles;
- event partitions and replay scopes;
- model-training permissions;
- export and disclosure controls;
- incident-notification contacts.

### Isolation tiers

| Tier | Isolation model | Intended use | Default |
|---|---|---|---|
| T1 — Logical | Shared compute, tenant-scoped rows, keys, caches, and event partitions | Lower-sensitivity development or small tenants | Never for restricted production data without compensating controls |
| T2 — Strong logical | Shared cluster, separate tenant partitions, per-tenant keys, policy-enforced row/field access | Standard regulated production | Default production tier |
| T3 — Dedicated data plane | Dedicated database/event partitions and cache namespace; shared control plane | Large or highly sensitive tenants | Available for premium or residency constraints |
| T4 — Dedicated environment | Separate account/cluster/network and tenant-managed keys | Sovereign, high-assurance, or contractual isolation | Exception or regulated deployment profile |

The control plane may be shared only when it stores metadata that is itself authorized for shared visibility. Tenant evidence, claims, decisions, and audit payloads remain tenant-scoped even when their schemas are shared.

## 3. Security principals and authorization

### Principal classes

| Principal | Typical examples | Default rights |
|---|---|---|
| Human user | Investigator, compliance officer, engineer, auditor | Role- and attribute-scoped access; no implicit cross-tenant access |
| Tenant service | Payment gateway, case system, policy compiler | Machine identity scoped to tenant and API capability |
| Platform operator | SRE, support, incident responder | Break-glass access only with ticket, approval, time limit, and audit |
| External reviewer | Regulator, independent auditor, partner | Explicit evidence package or time-bound read scope |
| Model service | Matcher, graph engine, feature service | Minimized fields and purpose-bound feature access |
| Replay service | Audit/research worker | Can access only the pinned snapshot scope authorized for the replay |

### Authorization model

Use a combination of RBAC, ABAC, and relationship-based access control:

- **RBAC** answers what a principal's job role permits.
- **ABAC** adds tenant, legal entity, region, purpose, data class, case assignment, and time constraints.
- **ReBAC** handles relationships such as “assigned investigator,” “policy owner,” “case reviewer,” or “auditor for this legal entity.”

Every access decision evaluates:

```text
allow = identity_authenticated
     AND tenant_scope_matches
     AND purpose_is_permitted
     AND data_class_is_authorized
     AND relationship_scope_is_valid
     AND temporal_grant_is_active
     AND legal_hold_or_restriction_is_satisfied
```

Deny by default. A service may never use a tenant identifier supplied only in the request body as proof of authorization; the tenant must come from a signed token, mTLS identity, workload identity, or trusted gateway context.

## 4. Data classification and handling

| Class | Examples | Minimum controls |
|---|---|---|
| Public | Public policy metadata, non-sensitive documentation | Integrity and normal access controls |
| Internal | Operational metrics, non-sensitive schemas, aggregate service health | Tenant-aware access; no raw restricted payloads |
| Confidential | Customer business data, contract terms, non-public model metadata | Encryption, tenant scope, least privilege, export approval |
| Restricted financial crime | Transaction parties, KYC, watchlist candidates, analyst notes, SAR/STR-related material | Field-level authorization, per-tenant keys, strict purpose limitation, immutable access logs |
| Highly restricted | Secrets, legal privilege, sensitive-source information, protected investigative material | Dedicated stores, dual approval, no model-training use by default, break-glass only |

Classification is field-level where necessary. A single decision object can contain public policy IDs, confidential transaction amounts, restricted identity facts, and highly restricted analyst notes. Access decisions must operate on field and subdocument paths rather than only on table or API level.

## 5. Storage and isolation controls

### Canonical storage rules

1. Every record has `tenant_id`, `data_controller_id`, `residency_zone`, `classification`, `purpose_tags`, `retention_class`, and `created_at`.
2. Every query path requires an authorization context; repositories reject unscoped queries by construction.
3. Tenant filters are enforced in the service layer and database layer. Application filtering alone is insufficient.
4. Sensitive fields are tokenized or encrypted separately from searchable metadata.
5. Search indexes, vector indexes, graph projections, caches, and materialized views are tenant-scoped by construction.
6. Event partitions include tenant and legal-entity scope; consumers cannot subscribe to an unrestricted global topic.
7. Object-storage paths include tenant, residency, classification, and object ID; bucket policy prevents cross-prefix access.
8. Backups preserve tenant and residency metadata and are tested for selective restoration.
9. Deletion is implemented as governed erasure or cryptographic destruction where legally permitted; immutable audit records are corrected by supersession rather than mutation.

### Encryption and key hierarchy

Use envelope encryption with a platform root key and tenant-scoped data-encryption keys. Highly sensitive tenants may supply or control their own keys.

```text
KMS root / HSM
  -> region or residency-zone key
      -> tenant key-encryption key
          -> data-encryption keys for evidence, events, indexes, backups
```

Key access is itself tenant- and purpose-scoped. A model service should not receive the key needed to decrypt raw analyst notes merely because it can read derived features.

## 6. Event and decision governance

### Immutable event envelope

The event envelope must include:

- tenant and data-controller scope;
- classification and purpose tags;
- event, observed, and validity times;
- aggregate scope and sequence;
- correlation and causation IDs;
- producer identity;
- schema and payload hashes;
- retention and legal-hold references;
- authorization context for sensitive event types.

Consumers must be idempotent and tenant-aware. A cross-tenant replay is prohibited unless an explicit, audited transfer package has been created.

### Decision visibility

A user who may view a decision does not automatically receive every underlying evidence item. The decision view should use a claim-level disclosure policy:

| Decision view | Permitted content |
|---|---|
| Operational summary | Disposition, reason codes, queue, deadlines, minimal party identifiers |
| Investigator view | Decisive claims, counterevidence, source spans, graph slice, policy trace |
| Auditor view | Full replay manifest, access history, versions, action acknowledgement, supersession history |
| Platform operator view | Health and metadata; no raw restricted content by default |
| Model-development view | De-identified or synthetic features only unless separately approved |

## 7. Data lifecycle

### Collection

Collect only fields needed for a declared decision purpose or a documented control obligation. The Domain Adapter records field transformations, source authority, consent or legal basis where applicable, and whether a field is required for hot-path evaluation.

### Use and derivation

Derived facts must retain input fact IDs, evidence references, derivation method, model version, purpose, and uncertainty. A model output cannot become a tenant-shared fact merely because it was computed by platform infrastructure.

### Sharing and transfer

Cross-tenant analytics use aggregate, de-identified, synthetic, or separately approved data. Sharing raw evidence, graph edges, watchlist candidate details, or analyst notes requires an explicit data-sharing agreement, purpose tag, recipient scope, residency check, and export audit record.

### Retention and deletion

Retention schedules are tenant- and jurisdiction-specific. A retention decision must account for operational need, legal/regulatory obligation, contractual requirement, legal hold, investigation status, and model-learning purpose. Once a decision or event is committed, corrections append a superseding record; the original remains immutable unless a legal erasure process explicitly requires cryptographic destruction.

## 8. Cross-tenant learning and model governance

The default is **no raw cross-tenant training**. A model or feature service may use:

- synthetic data;
- tenant-approved de-identified data;
- federated or privacy-preserving aggregates;
- institution-specific training inside the tenant boundary;
- published benchmark fixtures that contain no restricted production data.

Every model artifact records training-data scope, tenant participation, feature lineage, purpose, approval, fairness/security review, and whether it may be used for another tenant. A model trained from one tenant's restricted records must not be silently deployed to another tenant.

## 9. Operational isolation and failure handling

Tenant isolation applies to failure domains as well as permissions. Use per-tenant quotas, circuit breakers, queue partitions, concurrency limits, and noisy-neighbor detection. A high-volume tenant must not exhaust the interpreter, audit writer, cache, graph service, or replay workers for other tenants.

During incidents:

1. Freeze the affected scope.
2. Preserve event and access evidence.
3. Revoke or narrow compromised credentials.
4. Isolate the tenant or residency partition if necessary.
5. Continue only policy-permitted degraded behavior.
6. Reconcile action outcomes and replay affected decisions.
7. Notify authorized tenant and regulatory contacts according to the incident policy.
8. Record the incident as an immutable governance event.

## 10. Governance operating model

| Governance function | Owner | Cadence | Required artifact |
|---|---|---|---|
| Data classification | Data owner + security | At onboarding and material schema change | Classification record |
| Access policy review | Tenant security owner | Monthly or on role change | Access review evidence |
| Key review | Security/KMS owner | Quarterly and after incident | Key inventory and rotation record |
| Retention review | Legal/privacy + data owner | Quarterly | Retention matrix and legal holds |
| Schema/ontology governance | Architecture council | Per release | RFC/ADR and compatibility report |
| Model data-use review | Model-risk/privacy | Before activation and annually | Model card and data-use approval |
| Tenant isolation test | Platform security | Quarterly and after major change | Cross-tenant negative-test report |
| Disaster recovery | SRE + tenant owner | Quarterly | Restore and selective-recovery report |
| Break-glass review | Security | Per use, summarized monthly | Justification, approver, expiry, access log |

## 11. Minimum technical controls

The first production release should require:

- signed workload identity and mutual TLS for service-to-service calls;
- centralized policy decision point with tenant and purpose context;
- database row-level security or equivalent defense-in-depth;
- field-level encryption/tokenization for restricted identity data;
- tenant-scoped event topics and consumer authorization;
- per-tenant cache and index namespaces;
- immutable access logs linked to decision IDs;
- export controls and redaction profiles;
- secrets isolation and short-lived credentials;
- backup encryption and selective restore tests;
- automated cross-tenant negative tests in CI;
- data-loss-prevention checks on logs, prompts, traces, and support tools;
- retention and legal-hold enforcement;
- incident runbooks and break-glass controls.

## 12. RoR for governance workstreams

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Tenant identity and authorization context | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Field-level classification and purpose tags | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Tenant-scoped storage, cache, graph, and events | 5 | 5 | 5 | Very high / 2 | High / 3 | **4.25** | Now |
| Evidence and decision disclosure profiles | 5 | 4 | 5 | High / 3 | High / 3 | **4.10** | Now |
| Cross-tenant learning controls | 4 | 4 | 4 | Very high / 2 | High / 2 | **3.40** | Before multi-tenant model training |
| Dedicated-environment deployment profiles | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |
| Broad data catalog and connector governance | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | After concrete integrations |

The highest-return governance work is not a documentation exercise. It is enforcing tenant and purpose scope in the same canonical event, evidence, and replay contracts that make the product useful. Governance that lives only in process manuals will fail at the exact moment the system is under load or incident pressure.
