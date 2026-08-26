# End-to-End Integration Test Suite

## Purpose

This suite demonstrates the complete flow of a financial-crime transaction from the Domain Adapter through the Policy Interpreter and downstream audit logging. It is intentionally written against contract boundaries rather than concrete infrastructure. The executable reference harness uses in-memory fakes for the adapter, interpreter, action rail, and audit log; production deployments should replace each fake with the real implementation while preserving the assertions.

The integration boundary is:

```text
TransactionProposed
  -> Domain Adapter canonicalization
  -> Entity / relationship / candidate facts
  -> Policy Interpreter evaluation
  -> DecisionIssued
  -> ActionRequested
  -> ActionAcknowledged
  -> Immutable audit chain
```

## Test environment

| Component | Reference implementation | Production substitute |
|---|---|---|
| Transaction source | Deterministic fixture | Payment gateway, securities rail, crypto-asset or remittance rail |
| Domain Adapter | `FakeDomainAdapter` | AML adapter implementing the DomainAdapter contract |
| Policy Interpreter | `FakePolicyInterpreter` | Compiled Policy IR runtime |
| Decision Kernel | `InMemoryDecisionSystem` | Decision episode service and event router |
| Action rail | Configurable in-memory outcome | Payment or settlement action executor |
| Audit log | Hash-chained `FakeAuditLog` | Durable event log plus immutable evidence/object storage |
| Schema validator | Draft 2020-12 validator | CI, contract-test, and runtime boundary validation |

## Test data contract

Each transaction fixture contains a transaction ID, originator, beneficiary, amount, channel, jurisdiction set, transaction type, execution deadline, correlation ID, and idempotency key. The test suite varies only the facts relevant to the decision: candidate-match similarity, beneficial-owner state, policy version, and downstream action outcome.

## Test case matrix

| ID | Scenario | Primary assertion |
|---|---|---|
| E2E-001 | Candidate watchlist match | Adapter facts cause `hold_for_review`; policy trace contains `SAN-014`; audit contains all seven expected events |
| E2E-002 | Clear transaction | Same contract produces `allow` and an allow action |
| E2E-003 | Duplicate transaction | Same logical decision is returned; no duplicate audit events or action command |
| E2E-004 | Required fact unknown | Unknown beneficial-owner state follows declared fail behavior and produces a hold |
| E2E-005 | Action failure/timeout | Action state remains explicit and is not converted into an implicit allow |
| E2E-006 | Deterministic replay | Same canonical input and facts reproduce the same policy trace hash |
| E2E-007 | Audit tamper | Modification of an audited payload breaks hash-chain verification |

## End-to-end assertions

### E2E-001 — Hold path

The test submits a cross-border payment with a 0.96 candidate-match similarity. The Domain Adapter must emit a typed candidate fact with evidence references and candidate status. The Policy Interpreter must fire the mandatory-review rule and produce `hold_for_review`. The decision object must validate against the canonical schema. The audit log must contain, in order, `TransactionProposed`, `TransactionCanonicalized`, `MatchCandidatesGenerated`, `PolicyEvaluated`, `DecisionIssued`, `ActionRequested`, and `ActionAcknowledged`. The audit chain must verify successfully.

### E2E-002 — Allow path

The test submits the same transaction shape without a candidate match and with a resolved beneficial owner. The Policy Interpreter must emit `allow`, and the action mapping must produce an allow command. The event flow and audit guarantees remain identical to the hold path; only the policy conclusion and action type differ.

### E2E-003 — Idempotency

The same transaction is submitted twice with the same transaction ID and correlation context. The second submission must not create a second decision episode, action, or audit sequence. If a producer retries with a different transport event ID but the same idempotency key, the consumer should still collapse it into one logical transaction decision.

### E2E-004 — Unknown required evidence

The adapter marks beneficial-owner state as `unknown` and supplies no evidence reference. The interpreter must not coerce this to `false` or to a low-risk value. Under the configured `hold_on_required_evidence_missing` mode, the result must be `hold_for_review`, and the policy trace must list the unknown predicate.

### E2E-005 — Action ambiguity

The action rail returns a failure or timeout after the decision has been issued. The decision event must remain present. The action state must be explicitly represented as failed or outcome-unknown according to the rail contract. The system must not issue a compensating release or implicit allow without a separate, idempotent reconciliation decision.

### E2E-006 — Replay

The test runs the same canonical input, facts, policy version, evidence snapshot, and evaluation clock through the interpreter twice. The disposition, fired rule set, unknown predicates, and decision-path hash must match. If the implementation is nondeterministic, it must emit a reproducibility artifact or be rejected by the conformance suite.

### E2E-007 — Audit integrity

The test mutates the candidate similarity inside an already recorded audit event. Verification must fail. This demonstrates that audit logging is not merely a row count or timestamp trail; it is an integrity-protected record of the event payload and its predecessor.

## Contract assertions by boundary

| Boundary | Required assertion |
|---|---|
| Source → Adapter | Envelope is valid, idempotency key is present, event time and processing time are preserved |
| Adapter → Kernel | Canonical fields are deterministic, transformations are declared, unresolved references are visible |
| Adapter → Interpreter | Facts are typed, status distinguishes candidate/confirmed/unknown/conflicted, evidence references are present |
| Interpreter → Kernel | Disposition, obligations, rules evaluated, rules fired, unknowns, counterevidence, and trace hash are returned |
| Kernel → Action rail | Action request is idempotent and maps to the decision ID |
| Action rail → Kernel | Acknowledgement is explicit; timeout is not silently treated as success or failure |
| Kernel → Audit log | Event sequence, correlation, causation, hashes, and schema references are durable |
| Late evidence → Reassessment | Original decision is immutable; a new evaluation and causal `DecisionReopened` event are appended |

## Negative and resilience extensions

The initial seven tests should be extended with malformed policy activation, stale list epoch, graph-service outage, duplicate events, out-of-order relationship updates, event-log outage, action retry, clock skew, 10× burst traffic, replica loss, and schema-version mismatch. Each extension should assert both the functional outcome and the audit evidence proving which degraded mode was active.

## Execution

Run the executable reference suite from `/home/ubuntu`:

```bash
python3 -m unittest -v decision_infrastructure_integration_tests.py
```

Expected result:

```text
Ran 7 tests
OK
```

The suite is deliberately small enough to run in every commit, while the resilience and load extensions should run in nightly or pre-release pipelines. Production acceptance should require schema conformance, deterministic replay, idempotency, audit-chain verification, and explicit unknown-data handling.
