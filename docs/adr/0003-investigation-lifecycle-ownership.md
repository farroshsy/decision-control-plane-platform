# ADR 0003: Keep Human Investigation Work Accountable and Separate from Execution

## Status

Accepted.

## Context

Replay divergence and migration exceptions require discretionary human work around deterministic system gates. A role queue alone is insufficient for accountable case ownership, workload awareness, service-level targets, supporting rationale, or retained evidence.

## Decision

Investigation cases may be assigned to a tenant member or role queue, given due and service-level targets, escalated manually, annotated with immutable comments, linked to attachment metadata, and represented in an immutable activity history. Saved views are private to the tenant member who creates them. Service-level posture is evaluated at request time rather than by a background timer.

## Consequences

Operators can manage workload and explain their case work without creating implicit automation. Comments, attachments, activities, saved views, assignments, and escalations are tenant-scoped. Any future automatic reminders or escalations require a separately designed scheduled delivery workflow and deployment boundary.
