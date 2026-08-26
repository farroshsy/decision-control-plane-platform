## Cover
Decision Infrastructure
A decade-stable kernel for relationship-centric decisions under uncertainty
Cross-industry patterns, real-time financial-crime screening, and replaceable technology

## Slide 1
The same decision recurs under different names
- Manufacturing: approve, allocate to, monitor, or replace a supplier
- Finance: trade with, limit, collateralize, or close out a counterparty
- Government: award, reject, condition, or monitor a contractor
- Clinical research: select, monitor, remediate, or close a site

**Core insight:** the object is not an entity score; it is a contextual relationship decision.

## Slide 2
The invariant is a replayable decision event
> Every consequential decision is a replayable, evidence-bound event over a versioned relationship state.

- Evidence is time-stamped, scoped, sourced, and uncertainty-aware
- Relationships and exposures are first-class, not hidden in tables
- Policy constraints are separated from predictive estimates
- Action, approval, monitoring, and outcome remain linked

## Slide 3
The decision grammar is stable across industries
**Decision =** subject + relationship + exposure + context + evidence + policy + alternatives + action + outcome

- Universal: identity, relationship, evidence, time, constraints, decision, action, outcome
- Variable: ontology, loss model, thresholds, authority, cadence, permitted actions
- Rejected abstraction: one universal risk score

## Slide 4
Financial-crime screening needs two coordinated paths
**Fast path:** bounded, deterministic pre-execution disposition
- Normalize parties and transaction fields
- Resolve current entity, list, graph, and feature state
- Evaluate effective-dated policy
- Allow, block, hold, step-up, or route to review

**Durable path:** investigation and learning
- Preserve evidence snapshot and policy trace
- Enrich graph and related activity asynchronously
- Record analyst finding, reporting obligation, and outcome
- Reopen without rewriting the original decision

## Slide 5
High-frequency screening is a temporal graph problem
- Party identity is not enough: include accounts, beneficial owners, intermediaries, affiliates, wallets, and jurisdictions
- Screen both lists and behavior: transaction monitoring is a subset of broader suspicious-activity monitoring [1]
- Use event time and processing time explicitly
- Treat candidate match, confirmed match, anomaly, and legal conclusion as different states

## Slide 6
The canonical decision object preserves the proof
A transaction decision binds:
- `transaction_id`, party roles, relationship IDs, amount, product, channel, jurisdictions
- evidence snapshot, list bundle, graph version, feature version, and missing evidence
- typed facts, candidate matches, counterevidence, uncertainty, and scenarios
- policy bundle, rules fired, disposition, obligations, action acknowledgement, and triggers

**Result:** an analyst can reconstruct what the system knew, believed, and did.

## Slide 7
The Domain Adapter is the semantic boundary
The core kernel owns:
- decision episodes, evidence binding, immutable events, replay, lifecycle, and audit

The AML adapter owns:
- canonicalization and identity binding
- morphology-aware and transliteration-aware candidate generation
- graph slice and exposure calculation
- monitoring facts and typology signals
- action mapping, retrospective re-screening, reporting, and outcome normalization

**Rule:** adapters translate meaning; they do not fork the decision theory.

## Slide 8
The Policy Interpreter turns facts into governed action
- Input: typed facts, evidence snapshot, context, state, policy bundle, evaluation clock
- Output: disposition, obligations, routes, missing-data behavior, fired rules, counterevidence, explanation, and trace hash
- Hard constraints run before soft scoring or optimization
- `true`, `false`, `unknown`, and `conflicted` are explicit states
- Policies are effective-dated, immutable after activation, and tested in shadow mode

OFAC's framework similarly emphasizes risk assessment, internal controls, testing, audit, recordkeeping, and rapid response to changing sanctions data [2].

## Slide 9
What must remain stable for a decade
- Decision episode as the primary unit
- Subject–relationship–exposure context
- Evidence and claim provenance
- Temporal validity and dual clocks
- Hard constraints separated from estimates
- Immutable history and deterministic replay
- Explicit unknown and conflict states
- Human accountability, challenge, and exception paths
- Action and outcome closure
- Versioned extension contracts and falsifiable benchmarks

## Slide 10
What should remain replaceable
| Pluggable surface | Replaceable implementations |
|---|---|
| Entity resolution | Exact, phonetic, transliteration, embeddings, graph-assisted |
| Policy language | YAML, Rego, CEL, Datalog, DSL, visual authoring |
| Policy runtime | Tree evaluator, compiled IR, WASM, rule engine |
| Models | Rules, statistical, ML, foundation models, ensembles |
| Graph engine | SQL, property graph, RDF, temporal/distributed graph |
| Stream runtime | Kafka/Flink, Pulsar, CDC, event mesh |
| Evidence extraction | Parsers, OCR, document AI, multimodal models |
| Simulation | Monte Carlo, discrete-event, agent-based, optimization solvers |
| Visualization | Tables, timelines, graphs, scenario maps, accessible text |

**Compatibility rule:** new components emit typed outputs with provenance, uncertainty, version IDs, replay artifacts, and conformance tests.

## Slide 11
The reference architecture is a control loop
Sources → evidence plane → identity and relationship graph → state and exposure → scenarios → policy gate → Decision Workbench → action/workflow → monitoring → outcomes → learning

- Immutable event log and evidence store sit beneath every layer
- Domain adapters supply ontology, loss model, rules, and actions
- Engines can be replaced without changing canonical semantics
- Real-time screening is one latency profile, not a separate theory

## Slide 12
Build the kernel before the industry pack
1. Freeze canonical schemas, event envelopes, provenance, and replay semantics
2. Build an evidence ledger and temporal relationship graph
3. Implement a narrow AML adapter with benchmarked matching and policy evaluation
4. Add workflow, reporting obligations, monitoring, and outcome capture
5. Prove adapter interchangeability through shadow runs and conformance tests
6. Extend to supply chain, public procurement, counterparty, and clinical domains

**Closing principle:** build reusable capability, not another dashboard.

### Selected sources
[1] Wolfsberg Group, *The Wolfsberg Group Statement on Effective Monitoring for Suspicious Activity* (2024).
[2] U.S. Treasury OFAC, *A Framework for OFAC Compliance Commitments*.
[3] FATF, *The FATF Recommendations*.
[4] farroshsy/venture repository, especially CROSSCUT, BUILD-SPEC, and PROGRAM-C-FINDINGS.
