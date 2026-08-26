# Decision Infrastructure research notes

## Verified evidence

### Public procurement / contractor responsibility
Source: https://www.ecfr.gov/current/title-48/chapter-1/subchapter-B/part-9/subpart-9.1

The U.S. Federal Acquisition Regulation requires affirmative responsibility determinations before award. Responsibility includes adequate financial resources; ability to meet delivery/performance schedules; satisfactory performance record; integrity and business ethics; necessary organization, experience, accounting and operational controls, technical skills, equipment and facilities; and legal eligibility. The rule explicitly warns that lowest price alone can be a false economy if default, late delivery, or poor performance creates downstream cost. Special standards may be developed for particular acquisitions; subcontractor responsibility can affect the prime contractor's determination. This is evidence of a decision that joins identity, capability, capacity, past performance, integrity, legal eligibility, price, and downstream consequence rather than a single price comparison.

Source: https://www.procurement.govt.nz/guides/guide-to-procurement/source-your-suppliers/conducting-due-diligence-checks/

New Zealand Government Procurement guidance says due diligence should independently verify that a supplier is who they claim to be, has financial ability to deliver, and has capacity/capability over the contract life. It recommends planning the checks, specifying them in tender documents, collecting evidence, cross-verifying from multiple sources, documenting all actions, updating scoring if new information changes the evaluation, excluding or not awarding where issues are serious, and mitigating or gathering additional information when issues are less serious. Evidence types include legal records, financial history, corruption indicators, past performance, systems/processes, proposal assumptions, audit/accreditation reports, references, site visits, staff CVs, service reports, company registries, audited accounts, credit checks, insurance, compliance certificates, and security checks.

### Finance / counterparty risk
Source: https://www.occ.gov/topics/supervision-and-examination/capital-markets/financial-markets/counterparty-risk/index-counterparty-risk.html

The U.S. Office of the Comptroller of the Currency defines counterparty risk as the probability that the other party in an investment, credit, or trading transaction will not fulfill its contractual obligations and may default. This is a relational exposure decision, not just an entity score: the relevant unit is the organization’s exposure to a particular counterparty under a transaction or portfolio.

Source: https://www.federalreserve.gov/frrs/guidance/interagency-supervisory-guidance-on-counterparty-credit-risk-management.htm

Federal Reserve interagency guidance describes counterparty credit risk as bilateral and time-varying: exposure and credit quality can change with market factors, and their interaction matters. It calls for governance, risk tolerance, management reporting, risk measurement metrics, firm-wide exposure aggregation, concentration analysis, stress testing, collateral/margin and limits, model/system validation, legal and operational risk controls, and timely monitoring. The guidance notes historical weaknesses in timely and accurate exposure aggregation, correlation-risk measurement, exposure-limit and concentration management, and system infrastructure.

### Manufacturing / supplier risk
Source: https://www.kearney.com/industry/health/article/the-five-crucial-components-of-supplier-risk-management

Kearney describes five components: intelligent risk-based decision-making using risk vectors and leading indicators; an end-to-end process connected to strategic sourcing, contracting and S&OP; multi-tier governance across strategic, tactical and operational decisions; a technology stack that connects insight to action and can incorporate new data/proxies; and a proactive risk-aware culture. It explicitly frames the task as moving from sensing to executing, prioritizing key risks and suppliers, and using leading indicators to predict vulnerabilities rather than reacting after failures.

## Initial synthesis

Across the three domains, the recurring decision pattern is: whether and how to enter, continue, limit, allocate, or intervene in a relationship with an external entity, given incomplete and changing evidence, a specific exposure or dependency, policy constraints, alternative options, and asymmetric downside. The terminology differs—supplier qualification/risk, counterparty credit risk, contractor responsibility—but the common object is a time-indexed decision episode over an entity-in-context relationship.

Important non-equivalence: the domains do not share identical semantics or loss models. Finance often has market-valued bilateral exposure, netting, collateral, stress scenarios, and regulatory capital. Procurement has public-law eligibility, fairness, documentation, and best-value/contract-performance criteria. Manufacturing emphasizes operational continuity, multi-tier dependencies, quality, capacity, and time-to-recover. The reusable layer should therefore standardize evidence, relationships, exposures, policies, scenarios, workflow, and auditability while allowing domain-specific metrics, loss functions, constraints, and action vocabularies.

## Candidate reusable abstraction

Decision = choose an action a for a subject s in context c at time t, using evidence E with provenance and uncertainty, to optimize expected utility U(a | s,c,t,E) subject to hard constraints, risk appetite, and governance requirements. The system should represent not only an entity but the relationship and exposure: who/what depends on whom, for what obligation or objective, under what terms, with what alternatives and time horizon.

Core primitives to test further: Entity; Relationship; Exposure/Dependency; Evidence/Claim; Signal; Scenario; Policy/Constraint; Decision Episode; Action/Control; Outcome/Feedback; Provenance/Version; Explanation/Challenge record.

Core loop: define decision -> resolve entities/relationships -> collect and reconcile evidence -> estimate state and uncertainty -> generate scenarios -> evaluate alternatives under policy -> recommend or route -> capture human decision -> execute control -> monitor changes -> learn from outcomes and revise.

## Source caveat

The acquisition.gov page was inaccessible from the browser due to a CloudFront 403; the eCFR mirror provided the relevant current Part 9 text and is the source used here. Search snippets are not treated as evidence.

### Healthcare / clinical-trial site readiness
Source: https://www.fda.gov/media/116754/download

FDA's risk-based monitoring guidance says sponsors should focus oversight on critical data and processes, use a combination of centralized and on-site monitoring, document monitoring activities, and amend monitoring plans as evidence changes. It describes risk-based monitoring as dynamic and aimed at preventing or mitigating important and likely risks to data quality, subject protection, and trial integrity; findings should trigger additional actions such as training or clarification when needed. Site selection and initiation are included as part of the broader oversight system.

Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC10346039/

A peer-reviewed framework for clinical-trial site readiness synthesized 217 qualifications from 50 documents used by 14 sponsors and organized readiness into research team, infrastructure, study management, data collection and management, quality oversight, and ethics and safety. It reports that inconsistent and sponsor-specific qualifications create fragmented, duplicative feasibility and qualification work. The framework is designed to support initial assessment, monitoring, audit, and closeout, with common practices that can be modified for study-specific requirements.

## Hypothesis test update

The same structural pattern appears in at least four unrelated domains: manufacturing/supply chain, financial markets, public procurement, and clinical research. In all four, the actor must evaluate a candidate or existing external node in relation to a concrete obligation, dependency, or exposure; combine heterogeneous evidence with different reliability and time horizons; apply hard eligibility and policy rules; choose among accept/decline/limit/monitor/remediate/replace actions; and preserve a defensible record. The decision is revisited as new evidence arrives.

The cross-domain invariant is therefore not "risk scoring" and not "vendor management." It is a **contextual relationship decision under uncertainty**. The shared system boundary is an evidence-to-action control loop around a relationship or dependency. A domain-specific adapter supplies the ontology, loss model, thresholds, scenarios, and permitted actions.

The hypothesis should be rejected if one tries to make all domains share a single scalar risk score, a single probability model, a single loss function, or one universal workflow. The abstraction should unify the decision grammar and system primitives, not erase domain semantics.

## Falsifiable design claims

1. A decision record that explicitly stores entity, relationship, exposure, objective, alternatives, evidence provenance, uncertainty, policy constraints, action, and outcome should be reusable across the four domains.
2. Separating hard constraints from soft preferences should improve explainability and reduce invalid recommendations, especially in regulated procurement and clinical research.
3. A temporal relationship graph should reveal concentration, shared dependencies, hidden affiliates, subcontractor chains, and changing exposure that entity-centric dashboards miss.
4. Event-driven monitoring should reduce time from signal to review, but it cannot replace human judgment where evidence is sparse, contested, or normatively constrained.
5. Outcome capture is essential: without recording realized performance/default/quality/clinical outcomes, the system cannot calibrate signals, learn which evidence is predictive, or distinguish bad luck from bad decisions.

## Additional source URLs

- https://www.federalreserve.gov/frrs/guidance/interagency-supervisory-guidance-on-counterparty-credit-risk-management.htm
- https://www.ecfr.gov/current/title-48/chapter-1/subchapter-B/part-9/subpart-9.1
- https://www.procurement.govt.nz/guides/guide-to-procurement/source-your-suppliers/conducting-due-diligence-checks/
- https://www.occ.gov/topics/supervision-and-examination/capital-markets/financial-markets/counterparty-risk/index-counterparty-risk.html
- https://www.kearney.com/industry/health/article/the-five-crucial-components-of-supplier-risk-management
- https://www.fda.gov/media/116754/download
- https://pmc.ncbi.nlm.nih.gov/articles/PMC10346039/

## Supplemental repository review: farroshsy/venture

Repository: https://github.com/farroshsy/venture

The repository is explicitly adversarial and skeptical of platform framing. Its cross-cutting taxonomy groups integrity failures across 30 industries into DOC (document forgery), CRED (credential fraud), ID (identity verification failure), PROV (asset provenance), DUP (duplicate claims), FUND (fund custody opacity), EVT (fabricated event records), SETT (handoff/settlement disputes), AUTH (product authenticity), and COLL (off-system collusion). It notes that horizontal recurrence does not imply one product, buyer, or workflow. The repository's strongest product-coherent candidates are narrow verify-side credential checking and lender-facing duplicate-claim detection; it rejects broad horizontal platforms when the failure mode, authority, buyer, or field operation differs.

The repository's BUILD-SPEC selects forkprint, a narrow content-addressed, state-root-verifiable fixture tool, rather than a general platform. Its durable insight is that the format and verification invariant should compound while adapters and clients evolve. It emphasizes content-addressed immutable artifacts, offline verification, deterministic replay, explicit hard errors on missing data, pre-registered benchmarks, and a falsifier that can kill the project if the premise fails.

Program C is directly relevant to financial-crime screening. Its H2 describes an Indonesian statutory watchlist screening wedge: portfolio-wide re-screening triggered by a police letter; morphology-aware matching for mononyms and transliteration variants; parsing DTTOT/DPPSPM; onshore processing; statutory document generation; audit trail; no PII leaving the tenant; and benchmarks for recall, false positives per 100k records, and turnaround to signed berita acara/laporan nihil. The repo also identifies regulator-format-first reporting and custody reconciliation as adjacent patterns.

Program C's protocol defines a displacement hypothesis around proven spending, observed dissatisfaction, structural incumbent constraints, and measurable advantage. Its stable methodological implications for this design are: treat a concrete decision and evidence snapshot as the unit of analysis; require a measurable benchmark; separate demand from displacement opportunity; and avoid claiming horizontal coverage when the buyer, workflow, authority, or operational model differs.

Implication for this task: the financial-crime adapter must support high-throughput real-time screening without losing the same evidence, policy, decision, and audit semantics used in slower workflows. The policy interpreter must be able to emit an immediate transaction disposition and also produce a later investigation-grade decision episode. The architecture should preserve immutable evidence and deterministic replay as stable principles, while making matching, graph analytics, policy language, stream engine, model, connector, and visualization replaceable.

## Financial-crime screening evidence

Source: https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html

FATF presents its Recommendations as an international standard that countries adapt to their legal, administrative, operational, and financial-system circumstances. This supports an adapter architecture: the core decision theory is stable, while jurisdictional obligations, definitions, and controls are configurable.

Source: https://wolfsberg-group.org/news/the-wolfsberg-group-statement-on-effective-monitoring-for-suspicious-activity

The Wolfsberg Group states that the growing volume of SARs/STRs is not proportionately producing effective financial-crime outcomes and argues for more effective end-to-end monitoring. It deliberately uses Monitoring for Suspicious Activity (MSA) as a wider concept than transaction monitoring: customer behaviour and customer attributes combined with transactions provide broader insight, and transaction monitoring is a subset of MSA that can include ongoing customer due diligence. This supports modeling a screening decision as a contextual relationship/exposure decision, not a transaction-only list hit.

Technical implication: real-time screening needs two time horizons in one canonical object. The fast path makes a bounded transaction disposition from a point-in-time evidence snapshot and policy version. The durable path appends a decision episode with normalized matches, graph context, policy trace, analyst actions, and eventual outcome. The fast path must be deterministic/replayable and fail closed or route to review according to policy; the durable path can enrich asynchronously without changing the original disposition.

## Sanctions-compliance control evidence

Source: https://ofac.treasury.gov/media/16331/download?inline

OFAC's framework describes a risk-based sanctions compliance program with management commitment, risk assessment, internal controls, testing/auditing, and training. It says programs should identify, interdict, escalate, report as appropriate, and keep records for potentially prohibited activity; internal controls should adjust rapidly to list and regulatory changes; solutions should be selected and calibrated to the organization's risk profile and routinely tested; and weaknesses should receive compensating controls while root causes are remediated. It also describes risk assessment across customers, supply chain, intermediaries, counterparties, transactions, products/services, and geographies.

Architecture implication: Policy Interpreter must be able to evaluate hard prohibitions, soft risk indicators, escalation obligations, reporting obligations, recordkeeping, temporary compensating controls, and effective-dated policy changes. Screening decisions need policy/version provenance and a path from immediate disposition to subsequent investigation, reporting, testing, and audit.
