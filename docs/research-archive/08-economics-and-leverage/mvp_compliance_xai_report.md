# Decision Explanation and Compliance Audit: dec-aml-991

**Generated:** 2026-08-24T03:00:36Z  
**Tenant:** tenant-a  
**Disposition:** `hold_for_review`  
**Audit status:** `pass`

> This report explains the recorded decision path and checks the supplied control evidence. It is not a legal or regulatory determination.

## Plain-language summary

High-confidence candidate match requires sanctions review.

## Why this disposition was selected

| Rule | Category | Rationale |
|---|---|---|
| `SAN-014` | hard_constraint | High-confidence candidate match requires sanctions review. |

### Facts and evidence

- **Facts used:** fact-watchlist-1, fact-country-1
- **Evidence references:** ev-kyc-1, ev-watchlist-1, fact-watchlist-1
- **Counterevidence:** fact-country-1
- **Unknown predicates:** None recorded
- **Conflicted predicates:** None recorded

## Version context

```json
{
  "evidence_snapshot_id": "snapshot-2026-08-24-17",
  "model_versions": {
    "graph": "graph-2.2.0",
    "matcher": "matcher-4.1.0"
  },
  "policy_bundle_id": "aml-policy-42",
  "policy_version": "42.3",
  "replay_manifest_id": "replay-991",
  "state_manifest_id": "screening-state-17"
}
```

## Compliance findings

| Severity | Code | Finding | Remediation |
|---|---|---|---|

## Event timeline

| Processing time | Event | Actor | Event ID |
|---|---|---|---|
| 2026-08-24T01:02:03Z | `TransactionProposed` | n/a | `evt-1` |
| 2026-08-24T01:02:03.020Z | `DecisionIssued` | n/a | `evt-2` |
| 2026-08-24T01:02:03.030Z | `ActionRequested` | n/a | `evt-3` |
| 2026-08-24T01:02:03.050Z | `ActionAcknowledged` | n/a | `evt-4` |

## Limitations

- This report describes the recorded decision path; it is not a legal or regulatory determination.
- Absence of an evidence reference means the generator could not verify provenance from the supplied package.
- A model or matcher result is shown as a fact with provenance, not as an automatic legal conclusion.
