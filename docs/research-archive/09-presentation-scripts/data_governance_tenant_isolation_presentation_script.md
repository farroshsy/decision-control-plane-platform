# Enterprise Data Governance and Tenant Isolation
## Presentation Script and Slide Walkthrough

### Audience and objective

This presentation is for enterprise architecture, security, privacy, compliance, platform engineering, and business owners evaluating the Decision Control Plane. Its purpose is to explain how the system can remain replayable and useful without making all tenant data universally visible.

**Recommended duration:** 22–28 minutes, followed by 15 minutes of questions.

**Central message:** A decision can be replayable without being universally visible. Replay requires controlled access to the same versioned evidence and policy scope, not unrestricted access to the underlying personal or commercially sensitive data.

---

## Slide 1 — Governance is part of the decision product

### Walkthrough

Open by reframing governance as a product capability rather than a compliance appendix. The Decision Control Plane is designed for high-consequence decisions that must connect facts, policy, action, and outcome. That makes data access, evidence provenance, retention, and tenant scope part of the decision semantics.

### Suggested visual

Show a decision episode in the center, surrounded by tenant, purpose, evidence, policy, action, and outcome boundaries. Use a red line around the decision artifact to indicate that governance travels with the object.

### Script

“Today’s question is not simply how to keep one tenant from reading another tenant’s database rows. The deeper question is how to preserve the usefulness of replay, evidence, and audit without turning replay into unrestricted data access. The Decision Control Plane treats governance as part of the decision product. Every decision, event, evidence item, policy bundle, model reference, action, and outcome carries an explicit tenant and purpose scope. The system can then prove what happened while still enforcing who is allowed to see which claims, fields, artifacts, and replay scopes.”

### Delivery cue

Emphasize that governance is attached to the canonical decision object and event model, not added later through a dashboard permission layer.

---

## Slide 2 — The tenant hierarchy is a security boundary

### Walkthrough

Explain that a tenant is more than a login account. It is a security, legal, operational, and data-governance boundary. Show the hierarchy from platform to organization, legal entity, region, product, workspace, and service principal.

### Suggested visual

Use a tree diagram with `Platform` at the top and `Organization tenant` branching to legal entity, residency zone, transaction rail, workspace, and service principals.

### Script

“We model tenancy hierarchically because enterprise responsibility is hierarchical. An organization may contain multiple regulated legal entities, regions, transaction products, and operational workspaces. The tenant identifier is therefore accompanied by the data controller, legal entity, residency zone, and purpose. Those values are immutable ownership and authorization context, not fields a caller may freely choose in a request body. A service that receives a transaction must know not only which organization it belongs to, but also under whose authority it is processed, in which residency zone, for what purpose, and at what classification level.”

### Delivery cue

Make the point that the same identity may be authorized for one legal entity and denied for another within the same enterprise group.

---

## Slide 3 — Four isolation tiers support different risk profiles

### Walkthrough

Present the four deployment tiers: logical, strong logical, dedicated data plane, and dedicated environment. Explain that isolation strength is a product choice tied to sensitivity, residency, contract, and operational risk.

### Suggested visual

A left-to-right spectrum from shared compute to dedicated environment. Use increasing line weight or a denser boundary as isolation strengthens.

### Script

“Not every tenant requires the same physical topology, but every tenant requires the same semantic guarantees. The standard production profile is strong logical isolation: tenant-scoped rows, event partitions, indexes, caches, keys, and authorization policies. Larger or more sensitive customers can use a dedicated data plane or a dedicated environment. The important design decision is that moving from one tier to another must not change the decision theory. It should change the deployment boundary, capacity allocation, and key ownership while preserving the same event, evidence, replay, and action contracts.”

### Delivery cue

Clarify that stronger physical isolation is an available deployment profile, not a substitute for authorization.

---

## Slide 4 — Zero trust moves the boundary from the network to the resource

### Walkthrough

Connect the architecture to NIST SP 800-207. Explain that zero trust means no implicit trust based on network location or asset ownership, and that authentication and authorization are separate decisions before access [1].

### Suggested visual

Show a policy decision point in the middle and multiple enforcement points around APIs, repositories, queues, caches, graphs, object storage, replay, and action rails.

### Script

“NIST’s zero-trust model is directly relevant because the Decision Control Plane is not safe if it only trusts traffic arriving from an internal network. Zero trust treats users, workloads, devices, services, and resources as the things that must be evaluated. In this architecture, a policy decision point evaluates tenant, purpose, role, resource, data class, relationship, time, and action. Policy enforcement points appear at every meaningful boundary: the API gateway, service RPC, repository, event stream, object store, cache, graph query, replay worker, export path, and action rail. The network remains useful defense in depth, but it is no longer the primary trust boundary.”

### Delivery cue

Pause after “every meaningful boundary.” This is the architectural commitment that prevents permission drift.

---

## Slide 5 — Identity and purpose travel with every request

### Walkthrough

Introduce the signed tenant-context object. Explain what it contains and how downstream services validate it.

### Suggested visual

Show a signed context envelope moving through Edge Guard, Domain Adapter, Policy Interpreter, Decision Kernel, Audit, and Replay. Highlight the fields `tenant_id`, `purpose`, `classification_max`, `residency_zone`, `subject_id`, and expiry.

### Script

“The most important implementation detail is how context propagates. A service cannot simply trust a tenant ID from a URL or JSON payload. The edge creates or verifies a signed context containing the tenant, legal entity, residency zone, purpose, maximum classification, subject identity, authorization ID, issued time, and expiry. Each downstream component validates audience, signature, expiry, purpose, and resource scope. The Policy Interpreter receives that context as part of its evaluation input. The repository, graph service, cache, evidence store, and replay worker independently enforce it. That is how we prevent a broad internal service identity from becoming an accidental cross-tenant master key.”

### Delivery cue

Use the phrase “context is not metadata; context is authorization input.”

---

## Slide 6 — Defense in depth across data, compute, and failure domains

### Walkthrough

Explain the ten isolation controls: namespaces, row-level security, field encryption, event partitions, cache/graph namespaces, keys, quotas, logs, backups, and dedicated tiers.

### Suggested visual

A concentric defense-in-depth diagram with three rings: authorization, data isolation, and runtime/failure isolation.

### Script

“Tenant isolation has three dimensions. First is authorization: who may perform which action for which purpose. Second is data isolation: where the data is stored, indexed, cached, encrypted, backed up, and restored. Third is failure isolation: whether one tenant’s load, corruption, or incident can degrade another tenant. We therefore combine signed authorization context, database row-level controls, field encryption, tenant-scoped event partitions, per-tenant cache and graph namespaces, per-tenant keys, quotas, queue partitions, and selective restore. The design also isolates metrics, traces, and error messages so observability does not become an exfiltration path.”

### Delivery cue

Mention that every derived view—search, graph, vector, feature, and cache—is a data store and must be governed like the primary store.

---

## Slide 7 — Evidence is claim-level, not all-or-nothing

### Walkthrough

Show the disclosure profiles: operational summary, investigator, auditor, platform operator, and model-development. Explain that seeing a decision does not imply seeing every underlying artifact.

### Suggested visual

Use a layered decision view: disposition at the top, decisive claims in the middle, raw artifacts at the bottom. Different roles receive different layers.

### Script

“A common design mistake is to treat a decision as one indivisible document. In reality, a decision contains claims with different sensitivities. An operational user may need the disposition, reason code, deadline, and minimal identifiers. An investigator may need the decisive claims, source spans, counterevidence, and graph slice. An auditor may need the full replay manifest and access history. A platform operator may need health metadata but not raw investigative content. The Decision Control Plane therefore uses claim-level disclosure profiles. This lets us preserve replayability while applying least privilege and purpose limitation to the underlying evidence.”

### Delivery cue

Stress that redaction must preserve provenance and claim identity; it must not make the explanation unverifiable.

---

## Slide 8 — Data lifecycle: collect, derive, share, retain, supersede

### Walkthrough

Walk through collection, derivation, sharing, retention, legal hold, and correction. Explain why immutable records are corrected by supersession rather than mutation.

### Suggested visual

A lifecycle loop with five stages and an immutable event ledger beneath it. Use arrows from derived facts to their input facts and model versions.

### Script

“Governance is a lifecycle, not a storage setting. The Domain Adapter records why a field was collected, who is authoritative, how it was transformed, and whether it is required on the hot path. Derived facts retain their inputs, evidence references, model version, purpose, and uncertainty. Sharing requires an approved purpose, recipient scope, residency check, and export record. Retention is tenant- and jurisdiction-specific and must account for legal holds and investigation status. When a record needs correction, the system appends a superseding record rather than rewriting history. That is essential for both audit integrity and honest replay.”

### Delivery cue

Distinguish “negative evidence” from “no evidence”; they have different decision meanings.

---

## Slide 9 — Cross-tenant learning is opt-in, not ambient

### Walkthrough

Explain the default prohibition on raw cross-tenant training and the approved alternatives: synthetic data, de-identified data, federated aggregates, tenant-specific models, and public fixtures.

### Suggested visual

Show separate tenant data silos with a controlled aggregate-learning gateway in the middle. Put a red “no raw flow” barrier between silos.

### Script

“The platform must not quietly convert one customer’s restricted records into another customer’s training data. Raw cross-tenant training is off by default. Approved alternatives include synthetic data, tenant-approved de-identification, privacy-preserving aggregates, or training inside the customer boundary. Every model artifact records its training scope, participating tenants, feature lineage, purpose, approval, and deployment eligibility. A model trained on one tenant’s restricted records cannot silently appear in another tenant’s runtime. This is both a privacy control and a model-governance control: provenance determines where an output may be used.”

### Delivery cue

Use “data-use permission travels with the model artifact” as the key phrase.

---

## Slide 10 — Threat model: prevent, detect, recover

### Walkthrough

Present the principal adversaries: external attacker, compromised tenant user, malicious service, noisy tenant, insider, supply-chain attacker, stale source, replay attacker, and migration failure. Then show the three control layers.

### Suggested visual

A threat matrix with columns for adversary, target, preventive control, detective signal, and recovery action.

### Script

“The threat model is broader than unauthorized reads. We must prevent cross-tenant writes, policy tampering, watchlist substitution, action replay, silent allow during outage, evidence exfiltration, noisy-neighbor exhaustion, insider misuse, supply-chain compromise, and migration divergence. Each threat receives preventive controls, detective controls, and recovery actions. For example, a replay attacker is addressed through idempotency keys, nonces, deadlines, duplicate detection, and rail reconciliation. A compromised interpreter is limited by sandboxing, no arbitrary code, minimal permissions, signed images, and egress restrictions. A migration failure is handled with shadow comparison, canary cutover, divergence alerts, and a tested rollback pointer.”

### Delivery cue

Do not imply that a single control solves a threat; emphasize layered controls and recovery evidence.

---

## Slide 11 — Migration is a security boundary change

### Walkthrough

Connect the security model to migration. Explain the staged path: inventory, facade, canonical record, shadow evaluation, dual-write, slice cutover, and retirement.

### Suggested visual

A left-to-right migration timeline with the legacy monolith shrinking while the Decision Control Plane grows. Mark each stage with a security and correctness gate.

### Script

“Moving from a monolith is not only a code decomposition. It changes who is authoritative for policy, evidence, action, and audit. We therefore migrate in stages. First we inventory behavior and capture inputs and outputs. Then we place a facade in front of the legacy engine to establish tenant and purpose context. We build the canonical evidence and decision record while the incumbent still executes. Next we run the new adapter and interpreter in shadow mode, compare outputs, and classify differences. Dual-write and reconciliation come before action cutover. Finally, we move one bounded policy slice at a time with rollback. The monolith is retired last, after the new path owns action authority and historical replay.”

### Delivery cue

State clearly: no big-bang rewrite, no unobserved cutover, and no environment-variable-only migration control.

---

## Slide 12 — Decision: fund the control plane, not the permission theater

### Walkthrough

Close with the minimum control set and the return-on-research priority. Explain what should be built now, later, or only on demand.

### Suggested visual

A priority ladder: now = signed context, tenant-scoped repositories, immutable evidence, replay, shadow comparison, and negative tests; later = dedicated tiers, broad catalogs, and full monolith retirement.

### Script

“The recommendation is to fund the control plane capabilities that create reusable proof: tenant identity and purpose context, field-level classification, tenant-scoped stores and event partitions, claim-level disclosure, immutable evidence, replay, and migration comparison. These workstreams have the highest Return on Research because they create knowledge and interfaces that can be reused across financial crime, procurement, supplier risk, and clinical oversight. Dedicated environments, broad connector catalogs, and full monolith retirement remain valuable, but they should follow concrete demand and successful kernel validation. The final standard is simple: a decision must be fast enough to operate, governed enough to trust, and durable enough to replay—without granting more access than the purpose requires.”

### Delivery cue

End with the phrase “replayable does not mean universally visible.”

---

## Anticipated questions

### “Why not use a separate data warehouse for audit?”

A warehouse may support reporting, but it does not by itself provide an immutable, causally linked, tenant-scoped decision record. The control plane must preserve compact trace and action evidence at the decision boundary, then enrich asynchronously into analytical stores.

### “Why not rely on database row-level security alone?”

Row-level security is necessary but insufficient. Cross-tenant leakage can occur through caches, graphs, vector stores, logs, metrics, exports, event consumers, backups, and model features. The authorization context must be enforced at every resource boundary.

### “Does a dedicated environment eliminate the need for zero trust?”

No. Dedicated infrastructure reduces some co-tenancy risks, but credentials, service calls, exports, insider access, stale evidence, and action APIs still require authentication, authorization, and audit.

### “How do we support regulators or auditors?”

Create an explicit, time-bound evidence package or replay scope with approved purpose, tenant and residency constraints, disclosure profile, access logging, and expiration. Do not grant an unrestricted database account.

### “What if a tenant requests model training from another tenant’s data?”

Treat it as a governed data-sharing and model-use decision. Require documented purpose, authorization, de-identification or privacy-preserving method, recipient scope, residency review, model lineage, and deployment approval. The default is no raw cross-tenant training.

## Sources

[1]: https://csrc.nist.gov/pubs/sp/800/207/final "NIST SP 800-207, Zero Trust Architecture"

[2]: https://docs.cloud.gov/platform/compliance/customer-separation/ "Cloud.gov Docs, Multi-Tenant Security & Customer Isolation"
