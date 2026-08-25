# The Theory of Decision-State Evolution

## A reusable abstraction

Decision-state evolution is the controlled change of the information, semantics, authority, and operational consequences that determine a governed decision. It is broader than a database migration and narrower than enterprise transformation. The object being evolved is not merely a row, schema, or API. It is the **decision state** from which a system may issue, hold, reject, or reverse a material action.

Let a decision state be represented as:

```text
S = (I, E, P, M, A, O, T)
```

where `I` is identity and tenant scope, `E` is evidence and provenance, `P` is policy semantics, `M` is the state/model manifest, `A` is authority and ownership, `O` is action/outcome status, and `T` is temporal freshness and ordering.

An evolution is a versioned transition:

```text
S(t+1) = Transition(v, delta, proof, authority)(S(t))
```

The transition is valid only when it preserves identity, records provenance, proves compatibility, obeys authority boundaries, and leaves enough evidence to replay or roll back its operational consequences.

## Seven laws

1. **Identity precedes mutation.** A state change must remain bound to tenant, subject, decision, request, and action identity.
2. **Meaning is versioned.** Schema versions are semantic commitments, not serialization labels.
3. **Evidence is part of state.** Provenance, freshness, applicability, and conflicts must evolve with the facts they support.
4. **Compatibility is contextual.** A change can be technically readable while operationally unsafe for a specific policy, region, or action rail.
5. **Authority is temporal.** Ownership epochs, leases, and RPO headroom determine which actor may make a state effective now.
6. **Reversibility is additive.** Corrections, rollback, and replay append accountable transitions; they do not erase the prior decision episode.
7. **Safety is observable.** A transition is not production-ready until its semantic, authority, action, and audit properties can be measured.

## Consequence

The generalized migration lifecycle is:

```text
propose → expand → dual-represent → verify → canary-authorize
→ promote → contract → retain/replay
```

This lifecycle applies to policy upgrades, identity-graph changes, risk-model revisions, workflow reconfiguration, data migrations, and multi-region state movement. The implementation varies by domain; the proof obligations do not.

