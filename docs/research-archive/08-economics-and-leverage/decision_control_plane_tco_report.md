# Decision Control Plane vs Legacy Monolithic Decision Engine
## Cost-Benefit and Total Cost of Ownership Model

## 1. Executive conclusion

The Decision Control Plane is economically justified only if it delivers more than architectural elegance. Its value must come from a combination of lower steady-state operating cost, reduced duplicate engineering, faster policy and adapter change, lower audit/reconstruction effort, safer failure behavior, and a measurable reduction in decision ambiguity or operational loss.

Under the **illustrative base case** in this model, the Decision Control Plane has a one-time migration cost of **$5.0 million** and steady-state annual operating cost of **$7.8 million**, compared with **$10.6 million** for the legacy monolith. Direct annual savings are therefore **$2.8 million**. Including an illustrative **$2.0 million** annual operational-value benefit, the model produces a **1.04-year payback** and an illustrative **$13.20 million five-year NPV** at a 10% discount rate.

These numbers are planning assumptions, not forecasts. The model is designed to be replaced with pilot measurements before funding or procurement decisions.

## 2. Cost taxonomy

### Legacy monolithic engine

The legacy cost base includes infrastructure, database and storage, vendor/runtime licensing, rules and model engineering, release coordination, operations and on-call, audit and manual reconstruction, duplicated point integrations, incident response, and the opportunity cost of slow or risky change.

### Decision Control Plane

The Decision Control Plane cost base includes the real-time decision plane, durable event/evidence/replay plane, control plane, tenant-isolation and security controls, adapters and connectors, policy/model governance, migration coexistence, observability, support, and ongoing platform engineering.

The new architecture is not assumed to be cheaper in every line item. It may initially increase platform and migration cost. The economic case depends on reuse, change velocity, auditability, and lower duplication compensating for that investment.

## 3. Base-case assumptions

The base case is a transparent illustrative scenario in USD millions.

| Cost/value line | Legacy annual | DCP steady-state annual | Rationale |
|---|---:|---:|---|
| Compute, storage, and database | 1.40 | 1.20 | DCP uses a hot path plus independently scaled durable plane |
| Vendor/runtime licensing | 1.30 | 0.80 | Lower coupling and more replaceable engines; validate contracts |
| Rules, model, and policy engineering | 2.40 | 1.80 | Shared Policy IR, replay, and test harness reduce duplication |
| Operations and on-call | 1.50 | 1.30 | More components but clearer boundaries and failure modes |
| Audit and manual reconstruction | 1.20 | 0.50 | Evidence-bound trace and replay reduce manual archaeology |
| Point integrations and duplicated adapters | 1.20 | 0.70 | Domain Adapter boundary and common event contract |
| Security, governance, and compliance operations | 0.90 | 1.00 | Stronger tenant, key, disclosure, and evidence controls |
| Incident and change-risk reserve | 0.70 | 0.50 | Lower silent failure and rollback risk; validate with incidents |
| **Total annual steady-state cost** | **10.60** | **7.80** |  |

One-time DCP migration cost is assumed to be **$5.0 million**, including behavioral inventory, compatibility facade, canonicalization, event/audit/replay kernel, AML adapter, dual-run infrastructure, security review, migration engineering, training, and contingency.

## 4. Benefits taxonomy

### Direct cost benefits

Direct savings are the difference between the legacy annual run-rate and the DCP steady-state run-rate. They are the least speculative benefit because they can be measured from invoices, headcount allocation, infrastructure telemetry, and support effort.

### Operational value benefits

The model separately estimates soft or operational value that should not be counted as guaranteed savings until validated. Examples include:

- faster policy release and change validation;
- lower investigation and decision-reconstruction time;
- reduced duplicate engineering across risk domains;
- fewer severe incidents caused by stale, mixed, or untraceable state;
- fewer unnecessary holds or escalations from better evidence handling;
- faster onboarding of a new transaction rail or domain adapter;
- reduced time to produce a defensible audit or regulatory response;
- higher confidence in model and policy replacement through shadow replay.

The base scenario assumes **$2.0 million per year** of validated operational value. This should be decomposed into measurable units during the 90-day MVP: analyst minutes saved, engineering weeks avoided, incident hours avoided, change lead-time reduction, and prevented duplicate actions.

## 5. Five-year comparison

The accompanying calculator uses a five-year horizon and a 10% discount rate. It treats migration as a one-time cost in year 0 and steady-state costs as annual recurring costs. It does not assign a monetary value to regulatory fines, lost business, prevented losses, or reputational effects unless the user adds them as a scenario input.

| Scenario | Legacy 5-year cost | DCP 5-year cost incl. migration | Direct 5-year savings | Payback incl. soft value | NPV of total value |
|---|---:|---:|---:|---:|---:|
| Low | $51.0M | $52.5M | **-$1.5M** | 4.29 years | **-$0.69M** |
| Base | $53.0M | $44.0M | **$9.0M** | 1.04 years | **$13.20M** |
| High | $63.0M | $43.0M | **$20.0M** | 0.45 years | **$29.36M** |

The low case is deliberately important. It says that if the new architecture costs nearly as much to operate as the legacy engine, migration is expensive, and operational improvements are modest, the program should not be justified by platform theory alone.

## 6. Break-even analysis

The direct annual savings needed to recover a one-time migration cost over a chosen period are:

```text
required annual direct savings = migration cost / target payback period
```

For a $5.0 million migration:

| Target payback | Required annual direct savings | Required DCP steady-state cost against $10.6M legacy |
|---:|---:|---:|
| 1 year | $5.00M | ≤ $5.60M |
| 2 years | $2.50M | ≤ $8.10M |
| 3 years | $1.67M | ≤ $8.93M |
| 5 years | $1.00M | ≤ $9.60M |

The base case exceeds the two-year direct-savings threshold with **$2.8 million annual direct savings**, before counting operational value. If the pilot cannot support at least a credible two-to-three-year path through measured cost and value, scope should be narrowed.

## 7. Sensitivity cases

### Cost sensitivity

The most important sensitivities are migration effort, durable audit/evidence storage, policy/model engineering staffing, tenant-isolation requirements, and coexistence duration. The stress-test result also matters economically: scaling the Policy Interpreter while leaving audit persistence as the first bottleneck creates more infrastructure cost without more useful throughput.

### Value sensitivity

The most uncertain value inputs are analyst time saved, engineering reuse, avoided incidents, reduced duplicate integration, and prevented operational losses. These should be measured rather than capitalized in the base case before pilot evidence exists.

### Scenario interpretation

| Driver | Low case | Base case | High case |
|---|---|---|---|
| Migration cost | $6.0M | $5.0M | $4.0M |
| DCP steady-state cost | $9.3M | $7.8M | $7.8M |
| Direct annual savings | $0.9M | $2.8M | $4.8M |
| Annual operational value | $0.5M | $2.0M | $4.0M |
| Strategic implication | Do not scale without stronger proof | Fund vertical slice and validate | Accelerate after control gates |

## 8. What the 90-day MVP must measure for TCO credibility

| Measure | Data source | Required use in the model |
|---|---|---|
| Compute and storage per 1,000 decisions | Production-like telemetry | Replace infrastructure assumptions |
| Audit/evidence cost per decision | Journal/object-store metrics | Test durable-plane scaling economics |
| Engineering hours per policy change | Delivery records | Quantify Policy IR and replay leverage |
| Analyst time to reconstruct a decision | Controlled user study | Quantify operational value |
| Mean time to diagnose divergence | Incident and replay logs | Quantify governance and support value |
| Adapter onboarding time | Pilot implementation | Quantify cross-domain reuse |
| Duplicate integration count | Architecture inventory | Quantify consolidation value |
| Change lead time and rollback time | Deployment system | Quantify safe-evolution benefit |
| False-positive and false-negative impact | Adjudicated corpus/outcomes | Quantify quality and loss tradeoffs |
| Critical incident hours and recovery | Incident management | Quantify resilience benefit |
| Tenant-isolation control cost | Security/platform telemetry | Replace security-cost assumptions |

## 9. Cost allocation model for enterprise deployment

The platform should allocate shared costs by decision volume, peak concurrency, evidence volume, retention, residency tier, replay usage, and support tier. This is important because one noisy or high-retention tenant can distort the economics of a shared deployment.

```text
tenant_cost = base_platform_share
            + decision_volume_share
            + peak_capacity_reservation
            + evidence_storage_and_retention
            + replay_and_simulation_usage
            + dedicated_residency_or_environment
            + support_and_assurance_tier
```

The internal product team should also maintain a cost-per-decision view for each stage: adapter, candidate generation, Policy Interpreter, audit commit/spool, graph/state access, case/replay, and action execution.

## 10. TCO risks specific to the Decision Control Plane

The architecture can lose its economic advantage if it creates excessive adapters, duplicates event stores, retains everything forever, runs unbounded graph traversal in the hot path, introduces multiple policy runtimes, or requires a permanent dual-run environment. The design must therefore keep the kernel small, compile policies, bound dependencies, partition durable storage, and retire legacy paths after validated cutover.

A common failure is to count avoided incidents as certain value while treating migration and governance controls as one-time costs. The model should avoid that bias. Migration, security, observability, replay, backup, incident response, and tenant isolation are recurring enterprise costs and must be included.

## 11. Return on Research for the economic workstreams

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Cost-per-decision instrumentation | 5 | 5 | 5 | Medium / 3 | Medium / 4 | **4.55** | Now |
| 90-day analyst and engineering time study | 4 | 4 | 4 | High / 3 | Medium / 4 | **3.95** | Now |
| Stage-level capacity and storage model | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| Scenario and sensitivity model | 4 | 4 | 4 | Medium / 3 | Low / 5 | **4.05** | Now |
| Full loss-avoidance monetization | 5 | 3 | 3 | Very high / 2 | High / 2 | **3.25** | Later, after outcome data |
| Enterprise chargeback model | 3 | 4 | 4 | High / 3 | High / 3 | **3.60** | After pilot |

## Final decision rule

Fund the Decision Control Plane as a controlled migration and validation program, not as an unconditional platform rewrite. The base case is attractive, but the low case is not. The first investment should therefore be the instrumentation, canonical kernel, shadow comparison, replay, and one AML vertical slice that can replace assumptions with observed data.

If the pilot confirms direct savings, measurable operational value, and stable tenant/security costs, continue to slice-by-slice production migration. If it confirms only architectural reuse but not economic value, keep the kernel as internal infrastructure and narrow the product. If it fails replay, audit, resilience, or break-even tests, stop the expansion rather than funding a larger abstraction.

## References

This model is intentionally assumption-driven. Replace its illustrative inputs with institution-specific telemetry and finance-approved rates before using it for investment approval.
