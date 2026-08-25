# Case-Flow Validation Notes

## Live tenant migration view

The authenticated pilot tenant rendered the BPMN-aware migration investigation view successfully. The active rollout displayed **Semantic state 2.1 canary** in the **backfill** phase with a healthy canary posture and pending approval. The readiness model rendered **4/5 retained safety gates ready (80%)**, with ownership, RPO, audit, and replay passing and approval visibly blocked. The timeline exposed distinct phase progress bars and selected-phase evidence, including the backfill step's owner, epoch, RPO headroom, admission latency, and audit lag evidence.

The operator workflow retained its authority boundary: it offered evidence and rollback-recommendation recording plus an **Open linked case** action, while the rendered recommendation stated that no automatic promotion occurs and required approval evidence before write-canary authority.

## Replay and investigation evidence

The authenticated Replay Explorer first presented the compact tenant-scoped skeleton state and then hydrated to the retained decision episode **dec_pilot_001**. The rendered comparison contained **7 retained differences** between the 2.0.4 / `aml-policy@27` baseline and the 2.2.0-rc.1 / `aml-policy@28` candidate, including disposition, action, evidence-completeness, and semantic-note changes. The page retained both **Export package** and **Open case** actions. A prior browser check completed the export and showed the confirmation: “Replay investigation package prepared and downloaded.”

## Controlled retry rehearsal

In the authenticated integration workspace, the retained `replay.diverged` failure was retried from the diagnostics panel while its endpoint was **pilot_ready**. The UI confirmed “Controlled retry simulation recorded. No external receiver was contacted.” It then displayed a new **simulated delivered** attempt 2, preserved the original simulated-failed attempt 1, updated status counts to two delivered and one failed, and rendered a retry-audit row bound to payload `pilot-v1` and the source/result delivery identifiers. This verifies the bounded local simulation and its additive audit behavior; it does not verify or claim an external HTTP request, queue, retry guarantee, or streaming delivery.

## Final automated validation

After the final loading-state refinement, `pnpm test`, `pnpm check`, and `pnpm build` all completed successfully. Vitest reported **22 passing tests across 6 files**. The production build emitted only the existing non-blocking Vite chunk-size advisory.
