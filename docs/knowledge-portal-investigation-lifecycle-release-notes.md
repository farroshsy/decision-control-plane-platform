# Knowledge Portal and Investigation Lifecycle Release Notes

## Release purpose

This release connects the Decision Control Plane’s research lineage to the operator’s active case work. It introduces a searchable in-application Documentation Portal, a maintained architecture handbook, three architecture decision records, and an accountable investigation-lifecycle workspace with richer queue management and retained operator evidence.

## Delivered capabilities

| Capability                | Delivered behavior                                                                                                                                                                                       | Authority boundary                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation Portal      | Renders a curated catalog of theory, architecture handbook, process guides, release notes, ADRs, and the research archive with punctuation-tolerant full-text search and cross-reference navigation.     | The portal renders application-maintained knowledge; it is not an enterprise document synchronization service.                                 |
| Advanced queue            | Searches retained case summary, decision ID, status, role, and comments; filters by outcome, owner role, and service-level posture; sorts by activity, due target, service target, priority, or outcome. | Searches and saved views remain tenant-scoped and do not change a case or rollout.                                                             |
| Saved views and workload  | Stores private tenant-member queue views and shows open and overdue workload counts by current assignment.                                                                                               | A saved view is personal operating configuration, not a shared authorization rule.                                                             |
| Accountable ownership     | Supports role-queue or named tenant-member assignment with a due date and service-level target.                                                                                                          | Assignment records responsibility; it does not grant policy, rollout, or action authority.                                                     |
| Manual escalation posture | Records priority and an explicit service-level target for an escalation queue.                                                                                                                           | The posture is evaluated when read. No background timer, notification, dispatch, or automatic escalation is active.                            |
| Comments and attachments  | Retains case comments, small attachment metadata, object-storage references, and immutable activity evidence.                                                                                            | Attachments are limited to 2 MB in this pilot. Malware scanning, automated deletion, legal-hold enforcement, and external DLP are not claimed. |

## Data and audit model

The additive migration introduces comment, attachment-metadata, activity, and saved-view records. Existing assignment and escalation records now support due dates and service-level targets. Each outcome, assignment, escalation, acknowledgement, comment, and attachment action appends activity evidence rather than overwriting historical rationale.

The activity history complements the existing decision, replay, rollout, and audit records. It does not replace deterministic replay evidence, approval records, ownership/RPO gates, or the separately protected rollback mechanism.

## Validation

The release passed **36 Vitest assertions across 11 test files**, TypeScript validation, and a production build. Focused tests cover documentation search normalization, deterministic service-level target/posture rules, queue filtering/sorting behavior, pilot attachment admission, and the retained activity contracts for assignment, escalation, comment, and attachment mutations. The Documentation Portal was visually inspected with its `service level` query successfully matching `service-level` guidance.

Signed-in browser validation confirmed tenant-scoped queue hydration, free-text search, service-level sorting, workload counts, and a private saved view. It also confirmed a role-queue ownership assignment with a due date and 90-minute service target, a named `platform_operator` assignment to the eligible tenant member, an immutable rationale comment, and a 261-byte text attachment whose object reference and activity record rendered after upload. A local escalation with an explicit 240-minute service-level target rendered as retained queue posture and appended an immutable activity entry, while the UI explicitly confirmed that no automated dispatch occurred.

## Pilot boundary

This release intentionally does **not** create a persistent worker or in-process timer. It does not automatically notify, dispatch, escalate, execute, close, delete, or retain evidence. Any future automatic service-level reminder or escalation must select recipients, delivery channels, retry behavior, ownership, deployment, and scheduled-work operating requirements explicitly.
