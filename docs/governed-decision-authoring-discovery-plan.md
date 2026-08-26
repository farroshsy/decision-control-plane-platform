# Governed Decision Authoring Discovery Plan

## Decision

The next major product direction is **Governed Decision Authoring**: a Policy Studio that lets accountable teams create, version, review, simulate, and publish decision logic while preserving the existing tenant, evidence, authority, replay, and audit kernel. This responds directly to the supplied observation that the platform can operate governed decisions but does not yet provide a dedicated authoring lifecycle.[^source]

> **Product hypothesis:** organizations buy confidence in consequential decisions—evidence, policy, approvals, replay, and audit—not isolated dashboards or model features.

The current financial-crime screening application remains the validation wedge. Procurement, supplier risk, IT governance, and other domains are future **industry-pack proofs**, not claims that those workflows are already operational.

## Scope boundary

| Layer | Stable kernel to preserve | Pluggable surface to add later |
| --- | --- | --- |
| Decision state | Tenant scope, canonical episode, evidence bindings, authority, outcome, time, immutable activity, deterministic replay | Domain entities, policy language, graph vocabulary, visualisations, simulation model |
| Policy governance | Version identity, lifecycle transition evidence, maker/checker separation, publication gate | Rules, schemas, interpreters, impact metrics, review templates |
| Delivery | In-app pilot records and bounded request/response surfaces | Marketplace delivery, partner hosting, billing, package registry, external notification infrastructure |

The discovery work does **not** claim production policy deployment, automated enforcement, model safety certification, legal admissibility, multi-domain readiness, marketplace commerce, or partner SDK stability. Each claim requires its own validation evidence.

## Capability sequence

| Wave | Capability | Smallest credible deliverable | Go / narrow / stop gate |
| --- | --- | --- |
| 0 | **Policy Studio foundation** | Tenant-scoped policy drafts, immutable revisions, lifecycle states (`draft → review → approved → published/deprecated/archived`), maker/checker approval records, and replay links. | **Go** if a reviewer can reconstruct one approval. **Narrow** to one policy language if semantic comparison is unclear. **Stop** publication if replay evidence is incomplete. |
| 1 | **Evidence Graph and Simulation Workspace** | Read-only graph projection: Evidence → Policy → State → Replay → Investigation → Outcome → Audit; deterministic simulation using retained historical cases, impact deltas, and a non-production report. | **Go** if replay-backed impact is understandable. **Narrow** to lineage plus case impact before adding graph editing. **Stop** if inputs are not evidence-bound. |
| 2 | **Workflow Library and Industry Pack framework** | Versioned BPMN playbook templates plus an installable, tenant-scoped pack manifest containing policy templates, workflows, schemas, dashboard definitions, and documentation links. | **Go** after a second domain adapter passes the kernel invariants. **Narrow** to templates if pack installation needs uncontrolled runtime extensibility. **Stop** automatic execution. |
| 3 | **AI Governance and Decision Analytics** | AI recommendations recorded as evidence with model/prompt/version provenance, human review, replay comparison, and accountable approval; metrics for policy quality, workload, queue aging, and operational risk. | **Go** if recommendations remain reviewable and replayable. **Narrow** to assistive summaries. **Stop** autonomous decision or policy publication. |
| 4 | **Marketplace and Partner SDK** | Design-only package contract, capability discovery model, installer safety requirements, and partner SDK prototype. | **Go** only after pack compatibility, signing, upgrade, and rollback are proven. **Narrow** to curated internal packs. **Stop** public installability and commerce until isolation is independently tested. |

## Policy Studio discovery backlog

The initial build should model **policy objects** separately from execution. A policy revision must identify its tenant, parent revision, semantic version, source artifact hash, policy schema/adapter identity, lifecycle state, author, reviewers, evidence links, replay assertions, simulation report, and immutable transition activity. Publication is a controlled state transition, never a direct edit.

The first Policy Studio screen should provide a revision timeline, side-by-side semantic comparison, evidence/replay attachments, a maker/checker review queue, and a clear status badge. The first simulation screen should accept a proposed revision and a bounded retained-case cohort, then show decisions that would differ, impacted investigations, and confidence limits. It must not invoke a live policy engine or modify a rollout.

## Evidence Graph contract

The Evidence Graph should be a **read model**, not a second mutable source of truth. Nodes are tenant-bound references to existing identifiers; edges carry edge type, source record, timestamp, and provenance. The initial graph needs only these edge types: `used_evidence`, `evaluated_by_policy`, `evaluated_against_state`, `replayed_as`, `opened_investigation`, `resolved_by_outcome`, and `recorded_in_audit`.

Graph exploration must always preserve tenant filtering, record provenance, and a path back to the underlying immutable source. Graph editing, inferred links without provenance, cross-tenant graph traversal, and claims of knowledge completeness are deferred.

## Workflow, pack, and partner contract

The Workflow Library should retain BPMN source, version, owner, applicability, input/output references, and human authority points. An Industry Pack should be declarative: a signed manifest listing compatible policy templates, workflow templates, schema mappings, dashboard descriptors, documentation, and upgrade/rollback requirements. It must not execute arbitrary code in the control plane.

The Partner SDK should begin as a **schema and validation contract**, not a runtime plugin loader. A partner pack can be linted and simulated in an isolated validation environment before any controlled tenant installation path is considered. Marketplace functions, subscriptions, commercial pricing, and public discovery are deliberately deferred.

## AI Governance contract

An AI recommendation is treated as evidence, never as authority. The minimum retained record includes model/provider identity, prompt or input hash, output hash, retrieval/evidence bindings, evaluation context, reviewer decision, policy/replay references, and timestamps. A reviewer may accept, reject, or request further evidence; the recommendation cannot publish a policy, close an investigation, advance a rollout, or override ownership/RPO gates.

## Return on Research

| Workstream | Knowledge value | Engineering leverage | Cross-domain applicability | Validation cost | Maintenance burden | Strategic priority |
| --- | --- | --- | --- | --- | --- | --- |
| Policy Studio foundation | High | High | High | Moderate | Moderate | **Now** |
| Evidence Graph read model | High | High | High | Moderate | Moderate | **After policy revision identity** |
| Simulation Workspace | High | High | High | Moderate to high | Moderate | **After deterministic cohort/replay contract** |
| Workflow Library and Industry Packs | High | High | High | High | High | **After a second validated domain** |
| AI Governance | High | Medium | High | High | High | **After evidence/review provenance is proven** |
| Analytics | Medium | Medium | High | Low to moderate | Moderate | **Alongside validated workflow usage** |
| Marketplace and Partner SDK | Medium | High | High | High | High | **Later** |

## Immediate next increment

The next code milestone should be **Policy Studio Foundation**, limited to a tenant-scoped revision registry, lifecycle state machine, maker/checker approval evidence, and replay-linked comparison. It should reuse the existing replay, investigation, audit, tenant-membership, and activity infrastructure rather than creating a parallel decision engine.

[^source]: User-supplied “Governed Decision Authoring” direction, `pasted_content_5.txt`, sections 1–3 and 9–10.
