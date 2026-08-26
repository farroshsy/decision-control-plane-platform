# Decision Control Plane — Complete Work Summary

## Executive summary

The work began as a cross-industry research question: do supplier risk in manufacturing, counterparty risk in finance, contractor responsibility in public procurement, clinical-site oversight, and financial-crime screening represent the same underlying decision problem?

The conclusion is **yes at the level of decision infrastructure, but not at the level of domain semantics**. Across domains, an organization evaluates a relationship or activity under uncertainty, using evidence and policy, under time and operational constraints, and then issues a governed decision that may trigger a side effect. The stable abstraction is a **contextual relationship decision under uncertainty**.

That insight was converted into a concrete product: the **Decision Control Plane**. It is a governed, replayable, tenant-aware decision layer that sits between event origination and downstream action systems. The first product wedge is **real-time financial-crime transaction screening**, chosen because it has high decision frequency, material consequences, versioned policy, strict audit needs, external side effects, and measurable latency and resilience requirements.

## 1. Research question and cross-industry finding

| Domain | Local terminology | Common decision activity |
|---|---|---|
| Manufacturing | Supplier risk, supplier qualification, third-party risk | Decide whether to onboard, continue, restrict, or remediate a supplier using evidence and exposure context |
| Finance | Counterparty credit risk, limit management, transaction monitoring | Decide whether to transact, limit, hold, escalate, or exit a relationship under uncertain exposure |
| Government | Contractor responsibility, procurement due diligence | Decide whether an organization is eligible, responsible, restricted, or subject to oversight |
| Healthcare | Risk-based monitoring, site qualification | Decide whether a site is ready, how much oversight is required, and whether evidence supports continuation |
| Financial crime | Screening, transaction monitoring, sanctions controls | Decide whether a transaction may proceed, must be held, must be rejected, or requires investigation/reporting |

The domains are not interchangeable. Their policy vocabularies, loss models, evidence sources, legal obligations, and actions remain domain-specific. What is reusable is the infrastructure that binds **subject, relationship, activity, evidence, policy, decision, action, outcome, time, authority, and audit**.

## 2. Product thesis

The Decision Control Plane should not begin as a universal risk platform, generic graph database, autonomous compliance officer, or broad connector marketplace. It should begin as a focused control plane with five stable capabilities:

1. Canonicalize an incoming activity or relationship into a versioned decision context.
2. Evaluate that context against compiled policy and versioned evidence.
3. Admit, hold, reject, retry, or fence the decision according to authority, freshness, durability, and RPO constraints.
4. Issue idempotent downstream actions and reconcile their outcomes.
5. Preserve an immutable, explainable, replayable record.

The domain layer supplies the meaning. The control plane supplies the governance, execution, evidence, resilience, and audit discipline.

## 3. Stable invariants versus pluggable components

### Stable for the next decade

The following should remain stable unless research demonstrates that the theory is wrong:

- Canonical decision context and decision episode identity.
- Immutable event history and sequence ordering.
- Evidence provenance, freshness, and applicability.
- Policy and state version binding.
- Tri-state and conflict-aware fact semantics.
- Explicit unknown, conflicted, degraded, hold, retry, reject, and fence outcomes.
- Tenant identity, purpose, classification, residency, and authorization context.
- Ownership epochs and stale-writer fencing.
- Idempotent action identity and downstream outcome reconciliation.
- Deterministic replay and differential comparison.
- Durable compact trace before material side effects.
- Human and automated approval boundaries.
- Auditability, explainability, and evidence retention.
- Separation between kernel semantics and domain-specific adapters.

### Pluggable by design

The following should be replaceable behind explicit interfaces:

- Industry models and taxonomies.
- Domain Adapters and source-system connectors.
- Watchlist, identity, graph, and relationship stores.
- Policy authoring tools and decision-model formats such as DMN.
- AI, machine-learning, matching, ranking, and reasoning techniques.
- Storage engines, event-bus technologies, and replication mechanisms.
- Simulation, process mining, and forecasting methods.
- Visualization and dashboard products.
- Model-serving and feature-serving runtimes.
- Human workflow and case-management systems.
- Cloud, database, KMS, HSM, and identity providers.

The architecture succeeds when these components can be replaced without changing the meaning of a canonical decision or weakening its audit and replay properties.

## 4. Canonical decision and event model

The canonical decision object includes tenant scope, subject and relationship references, activity, policy bundle, evidence, state manifest, candidate facts, conflicts, constraints, disposition, actions, authority, trace, and timestamps.

The event model covers the full lifecycle:

```text
received → canonicalized → evidence_attached → policy_evaluated
→ admission_checked → decision_issued → action_requested
→ action_acknowledged → outcome_recorded → case_or_report_closed
```

Corrections, reassessments, reopenings, late evidence, policy changes, and replay results append new events. They do not rewrite the original decision history.

## 5. Policy Interpreter

The Policy Interpreter prototype was implemented in Python with:

- Typed facts.
- Policy IR compilation.
- Tri-state logic.
- Unknown and conflict propagation.
- Hard-constraint precedence.
- Effective-date checks.
- Trace generation.
- Replay-stable evaluation.
- Support for canonical `value.*` fact paths and enum normalization.

The RPO admission and fencing extension adds:

- Tenant ownership leases.
- Ownership epochs.
- Stale-region and stale-epoch rejection.
- Lease expiry and explicit fencing outcomes.
- Policy and state-manifest epoch checks.
- Trace-durability checks.
- Deadline checks.
- Replication-lag and remote-acknowledgement checks.
- Explicit `allow`, `hold_for_review`, `retry_later`, `fence_required`, and `reject` outcomes.
- Idempotent decision issuance and action identity.

The core test suite passes 6/6 Policy Interpreter tests and 8/8 RPO/fencing tests.

## 6. Financial-crime real-time screening design

The first production wedge is a bounded transaction-screening flow:

```text
transaction source
→ Domain Adapter
→ canonicalization
→ evidence/state lookup
→ candidate and relationship evaluation
→ Policy Interpreter
→ RPO admission and fencing
→ Decision Kernel
→ idempotent action rail
→ audit, case, report, and XAI package
```

The high-frequency hot path requires bounded latency, snapshot consistency, no network calls to unconstrained AI components, pinned policy/state/model versions, local or cached evidence, and durable compact trace creation before allow-like side effects.

The exact operational rule is:

> **Do not silently convert stale, unknown, conflicted, or unauditable state into an allow.**

## 7. Resilience and failover work

### Synchronous partition simulation

The continuous partition harness tested nominal, high-rate, very-high-rate, short-partition, long-partition, tight-RPO, late-heal, and fast-takeover scenarios. All 8/8 scenarios passed.

The reference nominal result included:

| Metric | Result |
|---|---:|
| Offered decisions | 6,001 |
| Accepted decisions | 4,700 |
| Fenced/rejected writes | 1,300 |
| RPO-driven holds | 399 |
| Duplicate retries deferred | 1 |
| Duplicate actions | 0 |
| Split-brain accepts | 0 |
| Events replayed after healing | 1,700 |
| Maximum replication lag | 4.99 seconds |
| Takeover interval | 7 seconds |
| Recovery | Pass |

### Asynchronous Byzantine simulation

The asynchronous harness injected message drops, delays, duplication, reordering, stale epochs, corrupted payloads, and asynchronous replication lag across six high-frequency scenarios. All 6/6 scenarios passed.

The harness observed zero duplicate actions, rejected corrupted replication messages, ignored duplicate replication, rejected stale epochs, and recovered all valid events after healing. These are protocol-level simulation results, not production capacity claims.

## 8. Migration and operations

The enterprise operational model includes:

- Tenant migration by shadowing, replay comparison, dual-write reconciliation, epoch-controlled cutover, and rollback.
- Key rotation with dual-read/new-write, bounded rewrap, verification, overlapping certificates, and controlled revocation.
- Partition response with quorum fencing, ownership epoch advancement, RPO admission, action reconciliation, replay, and controlled failback.
- Monthly technical drills, quarterly regional recovery drills, and semiannual split-brain game days.
- Tenant-scoped incident evidence packages.
- Explicit operator roles for platform, compliance, security, data, action rail, and audit.

The zero-downtime state-store migration strategy uses **expand → dual-write → backfill → verify → read cutover → write cutover → contract**. Schema versions carry semantic meaning, not merely serialization numbers. The Policy Interpreter reads versioned semantic state with provenance, revision, ownership epoch, policy/state epoch, and content hash.

## 9. Governance and tenant isolation

The enterprise governance model defines:

- Tenant identity and purpose limitation.
- Data classification and residency.
- Dedicated or shared isolation tiers.
- Per-tenant keys and key-version manifests.
- Tenant-scoped event, evidence, graph, cache, metric, and replay boundaries.
- Least-privilege service identities.
- Break-glass controls with dual approval.
- Retention, legal hold, deletion, and selective restore.
- Tenant-aware backups and disaster recovery.
- Cross-tenant negative testing.
- Audited support access.

Zero-trust controls apply to every request, including internal service traffic. A valid network location does not grant authority. The authorization context must include tenant, purpose, action, region, ownership epoch, policy version, and operator or service identity.

## 10. API and SDK integration

The Domain Adapter contract was specified in both REST and versioned gRPC/Protobuf. The client SDK patterns include:

- Synchronous screening requests for immediate authorization.
- Asynchronous callbacks or event consumption.
- Shadow-mode comparison against the incumbent.
- Action-rail dry runs.
- Batch replay and policy simulation.

The SDK validates tenant context, schema version, idempotency key, deadline, source timestamp, purpose, classification, and trace context before making a network call. It exposes typed outcomes and does not infer action permission from human-readable messages.

Developer onboarding proceeds through installation, sandbox fixtures, telemetry integration, adapter conformance, historical replay, shadow production, action dry run, canary authority, and operational handoff.

## 11. Observability and assurance

The production dashboard is an operational control surface built around:

- RPO headroom.
- Replication lag and acknowledgement age.
- Current owner region and ownership epoch.
- Fencing rejection rate.
- Stale epoch requests.
- Policy, evidence, and admission latency.
- Audit append latency and freshness.
- Action acknowledgement and unknown outcomes.
- Duplicate-action suppression.
- Replay divergence.
- Tenant isolation and key-access alerts.

A starter Grafana dashboard JSON and alert-rule file were generated. Critical alerts include split-brain acceptance, duplicate action, RPO breach, high admission latency, slow audit commit, policy/state manifest skew, unknown action outcomes, replay divergence, and key-access failure.

The compliance/XAI generator produces JSON and Markdown reports covering decision completeness, tenant scope, policy/evidence binding, unknowns, conflicts, action reconciliation, audit-chain integrity, replay manifests, rule rationales, facts, evidence, and timeline.

## 12. Economic model and RoR discipline

A five-year TCO calculator compares legacy monolithic engines with the Decision Control Plane using transparent assumptions. The illustrative base case produced:

- Migration cost: $5.0M.
- Decision Control Plane steady-state cost: $7.8M.
- Legacy steady-state cost: $10.6M.
- Payback including soft value: 1.04 years.
- Five-year NPV: $13.20M.

These are planning assumptions, not customer-specific financial forecasts. The customer pilot must replace them with measured telemetry.

Every recommendation was expanded with an explicit Return on Research analysis covering:

- Knowledge Value.
- Engineering Leverage.
- Cross-Domain Applicability.
- Validation Cost.
- Maintenance Burden.
- Strategic Priority.

The highest-RoR workstreams are kernel contracts and replay, canonical hashing, tenant-scoped migration, RPO/fencing, assurance/DR/XAI, typed SDK contracts, adapter conformance, and safety observability.

## 13. BPMN and process-model work

The process-model layer was expanded to connect the Decision Control Plane to:

- BPMN process orchestration.
- DMN decision logic.
- CMMN case management.
- State machines.
- Petri nets.
- Event-driven architecture and complex event processing.
- Process mining.
- Simulation and digital-twin methods.
- Rules engines.
- Knowledge graphs.
- Workflow and human task management.
- Stakeholder and target-market journeys.
- People-of-interest screening and reporting.

The design principle is to preserve customer investments in BPMN, DMN, CMMN, workflow, and process-mining artifacts. These models should map to the stable kernel rather than force a replacement of the customer's entire process estate.

## 14. Product and leverage strategy

The research was materialized into a self-contained MVP workspace at:

```text
/home/ubuntu/decision_control_plane_mvp
```

It contains contracts, runtime reference implementations, assurance generators, benchmarks, process models, operating runbooks, product documentation, and a validation orchestrator.

The leverage plan is:

1. Run a 90-day AML lighthouse on one bounded transaction slice.
2. Freeze and certify the canonical kernel contracts.
3. Package the Domain Adapter SDK and assurance suite.
4. Use compliance/XAI, DR, migration, and replay evidence to reduce enterprise approval friction.
5. Add a second domain, such as supplier or procurement risk, only after the AML slice proves economics and adapter reuse.
6. Turn every new deployment into a test of whether the kernel remains stable.

The right commercial motion is land-and-expand:

```text
observe → explain → shadow → co-execute → cut over → extend → generalize
```

## 15. Current validation status

The materialized MVP orchestrator runs:

| Check | Result |
|---|---|
| Policy Interpreter unit tests | Pass |
| RPO/fencing unit tests | Pass |
| Continuous partition harness | 8/8 pass |
| Asynchronous Byzantine harness | 6/6 pass |
| Compliance/XAI report generation | Pass with zero findings on reference package |
| Self-contained leverage workspace validation | Pass |
| Production-specific validation | Not yet performed |

## 16. What should happen next

### Next 30 days

Select one pilot customer, one transaction rail, one tenant or legal entity, one policy bundle, and one action boundary. Capture incumbent decisions, policy versions, evidence, action outcomes, latency, audit effort, and analyst reconstruction time.

### Days 31–60

Connect the real Domain Adapter in shadow mode. Run replay and differential analysis, validate tenant isolation, execute infrastructure-specific chaos tests, and integrate the observability dashboard with the customer's alerting system.

### Days 61–90

Run action dry runs, dual-write and reconciliation, a bounded canary, a partition/fencing drill, a selective restore, and a TCO refresh. Decide whether to cut over the slice, narrow the pilot, or stop expansion.

### After the first pilot

Only if the pilot passes the correctness, determinism, fencing, action, RPO, isolation, operational, and economic gates should the team build a second-domain adapter and broaden process-model interoperability.

## 17. Final recommendation

Build the **Decision Control Plane Kernel plus the Financial Crime Screening Pack**, and deploy it as a bounded, evidence-producing pilot. Keep the kernel stable and keep domain semantics, data connectors, AI methods, storage, replication, simulation, and visualization pluggable.

The durable strategic asset is not one AML ruleset or one database deployment. It is the reusable relationship between **canonical decisions, immutable events, evidence, policy, actions, outcomes, tenant context, ownership, replay, and operational proof**.

## References

[1]: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final "NIST SP 800-34 Rev. 1, Contingency Planning Guide"

[2]: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html "AWS, Disaster recovery options in the cloud"

[3]: https://csrc.nist.gov/pubs/sp/800/207/final "NIST SP 800-207, Zero Trust Architecture"

[4]: https://www.omg.org/spec/BPMN/2.0.2/About-BPMN "OMG BPMN 2.0.2"

[5]: https://www.omg.org/spec/DMN/1.5/About-DMN "OMG DMN 1.5"

[6]: https://www.omg.org/spec/CMMN/1.1/About-CMMN "OMG CMMN 1.1"

[7]: https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html "FATF Recommendations"

[8]: https://ofac.treasury.gov/media/16331/download?inline "OFAC Framework for Compliance Commitments"
