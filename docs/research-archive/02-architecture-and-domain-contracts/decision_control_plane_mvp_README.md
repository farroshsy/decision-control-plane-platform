# Decision Control Plane MVP Workspace

This workspace is the first executable productization of the research. It contains the stable contracts, runtime reference implementations, assurance reports, benchmarks, operational runbooks, process-model graphs, and leverage documentation.

## Start here

1. Read docs/decision_control_plane_leverage_plan.md.
2. Run scripts/run_mvp_validation.py.
3. Inspect the generated validation summary.
4. Use process/business_process_deliverable_quickstart.md for stakeholder walkthroughs.

## Stable kernel

The kernel consists of canonical decision/event semantics, evidence and provenance, tenant context, policy/version binding, replay, action idempotency, ownership epochs, fencing, and explicit degraded states.

## First product wedge

The first wedge is real-time financial-crime screening on one bounded transaction slice, followed by a second domain only after the kernel, economics, and adapter isolation pass.

## Workspace policy

Domain-specific matching, graph storage, process-model tooling, data connectors, AI methods, and visualization are replaceable. Changes to the kernel require compatibility fixtures, replay evidence, and architecture review.
