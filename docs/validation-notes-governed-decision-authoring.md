# Governed Decision Authoring Foundation — Validation Notes

## Browser observation before reminder resolution

On the tenant-scoped Control Room for **Pilot Transaction Rail**, the personal inbox rendered one existing, due-soon in-app SLA attention record for `dec_pilot_001`, with an **Acknowledge** control. The platform-operator workload panel showed the same tenant member with one open, one due-soon, zero overdue, zero acknowledged, and zero dismissed records. The rendered text explicitly states that lifecycle actions retain in-app evidence only and do not deliver a notification or change case ownership.

This observation used the existing approved pilot fixture and did not create or alter a record.

## Approved lifecycle mutation validation

With explicit user approval, the existing `dec_pilot_001` attention record was acknowledged through the personal inbox. The dashboard immediately showed zero pending records, exposed the acknowledged record’s required dismissal-rationale field, and changed the tenant-admin workload to zero open and one acknowledged.

The acknowledged record was then dismissed using the retained validation rationale: `VALIDATION ONLY — acknowledged SLA attention has been reviewed; retain closure evidence.` The dashboard rendered the success confirmation for both transitions. The final tenant-admin workload showed zero open, zero due soon, zero overdue, zero acknowledged, and **one dismissed** record. No scheduler, email, webhook, third-party request, ownership change, or escalation was activated.

## Read-only persistence verification

The retained reminder row remains in tenant `ten_KRp-xjuXwQe1KW` with status `dismissed`, acknowledgement and dismissal timestamps, actor user ID `1` for both transitions, and the retained dismissal rationale. The same case has two immutable activity rows: `sla_reminder_acknowledged` with prior state `open` and next state `acknowledged`, followed by `sla_reminder_dismissed` with prior state `acknowledged`, next state `dismissed`, actor/evidence binding, and the same retained rationale.

## Regression verification

The final release run passed **42 assertions across 12 Vitest files**, `pnpm check`, and `pnpm build`. The production build retains the existing non-blocking Vite client chunk-size advisory.
