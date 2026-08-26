# Diagram asset review

## Architecture diagram

The rendered architecture diagram is 3120×1172 px and is legible as a wide horizontal system view. It clearly separates the Transaction Edge, Real-time Decision Plane, Durable Decision Plane, Control Plane, and external sources. The most important visual path is the lower hot path: transaction edge → AML Domain Adapter → Screening State Manifest / Candidate Fact Service → Policy Interpreter → Decision Kernel → Action Executor. The durable plane is visibly distinct and includes the append-only event journal, evidence store, case/reporting, outcome, and replay services.

## Interaction sequence

The rendered sequence diagram is 3120×1372 px and is legible as a wide sequence view. It shows the synchronous path from TransactionProposed through canonicalization, manifest retrieval, candidate generation, Policy Interpreter evaluation, DecisionIssued, audit append, ActionRequested, and ActionAcknowledged/timeout. It also shows the asynchronous path for rich evidence, case/reporting, replay, later outcomes, DecisionReopened, and re-evaluation while keeping the original decision immutable.

## Presentation usage

Use the architecture image on an architecture slide with a fixed-height contained image and the sequence image on a separate interaction slide. Because both assets are wide, they should occupy the horizontal center of their slides rather than be placed in a vertical stack with other charts or images.
