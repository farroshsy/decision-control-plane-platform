# Architecture Handbook

## Purpose

The Decision Control Plane governs decision-state evolution without becoming a domain-specific decision engine. It provides a stable kernel for identity, evidence, versioned meaning, authority, outcome, and time, while domain adapters, policy interpreters, connectors, process runtimes, and visualization surfaces remain replaceable.

> A consequential decision is safe only when the evidence, policy/state version, authority posture, outcome, and audit trail are available for inspection and deterministic replay.

## Layered architecture

| Layer                   | Responsibility                                                                       | Current pilot implementation                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Domain adaptation       | Convert source-domain events to canonical decision episodes.                         | Financial-crime screening pilot semantics and typed integration guidance.                                                                 |
| Decision kernel         | Bind tenant, identity, evidence, policy/state version, authority, outcome, and time. | Tenant-scoped records, evidence, manifests, replay traces, and audit rows.                                                                |
| Safety controls         | Decide whether an action is admitted.                                                | Ownership, RPO, audit, replay, approval, and rollback readiness gates.                                                                    |
| Investigation lifecycle | Coordinate discretionary human work around deterministic controls.                   | Cases, outcomes, named or role-based assignment, due dates, SLA posture, escalation records, comments, attachments, and activity history. |
| Evidence lifecycle      | Retain and prove decision artifacts.                                                 | Signed replay manifests, retention-policy records, attachment metadata, and immutable activity evidence.                                  |
| Integration boundary    | Offer controlled access to external tooling.                                         | Pilot API keys, request/response MCP, and simulated webhook records.                                                                      |

## Safety separations

The control plane records evidence, recommendations, and accountable operator actions. It does not make an investigation outcome equivalent to execution authority. A `rollback_required` case outcome remains a recommendation until the separately protected rollback mechanism is invoked and the existing safety gates pass.

Similarly, a service-level target is an accountable operating commitment, not an autonomous dispatcher. The current pilot calculates due and overdue posture as case data is read. It does not run a background timer, send a notification, or escalate a case automatically.

## Business-process model

The deterministic BPMN-like migration process and the discretionary CMMN-style investigation case are complementary. A migration phase has explicit preconditions and stop rules; a case collects evidence, comments, attachments, human interpretation, recommendations, and assigned work. DMN-style decision rules can inform the explicit comparison and recommendation posture without taking over execution authority.

## Extension rules

New capabilities should preserve four rules. First, every persisted operational record must carry tenant scope. Second, every consequential transition must be evidence-bound and audit-retained. Third, a new connector, model, or UI must not bypass authority and admission controls. Fourth, pilot simulations must remain clearly distinguished from production guarantees.
