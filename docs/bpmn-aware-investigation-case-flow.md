# BPMN-Aware Investigation Case Flow

## Design conclusion

The review of the BPMN, DMN, CMMN, workflow, and process-model materials confirms that the next application increment should be an **investigation case flow**, not a new standalone visualization. A replay divergence may originate in a controlled migration process, but its resolution depends on discretionary analyst work, evidence interpretation, approval, and potential rollback recommendation. That is a case-management concern wrapped around a deterministic decision and migration substrate.

> BPMN moves work through stages; DMN and policy logic explain a governed conclusion; CMMN organizes evidence-driven exception work. The Decision Control Plane connects all three to tenant scope, evidence, authority, replay, action, and outcome.

## Application process

| Process step | BPMN/CMMN interpretation | Application surface | Required retained evidence | Authority boundary |
|---|---|---|---|---|
| **Detect** | Event or boundary escalation | Operations, Migration Timeline, webhook diagnostics | Telemetry, phase, delivery diagnostic, correlation | Detection cannot mutate rollout authority |
| **Open case** | CMMN case instance | Investigation Case | Tenant, decision, rollout, recommendation, linked traces | Case creation is additive |
| **Compare** | DMN/policy evaluation evidence | Replay Explorer | Baseline/candidate trace, state/policy versions, semantic fields, trace hashes | A diff is not an automatic outcome |
| **Explain** | CMMN human task | Investigation Case outcome and replay assertion | Analyst rationale, evidence binding, actor | Human conclusion remains recorded and reviewable |
| **Approve or recommend** | BPMN user task and exclusive gateway | Migration Timeline | Phase criteria, ownership, RPO, audit, replay, approval record | Recommendation does not bypass protected advance/rollback controls |
| **Act** | BPMN service task / saga action | Existing rollout controls | Idempotency, ownership epoch, durability, action trace | Only protected action paths execute a change |
| **Retain and export** | BPMN end-event data object / case file | Replay export and audit export | Case, assertion, comparison, evidence, tool/audit references | Exports are tenant-scoped pilot artifacts |

## What the application adds

The platform now implements the process as a tenant-scoped **case file** rather than a loose set of pages. It stores an accountable outcome—**confirmed**, **explained**, **accepted**, or **rollback required**—with an actor and rationale. A rollback-required case outcome is intentionally not a rollout rollback; it creates evidence for a separately authorized, safety-gated action.

The Replay Explorer packages the comparison, retained traces, assertions, evidence bindings, investigation status, recommendations, and audit references into a downloadable JSON evidence package. The Migration Timeline shows readiness as color-coded gate evidence for ownership, RPO, audit, replay, and approval. Webhook diagnostics allow a controlled pilot retry that creates a new simulated delivery and retry-audit record without contacting an external receiver.

## Stable and pluggable boundaries

| Stable control-plane kernel | Pluggable surrounding process representation |
|---|---|
| Tenant ID, decision ID, causation, correlation, event time | BPMN tool and process-definition format |
| Evidence, trace hash, state/policy version, manifest | DMN authoring surface and policy compiler |
| Ownership epoch, RPO admission, action idempotency | Workflow runtime or case-management system |
| Append-only assertions, approvals, recommendations, outcomes | Analyst workbench, queues, and process-mining views |
| Replay, audit export, authorization, data classification | Connector, notification, and integration technologies |

## Pilot boundary and next production gate

This flow is designed for a **pilot rehearsal**. The webhook retry feature is a deterministic, database-backed simulation. It records a new delivery attempt, payload version, result status, actor, rationale, and the fact that no external request was made. It is not a retry queue, a signed delivery system, or a delivery guarantee.

Before enabling a production execution model, the pilot must demonstrate that case outcomes, migration gate evidence, replay export packages, and operator handoffs are usable by the intended compliance, operations, and platform roles. Only then should a bounded external receiver, durable queue, replay-safe idempotency protocol, delivery SLO, key rotation lifecycle, and incident response process be introduced.

## Return on Research

| Workstream | Knowledge value | Engineering leverage | Cross-domain applicability | Validation cost | Maintenance burden | Priority |
|---|---:|---:|---:|---:|---:|---|
| Investigation case file and outcomes | High | High | High | Moderate | Moderate | Now |
| Replay evidence package export | High | High | High | Low | Low | Now |
| Migration gate progress visualization | Medium | High | Medium | Low | Low | Now |
| Controlled retry simulation | Medium | Medium | High | Low | Low | Now, pilot only |
| Live external retry and delivery operations | Medium until receiver contracts exist | Potentially high | High | High | High | Later, after pilot gate |

The resulting product path remains **detect → compare → explain → approve or recommend → act through protected controls → retain and export**. This preserves the distinction between process flow, decision semantics, discretionary case work, and operational authority.
