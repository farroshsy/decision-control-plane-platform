# Decision Infrastructure financial-crime JSON Schema package

## Contents

- `di-fincrime.schema.json` — Draft 2020-12 schema bundle for the canonical transaction-screening decision object and event envelope. It includes reusable definitions for entities, roles, relationships, exposures, evidence snapshots, claims/facts, policy context, recommendations, policy traces, explanations, actions, provenance, and the screening lifecycle event payloads.
- `examples.json` — Valid decision and event fixtures plus an intentionally incomplete invalid fixture.
- `../decision_infrastructure_schema_validation_expanded.txt` — Validation result from the local validator.

## Validation

From `/home/ubuntu`, install the `jsonschema` package if necessary and run:

```bash
python3 validate_di_schema.py
```

Expected output:

```text
valid_decision: PASS
valid_event: PASS
invalid_decision_missing_provenance: EXPECTED_FAIL
```

## Semantics

The schema deliberately separates:

- candidate matches from confirmed matches;
- missing evidence from negative evidence;
- model or matcher output from policy conclusions;
- event time from processing time;
- a decision being issued from an action being acknowledged;
- the original decision from later reassessment or replay.

The schema uses effective-dated version references and content hashes so that decisions can be replayed against the same policy, list, entity, relationship, feature, and model state. Extensions may be added through properties whose names begin with `x-`; core fields remain strict to prevent silent semantic drift.

## Production hardening still required

The schema validates structure, not business correctness. Production implementations should add policy-level validators for timestamp ordering, cross-field consistency, jurisdiction-specific requirements, action/disposition compatibility, snapshot epoch consistency, maximum graph depth, and tenant-specific retention and privacy rules. These should be implemented as versioned conformance tests rather than embedded as undocumented assumptions in consumers.
