# Decision Control Plane Production Observability Dashboard

## 1. Purpose

The dashboard is an operational control surface, not a decorative analytics page. It answers five questions continuously:

1. **Can this tenant safely issue a decision now?**
2. **Is replication inside the tenant’s RPO budget?**
3. **Are stale writers being fenced, or is a region still accepting unsafe writes?**
4. **Is the Policy Interpreter meeting its latency budget?**
5. **Can every decision and action still be reconstructed?**

Every panel must be filterable by `tenant_id`, `region`, `peer_region`, `environment`, `policy_version`, `state_manifest_epoch`, and `ownership_epoch`. Never put raw transaction identifiers or sensitive payloads into metric labels.

## 2. Telemetry architecture

The client SDK, Domain Adapter, Policy Interpreter, RPO Admission Gate, Decision Kernel, journal, action rail, replay service, and operations plane emit metrics, traces, and structured logs. Metrics provide aggregate health; traces reconstruct one request; immutable events provide authoritative history.

Use a consistent trace path:

```text
source request → adapter canonicalize → evidence/state lookup → policy evaluate
→ RPO admission → decision append → action submit → action acknowledge
→ audit/XAI package
```

The trace must carry `tenant_id`, `request_id`, `decision_id`, `idempotency_key_hash`, `ownership_epoch`, `policy_version`, `state_manifest_id`, and `region`. Sensitive values remain in the evidence boundary, not in telemetry.

## 3. Core metric taxonomy

### Replication and RPO

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `dcp_replication_lag_seconds` | Gauge | tenant, region, peer | Current logical lag between local and peer event watermark |
| `dcp_replication_lag_events` | Gauge | tenant, region, peer | Event-count gap |
| `dcp_replication_ack_age_seconds` | Gauge | tenant, region, peer | Age of last verified remote acknowledgement |
| `dcp_rpo_headroom_seconds` | Gauge | tenant, region | `required_rpo_seconds - max(lag, ack_age)` |
| `dcp_replication_queue_depth` | Gauge | tenant, region, peer | Pending outbound/inbound replication messages |
| `dcp_replication_messages_total` | Counter | tenant, region, peer, outcome | Sent, delivered, dropped, corrupt, stale, duplicate |
| `dcp_replay_recovery_events_total` | Counter | tenant, region | Events recovered after healing |

### Ownership and fencing

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `dcp_owner_epoch` | Gauge | tenant, region | Current ownership epoch visible to the process |
| `dcp_owner_region` | Info/Gauge | tenant, region | Region believed to be the current owner |
| `dcp_lease_age_seconds` | Gauge | tenant, region | Age of current lease |
| `dcp_fencing_rejections_total` | Counter | tenant, region, reason | Writes rejected due to stale region, epoch, lease, or fence |
| `dcp_stale_epoch_requests_total` | Counter | tenant, region | Requests presenting an older ownership epoch |
| `dcp_split_brain_accepts_total` | Counter | tenant | Must remain zero |

### Policy and admission

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `dcp_policy_evaluation_latency_seconds` | Histogram | tenant, region, policy_version | Policy Interpreter latency |
| `dcp_admission_latency_seconds` | Histogram | tenant, region, outcome | Full RPO admission latency |
| `dcp_admission_decisions_total` | Counter | tenant, region, disposition, reason | Allow, hold, reject, retry, fence outcomes |
| `dcp_rpo_holds_total` | Counter | tenant, region, reason | Decisions held because freshness or durability is insufficient |
| `dcp_trace_durability_failures_total` | Counter | tenant, region | Compact trace could not be durably recorded |
| `dcp_policy_manifest_mismatches_total` | Counter | tenant, region, kind | Policy or state epoch mismatch |

### Actions, audit, and replay

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `dcp_action_commands_total` | Counter | tenant, action, outcome | Commands issued, deferred, rejected, or reconciled |
| `dcp_action_duplicate_suppression_total` | Counter | tenant, action | Duplicate logical action attempts suppressed |
| `dcp_action_ack_latency_seconds` | Histogram | tenant, action, outcome | Time to downstream acknowledgement |
| `dcp_action_outcome_unknown_total` | Counter | tenant, action | Ambiguous action outcomes |
| `dcp_audit_append_latency_seconds` | Histogram | tenant, region | Durable audit append latency |
| `dcp_audit_chain_verification_failures_total` | Counter | tenant, region | Hash-chain verification failure |
| `dcp_replay_divergence_total` | Counter | tenant, policy_version, kind | Replay result differs from issued result |
| `dcp_xai_report_findings_total` | Counter | tenant, severity | Compliance/XAI findings by severity |

## 4. Dashboard layout

### Row 1 — Executive health strip

Display one tile per tenant or selected scope:

- **Decision safety:** green only when no split-brain accepts, no duplicate actions, current owner is valid, and no critical alert is active.
- **RPO headroom:** current minimum headroom in seconds.
- **Admission p99:** p99 full admission latency versus tenant SLO.
- **Fencing rate:** stale-write rejections per second.
- **Audit freshness:** age of newest durable audit event.
- **Action unknowns:** current unresolved action outcomes.

### Row 2 — Replication and ownership

Use a time-series panel for lag seconds and RPO budget, a table for owner region and epoch, and a heatmap for tenant-by-region lag. The plot must show the RPO threshold as a horizontal line. A lag value above the line is red even if the process remains available.

### Row 3 — Admission latency

Use p50, p95, p99, and p99.9 histograms split into Policy Interpreter time, evidence/state lookup, RPO gate, decision append, and total request time. Show outcome proportions next to latency so an apparent latency improvement cannot be achieved by silently holding traffic.

### Row 4 — Fencing and degraded outcomes

Show fencing rejections by reason, RPO holds over time, stale epoch request rate, manifest mismatch rate, and split-brain accepts. Split-brain accepts must have a dedicated single-stat panel whose non-zero state is always critical.

### Row 5 — Actions and audit

Show action command rate, acknowledgement p99, unknown outcomes, duplicate suppression, audit append p99, audit backlog, chain verification failures, and replay divergence.

### Row 6 — Drill-down links

Provide links to the tenant decision timeline, policy version, state manifest, ownership history, action reconciliation queue, XAI report, incident timeline, and replay comparison. Links must preserve tenant scope and must not grant broader access than the operator already has.

## 5. Alert policy

| Alert | Severity | Condition | Immediate action |
|---|---|---|---|
| `DCPSplitBrainAccept` | Critical | `dcp_split_brain_accepts_total > 0` | Freeze affected tenant, fence both suspect writers, declare incident |
| `DCPDuplicateAction` | Critical | `dcp_action_duplicate_suppression_total` or duplicate action audit > 0 | Stop action rail for tenant, reconcile commands |
| `DCPRPOBreached` | Critical/High | `dcp_rpo_headroom_seconds < 0` for 3 consecutive intervals | Hold allow-like actions; evaluate failover |
| `DCPStaleWriterRejected` | Info/High | Rejection rate rises above baseline during planned failover | Verify fencing; escalate if region remains in service |
| `DCPAdmissionLatencyHigh` | High | p99 > tenant SLO for 5 minutes | Identify stage; shed load or reduce cohort |
| `DCPAuditCommitSlow` | High | audit p99 or age exceeds budget | Hold allow-like actions if trace cannot be durable |
| `DCPManifestSkew` | High | policy/state epoch mismatch | Stop activation; pin known-good manifest |
| `DCPActionUnknown` | High | unresolved outcome age exceeds threshold | Query status; do not issue compensating command blindly |
| `DCPReplayDivergence` | High | any unexplained material divergence | Stop rollout; begin replay investigation |
| `DCPKeyAccessFailure` | Critical | KMS/HSM access failure on required tenant key | Enter explicit degraded mode; page security owner |

## 6. SLO formulas

### RPO headroom

```text
rpo_headroom_seconds = required_rpo_seconds - max(replication_lag_seconds, ack_age_seconds)
```

A negative value means the tenant’s freshness budget is exceeded. Do not average lag across tenants.

### Admission latency

```text
admission_latency = response_timestamp - adapter_accept_timestamp
```

Report p99 and p99.9 by tenant and disposition. A low average is not sufficient for a transaction hot path.

### Safety rate

```text
unsafe_accept_rate = (split_brain_accepts + duplicate_actions) / accepted_decisions
```

The target is exactly zero, not merely below a percentage threshold.

### Audit completeness

```text
audit_completeness = material_decisions_with_durable_trace / material_decisions
```

The target for the pilot is 100%.

## 7. Operator workflows

### When RPO headroom turns negative

Confirm the tenant, region, peer, state manifest, and action class. Verify that allow-like decisions are being held or rejected. Check replication queue and remote acknowledgement. If the condition persists, begin failover assessment; do not disable the gate to recover throughput.

### When fencing rejections spike

Determine whether the spike is planned failover or an unexpected stale writer. Compare owner epoch across regions, verify lease/quorum health, and search for any accepted writes from the stale region. A non-zero accepted-write result escalates immediately to a critical incident.

### When admission p99 rises

Decompose the latency into policy, evidence/state, RPO gate, decision append, and action acknowledgement. Protect the admission budget by reducing concurrency, applying backpressure, or moving the tenant to explicit hold/retry mode. Do not hide latency by bypassing the durable trace or policy-version checks.

## 8. Dashboard acceptance criteria

The dashboard is production-ready when:

- one operator can identify the current owner and epoch for every pilot tenant;
- RPO headroom and admission p99 are visible in under one minute;
- every alert links to a tenant-scoped trace and evidence package;
- planned failover and unexpected stale-writer activity are distinguishable;
- action duplicate suppression and unknown outcomes are visible;
- raw sensitive transaction fields do not appear in labels or logs;
- alert thresholds are tested in the partition and Byzantine harnesses;
- dashboard access is tenant-scoped and audited.

## 9. RoR for observability

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| RPO headroom and ownership dashboard | 5 | 5 | 5 | Medium / 4 | Medium / 4 | **4.75** | Now |
| Admission latency decomposition | 5 | 5 | 5 | Medium / 4 | Medium / 4 | **4.75** | Now |
| Fencing and stale-writer alerts | 5 | 5 | 5 | Medium / 4 | Medium / 4 | **4.75** | Now |
| Action/audit reconciliation panels | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Cross-domain dashboard templates | 4 | 5 | 5 | High / 3 | Medium / 4 | **4.25** | After first pilot |
| Automated anomaly detection | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | Later |
