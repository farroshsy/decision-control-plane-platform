# ADR 0001: Preserve the Canonical Decision Episode as the Stable Kernel

## Status

Accepted.

## Context

Supplier risk, financial-crime screening, procurement approval, and other decision domains use different terminology but require the same proof: who was evaluated, against which evidence and policy/state version, under what authority, with what result, and at what time.

## Decision

The platform preserves a canonical decision episode with the state model **S = (I, E, P, M, A, O, T)**. Domain adapters translate local models into this kernel; they do not replace it.

## Consequences

Replay, evidence provenance, tenant isolation, ownership/RPO admission, and auditability can evolve once and serve multiple domains. Domain-specific schemas, models, connectors, and process semantics remain pluggable.
