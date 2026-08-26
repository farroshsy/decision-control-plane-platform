# Operator Enablement and Governed Collaboration Release Notes

## Purpose

This release improves **operator comprehension and governed collaboration** without expanding the financial-crime screening pilot into an unvalidated operations platform. The priority is for a newly assigned operator to orient to tenant-scoped work in approximately five minutes and to move through the existing control-plane workflow with clear evidence and authority boundaries.

## Delivered capabilities

| Capability | Delivered behavior | Governance boundary |
| --- | --- | --- |
| **Getting Started** | `/app/getting-started` implements **Observe → Compare → Interpret → Act → Retain**, retains a browser-local checklist, and provides contextual links to Control Room, Replay, Investigation, Migration Timeline, Integrations, Evidence, and Documentation. | The recommended next action is advisory navigation based on visible tenant case posture; it does not take a decision, advance a rollout, assign work, or execute an action. |
| **Role-visible comments** | Comments have `tenant_members`, `operator_team`, or `platform_compliance` visibility. Reads enforce current tenant membership role. | Visibility does not cross tenant scope. A comment body is not copied into the shared immutable activity payload. |
| **Controlled redaction** | Platform and compliance operators can redact an active comment with a required reason. The row remains, the original SHA-256 body hash is retained, a placeholder replaces visible body content, and activity evidence records actor and timestamp. | Redaction is not deletion, retention deletion is not automated, and this is application evidence rather than a legal-hold or legal-admissibility mechanism. |
| **Shared team queues** | Platform operators can create and retire tenant-scoped queue views with an explicit allowed-role policy. Personal saved views remain private. | Team views do not create a cross-tenant work pool. Lifecycle changes append immutable activity evidence with creator/role-policy metadata. |
| **Hourly SLA reminder policy** | A draft policy uses fixed hourly UTC cadence `0 0 * * * *`, targets the **named assigned investigator only**, is owned operationally by the `platform_operator` role, and creates in-app reminder/activity records only when the retained target is due soon or overdue. | No email, SMS, Slack, Teams, external webhook, delivery guarantee, automatic reassignment, automatic escalation, or rollout action is included. |

## Scheduling posture

The database model and deterministic reminder evaluator are complete. Manual evaluation is available to validate tenant-scoped, idempotent records before schedule activation. The deployed callback is cron-authenticated, requires a scheduled task UID, resolves the matching active policy by that UID, catches errors, and returns JSON.

> **Schedule activation remains deliberately pending.** No Heartbeat task has been created in this environment. Activation is guarded to the deployed application and requires a release checkpoint, user publish action, and an explicit follow-up confirmation from the user.

## Return on Research: post-deployment activation decision

| Dimension | Assessment | Rationale |
| --- | --- | --- |
| Knowledge Value | High | Validates whether an evidence-only reminder meaningfully improves investigator attention without turning the pilot into a notification platform. |
| Engineering Leverage | High | The policy/task-UID/callback pattern can support other bounded, auditable scheduled evaluations while keeping delivery mechanisms pluggable. |
| Cross-Domain Applicability | High | Assigned-work attention records apply to supplier risk, procurement, compliance, claims, and other decision-review domains. |
| Validation Cost | Low to moderate | The scheduler is narrow and idempotent, but activation should be observed on a deployed environment before claiming operational reliability. |
| Maintenance Burden | Low | The fixed cadence and single-recipient model minimize configuration and delivery complexity. |
| Strategic Priority | **Later — immediately after deploy confirmation** | Complete the release checkpoint and publish first; activate only after the user explicitly confirms the deployed target. |

## Explicitly deferred

The following remain out of scope: external notification channels, delivery and retry guarantees, user-configured recipient routing, background workload balancing, watchers/mentions, automated case closure, auto-escalation, third-party notarization, retention deletion, legal-enforceability claims, production SLA claims, and autonomous rollout or infrastructure operations.

## Validation standard

Validation covers pure role-visibility, redaction-authority, shared-view, evaluation-hour, and assigned-investigator reminder-planning rules, together with application type checking, production build verification, and browser review of the new guide and tenant-scoped collaboration controls. The approved browser fixture path exercises governed comment creation and redaction, shared-view creation/use/retirement, and a draft manual reminder evaluation. Scheduled-job creation is intentionally excluded until deployment is confirmed.

## Validation result

The final release check passed **39 Vitest assertions across 12 test files**, `pnpm check`, and the production build. The build retains the existing non-blocking Vite client chunk-size advisory. Browser review confirmed the guide’s recommended action and all explicit operator paths. With user approval, the existing pilot tenant then received clearly labelled fixtures: a restricted-scope comment and governed redaction, a platform/compliance team queue that was applied and retired, and one due-soon assigned-investigator in-app reminder from a **draft** policy manual evaluation. The browser confirmed immutable comment-redaction and SLA-reminder activity entries. No Heartbeat task, external delivery, rollout action, or third-party communication was created.
