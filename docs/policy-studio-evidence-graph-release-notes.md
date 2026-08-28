# Policy Studio, Simulation, and Evidence Graph Release Notes

## Delivered capability

This release establishes a bounded **Governed Decision Authoring** foundation for the financial-crime screening pilot. Policy Studio now preserves tenant-scoped policy definitions and source-hashed revisions, records immutable revision activities, and routes drafts through a maker/checker lifecycle. A revision creator cannot review the same revision; review acceptance requires a distinct eligible tenant member. Approval is evidence of review only. The application does not publish policy code or alter the active policy interpreter.

The new retained-cohort simulator projects candidate policy semantics against existing replay traces, decision evidence, and investigation posture. It stores a report that exposes observed outcome deltas, affected open cases, a transparent score, and hard feasibility constraints. Missing retained evidence or an unrun candidate replay produces an infeasible result rather than an optimistic recommendation. The simulation neither reruns nor changes a trace, policy, case, or rollout.

The Evidence Graph is a provenance-only read model. It connects retained decision episodes to evidence, replay traces, referenced policy versions, investigation cases, outcomes, simulation reports, and immutable case activities. Each displayed edge names its retained source or stored provenance reference. It neither infers missing relationships nor offers graph editing.

| Surface | Intent | How to use it | Expected outcome |
|---|---|---|---|
| Policy Studio | Govern change to decision logic without code deployment. | Retain a source-hashed draft, run a retained-cohort report, then submit it for a distinct tenant checker. | Reconstructable authoring, simulation, and review evidence. |
| Retained-cohort report | Predict impact before a policy is eligible for a future publication control. | Read hard feasibility reasons before interpreting the transparent score or outcome counts. | A bounded completed or infeasible analysis record; no live action. |
| Evidence Graph | Explain why a decision, case, or policy reference belongs in the same audit trail. | Filter by decision ID; inspect node descriptions and edge provenance. | Tenant-scoped traceability over retained sources. |
| Getting Started | Explain each workspace’s intent, use, expected outcome, and safety boundary. | Follow Observe → Compare → Interpret → Act → Retain, then use the workspace cards for deeper context. | Faster operator orientation without implied automation. |

## Approved pilot validation

With explicit approval, the existing **Pilot Transaction Rail** tenant received exactly two clearly labeled Policy Studio seed revisions: a retained `aml-policy@27` baseline and `aml-policy@28-draft` candidate. Each has a hash-bound immutable registry activity record. Neither revision was published, executed, reviewed, or converted into user-authored policy content.

Browser review confirmed that the Policy Studio displays both source hashes and lifecycle states, and that the Evidence Graph projects the pilot decision’s retained replay, evidence, investigation, audit, and policy-version relationships. The simulation action was deliberately not invoked during this validation because the approved fixture scope was limited to seed revisions and activities.

## Operator-experience and build improvements

The operator guide now states the intent, workflow, expected outcome, and boundary for the Control Room, Policy Studio, Evidence Graph, Replay Explorer, Investigations, Migration Timeline, Version Lab, Audit & Replay, Integrations, and Operations workspaces. The sidebar resize handle has a visible hover cue, accessible label, native title, and tooltip.

Route-level lazy loading and explicit vendor chunks remove the prior monolithic application-entry advisory. The largest emitted client dependency chunk is now the 447 kB React runtime, below Vite’s 500 kB threshold; the application entry and workspace chunks are separately cacheable. A Playwright drag smoke test validates tooltip discovery, persisted width, and absence of a ResizeObserver loop when executed with an authenticated `E2E_STORAGE_STATE`. The test was run successfully using a short-lived, local-only signed test session for the existing pilot user; the generated state is ignored by Git and is not an export of the user’s real browser session.

## Validation

The final release check passed **45 Vitest tests across 14 files**, `pnpm check`, the production build, and the authenticated Playwright sidebar-resize smoke test. The build emitted route-level workspace chunks and no longer produced the previous default 500 kB chunk warning. Focused browser review of `/app/policy-studio` and `/app/evidence-graph` passed with the approved pilot fixtures.

## Explicit pilot boundary

This release does **not** deploy policy code, execute a policy interpreter, rerun or modify a replay, publish a policy revision, change a rollout, close a case, activate a scheduler, send an external notification, call an AI provider, route a model, allocate a budget, or bill a customer. Dynamic programming and constrained optimization are used only as transparent, retained-cohort analysis methods. AI Governance Control Plane concepts remain future discovery documentation, not an active module.
