# What We Should Make

## Executive answer

We should build a **Decision Control Plane for high-consequence, relationship-centric decisions**, beginning with **real-time financial-crime transaction screening**.

The first product is not a universal risk platform, a dashboard, a generic graph database, an AI copilot, or a replacement for a bank's core payment or case-management systems. It is a narrowly scoped control plane that answers one operational question:

> **Given this transaction, these parties and relationships, this version of the institution's evidence and policy, and this execution deadline, may the transaction proceed—and can we prove exactly why?**

The product should sit between transaction origination and downstream action systems. It will canonicalize the transaction, bind it to versioned entity and relationship state, evaluate a compiled policy, issue an allow/hold/block/review disposition, send an idempotent action, and preserve a replayable evidence-bound decision record.

The strategic thesis is simple: **make the decision artifact dependable before making the intelligence sophisticated**.

## 1. Product definition

### Working product name

**Decision Control Plane**, with the first domain pack called **Financial Crime Screening**.

“Decision Infrastructure” remains the architectural category and research program. “Decision Control Plane” is the product we can actually build, deploy, benchmark, and sell.

### Initial customer

The initial customer should be a regulated financial institution or financial infrastructure provider that already has payment, onboarding, watchlist, transaction-monitoring, and case systems but cannot reliably connect them into one replayable decision record.

The first buyer is likely a compliance-technology, payments-risk, fraud/AML platform, or enterprise-risk leader. The first operational users are screening engineers, financial-crime operations teams, investigators, model-risk teams, and compliance officers.

### First job to be done

The first job is **pre-execution transaction disposition with durable audit and retrospective reassessment**. The system must support both the low-latency decision and the later investigation, because separating those into unrelated systems destroys the evidence chain.

### Product promise

The product promises four things:

1. **Bounded decisions:** The hot path returns a governed disposition within a declared latency profile without unbounded remote calls.
2. **No silent meaning changes:** Policy, list, entity, relationship, feature, and model versions are pinned to a state manifest.
3. **Replayable proof:** A reviewer can reconstruct what the system knew, which rules fired, what remained unknown, and which action was taken.
4. **Safe evolution:** Matchers, graphs, models, policy runtimes, and connectors can be replaced behind typed, versioned interfaces.

## 2. The minimum valuable product

The minimum valuable product is a complete vertical slice, not a collection of infrastructure components.

```text
Transaction rail
  -> AML Domain Adapter
  -> evidence/state manifest
  -> Policy Interpreter
  -> Decision Kernel
  -> action executor
  -> immutable audit/replay record
  -> analyst review and reassessment
```

### MVP capabilities

| Capability | What we build | Why it belongs in MVP |
|---|---|---|
| Transaction ingestion | Idempotent transaction-proposal API and event intake | Establishes the first decision boundary |
| AML Domain Adapter | Canonicalize parties, accounts, roles, jurisdictions, amounts, and transaction types | Makes domain meaning explicit without contaminating the kernel |
| Evidence/state manifest | Atomically bind policy, watchlist, entity, relationship, feature, and model epochs | Prevents mixed-version decisions |
| Candidate-fact interface | Consume bounded match candidates with evidence references and candidate/confirmed/cleared states | Separates identity evidence from legal conclusions |
| Policy Interpreter | Evaluate precompiled Policy IR with hard constraints, unknown behavior, obligations, and trace | Converts facts into governed action |
| Decision Kernel | Create decision episode, issue disposition, manage lifecycle, and preserve causation | Provides the reusable stable center |
| Action executor | Send idempotent hold, allow, reject, release, or route-to-review commands | Connects reasoning to operational effect |
| Audit log | Append-only event chain plus content hashes and schema references | Makes the outcome defensible and replayable |
| Replay harness | Re-evaluate a pinned decision under the same or candidate policy bundle | Enables engineering, audit, and model governance |
| Minimal workbench | Show decision question, decisive evidence, rules, unknowns, action, and replay link | Gives an investigator a usable decision artifact |
| Benchmark harness | Measure recall/false positives for matching, p99 latency, queue behavior, completeness, and replay fidelity | Proves or falsifies the product thesis |

The MVP should not attempt to become the institution's system of record for customers, transactions, cases, or regulatory filings. It should integrate with those systems and own the **decision episode and control trace**.

## 3. What we are explicitly not making first

The following are strategically deferred:

| Deferred capability | Reason for deferral |
|---|---|
| Universal risk score | It violates the central finding that exposure and policy are contextual |
| General-purpose graph platform | It has high complexity before a concrete traversal and benchmark exist |
| Autonomous compliance officer | It is unsafe, difficult to validate, and conflicts with accountability requirements |
| Foundation-model reasoning engine | It is a replaceable implementation, not the theory |
| Broad connector catalog | Connectors have high maintenance burden and low standalone research value |
| Full simulation/optimization suite | It needs calibrated outcomes and exposure data |
| Multi-industry product suite | It creates adapter sprawl before the first kernel is proven |
| Full case-management replacement | It competes with mature systems without improving the core hypothesis |
| Generic data lake or enterprise knowledge graph | It risks becoming an integration project rather than a decision product |

## 4. The stable kernel we own

The product's durable intellectual and engineering center should contain only the primitives that survived the cross-industry comparison:

| Kernel primitive | Product responsibility |
|---|---|
| Decision episode | Store the question, context, evidence, alternatives, recommendation, approval, action, and outcome |
| Subject–relationship–exposure context | Ensure decisions are not reduced to entity-only scores |
| Evidence and claims | Preserve sources, scope, timestamps, freshness, confidence, contradiction, and missingness |
| Temporal event model | Distinguish event time, processing time, validity intervals, late events, and reassessment |
| Policy execution contract | Evaluate hard constraints before soft estimates and emit a complete trace |
| Immutable history | Prevent historical decisions from being rewritten |
| Deterministic replay | Reconstruct a decision from pinned versions and inputs |
| Explicit uncertainty | Represent `true`, `false`, `unknown`, `conflicted`, candidate, confirmed, and cleared states |
| Action and outcome closure | Link recommendation to execution, acknowledgement, review, and outcome |
| Extension contracts | Allow domain adapters and engines to change without changing canonical semantics |

The core should be deliberately boring. If a proposed feature cannot improve replayability, evidence quality, governed action, safety under change, or adapter reuse, it probably belongs outside the kernel.

## 5. The first domain pack: financial crime

The first domain pack should be a **transaction-screening adapter**, not a complete AML suite.

### Adapter responsibilities

The adapter should own:

- transaction and party canonicalization;
- jurisdiction and product context;
- customer, account, beneficial-owner, intermediary, wallet, and counterparty role binding;
- bounded watchlist and identity candidate generation;
- relationship-slice construction;
- current and aggregate exposure facts;
- transaction-monitoring and typology signals as non-legal facts;
- evidence requirements and freshness declarations;
- mapping of canonical dispositions to payment-rail actions;
- retrospective re-screening triggers;
- reporting-obligation and analyst-outcome normalization.

### First benchmark

The first benchmark should test whether the architecture can simultaneously preserve:

| Dimension | Initial benchmark question |
|---|---|
| Identity quality | Can the adapter improve recall on aliases, transliteration, mononyms, and structured-field differences without unacceptable false positives? |
| Policy correctness | Do effective-dated policies produce the same result under replay and shadow evaluation? |
| Latency | Does the synchronous path meet its declared p99/p99.9 target with pre-materialized state? |
| Resilience | What happens when list, graph, feature, policy, audit, or action dependencies fail? |
| Auditability | Can an investigator reconstruct the exact evidence and policy versions used? |
| Operational value | Does the system reduce unresolved evidence, investigation time, or ungoverned action ambiguity? |

The benchmark must declare its falsifiers before implementation. A successful demo is not evidence of a category; a failed benchmark should narrow or invalidate the claim.

## 6. Technical product architecture

### Control-plane components

The control plane manages policy bundles, Policy IR compilation, adapter manifests, schema versions, state manifests, conformance suites, model metadata, deployment approvals, and replay comparisons.

### Data-plane components

The data plane receives transaction proposals, reads the active screening-state manifest, executes the adapter and Policy Interpreter, emits a compact decision trace, and sends an idempotent action within the rail's deadline.

### Durable-plane components

The durable plane stores the immutable event log, evidence artifacts, decision episodes, action acknowledgements, cases, analyst findings, reassessments, outcomes, and replay manifests.

```text
                         +------------------------------+
                         | Decision Workbench            |
                         | evidence • trace • action     |
                         +---------------+--------------+
                                         |
+------------------+       +------------v-------------+       +--------------------+
| Transaction rail | ----> | Real-time Decision Plane | ----> | Action / case rail |
+------------------+       | Adapter -> Policy ->     |       +--------------------+
                           | Kernel -> compact trace |
                           +------------+-------------+
                                        |
                           +------------v-------------+
                           | Durable Decision Plane    |
                           | events • evidence • replay|
                           +------------+-------------+
                                        |
                           +------------v-------------+
                           | Control Plane              |
                           | policy • schemas • packs   |
                           | manifests • conformance    |
                           +----------------------------+
```

The simulation results change one important design choice: **audit commit must be independently scalable**. In the baseline model, 16 audit workers at 1.5 ms mean service time support roughly 10,667 tx/s, while the 32-worker interpreter supports roughly 16,000 tx/s. The durable audit path must therefore support partitioning, batching, local append-only spooling, or a compact synchronous trace plus asynchronous rich-record persistence. Scaling the interpreter alone will not solve the first bottleneck.

## 7. Interfaces we should freeze early

The following interfaces are the product's compatibility boundary:

```text
POST /v1/transaction-decisions
  input: TransactionProposed event
  output: compact DecisionIssued + ActionRequested result

GET /v1/decisions/{decision_id}
  output: canonical decision episode and evidence references

POST /v1/replay
  input: decision_id, snapshot_manifest, policy_version, engine versions
  output: replay result and differential comparison

POST /v1/policies/compile
  input: authoring format
  output: Policy IR, static-analysis report, conformance result

POST /v1/adapters/{adapter_id}/canonicalize
  input: domain event
  output: canonical event and transformation report

POST /v1/evaluate
  input: decision context, facts, evidence snapshot, Policy IR, evaluation clock
  output: PolicyEvaluation with complete trace

POST /v1/actions
  input: idempotent ActionRequest
  output: ActionAcknowledged or explicit outcome-unknown state
```

The APIs should be versioned around semantic contracts, not implementation frameworks. A matcher, graph engine, policy runtime, or model may be replaced if it emits typed outputs with provenance, uncertainty, version identifiers, replay artifacts, and conformance results.

## 8. Execution roadmap

### Phase 0 — Freeze the claim and falsifiers

**Deliverables:** canonical glossary, decision grammar, schema draft, threat model, benchmark specification, failure-mode catalog, and explicit falsification criteria.

**Exit criterion:** at least one independent domain expert and one systems engineer can implement the same decision object and identify what evidence would disprove the abstraction.

### Phase 1 — Build the replayable kernel

**Deliverables:** event envelope, canonical decision schema, evidence snapshot, state manifest, immutable audit log, replay API, and conformance fixtures.

**Exit criterion:** a historical decision can be reconstructed and its trace verified after process restart, duplicate delivery, late events, and policy-version changes.

### Phase 2 — Build one complete AML vertical slice

**Deliverables:** transaction API, AML adapter, bounded candidate interface, Policy IR runtime, action executor, case handoff, and minimal workbench.

**Exit criterion:** hold, allow, unknown-evidence, duplicate, action-timeout, and list-update scenarios pass end-to-end tests; stage-level latency and failure behavior are measured.

### Phase 3 — Prove production fitness

**Deliverables:** representative load benchmark, burst and failover tests, shadow policy deployment, replay comparison, operational dashboards, runbooks, and security review.

**Exit criterion:** the system meets an agreed rail-specific SLO under production-like load, has no unexplained replay divergence, and has an explicit behavior for every critical dependency failure.

### Phase 4 — Add a second domain only to test generality

**Deliverables:** one non-financial adapter, preferably supplier continuity or public procurement, adapter conformance results, shared-primitive coverage report, and false-abstraction analysis.

**Exit criterion:** the second adapter reuses the kernel without forking decision semantics, and the project can identify which concepts remain universal and which must remain domain-specific.

### Phase 5 — Productize the platform

**Deliverables:** adapter SDK, policy authoring tools, connector contracts, deployment profiles, reference documentation, and partner integration model.

**Exit criterion:** a qualified team can onboard a new domain or institution without modifying the kernel or violating replay and provenance guarantees.

## 9. What success looks like

Success is not the number of alerts, models, connectors, graph edges, or UI screens. Success is demonstrated by a small set of hard measures:

| Measure | Desired evidence |
|---|---|
| Decision reproducibility | Same pinned input yields the same disposition and trace |
| Audit reconstruction | Reviewer can explain the decision without querying five disconnected systems |
| Safe degradation | Dependency failure produces a declared hold, review, or compensating control |
| Operational latency | p99/p99.9 meet the selected transaction-rail profile |
| Outcome quality | Reduced unresolved evidence, avoidable manual effort, or control ambiguity without unacceptable false negatives |
| Adapter reuse | Second domain uses the same episode, evidence, event, replay, and policy contracts |
| Replacement safety | Matcher, graph, model, or policy runtime can be shadowed and swapped without rewriting history |

## 10. Return on Research for the build plan

Every proposed workstream carries an explicit RoR assessment. The following summary uses the prior five-point ordinal framework: high knowledge value, leverage, and applicability score higher; lower validation cost and maintenance burden score higher. The figures are prioritization estimates, not financial forecasts.

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Decision |
|---|---:|---:|---:|---|---|---:|---|
| Decision grammar and falsifiers | 5 | 5 | 5 | High / 3 | Low / 5 | **4.70** | Build now |
| Canonical schemas and event model | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Build now |
| Evidence, provenance, and replay | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Build now |
| Policy IR and interpreter | 5 | 5 | 5 | High / 3 | High / 3 | **4.40** | Build after schemas |
| Relationship/exposure graph | 5 | 5 | 5 | Very high / 2 | High / 3 | **4.25** | Build narrowly |
| AML proving-ground adapter | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | Build conditionally |
| Real-time benchmark harness | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | Build with AML slice |
| Decision Workbench | 3 | 3 | 4 | Medium / 3 | High / 3 | **3.20** | Build after first loop |
| Outcome and calibration loop | 5 | 4 | 5 | Very high / 2 | High / 3 | **4.00** | Start schema now; mature later |
| Simulation and optimization | 4 | 4 | 4 | Very high / 2 | High / 2 | **3.40** | Defer |
| Second and third domain packs | 3 | 4 | 5 | Very high / 2 | High / 2 | **3.35** | Only after kernel proof |
| Broad connector library | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |

The practical conclusion is that the first dollar, engineer-month, or research cycle should go to **replayable semantics and one complete vertical slice**, not to a broad product surface.

## Final recommendation

Make the **Decision Control Plane** first. Its first release should be a financial-crime screening system that makes transaction dispositions **fast enough to operate, strict enough to govern, and durable enough to replay**.

Once that product can demonstrate a real decision flowing from transaction to adapter to policy to action to audit—and can survive duplicates, late evidence, stale state, dependency failure, and load—the broader Decision Infrastructure thesis becomes testable. Only then should we invest in cross-industry adapters, general simulation, advanced AI, or a wider platform narrative.
