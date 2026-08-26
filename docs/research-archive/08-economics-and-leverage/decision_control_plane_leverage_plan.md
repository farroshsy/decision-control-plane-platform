# How to Leverage the Decision Control Plane Work

## Executive answer

Do not treat the research as a collection of documents, diagrams, and prototypes. Convert it into a **repeatable enterprise decision product** with three layers:

1. **Kernel:** canonical decision/event/evidence/replay contracts that remain stable.
2. **Lighthouse product:** real-time financial-crime screening where the value is urgent, measurable, and difficult to fake.
3. **Adapter and operating system:** APIs, Policy IR, process-model integration, tenant governance, DR, XAI reporting, runbooks, benchmarks, and deployment profiles that make the kernel deployable repeatedly.

The core leverage strategy is:

> **Use financial crime to prove the kernel, use process-model interoperability to make it reusable, and use governance/replay/DR evidence to make it enterprise-buyable.**

## 1. Convert the research into reusable assets

| Existing asset | Product asset | How to leverage it |
|---|---|---|
| Canonical decision object | Decision episode API and event schema | Make it the stable integration contract for every adapter |
| Policy Interpreter prototype | Policy IR runtime and conformance suite | Make policy execution deterministic, inspectable, and replaceable |
| Domain Adapter API/protobuf | Adapter SDK and certification program | Reduce time to onboard AML, procurement, supplier, and clinical domains |
| Stress-test simulator | Capacity and SLO benchmark harness | Size deployments and expose bottlenecks before production |
| Active-active simulation | DR/failover acceptance suite | Turn resilience claims into evidence and operational drills |
| Compliance/XAI generator | Audit evidence and investigator report service | Turn every material decision into an explainable control artifact |
| Governance/tenant model | Enterprise deployment profile | Make security, residency, key, and disclosure requirements explicit |
| BPMN/DMN/CMMN catalog | Process-model ingestion and mapping layer | Let customers keep existing process/decision/case models |
| Stakeholder BPMN | Buying-center and implementation map | Align economic buyer, compliance, engineering, security, audit, and operations |
| TCO model | Finance-approved business-case template | Replace platform rhetoric with measured cost per decision and payback |
| Operational runbook | Managed-service operating model | Make migration, key rotation, DR, and incident response part of the offer |

## 2. Product portfolio

### Product 1 — Decision Control Plane Kernel

The Kernel is the reusable infrastructure product. It owns decision episodes, canonical events, evidence references, policy/version binding, action lifecycle, tenant scope, audit, replay, and outcome closure. It should be sold or deployed as a platform capability, not as a generic rules engine.

### Product 2 — Financial Crime Screening Pack

The first domain pack owns transaction canonicalization, party/role binding, candidate facts, relationship and exposure context, AML policy mappings, case/reporting obligations, and action mapping. The pack should integrate with existing payment, KYC, watchlist, case, and reporting systems rather than attempting to replace all of them.

### Product 3 — Adapter and Process Integration Kit

The Kit includes REST/gRPC contracts, protobuf types, schema registry, adapter test harness, BPMN/DMN/CMMN mappings, event correlation, model registry, replay fixtures, and deployment profiles. It gives enterprise teams a controlled way to connect local processes and domain models without modifying the kernel.

### Product 4 — Assurance and Operations Suite

The Suite includes compliance/XAI reports, audit-chain verification, DR drills, tenant-isolation tests, capacity simulation, migration comparison, policy shadowing, and runbooks. It is the part that makes the architecture easier for security, audit, model risk, and operations teams to approve.

## 3. The first customer motion

### Ideal lighthouse customer

Choose one institution with:

- a high-volume transaction rail;
- a painful legacy screening or decision engine;
- a strong compliance and platform engineering sponsor;
- enough historical decisions for replay and benchmarking;
- an existing action and case system that the product can integrate with;
- willingness to run shadow mode and provide adjudicated outcomes;
- a bounded corridor, product, or tenant slice suitable for controlled cutover.

Avoid starting with the most politically complex enterprise-wide transformation. Choose a narrow decision boundary where audit, replay, latency, and operational pain are visible.

### Lighthouse offer

Offer a 90-day validation program with a fixed scope:

1. behavioral inventory of one incumbent decision slice;
2. compatibility facade;
3. canonical event and decision capture;
4. shadow adapter and Policy Interpreter;
5. replay and differential report;
6. tenant/security assessment;
7. load and failover drill;
8. business case using measured cost per decision;
9. recommendation to cut over, narrow, or stop.

The customer should receive evidence whether or not production cutover proceeds. That makes the offer credible and reduces procurement resistance.

## 4. Land-and-expand sequence

| Stage | Customer-visible outcome | Expansion trigger |
|---|---|---|
| 1. Observe | Existing engine behavior becomes replayable and measurable | ≥95% of target slice captured and reconciled |
| 2. Explain | Decision, evidence, policy, and version trace are visible | Analysts and auditors reconstruct decisions faster |
| 3. Shadow | New adapter and interpreter compare against incumbent | No unexplained critical divergence |
| 4. Co-execute | New and legacy systems dual-write and reconcile | Zero duplicate actions; audit completeness passes |
| 5. Cut over | New system owns one bounded action slice | Latency, resilience, and correctness targets pass |
| 6. Extend | Add new policy slice, rail, jurisdiction, or tenant | Adapter and kernel contracts remain stable |
| 7. Generalize | Add second domain adapter | No kernel semantic fork; shared primitives measured |

## 5. Where the strongest leverage comes from

### 5.1 Replayable semantics

Canonical objects and event contracts are reusable across every future deployment. They let the team compare incumbent and new behavior, debug incidents, train analysts, validate policies, and support audit without rebuilding the evidence model for every domain.

### 5.2 Policy as a replaceable artifact

Policy IR and deterministic replay let business and compliance teams change policy without rewriting the runtime. The high-leverage capability is not merely authoring a decision table; it is proving exactly which policy version was active, which rules fired, what was unknown, and what would change under a candidate version.

### 5.3 Adapter isolation

Adapters let the company integrate new domains and customer systems without making the kernel customer-specific. The adapter SDK should be a product moat: conformance tests, latency budgets, tenant controls, provenance requirements, and process-model mappings make a certified adapter safer than a one-off integration.

### 5.4 Assurance as a feature

The XAI report generator, DR runbook, active-active simulation, tenant-isolation tests, and TCO model should be bundled into the implementation and operating offer. Enterprise customers buy a reduction in uncertainty and approval friction, not only another runtime.

### 5.5 Process-model interoperability

Customers already have BPMN, DMN, CMMN, workflow, state-machine, and process-mining artifacts. The product should import, map, validate, and correlate those assets instead of asking customers to redraw everything. The Decision Control Plane becomes the evidence and decision substrate beneath their existing process investments.

## 6. Build, buy, or partner

| Capability | Build | Buy/partner | Rule |
|---|---|---|---|
| Canonical decision/event kernel | Build | No | Core intellectual and compatibility boundary |
| Policy IR and trace | Build | Integrate with DMN tools | Own semantics; allow authoring-tool interoperability |
| Watchlist and identity indexes | Integrate | Buy/partner | Domain data and matching are replaceable |
| Graph database/runtime | Integrate | Buy/partner | Own graph contract, not necessarily graph storage |
| Event journal and object storage | Integrate | Buy/managed service | Own ordering, tenant scope, hashes, and replay semantics |
| KMS/HSM and identity provider | Integrate | Buy/enterprise standard | Do not reinvent cryptography or IAM |
| BPMN/DMN/CMMN tooling | Integrate | Partner | Preserve customer model investments |
| Model/feature runtime | Integrate | Buy/partner | Keep model provenance and replacement boundary |
| Case management and reporting | Integrate | Partner | Keep decision/action/evidence linkage |
| Compliance/XAI report generator | Build | Optional template integration | Own evidence packaging and reproducibility |
| DR and load-test harness | Build | Cloud primitives underneath | Own test assertions and decision safety |

## 7. Operating model

### Product engineering

Maintain the kernel, schemas, Policy IR, replay, conformance, adapter SDK, observability, security, and performance harness. Kernel changes require architecture review and compatibility fixtures.

### Domain engineering

Maintain AML, procurement, supplier, clinical, or other domain packs. Domain teams own source semantics, evidence requirements, policy mappings, and action mappings. They cannot change kernel invariants without an explicit RFC.

### Assurance engineering

Maintain tenant isolation, threat model, DR drills, key rotation, audit-chain verification, model/policy governance, data classification, and report generation.

### Customer success / implementation

Run inventory, mapping, shadow comparison, cutover, rollback, training, and operational handoff. This function should use the BPMN stakeholder journey and quickstart guide to make the customer conversation legible.

## 8. Commercial packaging

### Entry offer: Validation and migration assessment

Fixed-duration engagement producing a behavioral inventory, replay corpus, gap analysis, TCO update, threat model, and cutover plan.

### Core offer: Decision Control Plane subscription or managed deployment

Price according to decision volume, peak concurrency, evidence retention, replay usage, residency/isolation tier, support tier, and adapter count. Avoid pricing only by seat count because the product's value and cost are driven by decision and evidence workload.

### Expansion offer: Domain packs and adapter certification

Charge for validated AML, procurement, supplier, clinical, or custom adapters, with a clear separation between source-data integration and kernel licensing.

### Assurance offer: Regulated operations package

Include DR drills, audit/XAI reports, tenant-isolation evidence, key-rotation runbooks, model/policy release controls, and operational readiness exercises.

## 9. What to automate next

The highest-leverage automations are:

1. adapter conformance and tenant-isolation testing in CI;
2. policy compilation, static analysis, and replay comparison;
3. migration input/output capture and semantic-difference classification;
4. decision evidence and XAI report generation;
5. regional failover, ownership fencing, and selective restore drills;
6. cost-per-decision telemetry and TCO refresh;
7. BPMN/DMN/CMMN import-to-canonical mapping;
8. customer-facing architecture and process walkthrough generation.

Do not automate final legal or compliance judgment. Automate collection, comparison, trace construction, evidence packaging, and controlled execution.

## 10. 12-month leverage roadmap

### Months 0–3 — Prove one vertical slice

Freeze the kernel contracts, run one AML validation program, collect cost and outcome telemetry, implement shadow comparison, and execute the first partition and restore drills.

### Months 4–6 — Make the slice repeatable

Package the adapter SDK, deployment profiles, compliance/XAI reports, tenant-isolation tests, runbooks, and customer implementation playbook. Reduce onboarding from bespoke engineering to certified configuration plus bounded extension.

### Months 7–9 — Add one second domain

Implement supplier continuity or public procurement as the second adapter. Measure shared kernel coverage, semantic exceptions, onboarding time, and operational reuse. Use the result to narrow or strengthen the platform thesis.

### Months 10–12 — Productize the platform

Add process-model import, policy lifecycle tools, connector contracts, chargeback telemetry, managed DR exercises, and partner enablement. Expand only where the kernel contracts remain stable.

## 11. Metrics that prove leverage

| Metric | Target direction |
|---|---|
| Time to onboard a new adapter | Down |
| Percentage of adapter implementation outside kernel | Up |
| Percentage of decisions replayable | Toward 100% |
| Unexplained replay divergence | Toward zero |
| Policy change lead time | Down |
| Analyst reconstruction time | Down |
| Duplicate integration count | Down |
| Decision cost per 1,000 transactions | Down or justified by control value |
| Audit completeness | Toward 100% |
| Tenant-isolation negative-test failures | Zero |
| DR drill recovery time | Down |
| Action duplicate count | Zero |
| Policy/model shadow-to-production confidence | Up |
| Revenue or internal reuse from second domain | Up only after first proof |

## 12. RoR-based prioritization

| Workstream | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Priority |
|---|---:|---:|---:|---|---|---:|---|
| Kernel contracts and replay | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| AML lighthouse deployment | 4 | 4 | 2 | High / 3 | High / 2 | **3.15** | Now |
| Adapter SDK and certification | 4 | 5 | 5 | High / 3 | Medium / 4 | **4.25** | After first slice |
| Assurance/DR/XAI package | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | Now |
| BPMN/DMN/CMMN interoperability | 4 | 5 | 5 | High / 3 | Medium / 4 | **4.25** | After kernel proof |
| Second domain validation | 3 | 4 | 5 | Very high / 2 | High / 2 | **3.35** | Months 7–9 |
| Broad connector ecosystem | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | On demand |
| Autonomous decisioning | 2 | 2 | 3 | Very high / 2 | High / 2 | **2.35** | Do not prioritize |

## Final recommendation

Use the accumulated work as an **enterprise proof system** first and a broad platform second. Sell the first customer on a bounded, measurable transformation of one decision slice. Use the kernel, replay, adapter, assurance, and process-model assets to reduce the risk of that transformation. Then use the measured result—not the elegance of the architecture—to decide whether to expand into a second domain and a broader product.

The leverage is highest when every new deployment improves the same core assets: canonical semantics, evidence, replay, policy compilation, tenant controls, resilience tests, and adapter conformance. That is how one AML implementation becomes a reusable Decision Control Plane rather than a collection of customer-specific projects.
