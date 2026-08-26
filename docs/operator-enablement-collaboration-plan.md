# Operator Enablement and Governed Collaboration Plan

## Purpose

This release responds to the primary usability gap in the current platform: an operator should understand what to do without first reading repository documentation. The product path is therefore organized around **Observe → Compare → Interpret → Act → Retain**, with contextual help and recommended actions that connect existing control-plane capabilities rather than adding another disconnected dashboard.

## Selected Scope

| Capability | Release behavior | Control boundary |
| --- | --- | --- |
| Getting Started workspace | Guides a first-time operator through Observe, Compare, Interpret, Act, and Retain using the existing pilot case and linked workspaces. | It explains and links to controls; it does not execute an action on the operator’s behalf. |
| Recommended next action | Uses current tenant case and rollout posture to suggest the next review step and evidence destination. | Recommendations remain advisory and cannot bypass approval, ownership, RPO, or replay gates. |
| Comment visibility and redaction | Comments receive a tenant-role visibility label; authorized users can redact body text while preserving the immutable redaction event and original evidence reference. | Redaction is not deletion, and cross-tenant reads remain forbidden. |
| Shared team queues | Named team views can be granted to explicit tenant roles, with their access posture visible in the queue. | Shared views are policies over the same tenant-scoped cases; they do not create a cross-tenant work pool. |
| Hourly assigned-investigator reminders | A scheduled job evaluates cases and writes in-application reminder/audit records for the current named assignee. | Pilot-only: no email, SMS, Teams, Slack, webhooks, delivery guarantees, or automatic escalation. |

## Scheduled Reminder Decision

The selected reminder model is an hourly, deterministic scheduled check. Its sole recipient is the assigned investigator, and its operational owner is the tenant’s platform operator. A reminder is an in-application record that remains visible alongside the case activity history; it is not an external notification or a substitute for a human escalation decision.

> The reminder scheduler evaluates a due target and records a governed prompt for the assigned investigator. It does not dispatch externally, reassign the case, or trigger a rollout action.

## Explicitly Deferred

The source roadmap also identifies watchers, mentions, handoffs, evidence graphs, policy trees, decision simulation, configurable templates, external notifications, and workload-balancing rules. These are valuable follow-on capabilities, but this release intentionally prioritizes operator understanding, accountable collaboration, and audit-safe in-application reminders first.

## Validation Standard

The release must retain tenant scoping in every query and mutation, preserve append-only activity evidence for visibility/redaction, exercise shared-view access policy, and test reminder planning independently from external delivery. A deployed schedule must be created only after a checkpoint and a user-initiated publish action.
