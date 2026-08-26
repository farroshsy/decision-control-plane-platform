# Decision Infrastructure

## A cross-industry abstraction for evidence-to-action decisions

**Author:** Manus AI  
**Purpose:** Research and systems-design blueprint, not a startup proposal  
**Scope:** Manufacturing and supply chain, financial markets, public procurement, and clinical research

## Executive conclusion

The recurring patterns in supplier risk, counterparty risk, government vendor responsibility, and clinical-trial site oversight are **substantially the same class of decision problem**, but not the same domain model.

The common problem is:

> **Should an organization enter, continue, limit, allocate, monitor, remediate, or exit a relationship or dependency, given incomplete and changing evidence, a concrete exposure, available alternatives, hard constraints, and asymmetric consequences?**

The terms differ because each industry names the problem around its dominant object. Manufacturing says *supplier risk* because continuity and quality depend on the supply base. Finance says *counterparty risk* because contractual exposure can move with market conditions and must be aggregated, stress-tested, collateralized, and limited. Government says *contractor responsibility* or *vendor due diligence* because public funds, fairness, eligibility, and defensible award decisions matter. Clinical research says *site readiness* and *risk-based monitoring* because participant safety, data integrity, and study execution depend on investigator sites and contractors.

These are not merely different dashboards for the same risk score. They are instances of a shared **contextual relationship decision**. The unit of analysis is not the entity alone; it is the entity **in relation to a specific obligation, exposure, objective, contract, study, portfolio, or dependency, at a point in time**.

A reusable platform should therefore share a decision grammar and infrastructure while allowing domain adapters to define their own ontology, loss model, evidence standards, policies, scenarios, and permitted actions. The right abstraction is **not a universal risk score**. It is a governed, temporal, evidence-backed decision loop.

## 1. Research question and method

The source brief asks for important decisions that remain poorly supported by modern software and specifically warns against building another dashboard, ERP, CRM, or reporting layer. This analysis narrows the search to a pattern that can be tested across unrelated industries:

1. A decision-maker must judge an external node or internal capability.
2. The judgment is made in a specific context, not in the abstract.
3. Evidence is heterogeneous, incomplete, stale, contradictory, or distributed across systems.
4. The outcome depends on the relationship and exposure, not just on the node's intrinsic attributes.
5. The decision is constrained by policy, law, risk appetite, fairness, safety, or capacity.
6. The decision must be revisited as conditions and evidence change.
7. A defensible record of evidence, reasoning, approval, action, and outcome is required.

The comparison uses primary or institutional sources where available. The Federal Acquisition Regulation defines contractor responsibility, the New Zealand Government Procurement guidance describes due diligence, U.S. banking guidance defines the counterparty-risk control framework, Kearney documents an end-to-end supplier-risk operating model, and FDA and peer-reviewed clinical-research sources describe risk-based site oversight.

## 2. The recurring patterns

### Pattern A: Qualification before commitment

Every domain asks whether a candidate is capable, eligible, trustworthy, and suitable for a particular obligation before committing scarce resources or accepting exposure.

In public procurement, the U.S. rules require an affirmative responsibility determination and assess financial resources, delivery capability, performance record, integrity, operational controls, technical skills, facilities, and legal eligibility. The rule explicitly warns that selecting on lowest price alone may create a false economy after default, delay, or poor performance [1]. New Zealand guidance similarly requires independent verification of identity, financial ability, capacity, and capability over the life of the contract, with documented evidence and cross-checks [2].

In manufacturing, supplier approval combines quality, capacity, delivery, resilience, cybersecurity, financial health, and often environmental or labor criteria. In clinical research, site readiness spans the research team, infrastructure, study management, data management, quality oversight, and ethics and safety [6]. In finance, onboarding a counterparty is inseparable from determining legal entity identity, credit quality, transaction eligibility, collateral arrangements, and exposure limits.

The surface vocabulary is different, but the decision structure is the same: **qualify a node for a relationship-specific role under constraints**.

### Pattern B: Exposure matters more than entity reputation

The same entity can be acceptable in one context and unacceptable in another. A supplier with good overall performance may still be unsuitable for a safety-critical component. A bank may be a sound counterparty for one transaction but create excessive concentration in a portfolio. A contractor may be responsible for a routine purchase but lack the specialized facilities required for a defense or clinical contract. A clinical site may be generally competent but unable to recruit the target population or execute a protocol on schedule.

This is why entity-centric scoring is inadequate. The system must model:

| Object | Meaning | Examples |
|---|---|---|
| **Entity** | The organization, person, facility, instrument, or site being evaluated | Supplier, bank, contractor, hospital, investigator |
| **Relationship** | The contractual, operational, financial, scientific, or organizational link | Purchase contract, derivative, grant, study delegation |
| **Exposure** | What can be lost, delayed, corrupted, or put at risk through the relationship | Spend, replacement cost, collateral, participant safety, data integrity |
| **Context** | The specific objective, product, study, geography, time horizon, and constraints | Critical component, OTC portfolio, public tender, phase III trial |
| **Alternatives** | Substitutes or fallback actions | Dual source, novate trade, re-tender, add monitoring, pause enrollment |

The Federal Reserve describes counterparty credit risk as bilateral and time-varying: exposure and credit quality change with market factors, and their interaction matters [3]. This is the clearest formal example of the principle, but the principle generalizes to physical supply and clinical operations.

### Pattern C: Heterogeneous evidence must become a defensible claim

The decision uses financial statements, performance records, audit reports, legal filings, certifications, site visits, market data, operational telemetry, news, sanctions or debarment records, contract terms, and human assessments. The evidence differs in freshness, authority, granularity, completeness, and likelihood of error.

New Zealand's public-procurement guidance recommends verifying information from multiple sources, including supplier documents, third parties, references, audited accounts, credit checks, registries, site visits, security checks, and performance reports [2]. The guidance also requires documentation and says that new information should update the evaluation. Clinical research sources describe a similar need to combine centralized data checks, site records, on-site visits, and targeted follow-up rather than treating one inspection as complete assurance [4] [6].

The reusable primitive is not a raw data field. It is an **evidence-backed claim**:

> “Entity E, in relationship R and context C, has capability K as of time T, supported by source S, with reliability and uncertainty U.”

A claim can be corroborated, contradicted, expired, scoped to a subsidiary, or rendered irrelevant by a changed context. This is closer to an evidence ledger than to a conventional feature table.

### Pattern D: Risk assessment is a control policy, not only a forecast

The output is not simply a probability. Decision-makers must choose a control: approve, reject, limit, require collateral, diversify, inspect, ask for remediation, add contract protections, increase monitoring, pause, replace, or exit.

The Federal Reserve framework links risk measurement to governance, limits, concentration analysis, stress testing, margin, model validation, legal controls, and escalation [3]. Kearney describes supplier risk management as a connected process from sensing to execution, embedded in sourcing, contracting, and sales-and-operations planning [5]. FDA describes risk-based monitoring as a dynamic approach in which findings can trigger training, clarification, or changes in monitoring intensity [4].

Therefore the reusable output should be a **recommended action with conditions and escalation**, not a score displayed beside a green, yellow, or red badge.

### Pattern E: Concentration and hidden dependency are graph problems

Many serious failures are not visible at the node level. They arise from shared ownership, a common sub-tier supplier, correlated geography, a common logistics route, a common clearing member, a shared cloud provider, or multiple contracts depending on one facility.

Finance formalizes this through aggregation of exposures, concentration analysis, central-counterparty exposure, and wrong-way risk [3]. Government procurement must consider proposed subcontractors and affiliated concerns; the eCFR says affiliate performance and integrity may affect responsibility, and subcontractor responsibility can affect the prime contractor's determination [1]. Clinical-trial site frameworks explicitly include satellite sites, external facilities, contractors, and delegated activities [6]. Supplier-risk programs also need multi-tier visibility and connected governance [5].

A temporal, typed graph is thus a core part of the abstraction. It should answer: **What else changes if this node fails, deteriorates, becomes unavailable, or becomes ineligible?**

### Pattern F: Monitoring is a decision to allocate attention

Monitoring capacity is scarce. Organizations cannot inspect every supplier, visit every clinical site constantly, recalculate every exposure at maximum granularity, or manually review every government vendor every day.

The recurring decision is therefore not simply “what is risky?” It is “where should the next unit of human, analytical, financial, or operational attention go?” FDA encourages centralized monitoring and targeted on-site visits to higher-risk clinical investigators [4]. Kearney recommends prioritizing key risks and suppliers, using leading indicators, and linking detection to action [5]. Banking guidance calls for reporting frequency commensurate with materiality and complexity [3].

This is an **attention-allocation problem under uncertainty**, which makes active monitoring, value-of-information analysis, and policy-based triage more important than static rankings.

### Pattern G: Outcomes must close the loop

The system must record what happened after a decision: delivery, default, defect, payment, audit finding, enrollment, protocol deviation, recovery time, loss, remediation, or successful completion. Without outcomes, the organization cannot calibrate signals, distinguish predictive indicators from noise, or learn whether a control was proportionate.

The clinical site-readiness framework spans initial assessment, monitoring, audit, and closeout [6]. The Federal Reserve guidance includes model validation, backtesting, stress testing, and review of measurement weaknesses [3]. Public procurement requires documentation and performance evidence [1] [2]. These are all forms of outcome and feedback capture.

## 3. Comparative decision map

The following table makes the equivalence and the limits explicit.

| Domain | Decision being made | Decision-maker | Exposure or dependency | Typical action set | Dominant loss model | Main evidence |
|---|---|---|---|---|---|---|
| Manufacturing / supply chain | Approve, source, dual-source, allocate volume to, monitor, or replace a supplier | Procurement, quality, supply-chain, plant, and executive teams | Production continuity, quality, inventory, lead time, safety, margin | Approve, conditionally approve, audit, buffer inventory, dual-source, reduce share, replace | Expected disruption cost, quality loss, recovery time, service-level impact | Quality records, delivery history, capacity, financials, geopolitical and climate signals, sub-tier graph |
| Financial markets | Trade with, extend limits to, collateralize, net, diversify, or terminate a counterparty relationship | Trading, credit, treasury, risk, legal, and senior management | Bilateral mark-to-market exposure, settlement, collateral, concentration, wrong-way risk | Approve, set limit, require margin, net, hedge, stress, restrict, close out | Expected loss, exposure-at-default, potential future exposure, stress loss, capital and policy constraints | Positions, market data, legal terms, ratings, collateral, payments, entity hierarchy |
| Public procurement | Award, reject, condition, monitor, or remediate a contractor or subcontractor | Contracting officer, evaluation panel, program owner, oversight body | Public money, delivery, integrity, safety, statutory and policy compliance | Award, exclude, request evidence, add terms, surveil, suspend, terminate | Best value subject to law, performance failure, public harm, audit and fairness constraints | Registry, financials, past performance, certifications, proposal, references, security and integrity checks |
| Clinical research | Select a site, initiate it, allocate monitoring intensity, remediate, pause, or close it | Sponsor, CRO, principal investigator, quality and safety teams | Participant safety, data quality, recruitment, protocol execution, study timelines | Initiate, train, central-monitor, visit, retrain, pause, replace, close out | Safety and data-integrity risk, enrollment delay, trial validity, regulatory risk | Site qualifications, staff, infrastructure, data anomalies, deviations, enrollment, audits, safety reports |
| Insurance underwriting | Accept, price, limit, condition, monitor, renew, or decline a risk | Underwriter, actuary, risk, claims, and portfolio managers | Expected claims, catastrophe accumulation, capital, fraud, reinsurance | Quote, price, exclude, add deductible, limit, reinsure, renew, decline | Expected loss, tail risk, capital and portfolio constraints | Application, exposure characteristics, loss history, geospatial hazards, inspections, claims and external signals |

The insurance row is included as a fifth validation domain, although the primary evidence set in this report focuses on the first four. It demonstrates that the abstraction is broader than third-party management: the same grammar applies when the “relationship” is an insurer's acceptance of a policyholder exposure rather than a procurement or counterparty relationship.

## 4. Are these actually the same underlying decision problem?

### Answer: yes at the decision-grammar level; no at the semantic and economic level

The hypothesis passes if “same problem” means a common structure:

> **Given a changing relationship graph, heterogeneous evidence, an objective, alternatives, hard constraints, and uncertain outcomes, select and govern an action that keeps expected harm within tolerance while preserving value.**

The hypothesis fails if it means that every domain can share one risk score, one probability model, one threshold, one ontology, or one optimization objective.

A useful formalization is:

\[
D = \langle S, R, C, O, A, E_t, P, L, G, \tau \rangle
\]

where:

| Symbol | Meaning |
|---|---|
| \(S\) | Subject or candidate entity |
| \(R\) | Relationship or role connecting the subject to the organization |
| \(C\) | Decision context, including objective, scope, geography, product, study, or portfolio |
| \(O\) | Exposure or dependency created by the relationship |
| \(A\) | Available actions and alternatives |
| \(E_t\) | Evidence available at time \(t\), including provenance and uncertainty |
| \(P\) | Hard policies, laws, eligibility rules, and risk appetite |
| \(L\) | Domain-specific loss, utility, or consequence model |
| \(G\) | Governance requirements, approvals, duties, and escalation paths |
| \(\tau\) | Time horizon and review cadence |

The decision engine seeks an action:

\[
a^* = \arg\max_{a \in A} U(a \mid S,R,C,O,E_t)\]

subject to:

\[
P(S,R,C,a)=\text{true}
\]

and with explicit uncertainty, scenario ranges, and human approval where required. The equation is not a prescription to automate every decision. It is a way to separate **shared infrastructure** from **domain-specific judgment**.

### What can be shared

| Shared layer | Why it generalizes |
|---|---|
| Entity resolution and identity graph | Subsidiaries, affiliates, sites, people, instruments, facilities, and aliases create the same identity problem |
| Relationship and dependency graph | Exposure is relational and often transitive |
| Evidence ingestion, provenance, versioning, and freshness | All domains need to know what is known, from where, and as of when |
| Claim and contradiction model | Multiple sources disagree and must be reconciled rather than silently averaged |
| Scenario and counterfactual engine | Decision-makers need to ask what happens under failure, stress, delay, or change |
| Policy and constraint engine | Hard rules must be separated from preferences and predictions |
| Decision episode and workflow | Recommendation, approval, escalation, action, and review recur across domains |
| Explanation and audit record | Regulated or high-consequence decisions require a defensible trail |
| Monitoring and alerting | New evidence should trigger re-evaluation and allocation of attention |
| Outcome and feedback loop | Results are required for calibration and continuous improvement |

### What must remain domain-specific

| Domain-specific layer | Examples |
|---|---|
| Ontology | Material and plant; legal entity and derivative; contract and appropriation; study and site |
| Exposure metric | Recovery time and stockout; potential future exposure; public-service failure; participant safety and data integrity |
| Loss and utility model | Expected loss, tail loss, capital usage, public value, study validity, safety |
| Hard constraints | Regulatory eligibility, sanctions, collateral, quality standards, ethics, procurement law |
| Evidence admissibility | Audited accounts, validated market data, certified lab results, regulatory records, site documents |
| Action vocabulary | Dual-source and inventory buffer; margin call and closeout; tender exclusion; retraining or site pause |
| Authority model | Credit officer, contracting officer, quality unit, principal investigator, ethics committee |
| Review cadence | Intraday, daily, event-driven, monthly, milestone-based, annual |

## 5. Proposed Decision Infrastructure abstraction

### 5.1 Definition

**Decision Infrastructure** is a reusable platform for turning distributed evidence about entities, relationships, exposures, and environments into governed decisions and closed-loop actions.

It has five properties:

1. It treats the **decision episode**, not the dashboard, as the primary product object.
2. It represents entities in context through a **temporal relationship and exposure graph**.
3. It stores **claims with provenance, confidence, freshness, scope, and contradiction status**, not just flattened scores.
4. It separates **hard constraints, predictive estimates, preferences, and human judgment**.
5. It closes the loop by linking recommendation to approval, execution, monitoring, outcome, and learning.

### 5.2 Core domain model

| Primitive | Required fields | Purpose |
|---|---|---|
| **Entity** | `entity_id`, type, legal names, aliases, identifiers, jurisdiction, parent/affiliate links, validity interval | Resolve who or what is being evaluated |
| **Relationship** | `relationship_id`, source, target, role, contract/instrument/study, start/end, terms, status | Define how the entity connects to the organization |
| **Exposure** | amount or dependency measure, unit, direction, horizon, criticality, concentration group, recoverability | Quantify or characterize what is at stake |
| **Context** | objective, product/project/study, geography, scenario, decision date, alternatives | Make evaluation conditional and comparable |
| **Claim** | subject, predicate, object/value, source, timestamp, scope, confidence, freshness, status | Represent an assertion about the world |
| **Evidence item** | raw artifact pointer, extractor, checksum, access time, source authority, retention class | Preserve what supports the claim |
| **Signal** | feature/event/anomaly, method, threshold, baseline, severity, uncertainty | Detect a relevant change or pattern |
| **Scenario** | assumptions, shocks, dependencies, horizon, probability or range, model version | Test future states and counterfactuals |
| **Policy** | rule, jurisdiction, owner, effective interval, exception path, priority | Enforce hard constraints and governance |
| **Decision episode** | question, subject/context, alternatives, evidence snapshot, decision, rationale, approver, timestamp | Make the unit of work auditable and replayable |
| **Action/control** | action type, owner, due date, preconditions, expected effect, status | Translate insight into operational change |
| **Outcome** | observed result, loss/benefit, timing, causal notes, reviewer, linked episode | Feed learning and calibration |
| **Explanation** | decisive evidence, counterevidence, rules fired, sensitivity, uncertainty, rejected alternatives | Let a human challenge or defend the recommendation |

### 5.3 Canonical decision object

A portable decision object could be serialized as follows:

```json
{
  "decision_id": "dec-2026-000184",
  "question": "Should this relationship continue under the proposed context?",
  "subject": { "entity_id": "ent-0042", "role": "supplier" },
  "relationship": { "relationship_id": "rel-0198", "type": "critical-component-contract" },
  "context": {
    "objective": "maintain production of product-x",
    "scope": "plant-07",
    "horizon": "12 months",
    "alternatives": ["dual_source", "inventory_buffer", "replace"]
  },
  "exposure": {
    "criticality": "high",
    "annual_spend": 8200000,
    "estimated_recovery_days": { "p50": 45, "p90": 120 },
    "concentration_group": "single-source-bearing-assembly"
  },
  "evidence_snapshot": "evidence-snap-2026-08-23T12:00:00Z",
  "claims": [
    { "claim_id": "cl-11", "predicate": "has_satisfactory_delivery_record", "value": true, "confidence": 0.91 },
    { "claim_id": "cl-12", "predicate": "shares_subtier_with", "value": "ent-991", "confidence": 0.74 }
  ],
  "constraints": ["policy-critical-supplier-review", "quality-certification-current"],
  "scenarios": ["base", "port-disruption", "supplier-default"],
  "recommendation": {
    "action": "conditional_continue",
    "conditions": ["approve_second_source", "increase_buffer_to_30_days"],
    "confidence": "medium",
    "expected_rationale": "acceptable current performance but high concentration and recovery exposure"
  },
  "human_decision": {
    "decision": "approved_with_conditions",
    "actor": "role-supply-chain-risk-committee",
    "timestamp": "2026-08-23T13:00:00Z"
  },
  "review_trigger": ["subtier-ownership-change", "delivery-late-rate-above-threshold"],
  "provenance": { "model_version": "adapter-manufacturing-0.3.0", "policy_version": "policy-17" }
}
```

The same shape can represent a counterparty limit review, a government responsibility determination, or a clinical-site monitoring decision by replacing the domain adapter and metrics.

## 6. Reference architecture

### 6.1 Architectural layers

![Decision Infrastructure reference architecture](decision_infrastructure_architecture.png)

*Figure 1. A reusable evidence-to-action control loop with domain-specific adapters.*

| Layer | Responsibilities | Design principle |
|---|---|---|
| **Source connectors** | ERP, procurement, trading, market, registry, document, sensor, audit, news, geospatial, and user-uploaded sources | Treat every source as time-varying and fallible |
| **Ingestion and evidence plane** | Capture, checksum, normalize, classify, extract, retain, and version raw artifacts | Never lose the original evidence |
| **Identity and relationship plane** | Entity resolution, legal hierarchy, aliases, ownership, contracts, facilities, instruments, sub-tier and delegated relationships | Make graph edges first-class |
| **Claim and knowledge plane** | Store claims, provenance, confidence, freshness, contradictions, and semantic mappings | Separate assertion from fact certainty |
| **Exposure and state plane** | Calculate current exposure, criticality, concentration, dependency, capacity, and state estimates | Contextualize the entity |
| **Scenario and model plane** | Forecasting, stress testing, simulation, causal hypotheses, optimization, and value-of-information analysis | Show ranges and sensitivities, not false precision |
| **Policy and decision plane** | Eligibility, limits, constraints, exceptions, action recommendation, approval routing, and escalation | Hard rules before soft ranking |
| **Workflow and action plane** | Tasks, requests for evidence, audits, contract changes, monitoring, remediation, and replacement | Connect insight to action |
| **Outcome and learning plane** | Capture realized performance, losses, deviations, recovery, model calibration, and policy review | Make every decision teach the system |
| **Experience plane** | Decision workbench, evidence view, graph view, scenario comparison, approval record, and APIs | Optimize for a decision moment, not a dashboard wall |

### 6.2 Event-driven control loop

The operational loop is:

1. **Define:** A user asks a decision question with an objective, context, horizon, and alternatives.
2. **Resolve:** The system resolves the entity, relationship, affiliates, delegated parties, and relevant exposure graph.
3. **Assemble:** It builds a time-stamped evidence snapshot and identifies missing or contradictory claims.
4. **Estimate:** Domain models calculate current state, forecast ranges, concentration, and uncertainty.
5. **Constrain:** Policy rules eliminate prohibited or ineligible actions and identify required approvals.
6. **Compare:** Scenarios and alternatives are evaluated using the domain loss and utility model.
7. **Recommend:** The system proposes an action, conditions, monitoring plan, and confidence level.
8. **Decide:** An authorized human approves, rejects, modifies, or requests more evidence.
9. **Execute:** The action creates operational tasks, contractual controls, limits, inspections, or workflow changes.
10. **Monitor:** New events, thresholds, periodic reviews, and user observations reopen the episode when warranted.
11. **Learn:** Outcomes update calibration, indicator usefulness, policy thresholds, and playbooks.

This loop is reusable because only the adapters change: the source mappings, ontology, exposure calculators, loss models, rules, and action types.

### 6.3 Event model

A minimal event taxonomy includes:

| Event class | Examples | Typical consequence |
|---|---|---|
| Identity | Merger, ownership change, sanctions hit, debarment, license expiration | Re-resolve graph; trigger eligibility review |
| Financial | Rating change, covenant breach, liquidity signal, late payment | Recalculate exposure and limits |
| Operational | Late delivery, quality defect, downtime, enrollment shortfall | Escalate monitoring or remediation |
| Relationship | New contract, delegation, subcontractor, trade, facility closure | Add or change graph edge |
| External | Weather, conflict, regulation, cyber incident, disease outbreak | Re-run affected scenarios |
| Evidence | New filing, audit, certification, site report, data anomaly | Update claims and confidence |
| Outcome | Default, successful delivery, recovered loss, protocol deviation, claim | Calibrate model and playbook |

## 7. Why modern software still struggles with this problem

The difficulty is not simply a lack of AI. It is a systems problem created by the interaction of organizational, semantic, and governance constraints.

First, the data is fragmented by ownership. Procurement owns vendors, finance owns payment and exposure, quality owns audits, operations owns performance, legal owns contract terms, and risk owns thresholds. The same entity appears under different identifiers, and the relationship is often implicit in documents or spreadsheets.

Second, the decision is contextual. A generic supplier score, credit rating, or site grade cannot express whether the entity is suitable for a specific component, instrument, study, or public contract. The relevant object is a conditional relationship with an exposure and time horizon.

Third, evidence is not uniform. A regulatory record, audited statement, self-attestation, news report, sensor event, and human observation have different authority and failure modes. Conventional data warehouses tend to flatten them into fields and hide provenance.

Fourth, the output is governed action. A decision may require a contracting officer, credit officer, quality unit, ethics committee, or board-level approval. Fully automated optimization can be invalid even when prediction is accurate because authority, fairness, safety, and procedural requirements matter.

Fifth, most systems are optimized for transactions and reporting, not for revisitable decisions. They store the current vendor, current counterparty, or current site status but not the complete evidence snapshot, rejected alternatives, uncertainty, rule interpretation, approval path, and realized outcome that made a decision defensible.

Sixth, the graph is dynamic. New subsidiaries, shared facilities, subcontractors, common owners, and changing terms can alter concentration and dependency without changing the name of the primary entity. Static master data is not enough.

## 8. Technical implementation blueprint

### 8.1 Storage and processing

A practical long-term implementation should use polyglot persistence rather than force every object into one database.

| Need | Suggested storage pattern | Reason |
|---|---|---|
| Raw documents and source artifacts | Object storage with immutable versions and checksums | Retain original evidence and reproducibility |
| Canonical entities, relationships, policies, decisions | Relational database | Transactions, constraints, permissions, auditability |
| Temporal graph traversal | Property graph or graph layer over relational storage | Ownership, dependency, concentration, delegation, path analysis |
| Claims and semantic search | Document store plus vector index | Retrieval over evidence while preserving structured claims |
| Time-series signals and exposure | Columnar warehouse or time-series store | Efficient aggregation and historical replay |
| Event transport | Durable event log or queue | Recompute affected decisions after new signals |
| Models and features | Versioned feature/model registry | Reproducibility, rollback, and adapter isolation |
| Human review and workflow | Relational workflow tables plus task/event stream | Approvals, exceptions, evidence requests, remediation |

A durable identifier strategy is essential. Every entity, relationship, evidence item, claim, model, policy, decision episode, and action should have a stable ID and validity interval. All derived outputs should be reproducible from a source snapshot and versioned computation.

### 8.2 AI usage

AI is useful in bounded roles:

| AI capability | High-value use | Required control |
|---|---|---|
| Document extraction | Extract financial figures, clauses, certifications, site capabilities, and obligations | Field-level citations, confidence, human review for material claims |
| Entity resolution | Match aliases, subsidiaries, facilities, instruments, and people | Candidate links, explainable features, no silent merges |
| Claim extraction | Convert text into typed assertions with source spans | Preserve quote, page/section, timestamp, and scope |
| Contradiction detection | Find conflicts between filings, attestations, audits, and observed performance | Route disputes; do not force a single truth |
| Retrieval and synthesis | Prepare a decision brief from distributed records | Every material statement links to evidence |
| Anomaly detection | Detect unusual payment, delivery, market, quality, enrollment, or activity patterns | Baselines, false-positive review, drift monitoring |
| Forecasting | Estimate delay, default, capacity, loss, enrollment, or recovery ranges | Calibration, backtesting, uncertainty intervals |
| Recommendation | Rank permitted actions and generate rationale | Policy engine and human approval remain authoritative |
| Conversational interface | Let a professional ask “what changed?” or “what would break?” | Constrained retrieval; no unsupported assertions |

The strongest first use of generative AI is not autonomous approval. It is **evidence assembly, explanation, and investigation acceleration**.

### 8.3 Graph usage

The graph should support at least these traversals:

- Which contracts, plants, products, accounts, studies, or public programs depend on this entity?
- Which other entities share an owner, facility, bank, logistics route, sub-tier supplier, cloud service, investigator, or clearing relationship?
- What is the total exposure after aggregating across legal entities, instruments, contracts, and affiliates?
- What changes if this node becomes unavailable for 30, 90, or 180 days?
- Which decision episodes relied on a claim that has now expired or been contradicted?
- What alternative paths exist, and how long would substitution take?

### 8.4 Forecasting, simulation, and optimization

The system should distinguish three analytical modes.

**Forecasting** estimates what may happen if current conditions continue: delay probability, expected loss, quality failure, enrollment, capacity, or recovery time. It should produce calibrated ranges rather than a single unqualified number.

**Simulation** explores shocks and dependencies: a supplier outage, a counterparty default under market stress, a subcontractor failure, a cyber incident at a clinical site, or a weather event affecting a shared route. Monte Carlo, discrete-event simulation, agent-based models, or scenario trees can be selected per adapter.

**Optimization** chooses an allocation or portfolio subject to constraints: supplier shares and safety stock, counterparty limits and collateral, procurement award bundles, or monitoring visits across sites. Optimization should never bypass eligibility, authority, or fairness constraints.

A useful decision-support addition is **value of information**: when evidence is missing, estimate whether an audit, site visit, credit check, second reference, or data purchase could materially change the recommended action. This turns “collect more data” into a decision with cost and expected benefit.

## 9. Domain adapters

### Manufacturing adapter

The manufacturing adapter maps bills of material, plants, lanes, materials, supplier sites, quality records, purchase orders, and sub-tier relationships into the common model. Its key outputs are criticality, single-source exposure, lead-time risk, capacity sufficiency, quality risk, time-to-recover, and feasible mitigation actions. A first implementation should connect supplier qualification to sourcing events, inventory policy, production planning, and corrective-action workflows.

### Finance adapter

The finance adapter maps legal entities, portfolios, trades, netting sets, collateral, limits, market factors, and settlement obligations. It requires domain-specific exposure measures such as current exposure, potential future exposure, stress exposure, concentration, and wrong-way risk. Its most important architectural requirement is aggregation across books, legal entities, products, and correlated counterparties without losing transaction-level explainability.

### Public procurement adapter

The public-procurement adapter maps solicitations, evaluation criteria, vendors, affiliates, subcontractors, contract vehicles, performance records, eligibility restrictions, and public-sector approval roles. It must distinguish mandatory responsibility and eligibility rules from scored preferences, preserve fairness and equal-treatment evidence, document the evaluation basis, and support post-award performance monitoring and remediation.

### Clinical research adapter

The clinical adapter maps study protocols, sites, investigators, satellite facilities, CROs, participants, critical data, deviations, enrollment, safety, audits, and monitoring plans. It should recommend monitoring intensity and intervention based on criticality and observed signals, not apply the same visit schedule to every site. Any action affecting participant protection or study conduct must route through the appropriate accountable roles.

## 10. Product surface: the Decision Workbench

The primary user experience should be a **Decision Workbench**, not a dashboard. A workbench is opened for a concrete question and contains:

| Panel | Question answered |
|---|---|
| Decision question | What must be decided, by whom, by when, and for what objective? |
| Relationship context | What is the entity's role, obligation, exposure, and dependency graph? |
| Evidence ledger | What do we know, from which sources, as of when, and with what contradictions? |
| State and scenarios | What is the current estimate, what could change, and what are the downside cases? |
| Constraints | Which options are prohibited, required, or approval-gated? |
| Alternatives | What are the feasible actions and their cost, benefit, risk, and reversibility? |
| Recommendation | What action is proposed, under what conditions, and with what uncertainty? |
| Human decision | Who approved, modified, rejected, or requested more evidence? |
| Action plan | What tasks, limits, inspections, contract changes, or monitoring actions follow? |
| Outcome loop | What will be measured to learn whether the decision worked? |

This is a decision artifact that can be exported as an approval memo, procurement record, credit file, quality review, or clinical monitoring plan while retaining machine-readable structure.

## 11. Governance, security, and failure modes

The platform will handle commercially sensitive, regulated, and potentially personal information. It should apply tenant and domain isolation, row- and field-level access control, encryption in transit and at rest, key management, retention policies, legal holds, purpose limitation, and complete immutable audit trails. Sensitive attributes should not be exposed to models or users without an explicit purpose and authorization.

Model governance should include versioned training data, feature lineage, calibration, drift tests, backtesting, fairness tests where people or organizations may be advantaged or excluded, adversarial testing, approval records, and rollback. The system must distinguish “no evidence,” “negative evidence,” and “positive evidence.” Missing data must not silently become a low-risk value.

The principal failure modes are:

| Failure mode | Why it is dangerous | Mitigation |
|---|---|---|
| Universal score collapse | Erases context and gives false comparability | Keep adapter-specific metrics and explicit decision context |
| Silent entity merge | Attributes the wrong evidence to a subject | Candidate resolution, review thresholds, merge history |
| Stale evidence | Makes past capability look current | Freshness intervals, expiry events, revalidation workflows |
| Correlation blindness | Misses shared dependency and concentration | Temporal graph, path aggregation, scenario shocks |
| Automation bias | Humans accept machine recommendations uncritically | Show counterevidence, sensitivity, uncertainty, and alternatives |
| Policy bypass | Optimizer selects an ineligible action | Hard constraints execute before ranking |
| Alert fatigue | Too many signals destroy attention | Materiality, value-of-information, deduplication, escalation budgets |
| Goodharting | Participants optimize the metric rather than the outcome | Use multiple indicators and outcome validation |
| Untraceable AI output | No defensible record for a high-consequence decision | Claim-level citations, prompts/models versioned, reviewer sign-off |
| Feedback contamination | Decisions change behavior, making outcomes nonstationary | Track interventions and policy changes in the outcome model |

## 12. Build sequence for an extraordinary engineering project

A long-term implementation should proceed in slices that each deliver a real decision capability.

| Phase | Capability | Demonstration |
|---|---|---|
| 1. Evidence foundation | Immutable source artifacts, entity IDs, claim schema, provenance, and a basic decision record | Reconstruct why a historical decision was made |
| 2. Relationship graph | Ownership, contracts, facilities, affiliates, subcontractors, instruments, and dependencies | Find hidden concentration and delegated risk |
| 3. First domain adapter | Manufacturing supplier qualification and continuity decision | Approve, condition, or replace a supplier with cited evidence |
| 4. Workflow and policy | Rules, exceptions, approvals, evidence requests, and remediation tasks | Convert recommendation into governed action |
| 5. Monitoring loop | Events, freshness, thresholding, triage, and episode reopening | Detect a material change and route attention |
| 6. Second adapter | Counterparty exposure and limit review | Reuse the same primitives with different metrics and constraints |
| 7. Scenario engine | Stress, substitution, disruption, and recovery simulation | Compare mitigations under explicit assumptions |
| 8. Third adapter | Public contractor responsibility and post-award performance | Produce a documented and auditable determination |
| 9. Fourth adapter | Clinical site readiness and monitoring allocation | Reuse evidence, graph, and monitoring infrastructure in a safety-critical domain |
| 10. Learning system | Outcome capture, calibration, model registry, policy review, and decision-quality metrics | Measure whether decisions improved, not just whether users clicked |

### Evaluation metrics

The project should measure decision quality and operational usefulness rather than dashboard activity:

- Time from decision question to evidence-complete review.
- Percentage of material claims with source, freshness, and scope recorded.
- Entity-resolution precision and reviewed-merge rate.
- Percentage of decisions with explicit alternatives and constraints.
- Time from material event to human review or control action.
- False-positive and false-negative rates for alerts by domain.
- Forecast calibration and interval coverage.
- Concentration or dependency discoveries that were not visible in source systems.
- Outcome-adjusted loss, delay, defect, safety, or performance improvement.
- Percentage of actions completed and verified.
- Decision reversibility and audit reconstruction time.
- Human challenge rate and rate of recommendation modification.

## 13. Return on Research analysis

Every recommendation in this blueprint should be judged by **Return on Research (RoR)**, not only by product attractiveness or engineering novelty. RoR asks whether a workstream compounds understanding and reusable capability faster than it consumes validation and maintenance capacity.

The estimates below use a five-point ordinal scale. A score of **5** means high knowledge value, high engineering leverage, or broad applicability. For validation cost and maintenance burden, the direction is inverted: **5 means low cost or low burden**, while **1 means high cost or high burden**. The portfolio score is:

\[
RoR = 0.25K + 0.25L + 0.20X + 0.15V + 0.15M
\]

where \(K\) is Knowledge Value, \(L\) is Engineering Leverage, \(X\) is Cross-Domain Applicability, \(V\) is Validation Ease, and \(M\) is Maintenance Ease. This is a research-prioritization score, not a monetary return estimate.

| Workstream recommendation | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Strategic priority |
|---|---:|---:|---:|---|---|---:|---|
| **W1. Theory and decision grammar** | 5 | 5 | 5 | High / 3 | Low / 5 | **4.70** | **Now** |
| **W2. Canonical ontology and schemas** | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| **W3. Evidence, claim, provenance, and contradiction model** | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| **W4. Temporal events, state, and deterministic replay** | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| **W6. Policy IR and Policy Interpreter** | 5 | 5 | 5 | High / 3 | High / 3 | **4.40** | **Now, after W1–W4 contracts** |
| **W13. Governance, standards, and research archive** | 4 | 5 | 5 | High / 3 | Medium / 4 | **4.30** | **Now, in parallel** |
| **W5. Relationship and exposure graph** | 5 | 5 | 5 | Very high / 2 | High / 3 | **4.25** | **Now, after schema baseline** |
| **W7. Domain Adapter SDK and conformance suite** | 4 | 5 | 5 | High / 3 | High / 3 | **4.15** | **After one stable adapter contract** |
| **W12. Outcome capture, calibration, and learning loop** | 5 | 4 | 5 | Very high / 2 | High / 3 | **4.00** | **Later, after live decisions produce outcomes** |
| **W11. Scenario, simulation, and value-of-information engine** | 4 | 4 | 4 | Very high / 2 | High / 2 | **3.40** | **Later, after evidence and exposure state exist** |
| **W14. Cross-industry adapter packs** | 3 | 4 | 5 | Very high / 2 | High / 2 | **3.35** | **Only if W7 succeeds** |
| **W10. Decision Workbench and explanation UX** | 3 | 3 | 4 | Medium / 3 | High / 3 | **3.20** | **After one complete decision loop** |
| **W15. Data connector library** | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | **On demand; do not build a catalog first** |
| **W8. AML transaction-screening adapter** | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | **Now only as a proving ground for the kernel** |
| **W9. Real-time stream and hot-path benchmark harness** | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | **Conditional on W8 or another real-time adapter** |

### Interpretation by workstream

**W1 — Theory and decision grammar.** Its knowledge value is maximal because it tests whether the proposed abstraction is genuinely a common decision structure rather than an attractive analogy. Its engineering leverage is maximal because every later schema, adapter, and benchmark depends on the grammar. It is broadly applicable and relatively maintainable once expressed as a small set of primitives. Validation is costly because it requires counterexamples and cross-domain experts, but it should happen immediately because errors here contaminate everything downstream.

**W2 — Canonical ontology and schemas.** This creates the durable vocabulary and compatibility boundary. Its value compounds through every adapter and API, but schema design is difficult to validate because premature generalization can create false universals. The work should begin now with a deliberately small core and explicit extension points; it should not attempt to encode every industry before any adapter exists.

**W3 — Evidence, claim, provenance, and contradiction model.** This has unusually high RoR because it turns raw data into defensible, replayable knowledge and applies across regulated decisions. It is expensive to validate because evidence quality and contradiction semantics require real cases, but maintenance is manageable if the model stores provenance and supports additive predicates rather than hard-coded domain fields. It belongs in the first foundation release.

**W4 — Temporal events, state, and deterministic replay.** This is the most important engineering multiplier after the ontology because it supports audit, debugging, retrospective analysis, model comparison, and high-frequency screening. The validation burden is high because replay must be tested under duplicates, late events, failures, and version changes. It is still a “now” workstream: the linked repository demonstrates why an independently verifiable durable artifact is more valuable than a trust-me cache [8].

**W5 — Relationship and exposure graph.** The graph creates deep cross-domain insight by exposing concentration, delegation, shared ownership, and hidden dependencies. Its RoR is slightly lower than the foundational data model because graph semantics, identity resolution, and temporal traversal are expensive to validate and maintain. Build a narrow temporal graph after W2–W4, beginning with one high-value path such as ownership and subcontractor concentration.

**W6 — Policy IR and Policy Interpreter.** This is a high-leverage bridge from evidence to governed action. It deserves early investment because a decision system without policy semantics collapses into analytics. Maintenance is high because jurisdictional and organizational policies change, so the interpreter must remain stable while policy bundles evolve. Start after the canonical fact and event contracts are stable, and test it through shadow evaluation before any live enforcement.

**W7 — Domain Adapter SDK and conformance suite.** This is the mechanism that turns the theory into a reusable research platform. Its cross-domain applicability and engineering leverage are high, but it should not be designed in a vacuum. The first adapter should reveal the actual contract, and the conformance suite should encode falsifiers, replay fixtures, missing-data behavior, and performance envelopes.

**W8 — AML transaction-screening adapter.** Its direct cross-domain applicability is lower because morphology, watchlists, typologies, reporting, and real-time latency are domain-specific. Its research value is nevertheless high as a proving ground: it stresses identity resolution, temporal events, policy interpretation, auditability, and stream processing. It should be done now only after a thin kernel exists, and only with pre-registered recall, false-positive, latency, completeness, and replay benchmarks.

**W9 — Real-time stream and hot-path benchmark harness.** This creates valuable knowledge about bounded decision latency, backpressure, idempotency, action acknowledgement, and failure modes. However, its value is conditional: without a real adapter and realistic events, it becomes infrastructure theatre. It should follow W8 or another real-time adapter and be evaluated against a declared transaction mix and failure model.

**W10 — Decision Workbench and explanation UX.** The workbench is important for human accountability, but it has lower foundational RoR than the kernel because the right interface depends on observed decisions, evidence disputes, and analyst behavior. Begin after one end-to-end decision loop exists. Validate by decision completion time, evidence challenge rate, reconstruction accuracy, and action quality—not screen engagement.

**W11 — Scenario, simulation, and value-of-information engine.** This could become a major differentiator because it lets users compare mitigations and decide what evidence to acquire. Its validation and maintenance costs are high: models require assumptions, calibration, domain expertise, and outcome data. It should be delayed until exposure state and outcomes are available, beginning with simple scenario replay before general-purpose simulation.

**W12 — Outcome capture, calibration, and learning loop.** This workstream has high knowledge value because it reveals which evidence and actions actually predict or improve outcomes. It should not be postponed indefinitely, but its meaningful validation requires live decisions and labeled outcomes. Build the event and outcome schema now; build sophisticated calibration later, after the first adapter generates sufficient evidence.

**W13 — Governance, standards, and research archive.** This has high RoR because it prevents conceptual drift, preserves negative results, and makes the project reproducible for future contributors. It should run in parallel with the foundation. The repository's frozen protocols, adversarial memos, explicit failure conditions, and post-hoc audit record illustrate the value of this work [8].

**W14 — Cross-industry adapter packs.** These provide visible generalization evidence, but their foundational knowledge value is lower than the core ontology and adapter SDK. Building too many packs early creates maintenance sprawl and encourages false claims of universality. Add a second and third pack only after one adapter has passed conformance and the kernel has survived a falsification attempt.

**W15 — Data connector library.** Connectors are necessary but have low standalone research value and high maintenance burden because external APIs, schemas, credentials, and legal access conditions change. Build only the connectors required by a concrete adapter benchmark. Prefer a small connector contract and reusable ingestion patterns over a large prebuilt catalog.

### RoR decision rule

A workstream should be started now when it has high RoR **and** establishes a dependency required by later work. A workstream with lower direct RoR may still be started as a **proving ground** when it falsifies a critical architectural assumption. A workstream should be deferred when it depends on evidence, outcomes, or user behavior that does not yet exist. A workstream should be conditional when its value is primarily unlocked by another workstream's success.

This rule changes the sequence from “build every capability in the architecture” to “build the smallest artifact that maximizes future learning.” The recommended order is therefore **W1 → W2/W3/W4 → W6/W13 → W5 → W7 → W8/W9 → W10/W12 → W11 → W14/W15**, with W13 running throughout.

## 14. Final judgment

The most defensible cross-industry insight is not “build a better risk dashboard.” It is:

> **Organizations repeatedly need to make governed decisions about changing relationships and dependencies, but their software separates identity, evidence, exposure, policy, workflow, and outcomes.**

Supplier risk, counterparty risk, contractor responsibility, and clinical-site monitoring are therefore different **adapters to one decision infrastructure**. The shared platform should provide the evidence ledger, temporal graph, exposure context, scenario engine, policy gate, decision episode, workflow, explanation, and learning loop. The domain adapter should provide semantics and consequences.

This abstraction is technically ambitious because it requires distributed data engineering, identity resolution, graph modeling, temporal state, probabilistic forecasting, simulation, optimization, human-computer interaction, governance, and reliable workflow execution. It is also product-realistic: professionals do not primarily need another screen; they need a faster, more defensible answer to a consequential question, with a clear path from evidence to action and a record of what happened afterward.

## References

[1]: https://www.ecfr.gov/current/title-48/chapter-1/subchapter-B/part-9/subpart-9.1 "eCFR, 48 CFR Part 9 Subpart 9.1 — Responsible Prospective Contractors"

[2]: https://www.procurement.govt.nz/guides/guide-to-procurement/source-your-suppliers/conducting-due-diligence-checks/ "New Zealand Government Procurement, Conducting due diligence checks"

[3]: https://www.federalreserve.gov/frrs/guidance/interagency-supervisory-guidance-on-counterparty-credit-risk-management.htm "Federal Reserve, Interagency Supervisory Guidance on Counterparty Credit Risk Management"

[4]: https://www.fda.gov/media/116754/download "U.S. FDA, Oversight of Clinical Investigations — A Risk-Based Approach to Monitoring"

[5]: https://www.kearney.com/industry/health/article/the-five-crucial-components-of-supplier-risk-management "Kearney, The five crucial components of supplier risk management"

[6]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10346039/ "Buse et al., A framework for assessing clinical trial site readiness, Journal of Clinical and Translational Science"

[7]: https://www.occ.gov/topics/supervision-and-examination/capital-markets/financial-markets/counterparty-risk/index-counterparty-risk.html "Office of the Comptroller of the Currency, Counterparty Risk"

[8]: https://github.com/farroshsy/venture "farroshsy/venture research repository"
