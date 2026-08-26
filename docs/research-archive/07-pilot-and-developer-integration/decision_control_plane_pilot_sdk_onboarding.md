# Decision Control Plane Pilot SDK and Developer Onboarding

## 1. Purpose

The first pilot should integrate through a thin, typed client SDK rather than direct calls from every application. The SDK becomes the customer-side safety boundary for tenant context, deadlines, idempotency, trace propagation, schema versions, retries, and explicit degraded outcomes.

The SDK must be boring at the transaction edge. It should not hide a retry, silently change an outcome, or decide whether a transaction is safe. It should validate the request, call the Decision Control Plane, expose the canonical result, and make every side effect explicit.

## 2. Recommended integration pattern

### Pattern A — Synchronous decision request

Use for transaction authorization paths where the originating system requires an immediate disposition.

```python
from decision_control_plane import DcpClient, ScreeningRequest

client = DcpClient(
    endpoint="https://dcp-pilot.example.com",
    tenant_id="tenant-a",
    service_name="payments-authorizer",
    timeout_ms=120,
)

result = client.screen(
    ScreeningRequest(
        transaction_id="txn-123",
        idempotency_key="payment:txn-123:v1",
        schema_version="fincrime.transaction.v1",
        transaction={
            "amount": "1250.00",
            "currency": "USD",
            "originator_party_id": "party-1",
            "beneficiary_party_id": "party-2",
        },
    )
)

if result.disposition == "allow" and result.action_permitted:
    payment_rail.execute(result.action_command)
elif result.disposition in {"hold", "review", "retry_later"}:
    payment_rail.defer(result.decision_id, reason=result.reason_code)
else:
    payment_rail.reject(result.decision_id, reason=result.reason_code)
```

The SDK returns a typed object containing decision ID, disposition, reason code, policy/state epochs, ownership epoch, trace ID, action command, and retry guidance. The caller remains responsible for deciding how its payment rail handles hold, reject, or retry.

### Pattern B — Asynchronous decision callback

Use when transaction origination cannot wait for screening or when the customer wants to decouple ingestion from adjudication. The adapter submits an event with an idempotency key, receives an accepted sequence, and consumes a signed decision callback or event-stream message.

The customer callback endpoint must verify message signature, tenant ID, decision ID, event sequence, policy version, and trace ID before applying a release, hold, or block. Callback handling must be idempotent and must reject stale ownership epochs.

### Pattern C — Shadow comparison

Use before any action authority changes. The SDK sends the same canonical request to the incumbent and the Decision Control Plane, but the DCP response is marked `shadow_only=true` and cannot issue an action command. The customer records both outputs and compares disposition, reasons, policy versions, evidence references, unknowns, latency, and action intent.

### Pattern D — Action-rail dry run

Use after shadow parity is understood. The DCP produces an action command against a customer test or non-executing endpoint. The action rail returns acknowledgement and reconciliation status. Duplicate retries, timeouts, stale commands, and out-of-order acknowledgements are intentionally injected.

### Pattern E — Batch replay and policy simulation

Use for historical validation, policy change review, and migration analysis. The SDK or replay utility submits a bounded corpus with pinned policy, state, evidence, and model epochs. Results are written to an isolated replay namespace and cannot affect production action rails.

## 3. Client-side request contract

Every request must contain:

| Field | Requirement | Reason |
|---|---|---|
| `tenant_id` | Required and immutable for the request | Prevent scope ambiguity |
| `transaction_id` | Stable source identifier | Correlate decisions and outcomes |
| `idempotency_key` | Stable across retries | Prevent duplicate logical decisions/actions |
| `schema_version` | Explicit | Prevent silent reinterpretation |
| `source_timestamp` | RFC 3339 with source clock metadata | Support freshness and replay |
| `deadline` | Absolute timestamp or bounded timeout | Preserve hot-path budget |
| `traceparent` | Propagated where available | Correlate ingress, policy, audit, and action spans |
| `purpose` | Enumerated | Enforce allowed processing purpose |
| `data_classification` | Enumerated | Route to approved storage and processing boundary |
| `transaction` | Canonicalizable payload | Domain Adapter input |

The SDK must reject missing tenant context, empty idempotency keys, unsupported schema versions, expired deadlines, invalid amounts/currencies, and payloads that exceed the pilot limit before making a network call.

## 4. Client-side response contract

The SDK should expose a strongly typed result:

```python
@dataclass(frozen=True)
class ScreeningResult:
    decision_id: str
    disposition: str                 # allow, hold, reject, review, retry_later
    action_permitted: bool
    reason_code: str
    policy_version: str
    state_manifest_id: str
    ownership_epoch: int
    trace_id: str
    trace_hash: str
    action_command: Optional[ActionCommand]
    retry_after_ms: Optional[int]
    degraded: bool
    evidence_summary: EvidenceSummary
```

`action_permitted` is authoritative for the action rail. The caller must not infer permission from a human-readable message or from disposition alone.

## 5. Retry and failure semantics

The SDK implements only safe transport retries. It retries a request when the server has not acknowledged acceptance and the deadline remains valid. It does not blindly retry after an ambiguous action response; it queries the idempotency status endpoint first.

| Failure | SDK behavior | Caller behavior |
|---|---|---|
| Connect timeout before request sent | Safe retry within deadline | Continue retry budget or hold |
| HTTP/gRPC unavailable before acceptance | Retry with same idempotency key | Do not create a new transaction ID |
| Accepted but response lost | Query decision by idempotency key | Apply returned original result |
| `STALE_EPOCH` / `FENCE_REQUIRED` | No automatic retry to same owner | Route through approved recovery path |
| `RPO_BREACH_ALLOW_BLOCKED` | Return hold/review typed result | Do not silently allow |
| Policy/state mismatch | Return hold or reject | Alert policy operations |
| Action acknowledgement timeout | Query action status | Reconcile before compensating action |
| Invalid request | Do not retry | Fix caller payload |

## 6. SDK configuration profiles

### Shadow profile

Action execution is disabled. The SDK records incumbent comparison metadata, DCP decision, latency, and trace ID. It must not expose a method that can accidentally execute a shadow action.

### Canary profile

The SDK is authoritative only for an explicit cohort predicate. It requires a signed tenant and cohort manifest. Every result carries the cohort and ownership epoch.

### Production profile

The SDK enables action commands only when the DCP returns `action_permitted=true`, the caller verifies the tenant and idempotency key, and the action rail accepts the same logical action ID.

### Replay profile

The SDK routes to an isolated replay endpoint, requires a replay ID, and rejects any attempt to use a production action endpoint.

## 7. Developer onboarding workflow

### Stage 0 — Access and scope

The customer names the application owner, platform engineer, compliance owner, security reviewer, and action-rail owner. The team records the tenant, transaction rail, region, residency, action boundary, policy bundle, and pilot cohort.

**Exit:** signed pilot charter and approved service identities.

### Stage 1 — Install and compile

The customer installs the SDK, registers the schema package, configures endpoint and certificates, and enables strict type checking. CI must fail on unsupported schema versions or missing required fields.

**Exit:** a local request serializes and validates without network access.

### Stage 2 — Connect to sandbox

The developer configures a sandbox tenant and sends known fixtures: allow, hold, reject, unknown evidence, conflict, duplicate retry, expired deadline, and malformed request.

**Exit:** all fixture outcomes match expected reason codes and no action endpoint is contacted.

### Stage 3 — Integrate telemetry

The developer connects request, decision, action, and audit IDs to the customer’s telemetry. The SDK exports latency histograms, error counters, retry counters, decision dispositions, degraded outcomes, and tenant-scoped trace context.

**Exit:** one transaction can be followed from source request to decision to action outcome.

### Stage 4 — Adapter conformance

The developer runs the adapter conformance suite: canonicalization, tenant propagation, provenance, idempotency, ordering, evidence references, version binding, deadline handling, and negative isolation tests.

**Exit:** all required conformance tests pass and the adapter is certified for shadow mode.

### Stage 5 — Historical replay

The customer imports a redacted and approved replay corpus. The team compares DCP output with incumbent output and classifies all differences.

**Exit:** no unexplained critical divergence and deterministic replay equivalence above the pilot threshold.

### Stage 6 — Shadow production

The SDK sends live requests in shadow-only mode. The customer monitors traffic coverage, data quality, p99/p99.9 latency, decision divergence, evidence completeness, RPO behavior, and policy/state skew.

**Exit:** compliance, platform, security, and operations sign off.

### Stage 7 — Action dry run

The customer points action commands to a dry-run endpoint. Duplicate retries, timeouts, and stale commands are injected. The customer verifies one logical command produces one logical action.

**Exit:** zero duplicate actions and complete reconciliation.

### Stage 8 — Canary authority

The customer enables DCP authority for a bounded cohort. The SDK enforces tenant and cohort manifests, while the incumbent remains available through the approved rollback path.

**Exit:** canary meets latency, correctness, isolation, RPO, audit, and RTO gates.

### Stage 9 — Production handoff

The customer receives runbooks, dashboards, report templates, escalation contacts, key-rotation procedures, and the signed pilot evidence package.

**Exit:** an operator who did not author the integration can run the service and execute rollback.

## 8. SDK acceptance suite

| Test family | Required assertions |
|---|---|
| Serialization | Canonical payload matches schema and version |
| Context | Tenant, purpose, classification, and residency cannot be dropped |
| Idempotency | Same key returns the original decision and action status |
| Deadline | Requests do not outlive caller budget |
| Retry | Only safe transport retries occur automatically |
| Fencing | Stale epoch is surfaced and never retried blindly |
| RPO | Allow-like action is not inferred when admission is held |
| Replay | Pinned inputs produce stable decision and trace hashes |
| Telemetry | IDs, latency, and outcomes are emitted without sensitive payload leakage |
| Isolation | Cross-tenant fixtures fail at client and server boundaries |
| Action rail | Timeout and duplicate command paths reconcile safely |

## 9. Versioning and release workflow

The SDK follows semantic versioning for client behavior and explicit schema versions for canonical payloads. A release requires:

1. schema compatibility tests;
2. replay corpus comparison;
3. adapter conformance;
4. tenant-isolation tests;
5. failure and timeout tests;
6. performance budget comparison;
7. security review for credential, logging, and certificate changes;
8. signed release notes and rollback version.

A breaking change to canonical meaning requires a new schema version and a migration plan. A transport or implementation change should not require a kernel semantic fork.

## 10. Developer quickstart

The shortest safe path is:

1. Install the SDK and schema package.
2. Configure a sandbox tenant and mTLS credentials.
3. Send the seven canonical fixtures.
4. Verify typed outcomes and no action side effects.
5. Connect trace and metrics exporters.
6. Run adapter conformance and replay.
7. Obtain shadow-mode approval.
8. Enable action dry run.
9. Execute the canary cutover checklist.

## 11. RoR for onboarding workstreams

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Typed SDK request/response contract | 5 | 5 | 5 | Medium / 4 | Medium / 4 | **4.75** | Now |
| Idempotent retry/status pattern | 5 | 5 | 5 | Medium / 4 | Medium / 4 | **4.75** | Now |
| Adapter conformance suite | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Shadow and replay profile | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Client-side telemetry conventions | 4 | 5 | 5 | Medium / 4 | Medium / 4 | **4.50** | Now |
| Broad language SDK portfolio | 3 | 4 | 4 | High / 3 | High / 2 | **3.35** | After first pilot |
| Auto-generated domain mappings | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | Later |

## 12. Pilot onboarding completion definition

The pilot is developer-ready when a new engineer can install the SDK, send a valid sandbox decision within one working session, understand every typed outcome, run the conformance suite, trace one transaction end to end, and execute a safe retry without creating a duplicate action. That is a better onboarding metric than documentation page count.
