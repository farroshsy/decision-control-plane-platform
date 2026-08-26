# Personal Reminder Inbox and Shared-Queue Clarity

## Purpose

This bounded enhancement makes existing pilot collaboration signals easier to find without broadening scheduling, notification, or cross-tenant capabilities. It introduces a compact personal reminder filter on the Control Room, makes governed comment redaction visible in queue-facing case rows, and verifies shared-queue policy against an explicitly modelled second tenant member.

## Delivered behavior

| Capability | Delivered behavior | Boundary retained |
| --- | --- | --- |
| Personal SLA inbox | The Control Room lists only open in-app SLA records whose `recipientUserId` matches the signed-in member. It supports **All pending**, **Due soon**, and **Overdue** filters and links back to the retained case. | No email, SMS, webhook, delivery guarantee, acknowledgement workflow, or scheduler activation is added. |
| Queue redaction badge | A visible amber badge reports the number of redacted comments on each case row, but only when those comments are already visible to the current tenant role. | The badge reveals neither original body text nor redacted-comment existence outside the caller's permitted visibility scope. |
| Role matrix | A second member in the same tenant is denied a platform/compliance queue when holding `customer_operator`; a platform operator is allowed; a compliance member in a different tenant is denied. | Queue access remains both tenant-bound and role-bound. |

## Browser observation

The tenant-scoped Control Room rendered **one** personal due-soon in-app record for `dec_pilot_001`. Changing the filter from **All pending** to **Due soon** retained that record and did not create or mutate data. The investigation queue rendered the explicit **“1 redacted comment”** amber badge on the same case row. These views reuse the approved pilot reminder and redaction fixtures; no new scheduler, external delivery, or third-party action was created.

If the personal reminder query fails, the dashboard now renders **“Reminder inbox unavailable”** plus an explicit retry-by-refresh message instead of presenting an empty result as zero pending records. The final release verification passed **40 assertions across 12 Vitest files**, `pnpm check`, and `pnpm build`; the existing Vite chunk-size advisory remains non-blocking.
