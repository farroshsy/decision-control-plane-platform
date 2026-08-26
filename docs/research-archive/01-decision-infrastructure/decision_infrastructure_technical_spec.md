# Decision Infrastructure Technical Specification

## Real-time financial-crime screening, Domain Adapter, and Policy Interpreter

**Status:** Draft v0.1  
**Author:** Manus AI  
**Audience:** Platform engineers, financial-crime technology architects, compliance engineering teams, researchers, and domain-adapter authors

## 1. Design thesis

The Decision Infrastructure is not a universal risk-scoring engine. It is a **replayable decision kernel** that evaluates a relationship or transaction against versioned evidence, policy, state, and alternatives, then records the resulting action and outcome.

The decade-stable invariant is:

> **Every consequential decision is a replayable, evidence-bound event over a versioned relationship state.**

This principle incorporates the strongest design lesson from the linked `venture` repository: make the durable artifact independently checkable, content-addressed or otherwise integrity-protected, deterministic under replay, explicit about missing data, and honest about what the system can prove. The financial-crime implementation adds a hard real-time path, but it must not create a second theory or an un-auditable fast lane.

## 2. Scope and non-goals

### In scope

This specification covers a high-frequency transaction screening and monitoring system that may receive payment, securities, crypto-asset, remittance, or other financial transaction events. It supports sanctions/watchlist screening, customer and counterparty context, graph relationships, risk-based transaction monitoring, operational holds or routing, case creation, reporting obligations, and post-decision review.

The terminology follows a layered model. Transaction screening evaluates a transaction and relevant parties against prohibitions or screening lists. Transaction monitoring evaluates activity patterns over time. Monitoring for Suspicious Activity is broader still: the Wolfsberg Group describes transaction monitoring as a subset that combines transaction information with customer behavior and attributes and can include ongoing customer due diligence [1].

### Non-goals

The system does not decide legal guilt, replace a regulated institution's compliance officer, invent jurisdictional obligations, or guarantee that suspicious activity will be detected. It does not treat a model score as a legal conclusion. It is an evidence-to-action system with configurable policies, explicit uncertainty, and accountable human review.

## 3. Reference operating model

The system has two coordinated paths.

| Path | Purpose | Latency posture | Output |
|---|---|---|---|
| **Synchronous disposition path** | Make a bounded decision before or during transaction execution | Deterministic, low-latency, no unbounded remote dependencies | Allow, reject/block, hold, step-up, or route-to-review according to policy |
| **Durable investigation path** | Preserve evidence, enrich context, connect activity, support investigation and reporting | Asynchronous and eventually complete, but auditable | Decision episode, case, typology context, evidence pack, analyst actions, outcome |

The synchronous path may use pre-materialized entity, watchlist, ownership, and risk state. It must not depend on an external API whose timeout silently changes the meaning of the decision. If required evidence is unavailable, the policy bundle determines whether to fail closed, hold, step up, or allow with compensating controls. The durable path can append late evidence and create a new review decision, but it must not rewrite the original disposition.

### Real-time sequence

1. A transaction proposal arrives with an idempotency key and execution deadline.
2. The adapter canonicalizes fields, resolves parties and accounts, and identifies the relevant jurisdiction and product context.
3. The evidence plane retrieves the active policy, watchlist snapshot, entity state, relationship graph slice, and recent behavioral features.
4. Candidate generation and scoring produce typed match and risk facts.
5. The Policy Interpreter evaluates hard prohibitions, conditional rules, data sufficiency, routing, and reporting obligations.
6. The Decision Kernel emits a disposition with a policy trace and evidence references.
7. The action executor applies the disposition to the transaction rail and emits an immutable action event.
8. Asynchronous enrichment adds graph context, related activity, analyst notes, and downstream outcomes.
9. New list, identity, relationship, transaction, model, or policy events may reopen the decision episode or trigger retrospective re-screening.

## 4. Canonical decision object for high-frequency screening

A transaction-screening decision is a specialized instance of the general decision object. It has a fast-path envelope and a durable decision episode.

### 4.1 Canonical transaction decision object

```json
{
  "decision_id": "dec-01J9SCREEN0001",
  "decision_kind": "transaction_screening",
  "schema_version": "di.decision.v1",
  "tenant_id": "tenant-bank-01",
  "question": "May this transaction proceed under the active financial-crime policy?",
  "subject": {
    "entity_ids": ["party-originator-42", "party-beneficiary-77"],
    "account_ids": ["acct-123", "acct-987"],
    "role_bindings": ["originator", "beneficiary", "intermediary"]
  },
  "relationship": {
    "relationship_ids": ["acct-owner-123", "beneficial-owner-77", "customer-bank-01"],
    "transaction_id": "txn-7f4b",
    "transaction_type": "cross_border_payment"
  },
  "context": {
    "product": "commercial_payments",
    "jurisdiction_set": ["ID", "SG", "US"],
    "channel": "api",
    "execution_deadline": "2026-08-23T13:00:00.150Z",
    "purpose": "pre_execution_screening"
  },
  "exposure": {
    "amount": 125000000,
    "currency": "IDR",
    "direction": "outbound",
    "settlement_risk": "medium",
    "customer_risk_state": "high",
    "related_activity_window": "90d"
  },
  "evidence_snapshot": {
    "snapshot_id": "snap-01J9EVIDENCE0001",
    "as_of": "2026-08-23T12:59:59.850Z",
    "entity_state_version": "entity-state-584",
    "relationship_graph_version": "graph-2026-08-23-1042",
    "list_bundle_version": "lists-2026-08-23-07",
    "feature_set_version": "features-aml-19",
    "missing_evidence": [],
    "content_hash": "sha256:..."
  },
  "facts": [
    {
      "fact_id": "fact-1",
      "type": "watchlist_candidate_match",
      "value": {
        "party_id": "party-beneficiary-77",
        "list_id": "list-sanctions-01",
        "match_method": "transliteration_aware",
        "similarity": 0.94,
        "matched_fields": ["name", "country"],
        "status": "candidate"
      },
      "evidence_refs": ["ev-442", "ev-443"],
      "valid_time": { "from": "2026-08-23T12:00:00Z" },
      "confidence": 0.94
    },
    {
      "fact_id": "fact-2",
      "type": "beneficial_owner_uncertainty",
      "value": { "state": "unresolved", "depth": 2 },
      "evidence_refs": ["ev-890"],
      "confidence": 0.81
    }
  ],
  "policy_context": {
    "policy_bundle_id": "policy-aml-id-2026-08-23",
    "policy_version": "42.1",
    "effective_at": "2026-08-23T00:00:00Z",
    "decision_mode": "pre_execution",
    "fail_mode": "hold_on_required_evidence_missing"
  },
  "scenario_context": {
    "scenario_id": "screening_base",
    "model_versions": ["match-17", "graph-9"]
  },
  "recommendation": {
    "disposition": "hold_for_review",
    "obligations": ["capture_case", "request_beneficial_owner_evidence"],
    "review_queue": "sanctions_level_2",
    "expiry": "2026-08-23T13:15:00Z",
    "confidence": "high"
  },
  "policy_trace": {
    "rules_evaluated": ["SAN-001", "SAN-014", "CDD-203"],
    "rules_fired": ["SAN-014", "CDD-203"],
    "hard_constraints": ["no_execution_until_match_resolved"],
    "counterevidence": ["country_mismatch"],
    "decision_path_hash": "sha256:..."
  },
  "human_decision": null,
  "action": {
    "action_id": "act-01J9HOLD0001",
    "type": "place_transaction_hold",
    "status": "accepted_by_rail",
    "executed_at": "2026-08-23T13:00:00.041Z"
  },
  "reassessment_triggers": [
    "watchlist_update",
    "analyst_resolution",
    "beneficial_owner_change",
    "related_activity_threshold"
  ],
  "provenance": {
    "created_at": "2026-08-23T13:00:00.012Z",
    "producer": "screening-adapter-aml-3",
    "correlation_id": "corr-7f4b",
    "causation_id": "txn-event-7f4b",
    "replayable": true
  }
}
```

### 4.2 Semantics

The object is a point-in-time assertion, not a mutable customer status. If a watchlist changes five minutes later, the system appends a new event and creates a new assessment or retrospective review. The old decision remains intact, including the evidence and policy versions used at the time.

A screening match is a **candidate fact**, not automatically a confirmed match. Confirmation requires policy-defined evidence and, where applicable, human review. Similarly, a behavioral anomaly is a signal that can increase review priority or trigger a case; it is not itself a determination of criminality.

The decision object must preserve three distinctions:

| Distinction | Required interpretation |
|---|---|
| No evidence vs negative evidence | Missing data cannot silently become a safe value |
| Candidate match vs confirmed match | Similarity and list overlap do not equal identity or legal status |
| Model output vs policy conclusion | A probability or score can inform a rule but cannot replace a rule or accountable decision |

## 5. Event model

### 5.1 Event envelope

Every event is immutable and carries enough metadata for ordering, replay, lineage, and access control.

```json
{
  "event_id": "evt-01J9EVENT0001",
  "event_type": "DecisionIssued",
  "event_schema": "di.event.decision_issued.v1",
  "occurred_at": "2026-08-23T13:00:00.012Z",
  "observed_at": "2026-08-23T13:00:00.013Z",
  "tenant_id": "tenant-bank-01",
  "classification": "restricted_financial_crime",
  "aggregate_type": "transaction_decision",
  "aggregate_id": "dec-01J9SCREEN0001",
  "sequence": 7,
  "correlation_id": "corr-7f4b",
  "causation_id": "evt-policy-evaluation-6",
  "producer": "decision-kernel-2",
  "payload_hash": "sha256:...",
  "schema_registry_ref": "schema://di/event/DecisionIssued/1",
  "payload": {}
}
```

The model supports at-least-once delivery. Consumers must be idempotent on `event_id` and, where needed, enforce aggregate sequence checks. `occurred_at` is the event-time claim; `observed_at` is when the platform received it. Late and out-of-order events are expected and must be visible rather than silently rewritten.

### 5.2 Event types

| Event | Meaning | Synchronous or asynchronous | Typical consumers |
|---|---|---|---|
| `TransactionProposed` | A transaction is proposed for execution | Synchronous | Adapter, evidence snapshot service |
| `TransactionCanonicalized` | Fields and party roles are normalized | Synchronous | Matchers, policy interpreter |
| `EntityResolved` | Parties, accounts, affiliates, or beneficial owners are linked | Both | Graph, evidence, policy |
| `EvidenceSnapshotCreated` | The point-in-time evidence bundle is pinned | Synchronous | Decision kernel, audit |
| `ListBundleActivated` | A versioned watchlist bundle becomes effective | Asynchronous | Index builder, re-screen scheduler |
| `RelationshipStateChanged` | Ownership, account, customer, or graph state changes | Asynchronous | Feature builder, retrospective screening |
| `MatchCandidatesGenerated` | Candidate list or identity matches are produced | Synchronous | Policy interpreter, case system |
| `MonitoringSignalGenerated` | A threshold, anomaly, typology, or velocity pattern is detected | Both | Policy interpreter, alert router |
| `PolicyEvaluated` | Rules were evaluated against typed facts | Synchronous | Decision kernel, audit |
| `DecisionIssued` | A disposition and obligations are emitted | Synchronous | Action executor, audit |
| `ActionRequested` | A hold, reject, step-up, release, or routing action is requested | Synchronous | Payment rail, case system |
| `ActionAcknowledged` | The downstream rail accepted or rejected the action | Synchronous | Decision episode, reconciliation |
| `CaseCreated` | A durable investigation work item is opened | Asynchronous | Case management, analysts |
| `AnalystFindingRecorded` | A human confirms, clears, escalates, or requests evidence | Asynchronous | Policy, case, reporting |
| `ReportObligationCreated` | A policy requires a report, record, notice, or deadline | Asynchronous | Reporting workflow |
| `ReportSubmitted` | The report or filing was submitted | Asynchronous | Audit, outcome |
| `DecisionReopened` | New evidence or policy requires reassessment | Asynchronous | Decision kernel, case |
| `OutcomeRecorded` | Final disposition, loss, audit result, or review outcome is captured | Asynchronous | Calibration, policy review |
| `ReplayRequested` | A decision or corpus is to be replayed under a specified bundle | Asynchronous | Test harness, model governance |

### 5.3 Two clocks and two state stores

The fast path uses a bounded **decision state store** containing the latest admissible entity, relationship, list, policy, and feature snapshots. The durable path uses an immutable **event log** and evidence object store from which the state can be rebuilt.

The two clocks are:

- **Event time:** when the transaction, list update, ownership change, or analyst action occurred.
- **Processing time:** when the platform received or evaluated it.

Every time-sensitive rule must declare which clock it uses. A rule such as “three transactions in 24 hours” is not well-defined unless the window semantics and treatment of late events are explicit.

## 6. Domain Adapter technical specification

### 6.1 Purpose

A Domain Adapter translates a domain's events, entities, relations, exposures, evidence, actions, and reporting obligations into the canonical Decision Infrastructure model. It is a **semantic boundary**, not a thin connector and not a second decision engine.

The adapter owns domain meaning. The core kernel owns identity of decision episodes, evidence binding, event integrity, policy evaluation protocol, replay, audit, and lifecycle management.

### 6.2 Adapter contract

```text
DomainAdapter
  manifest() -> DomainManifest
  canonicalize(event, context) -> CanonicalEvent
  resolve_subjects(canonical_event, state) -> SubjectBindings
  build_relationship_slice(subject_bindings, state) -> RelationshipSlice
  declare_required_evidence(decision_context) -> EvidenceRequirements
  derive_facts(canonical_event, evidence_snapshot, state) -> FactSet
  calculate_exposure(context, facts, state) -> ExposureState
  generate_candidates(context, facts, indexes) -> CandidateSet
  validate_decision(decision, context) -> ValidationResult
  map_action(decision, target_system) -> ActionRequest
  normalize_outcome(outcome_event) -> Outcome
  render_domain_record(decision_episode, format) -> Artifact
  explain_term(term, locale) -> DomainExplanation
  conformance_suite() -> TestSuite
```

The adapter may call pluggable engines through declared ports, but its public contract remains stable.

### 6.3 Domain manifest

```yaml
adapter_id: aml.transaction-screening
adapter_version: 3.0.0
canonical_schema_version: di.v1
jurisdictions: [ID, SG, US]
entity_types:
  - person
  - legal_entity
  - account
  - wallet
  - virtual_asset_service_provider
  - beneficial_owner
  - intermediary
  - watchlist_subject
relationship_types:
  - owns
  - controls
  - transacts_with
  - acts_for
  - located_in
  - delegated_to
exposure_definitions:
  - transaction_amount
  - customer_risk
  - counterparty_concentration
  - velocity_window
  - jurisdiction_exposure
action_types:
  - allow
  - reject
  - block
  - hold
  - step_up_due_diligence
  - route_to_review
  - create_case
  - request_evidence
  - create_reporting_obligation
required_capabilities:
  - effective_dated_policy
  - temporal_windows
  - graph_predicates
  - evidence_provenance
  - deterministic_replay
slo_profiles:
  pre_execution:
    max_decision_latency_ms: configurable
    external_call_budget: zero_unbounded_calls
    availability_policy: jurisdiction_and_product_specific
```

### 6.4 Financial-crime adapter responsibilities

The financial-crime adapter should provide the following semantics:

| Adapter function | Financial-crime behavior |
|---|---|
| Canonicalization | Normalize names, addresses, identifiers, account numbers, country codes, currencies, timestamps, transaction types, and party roles |
| Identity binding | Link transaction parties to customer, account, beneficial-owner, intermediary, and external-list identities; retain candidate and confirmed states separately |
| Morphology-aware matching | Support mononyms, transliteration variants, token order, diacritics, aliases, script conversion, abbreviations, and structured field separation; expose match evidence rather than only a score |
| Relationship slice | Traverse ownership, control, delegation, correspondent, intermediary, counterparty, wallet, and shared-address relationships to a bounded depth and time horizon |
| Exposure calculation | Compute transaction amount, velocity, customer state, related activity, concentration, geography, product/channel, and relevant aggregate exposure |
| Evidence requirements | Declare which facts must be current, which may be cached, which require corroboration, and which are unavailable in the fast path |
| Candidate generation | Query indexed watchlists and relationship state; return top candidates with completeness metadata and index version |
| Monitoring facts | Produce velocity, structuring, unusual corridor, rapid movement, layering, funnel-account, network, and other institution-defined typology signals without asserting criminality |
| Action mapping | Translate a canonical disposition to a payment-rail hold, reject, step-up, review queue, case, or reporting obligation, with acknowledgement semantics |
| Retrospective screening | When a list or relationship state changes, generate re-screen work over affected portfolios and preserve the triggering event |
| Reporting | Render jurisdiction-specific evidence packs, internal escalation records, and statutory reporting artifacts from the same decision episode |
| Outcome mapping | Convert analyst decisions, confirmed matches, cleared alerts, filed reports, returns, losses, audit findings, and false-positive labels into outcomes |

The repository's H2 finding provides a concrete adapter wedge: an onshore batch and real-time matcher that handles Indonesian morphology, parsed DTTOT/DPPSPM inputs, statutory document generation, audit trails, and benchmarkable recall/false-positive/turnaround results. That wedge is an adapter implementation, not a change to the core theory.

### 6.5 Adapter guarantees

An adapter must guarantee deterministic canonicalization for the same input and version. It must declare field-level transformations, loss of precision, default handling, and required identifiers. It must never silently discard an input field that could affect a decision. It must expose `completeness_status` and `unresolved_references` when it cannot resolve a party or relationship.

The adapter must be independently testable against golden fixtures. A fixture includes input event, source-state snapshot, adapter version, expected canonical event, expected facts, expected candidate set or bounded candidate contract, and expected action mapping. Fixtures should include adversarial variants, aliases, missing fields, out-of-order events, duplicated events, and large-volume replay.

## 7. Policy Interpreter technical specification

### 7.1 Purpose

The Policy Interpreter evaluates typed facts, evidence, context, and state against an effective-dated policy bundle. It produces a structured result and a complete trace. It does not directly place holds, send reports, or mutate account state; those effects belong to action executors and workflow services.

The interpreter is a policy **execution and explanation** component. Policy authoring, policy approval, and policy deployment are separate lifecycle concerns.

### 7.2 Inputs and outputs

```text
PolicyInterpreter.evaluate(
  decision_context: DecisionContext,
  facts: FactSet,
  evidence_snapshot: EvidenceSnapshot,
  policy_bundle: PolicyBundle,
  clock: EvaluationClock,
  capabilities: RuntimeCapabilities
) -> PolicyEvaluation
```

```json
{
  "evaluation_id": "eval-123",
  "decision_id": "dec-123",
  "status": "complete",
  "disposition": "hold_for_review",
  "obligations": [
    { "type": "create_case", "queue": "sanctions_level_2", "deadline": "PT15M" },
    { "type": "request_evidence", "fields": ["beneficial_owner_source"] }
  ],
  "facts_used": ["fact-1", "fact-2", "fact-18"],
  "rules_evaluated": ["SAN-001", "SAN-014", "CDD-203"],
  "rules_fired": ["SAN-014", "CDD-203"],
  "rules_not_evaluable": [],
  "missing_evidence": [],
  "counterevidence": ["fact-21"],
  "uncertainty": { "class": "identity_resolution", "level": "medium" },
  "explanation": {
    "summary": "A high-confidence candidate match requires review before execution.",
    "decisive_claims": ["claim-900", "claim-901"],
    "alternative_actions_considered": ["allow", "reject", "hold_for_review"],
    "sensitivity": [{ "change": "clear_candidate_match", "new_disposition": "allow" }]
  },
  "policy_trace_hash": "sha256:...",
  "interpreter_version": "pi-5.2.0"
}
```

### 7.3 Policy bundle structure

A policy bundle contains:

| Component | Function |
|---|---|
| Metadata | Policy ID, owner, jurisdiction, product scope, effective interval, approval, version |
| Definitions | Typed facts, entities, relations, time windows, units, and enumerations |
| Hard constraints | Prohibitions, mandatory holds, eligibility, required evidence, limits |
| Conditional rules | Context-dependent decisions based on facts, exposure, and relationships |
| Scoring/ranking rules | Soft indicators, prioritization, triage, or queue assignment |
| Obligation rules | Case, report, recordkeeping, notification, training, or escalation requirements |
| Conflict rules | Precedence and resolution when multiple rules fire |
| Exception rules | Authorized exceptions, expiry, reason, approver, and compensating control |
| Test vectors | Positive, negative, boundary, contradictory, missing-data, and regression cases |

A policy bundle must be effective-dated and immutable after activation. Corrections create a new version. The interpreter records the exact bundle, rule subset, input facts, and runtime capabilities used.

### 7.4 Policy semantics

The policy interpreter should use a typed intermediate representation (Policy IR) independent of any authoring language. A policy author may use YAML, a visual editor, Rego, CEL, Datalog, a domain-specific language, or another future technology. The runtime receives Policy IR, not arbitrary executable code.

The minimum semantic model is:

```text
Rule {
  rule_id
  priority
  effective_interval
  scope_predicate(context)
  condition(facts, evidence, state, clock)
  effect: { disposition | obligation | score | route | evidence_requirement }
  rationale
  source_refs
}
```

The interpreter must distinguish:

1. **Hard constraints**, which eliminate or require actions.
2. **Soft signals**, which change risk, priority, or recommended controls.
3. **Evidence requirements**, which determine whether a rule is evaluable.
4. **Obligations**, which create work or records even when a transaction is allowed.
5. **Exceptions**, which are explicit, authorized, time-bounded, and auditable.

A common default precedence is `reject_or_block > hold_or_review > step_up > allow`, but the precedence must be declared in the policy bundle because legal and product contexts can differ. The interpreter must not invent precedence from rule order.

### 7.5 Missing, conflicting, and late facts

The interpreter returns a three-valued or four-valued result for material predicates: `true`, `false`, `unknown`, and optionally `conflicted`. The policy decides how `unknown` and `conflicted` affect the disposition. A missing beneficial-owner record may require a hold in one context and enhanced review in another.

A late event does not mutate a prior decision. It creates a new evaluation with a causal link to the original decision and an explanation of what changed. This is essential for list updates, ownership changes, and retrospective transaction review.

### 7.6 Hot-path constraints

The real-time interpreter must:

- Execute only a bounded rule graph.
- Use precompiled Policy IR.
- Avoid arbitrary code execution.
- Avoid unbounded network calls.
- Declare maximum fact retrieval depth and time windows.
- Return within a configured deadline or apply the declared timeout policy.
- Produce a compact decision trace synchronously and a richer explanation asynchronously.
- Be replayable against the exact policy, evidence, and state versions.

The interpreter may use ML or graph-derived facts, but it must treat them as typed, versioned inputs. A new model cannot silently change the meaning of a policy rule without a new policy or model compatibility declaration.

### 7.7 Policy testing and simulation

Before activation, a policy bundle must pass:

| Test class | Example |
|---|---|
| Unit tests | Candidate match plus sanctioned jurisdiction produces hold |
| Boundary tests | Amount exactly at threshold; list entry effective at transaction time |
| Negative tests | Similar name with incompatible date of birth is not confirmed automatically |
| Missing-data tests | Unresolved beneficial owner follows declared unknown-data behavior |
| Conflict tests | One rule allows while another imposes a mandatory hold |
| Replay tests | Historical decision reproduces under pinned bundles |
| Load tests | Sustained throughput and p99 latency under representative volume |
| Mutation tests | Small rule change produces expected affected decisions |
| Shadow tests | New policy runs beside current policy without changing live dispositions |
| Retrospective tests | New list version identifies affected historical scope |

Policy simulation is performed against historical or synthetic-but-grounded decision bundles. The system must report not only disposition changes but queue volume, false-positive proxy, missing-evidence rate, latency, and downstream operational capacity.

## 8. Core kernel versus pluggable components

### 8.1 Stable for the next decade

These invariants should remain in the core theory and compatibility contract.

| Invariant | Why it should remain stable |
|---|---|
| Decision episode as the primary unit | Every domain requires a question, context, evidence, decision, action, and outcome rather than an isolated score |
| Contextual subject–relationship–exposure model | Entity-only scores cannot represent transaction, contract, study, portfolio, or dependency context |
| Evidence and claim provenance | Trust depends on knowing what was asserted, by whom or what source, when, with what scope and uncertainty |
| Temporal validity and dual clocks | Decisions and evidence change over time; event time and processing time must remain explicit |
| Hard constraints separated from soft estimates | Law, safety, eligibility, and authority cannot be reduced to statistical ranking |
| Immutable decision and event history | Audit, replay, investigation, and learning require an unaltered historical record |
| Deterministic replay | A high-consequence decision must be reconstructable from pinned inputs and versions |
| Explicit unknown and conflict states | Missing or contradictory evidence must not silently become safe or unsafe |
| Human accountability and challenge | High-consequence decisions require authorized review, exception, and explanation paths |
| Action and outcome closure | The system must connect recommendation to execution and observed result |
| Versioned extension boundary | Future adapters and engines must replace implementation without changing canonical semantics |
| Testable contracts and falsifiability | Every adapter, policy, model, and engine must have declared tests and failure criteria |

### 8.2 Pluggable components

These parts should be replaceable behind stable contracts.

| Pluggable component | Examples of future replacements |
|---|---|
| Industry ontology | AML, supplier, counterparty, clinical site, procurement, insurance, new domains |
| Jurisdictional rules | Country-specific sanctions, reporting, procurement, privacy, safety, or tax rules |
| Entity-resolution matcher | Exact, phonetic, transliteration-aware, embedding, graph-assisted, quantum-inspired future methods |
| Risk and behavioral models | Rules, statistical models, gradient boosting, deep learning, foundation models, ensembles |
| Graph engine | Relational joins, property graph, RDF/SPARQL, temporal graph, distributed graph, specialized accelerator |
| Evidence extraction | Hand-coded parsers, OCR, document AI, multimodal models, human-in-the-loop extraction |
| Stream-processing engine | Kafka/Flink, Pulsar, cloud-native streams, database CDC, event mesh, future runtimes |
| Policy authoring language | YAML, Rego, CEL, Datalog, visual editor, domain-specific language |
| Policy interpreter implementation | Tree evaluator, compiled IR, WASM, rule engine, secure accelerator |
| Feature and state store | Redis, RocksDB, relational snapshots, feature store, vector/graph state, confidential-compute state |
| Data connectors | Core banking, payment rails, ERP, KYC, registries, watchlists, chain data, APIs, files, sensors |
| Simulation and optimization | Monte Carlo, discrete-event, agent-based, constraint solver, differentiable or quantum methods |
| Reasoning engine | Deterministic rules, probabilistic graphical model, causal model, LLM-assisted investigator, hybrid engine |
| Visualization | Tables, graph views, timelines, scenario maps, immersive interfaces, accessible text interfaces |
| Deployment model | Single tenant, on-premise, sovereign cloud, confidential cloud, edge or embedded execution |
| Storage and serialization | SQL, event store, object storage, content addressing, merkle structures, future durable media |

### 8.3 Compatibility rules

A pluggable component may be replaced if it preserves the following contract:

1. It emits canonical typed outputs with provenance and version identifiers.
2. It declares uncertainty, completeness, and known failure modes.
3. It can be evaluated in shadow mode against the incumbent.
4. It supports deterministic replay or explicitly declares non-determinism and supplies a reproducibility artifact.
5. It does not mutate historical decisions.
6. It passes conformance, performance, security, and domain-specific acceptance tests.
7. It preserves the ability to explain which inputs and transformations influenced the output.

The core kernel must never depend on a particular vendor, model family, database, graph technology, policy language, or visualization library.

## 9. Reference deployment architecture

```text
                    +-----------------------------+
                    |   Decision Workbench        |
                    | evidence • trace • actions  |
                    +--------------+--------------+
                                   |
                    +--------------v--------------+
                    |        Decision Kernel      |
                    | episodes • lifecycle • API  |
                    +----+-------------------+----+
                         |                   |
              +----------v---------+  +----v----------------+
              | Policy Interpreter  |  | Action / Workflow   |
              | Policy IR • trace   |  | rail • case • report|
              +----------+----------+  +---------------------+
                         |
              +----------v----------+
              |   Domain Adapter    |
              | AML / supply / etc. |
              +----+------------+----+
                   |            |
          +--------v--+     +---v-----------+
          | Fact /    |     | Pluggable      |
          | evidence |     | engines        |
          | services |     | match • graph  |
          +----+-----+     | model • sim    |
               |           +---+------------+
      +--------v----------------v---------+
      | Immutable event log + evidence     |
      | object store + temporal state      |
      +----------------+-------------------+
                       |
        +--------------v------------------+
        | Sources: rails, registries,     |
        | lists, KYC, ERP, documents, IoT |
        +---------------------------------+
```

The kernel and canonical schemas form the stable center. The adapter and engines are versioned ports. A policy bundle can be interpreted by multiple implementations for conformance testing. A matcher or graph engine can be swapped without changing the decision object or event envelope.

## 10. Performance and reliability requirements

The platform should define SLO profiles rather than one universal latency promise. Pre-execution screening should have a bounded latency budget appropriate to the transaction rail, while batch re-screening and retrospective analysis optimize for completeness and throughput.

| Requirement | Specification direction |
|---|---|
| Idempotency | Repeated transaction events produce one logical decision unless policy explicitly requests reassessment |
| Ordering | Per-transaction and per-aggregate sequence checks; late-event semantics explicit |
| Availability | Product/jurisdiction-specific fail behavior; no silent allow on required evidence failure |
| Latency | p50/p95/p99 measured by adapter and action path; external calls bounded or removed from hot path |
| Throughput | Capacity tested with realistic transaction mix, watchlist size, graph depth, and burst patterns |
| Replay | Same bundle, state, policy, adapter, and engine versions reproduce the decision trace |
| Durability | Event and evidence writes survive process failure before action acknowledgement where required |
| Backpressure | Explicit queueing, shedding, or hold behavior; no silent drops |
| Security | Tenant isolation, encryption, least privilege, PII minimization, and immutable access logs |
| Observability | Decision latency, missing evidence, match rates, rule firing, queue age, action acknowledgement, and drift |

## 11. Research and implementation questions

The following questions remain empirical rather than theoretical:

- What latency and throughput are required for each transaction rail and action path?
- How much pre-materialized graph state can be safely used before stale relationships create unacceptable risk?
- Which morphology-aware matching methods reduce false positives without reducing recall on mononyms and transliteration variants?
- How should institutions measure screening effectiveness beyond alert and SAR/STR volume, consistent with Wolfsberg's concern about output volume versus effective outcomes [1]?
- What evidence and audit format is accepted by each jurisdiction and regulator?
- How should unknown or conflicting evidence be governed when the transaction deadline expires?
- Which outcomes are sufficiently labeled for model calibration, given that cleared alerts, filed reports, and enforcement outcomes have different meanings?
- How should privacy-preserving cross-institution collaboration be represented without violating the single-tenant evidence boundary?

These should be tested with pre-registered benchmarks, historical replay, shadow deployment, and domain review. The linked repository's benchmark discipline is directly applicable: declare the falsifier before implementation, publish failures, and do not replace a failed premise with a weaker claim.

## 12. Return on Research for the technical workstreams

The technical recommendations in this specification are not equal-priority implementation tasks. Their **Return on Research (RoR)** is estimated using the same five-point ordinal scale as the research blueprint: 5 is high value, leverage, or applicability; for validation cost and maintenance burden, 5 means low cost or low burden. The weighted score is:

\[
RoR = 0.25K + 0.25L + 0.20X + 0.15V + 0.15M
\]

where \(K\) is Knowledge Value, \(L\) is Engineering Leverage, \(X\) is Cross-Domain Applicability, \(V\) is Validation Ease, and \(M\) is Maintenance Ease.

| Technical recommendation | Knowledge Value | Engineering Leverage | Cross-Domain Applicability | Validation Cost | Maintenance Burden | RoR | Strategic priority |
|---|---:|---:|---:|---|---|---:|---|
| Canonical decision and event schemas | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| Immutable evidence snapshots and provenance | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| Deterministic replay and conformance fixtures | 5 | 5 | 5 | High / 3 | Medium / 4 | **4.55** | **Now** |
| Policy IR and Policy Interpreter | 5 | 5 | 5 | High / 3 | High / 3 | **4.40** | **Now, after schemas** |
| Temporal relationship and exposure graph | 5 | 5 | 5 | Very high / 2 | High / 3 | **4.25** | **After state baseline** |
| Domain Adapter SDK | 4 | 5 | 5 | High / 3 | High / 3 | **4.15** | **After first adapter contract** |
| Outcome and calibration loop | 5 | 4 | 5 | Very high / 2 | High / 3 | **4.00** | **Later, after real outcomes** |
| AML transaction-screening adapter | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | **Proving ground, not universal core** |
| Real-time stream and hot-path harness | 4 | 4 | 2 | Very high / 2 | High / 2 | **3.00** | **Conditional on a real adapter** |
| General simulation and optimization engine | 4 | 4 | 4 | Very high / 2 | High / 2 | **3.40** | **Later, after exposure data** |
| Visualization and Decision Workbench | 3 | 3 | 4 | Medium / 3 | High / 3 | **3.20** | **After observed workflows** |
| Broad connector library | 3 | 4 | 4 | Very high / 2 | High / 2 | **3.15** | **On demand only** |

### Recommendation-level interpretation

The first implementation should maximize knowledge compounding: canonical schemas, evidence provenance, immutable events, and replay should be built before sophisticated models or broad connectors. The Policy Interpreter follows because it converts facts into governed action without embedding domain semantics in the kernel. The graph should be developed narrowly around a high-value dependency path rather than as a general graph platform.

The AML adapter and hot-path harness have lower direct cross-domain applicability, but they have high **option value** as a proving ground. They stress the architecture with identity ambiguity, effective-dated rules, bounded latency, duplicate and late events, action acknowledgement, and audit requirements. Their strategic priority is therefore conditional: proceed when they can falsify the kernel's assumptions with a real benchmark, not merely because financial crime is an attractive domain.

Simulation, advanced learning, broad visualization, and connector catalogs should be delayed until the system has real evidence, exposure state, outcomes, and observed human workflows. Their RoR rises when they are grounded in an active adapter and falls when built speculatively. Every implementation proposal should include the same six fields—knowledge value, engineering leverage, cross-domain applicability, validation cost, maintenance burden, and strategic priority—before entering the roadmap.

## References

[1]: https://wolfsberg-group.org/news/the-wolfsberg-group-statement-on-effective-monitoring-for-suspicious-activity "Wolfsberg Group, The Wolfsberg Group Statement on Effective Monitoring for Suspicious Activity"

[2]: https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Fatf-recommendations.html "FATF, The FATF Recommendations"

[3]: https://ofac.treasury.gov/media/16331/download?inline "U.S. Treasury OFAC, A Framework for OFAC Compliance Commitments"

[4]: https://github.com/farroshsy/venture "farroshsy/venture research repository"
