# Optimization Research Notes for Governed Policy Simulation

## Design decision

The simulation workspace will use **deterministic replay comparison first**. It will not train, deploy, or autonomously optimize a live decision policy. A retained cohort supplies fixed evidence, policy/version bindings, outcomes, and safety constraints; the proposed revision is evaluated against that bounded cohort and emits an evidence-bound impact report.

Dynamic programming and constrained optimization are used as **analysis methods**, not execution authority. A simulated recommendation is therefore a structured input to human maker/checker review, not a policy publication, rollout, case closure, or external action.

## Research-informed method selection

| Method | Appropriate use in this pilot | Guardrail |
| --- | --- | --- |
| Exact dynamic programming / bounded look-ahead | Enumerate a finite revision sequence or replay cohort and compare an objective score with fixed safety constraints. | Use only retained, tenant-scoped inputs; never infer unknown transition probabilities. |
| Constraint-aware scoring | Minimize replay divergence and queue/SLA impact subject to explicit non-negotiable gates such as tenant boundary, evidence binding, maker/checker requirement, and no unsafe automatic outcome. | A constraint breach results in an infeasible simulation, not a trade-off. |
| Multi-objective frontier | Show policy-quality, impact, workload, and safety trade-offs as ranked alternatives. | Do not represent a ranking as a recommended production action. |
| Approximate methods | Future research only if a cohort becomes too large for exact bounded comparison. | Require held-out replay validation, uncertainty disclosure, and a separate approval design before use. |

Constrained Markov decision process literature expresses an objective alongside explicit cost constraints; for finite known models, dynamic programming or linear programming can solve the constrained formulation. That framing supports keeping hard control-plane constraints separate from quality scores in this application.[^cmdp] Approximate dynamic programming combines mathematical programming, simulation, and statistics for larger stochastic decision problems, but its dimensionality and model-assumption limits mean it is not introduced into the initial pilot implementation.[^adp]

## Initial optimization contract

For policy revision `r` and retained cohort `C`, calculate only replay-observable measures:

`score(r, C) = w₁ × unchanged_outcomes + w₂ × resolved_divergences − w₃ × newly_held_or_rejected − w₄ × affected_open_cases`

The score is accompanied by hard feasibility gates, not substituted for them:

1. Every cohort episode, evidence binding, policy revision, and replay comparison must be tenant-scoped and retained.
2. A revision without review evidence or deterministic replay output is infeasible.
3. A result that crosses the pilot boundary—live publication, rollout mutation, external delivery, or automatic decision execution—is infeasible.
4. Any unknown, conflicted, or missing replay state is reported separately and cannot be optimized into an allow-like outcome.

The exact weights remain tenant-configured pilot inputs, displayed in the report, and require maker/checker approval before they can influence any review decision. The first report will show component counts and feasibility explanation rather than asserting predictive accuracy.

## References

[^cmdp]: Li et al., “[Faster algorithm and sharper analysis for constrained Markov decision process](https://pmc.ncbi.nlm.nih.gov/articles/PMC12700660/)” (2024); Kushwaha et al., “[A Survey of Safe Reinforcement Learning and Constrained MDPs](https://arxiv.org/html/2505.17342v2)” (2026).

[^adp]: Powell, “[Approximate Dynamic Programming: Solving the Curses of Dimensionality](https://collaborate.princeton.edu/en/publications/approximate-dynamic-programming-solving-the-curses-of-dimensional/)” (2011).
