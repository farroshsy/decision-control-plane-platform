# Decision Control Plane ↔ Domain Adapter API Specification

## 1. Scope and protocol strategy

This specification defines the boundary between the Decision Control Plane and external Domain Adapters. A Domain Adapter translates domain-specific source events into canonical transactions, parties, relationships, facts, evidence references, actions, and lifecycle events. It does not own the Decision Kernel, final policy semantics, audit ledger, or tenant authorization policy.

The API supports two transport profiles:

| Profile | Use | Contract |
|---|---|---|
| REST/JSON | Integration, debugging, partner onboarding, lower-volume synchronous calls | OpenAPI-style HTTP contract |
| gRPC/Protobuf | High-throughput, low-latency service-to-service calls and streaming | `decision_control_plane_domain_adapter.proto` |

The semantic contract is shared. A REST adapter and a gRPC adapter must produce the same canonical output for the same input, adapter version, tenant context, state manifest, and evaluation time.

## 2. Security and request headers

All calls use mTLS or equivalent workload authentication and a signed tenant context. The caller must not select tenant scope solely through a path parameter or request body.

| Header | Required | Meaning |
|---|---|---|
| `Authorization` | Yes | Short-lived workload or delegated user token |
| `X-Tenant-Context` | Yes | Signed, base64url-encoded tenant authorization context |
| `X-Request-Id` | Yes | Unique transport request ID |
| `X-Correlation-Id` | Yes | End-to-end decision/process correlation |
| `X-Causation-Id` | Conditional | ID of the event that caused this call |
| `Idempotency-Key` | Yes for mutations | Stable logical operation key; duplicate calls return the original result |
| `X-Request-Deadline` | Yes on hot path | RFC 3339 deadline; server must reject or degrade before expiry |
| `traceparent` | Recommended | W3C trace context |
| `Content-Type` | Yes | `application/json` for REST |
| `X-Adapter-Id` | Yes | Registered adapter identity |
| `X-Adapter-Version` | Yes | Immutable adapter build/version |
| `X-Schema-Version` | Yes | Major version of request/response schema |

The server must bind `tenant_id`, `data_controller_id`, `legal_entity_id`, `residency_zone`, `purpose`, classification ceiling, allowed actions, and expiry from the verified context. It must reject mismatched body, path, token, and context values.

## 3. REST endpoints

### 3.1 Canonicalize a transaction

```http
POST /v1/domain-adapters/{adapterId}/canonicalize
```

Purpose: transform a source-domain transaction into a deterministic `CanonicalTransaction`.

Request body:

```json
{
  "schema_version": "1.0",
  "adapter_version": "aml-adapter-1.2.0",
  "metadata": {
    "request_id": "req-01J9A",
    "correlation_id": "corr-01J9A",
    "causation_id": "evt-01J9A",
    "idempotency_key": "txn-991:canonicalize:v1",
    "event_time": "2026-08-24T01:02:03Z",
    "processing_time": "2026-08-24T01:02:03.012Z",
    "deadline": "2026-08-24T01:02:03.100Z"
  },
  "transaction": {
    "transaction_id": "txn-991",
    "transaction_type": "cross_border_payment",
    "product": "commercial_payments",
    "channel": "api",
    "instrument": "wire",
    "settlement_method": "gross",
    "originator_party_id": "party-a",
    "beneficiary_party_id": "party-b",
    "originator_account_id": "acct-a",
    "beneficiary_account_id": "acct-b",
    "amount": {"value": "125000.00", "currency": "USD"},
    "jurisdictions": ["SG", "ID"],
    "requested_execution_time": "2026-08-24T01:02:03Z",
    "raw_domain_payload": {"source_field": "source-value"}
  }
}
```

Response `200 OK`:

```json
{
  "schema_version": "1.0",
  "canonical_transaction": {
    "canonical_schema_version": "1.0",
    "transaction_id": "txn-991",
    "transaction_type": "cross_border_payment",
    "product": "commercial_payments",
    "channel": "api",
    "instrument": "wire",
    "settlement_method": "gross",
    "amount": {"value": "125000.00", "currency": "USD"},
    "jurisdictions": ["ID", "SG"],
    "requested_execution_time": "2026-08-24T01:02:03Z",
    "parties": [
      {"party_id": "party-a", "role": "originator", "source_record_id": "cust-a"},
      {"party_id": "party-b", "role": "beneficiary", "source_record_id": "cust-b"}
    ],
    "relationships": [],
    "canonical_attributes": {"originator_account_id": "acct-a", "beneficiary_account_id": "acct-b"},
    "transformations": [
      {"transformation_id": "tr-1", "source_field": "amount.value", "target_field": "amount.value", "operation": "decimal_normalization"}
    ],
    "evidence_references": []
  },
  "warnings": [],
  "errors": [],
  "complete": true,
  "canonicalization_hash": "sha256:...",
  "processing_duration_ms": 4
}
```

### 3.2 Build a decision context

```http
POST /v1/domain-adapters/{adapterId}/decision-context
```

This endpoint builds the bounded subject–relationship–exposure context for a decision. The caller supplies the canonical transaction and a state-manifest reference. The adapter must return the manifest actually used, not only the requested manifest.

The request must include `max_relationship_depth`, `max_fact_count`, and a deadline. The server must return `complete=false` with typed warnings if the bound prevents full expansion; it must not silently imply completeness.

### 3.3 Generate candidate facts

```http
POST /v1/domain-adapters/{adapterId}/candidate-facts
```

This endpoint returns bounded candidate matches and typed facts. Candidate facts are not legal conclusions. Each candidate carries matcher version, similarity, matched fields, unresolved fields, status, and evidence references.

Request:

```json
{
  "canonical_transaction": {"...": "..."},
  "state_manifest": {"manifest_id": "screening-state-17", "manifest_hash": "sha256:..."},
  "candidate_types": ["watchlist_candidate_match", "adverse_media_candidate"],
  "max_candidates": 50,
  "budget_ms": 20
}
```

Response fields:

```json
{
  "candidates": [
    {
      "candidate_id": "cand-1",
      "subject_party_id": "party-a",
      "list_id": "list-91",
      "list_entry_id": "entry-7",
      "similarity": 0.96,
      "status": "candidate",
      "matched_fields": ["name", "country"],
      "unresolved_fields": ["date_of_birth"],
      "matcher_version": "matcher-4.1.0",
      "evidence": [{"evidence_ref_id": "ev-1", "source_system": "watchlist-index"}]
    }
  ],
  "facts": [
    {
      "fact_id": "fact-1",
      "fact_type": "watchlist_candidate_match",
      "value": {"similarity": 0.96, "candidate_id": "cand-1"},
      "assertion_status": "candidate",
      "evidence_ref_ids": ["ev-1"],
      "classification": "restricted_financial_crime"
    }
  ],
  "complete": true,
  "truncated": false,
  "candidate_set_hash": "sha256:..."
}
```

### 3.4 Map a decision to domain actions

```http
POST /v1/domain-adapters/{adapterId}/action-mapping
```

The adapter maps a canonical disposition to domain-specific action requests without executing them. The action executor remains a separate control boundary.

The mapping must be deterministic for the adapter version and must preserve the decision ID and idempotency key. A mapping such as `hold_for_review` may produce a payment-hold action and a case-creation obligation; it must not create hidden side effects.

### 3.5 Handle a lifecycle event

```http
POST /v1/domain-adapters/{adapterId}/lifecycle-events
```

Used for late watchlist activation, ownership changes, analyst findings, action outcomes, return events, report deadlines, and other triggers. The response may request reassessment, create new facts, or propose compensating actions. It must never mutate the original decision.

### 3.6 Health and readiness

```http
GET /v1/domain-adapters/{adapterId}/health
GET /v1/domain-adapters/{adapterId}/readiness
```

Health is liveness. Readiness is tenant- and purpose-scoped ability to serve a declared operation under a declared deadline. A globally healthy adapter may still be not-ready for a tenant or residency zone.

## 4. Error contract

All non-success responses use a stable envelope:

```json
{
  "error": {
    "code": "TENANT_SCOPE_MISMATCH",
    "message": "trusted tenant context does not match requested resource",
    "retryable": false,
    "dependency": "authorization",
    "request_id": "req-01J9A",
    "correlation_id": "corr-01J9A",
    "degraded_mode": "reject",
    "details": {"resource_scope": "tenant-a"}
  }
}
```

| HTTP | gRPC status | Meaning | Retry |
|---:|---|---|---|
| 400 | `INVALID_ARGUMENT` | Malformed or semantically invalid request | No |
| 401 | `UNAUTHENTICATED` | Missing/invalid credential or context signature | No until credential fixed |
| 403 | `PERMISSION_DENIED` | Authenticated principal lacks tenant/purpose/resource access | No |
| 404 | `NOT_FOUND` | Unknown adapter, manifest, or resource | No unless eventual consistency documented |
| 409 | `ALREADY_EXISTS` / `ABORTED` | Idempotency or version conflict | Reconcile; do not blindly retry |
| 412 | `FAILED_PRECONDITION` | Stale manifest, invalid effective date, or unmet contract | Refresh and retry only if policy permits |
| 422 | `INVALID_ARGUMENT` | Valid JSON but domain semantics invalid | No |
| 429 | `RESOURCE_EXHAUSTED` | Tenant or adapter quota exceeded | Retry with backoff and deadline |
| 500 | `INTERNAL` | Unexpected adapter/runtime failure | Retry only if operation is idempotent |
| 502 | `UNAVAILABLE` | Downstream dependency unavailable | Bounded retry or declared degraded mode |
| 504 | `DEADLINE_EXCEEDED` | Deadline expired | Do not retry past decision deadline |

## 5. Idempotency and ordering

The idempotency key is scoped to `(tenant_id, adapter_id, operation, logical_resource)`. A duplicate request with the same key and identical request hash returns the original response. A duplicate key with a different request hash returns `409` and does not execute.

Every lifecycle event carries event ID, aggregate ID, sequence, event time, processing time, correlation ID, and causation ID. The adapter must tolerate at-least-once delivery. Out-of-order events are either buffered within a declared window or returned as an explicit sequence-gap condition.

## 6. Deadline and hot-path rules

The client supplies a deadline. The adapter must compute a remaining budget and pass it to dependencies. It must not begin an operation whose minimum safe completion time exceeds the remaining budget.

The hot path must use pre-materialized tenant-scoped state, bounded candidate generation, bounded graph expansion, and compiled transformation logic. Rich document retrieval, open-ended graph traversal, LLM calls, and analyst explanation generation belong on the asynchronous path unless the tenant policy explicitly permits otherwise.

## 7. Compatibility and evolution

Major schema changes require a new endpoint or negotiated major version. Minor additions must be backward-compatible and must not change the meaning of an existing field. The adapter reports its source schema, canonical schema, build hash, policy-pack compatibility, unmapped source fields, and conformance-suite version.

Every adapter release must pass:

- schema and serialization tests;
- deterministic canonicalization tests;
- tenant-scope negative tests;
- duplicate and out-of-order event tests;
- deadline and dependency-failure tests;
- replay and hash-stability tests;
- candidate-fact evidence tests;
- action-mapping purity tests;
- load and tail-latency benchmarks;
- data-classification and redaction tests.

## 8. RoR for the API workstream

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Shared semantic contract across REST/gRPC | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Tenant context and authorization binding | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Canonicalization and evidence references | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Candidate-fact bounded interface | 4 | 5 | 4 | High / 3 | High / 3 | **4.10** | Now for AML |
| Streaming optimization | 3 | 4 | 3 | Very high / 2 | High / 2 | **3.00** | After unary path proves |
| Broad partner connector SDK | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |
