# Business Process, BPMN, and Adjacent Process-Model Catalog

## Purpose

The Decision Control Plane should not replace BPMN, DMN, CMMN, workflow engines, process mining, or formal verification tools. It should provide a stable evidence, policy, event, decision, audit, and outcome substrate that can host several process representations.

The key distinction is:

> **A process model explains how work progresses; a decision model explains how a conclusion is derived; a case model explains how discretionary work unfolds; Decision Infrastructure explains how a consequential decision remains evidence-bound, governed, replayable, and connected to action and outcome.**

OMG describes BPMN as a process notation intended for stakeholders and precise enough to translate into software process components [1]. OMG describes DMN as a standardized bridge between business decision design and decision implementation, designed to work alongside BPMN [2]. OMG defines CMMN as a meta-model and notation for modeling and exchanging cases [3]. These standards are complementary inputs to the Decision Control Plane, not competitors that need to be collapsed into one notation.

## 1. Canonical process meta-model

The product should normalize process representations into a small internal meta-model without forcing every source notation to have identical semantics.

| Canonical object | Meaning | Typical source representations |
|---|---|---|
| **Process Definition** | Versioned description of intended work or behavior | BPMN process, UML activity, EPC, workflow DSL |
| **Process Instance** | One execution of a process definition | BPMN instance, workflow case, order, transaction lifecycle |
| **Case** | A goal-oriented body of work whose path may be discretionary | CMMN case, investigation, procurement, incident |
| **Activity Definition** | A unit of work or automated operation | BPMN task, service task, user task, CMMN task, state transition |
| **Activity Instance** | A concrete execution of an activity | Work item, job, task instance, API call |
| **Token / State** | Current execution position or state | BPMN token, state-machine state, Petri marking |
| **Event** | Something that occurred, was observed, or became valid | Event log, BPMN event, domain event, XES event |
| **Gateway / Rule** | Control-flow or decision routing logic | BPMN gateway, DMN decision, rule, guard |
| **Decision Episode** | A bounded question requiring evidence, policy, alternatives, action, and outcome | DI canonical object, underwriting decision, AML disposition |
| **Evidence / Claim** | An artifact or assertion that supports or challenges a decision | Document, signal, fact, audit record, data object |
| **Relationship / Exposure** | Link and consequence context around an object | Graph edge, participant, contract, dependency, resource |
| **Policy / Constraint** | Non-negotiable or governed condition | DMN rule, policy bundle, authorization rule, SLA |
| **Resource / Role** | Person, system, team, facility, or capacity assigned to work | BPMN lane, RACI role, workforce, queue |
| **Artifact** | Input, output, document, payload, or record produced by work | BPMN data object/store, case file, evidence pack |
| **Exception / Escalation** | Deviation, failure, timeout, or human intervention | BPMN boundary event, CMMN escalation, incident, retry |
| **Outcome** | Observed result after action or process completion | Delivery, loss, clearance, report, defect, recovery |
| **SLA / Timer** | Deadline, freshness window, or service constraint | Timer event, case milestone, policy deadline, queue SLA |

The internal meta-model should preserve source notation, source element IDs, semantic mappings, and unmapped constructs. Translation must be loss-aware; an unsupported BPMN or CMMN construct should be marked `unmapped` rather than silently flattened.

## 2. BPMN family and process-flow models

### 2.1 BPMN process types

| BPMN/process type | Best for | Decision Control Plane integration |
|---|---|---|
| **Private executable process** | A controlled process executed by one organization or engine | Map process instance and activity events into the event log; attach decisions and evidence to activity scopes |
| **Private non-executable process** | Internal documentation and analysis | Store as process definition; use it to identify candidate decision points and evidence requirements |
| **Public process** | Showing externally visible behavior without internal detail | Use message boundaries and obligations as relationship/context metadata |
| **Collaboration** | Multiple pools exchanging messages | Map participants to tenants/legal entities and messages to cross-organization events |
| **Choreography** | Interaction contract without a central orchestrator | Use message events and correlation IDs; attach obligations and evidence to each participant's action |
| **Conversation** | High-level view of related message exchanges | Use as a relationship map, not as an execution model |
| **Ad hoc subprocess** | Flexible order of activities | Treat as case-like work; require explicit decision episodes and outcome closure for consequential actions |
| **Event subprocess** | Event-triggered handling inside a running process | Map trigger to reassessment or exception event; preserve causal link to parent instance |
| **Transaction subprocess** | Coordinated work with commit/rollback/compensation semantics | Map compensation and rollback as explicit action/outcome events |
| **Call activity** | Reuse of another process definition | Store a versioned process-definition reference and preserve nested decision lineage |
| **Embedded subprocess** | Local grouping of activities | Use as a scope for evidence, deadlines, and nested decisions |

### 2.2 BPMN flow elements

| Element family | Examples | Use in the Decision Control Plane |
|---|---|---|
| **Start events** | None, message, timer, signal, conditional, error | Create process instance or decision-trigger event with event-time semantics |
| **Intermediate events** | Message, timer, escalation, link, compensation, conditional | Reopen, pause, escalate, wait for evidence, or trigger a compensating action |
| **End events** | None, message, error, escalation, terminate, compensation | Close activity/process scope and append outcome or exception |
| **Boundary events** | Interrupting or non-interrupting timer, error, escalation, compensation | Attach failure or deadline behavior to a task; preserve whether the task was cancelled |
| **Tasks** | User, service, send, receive, manual, business rule, script | Map task execution to action requests, policy evaluations, or human work items |
| **Gateways** | Exclusive, inclusive, parallel, event-based, complex | Keep control-flow semantics separate from policy conclusions; gateway conditions may reference a Decision Episode |
| **Pools and lanes** | Participant, role, department, system | Map to organization, tenant, authority, responsibility, and authorization scope |
| **Messages** | Message flow, send/receive task | Map to causally linked events and cross-tenant transfer packages |
| **Signals and escalations** | Broadcast triggers and scoped exception notifications | Map to monitoring signals, reassessment triggers, and case escalation |
| **Data objects and stores** | Document, data input/output, data store | Map to evidence artifacts, claims, source snapshots, and retention classes |
| **Associations** | Data, text, compensation, artifact associations | Preserve provenance links between activities, evidence, and outcomes |

BPMN gives a strong process-flow representation, but it does not by itself guarantee evidence provenance, policy versioning, tenant isolation, deterministic replay, or outcome learning. Those are Decision Control Plane responsibilities.

## 3. DMN and decision models

DMN is the closest adjacent standard to the Policy Interpreter. It should be treated as a compatible policy-authoring and decision-design surface, not as the entire runtime.

### DMN model types

| DMN model | What it represents | Integration |
|---|---|---|
| **Decision Requirements Graph** | Dependencies among decisions and knowledge sources | Compile to Policy IR dependency graph; retain source IDs |
| **Decision node** | A named decision that produces an output | Map to a policy evaluation or nested decision episode |
| **Business knowledge model** | Reusable decision logic | Version as a policy artifact and test independently |
| **Knowledge source** | Authority or source for decision logic | Map to policy provenance and source references |
| **Input data** | Data required for evaluation | Map to typed facts and evidence requirements |
| **Decision table** | Rules over inputs and outputs | Compile to deterministic Policy IR with hit policy recorded |
| **Literal expression** | Direct expression or calculation | Compile only from a safe, approved expression subset |
| **Boxed expression** | Structured expression representation | Preserve for authoring, compile to runtime IR |
| **Relation / context / invocation** | Structured decision logic and calls | Bound call depth and preserve dependency trace |
| **Business knowledge invocation** | Calling reusable knowledge logic | Treat as versioned, deterministic dependency |

The Policy Interpreter should accept DMN-derived IR but should add semantics not guaranteed by a decision notation alone: explicit `unknown` and `conflicted` states, evidence sufficiency, action obligations, effective clocks, runtime capabilities, trace hashes, and action reconciliation.

## 4. CMMN and case-management models

CMMN is appropriate for work where the next step depends on emerging evidence, human judgment, or discretionary planning.

| CMMN concept | Best use | Decision Control Plane mapping |
|---|---|---|
| **Case file** | Evidence and information associated with a case | Evidence ledger and case-scoped disclosure policy |
| **Case plan model** | Overall structure of case work | Process/case definition with decision episodes |
| **Stage** | Group of case tasks and milestones | Nested workflow scope and authority boundary |
| **Human task** | Discretionary analyst work | Action/task with accountable actor and evidence request |
| **Process task** | Invocation of a predefined process | BPMN/workflow reference with causal lineage |
| **Case task** | Invocation of another case | Nested case and decision episode |
| **Milestone** | State or achievement used for progression | Outcome or state transition event |
| **Sentry** | Condition that enables, disables, or terminates work | Policy/condition evaluation with explicit facts and unknown behavior |
| **Discretionary item** | Work selected by a knowledge worker | Alternative action and human authority record |
| **Timer / event listener** | Time or event-based case progression | Freshness trigger, escalation, or reassessment |
| **Planning table** | Runtime planning of optional work | Value-of-information and evidence acquisition plan |

CMMN should drive investigation and exception work after the real-time disposition, while the canonical decision object preserves the original transaction decision and any later case conclusions.

## 5. State, workflow, and formal execution models

| Model family | Primary abstraction | Strength | Limitation | When to use |
|---|---|---|---|---|
| **Finite-state machine** | State and transition | Simple lifecycle control | Weak for concurrency and evidence context | Decision/action lifecycle, case status |
| **Hierarchical statechart** | Nested states and guarded transitions | Handles hierarchy, concurrency, and events | Can become difficult to audit if guards are implicit | Long-running transaction or case lifecycle |
| **Petri net / workflow net** | Places, transitions, and tokens | Formal concurrency, reachability, deadlock analysis | Less familiar to business users | Verification, workflow correctness, capacity reasoning |
| **Colored Petri net** | Typed tokens and transitions | Data-aware workflow analysis | More complex tooling and semantics | Multi-party workflows and resource constraints |
| **EPC** | Events, functions, and logical connectors | Business process analysis and SAP-adjacent modeling | Less standardized execution semantics than BPMN | Legacy process inventories and migration |
| **UML activity diagram** | Activities, control flow, object flow | Software/system design integration | Ambiguous operational semantics across tools | Engineering design and code-adjacent modeling |
| **BPEL / orchestration language** | Executable service orchestration | Long-running transactions and compensation | Implementation-oriented and vendor/runtime coupled | Existing service orchestration integration |
| **Workflow DSL** | Engine-specific task and routing semantics | Fast execution and product fit | Portability and interpretability vary | Adapter-specific automation behind a canonical boundary |
| **Saga** | Distributed transaction with compensations | Explicit cross-service consistency | Not a general policy or evidence model | Action orchestration and rollback |
| **Event-sourced process** | State rebuilt from immutable events | Replay and audit | Requires careful event evolution | Decision and transaction lifecycle |
| **Temporal workflow** | Durable, timer-aware orchestration | Resilient long-running execution | Runtime-specific semantics | Case/review workflows and asynchronous obligations |

The Decision Control Plane should use the event-sourced process model for the decision lifecycle and allow BPMN/workflow/state-machine runtimes to execute surrounding work.

## 6. Process discovery, mining, and conformance models

| Model | Purpose | Decision Control Plane use |
|---|---|---|
| **Event log** | Ordered record of activities and events | Canonical event model and replay corpus |
| **Directly-follows graph** | Empirical adjacency between events | Discover actual workflow paths and bottlenecks |
| **Process tree** | Structured discovered process with sequence, choice, parallelism, loop | Compare observed behavior with intended process |
| **Discovered BPMN model** | Visual executable/documentary process approximation | Generate candidate process definition with confidence and support |
| **Conformance alignment** | Map trace deviations to model behavior | Identify policy bypass, missing steps, or unauthorized paths |
| **Performance spectrum** | Time between activities and bottlenecks | Allocate attention and redesign queues |
| **Variant analysis** | Distinct execution paths | Test whether risky outcomes cluster in variants |
| **Object-centric process model** | Multiple interacting objects rather than one case ID | Aligns strongly with subject–relationship–exposure context |
| **Multi-perspective process model** | Control flow plus resources, data, time, and organization | Connect process execution to authority, evidence, and exposure |
| **Predictive process monitoring** | Forecast next activity, delay, or outcome | Provide typed signals, never direct legal conclusions |
| **Prescriptive process monitoring** | Recommend next action or intervention | Feed permitted alternatives into the Decision Workbench |

The product should treat the event log as a governed evidence source. Process mining may discover patterns, but a discovered path is not automatically a permitted policy. Policy and authority remain separate.

## 7. Decision, rule, and event models

| Model family | Core abstraction | Use |
|---|---|---|
| **Decision table** | Inputs × conditions × outcomes | Explicit thresholds, eligibility, and routing |
| **Rule engine** | Facts, predicates, consequences | Deterministic policy evaluation |
| **Production system** | Working memory plus firing rules | High-volume rule execution; must expose agenda and trace |
| **Event-condition-action** | Event triggers condition and action | Monitoring alerts, reassessment, and automation |
| **Complex event processing** | Patterns over event streams | Velocity, sequence, structuring, and network signals |
| **Temporal rule system** | Conditions over intervals and windows | Effective dates, freshness, sliding windows, late events |
| **Constraint satisfaction model** | Values satisfying hard constraints | Eligibility, resource, or action feasibility |
| **Optimization model** | Objective plus constraints | Portfolio, allocation, monitoring capacity; never bypass hard policy |
| **Bayesian network** | Probabilistic dependencies | Uncertainty and belief updating where calibration exists |
| **Causal model** | Interventions and outcome effects | Policy/action evaluation and counterfactual reasoning |
| **POMDP / belief-state model** | Partial observability, actions, and belief updates | Long-running investigation and evidence acquisition |
| **Knowledge graph** | Typed entities and relationships | Exposure, dependency, ownership, and context |
| **Temporal graph** | Time-valid typed relationships | Reassessment, concentration, and historical replay |
| **Ontology / knowledge model** | Meaning and constraints of concepts | Domain adapter semantics and interoperability |

The Policy Interpreter should implement a constrained deterministic subset first. Bayesian, causal, POMDP, optimization, and graph reasoning are pluggable producers of typed facts, scenarios, and alternatives.

## 8. Operating-model and human-work models

| Model | Focus | Integration |
|---|---|---|
| **SIPOC** | Suppliers, inputs, process, outputs, customers | Fast scoping of a domain adapter |
| **Value-stream map** | Flow time, wait time, handoffs, waste | Identify where decisions and evidence delays occur |
| **Service blueprint** | Frontstage, backstage, support, and customer interaction | Map user-visible obligations and internal controls |
| **Customer journey map** | Experience and touchpoints | Add customer impact to context and outcome |
| **Capability map** | What the organization can do | Identify authority, resource, and dependency context |
| **RACI** | Responsible, accountable, consulted, informed | Populate action ownership and approval routing |
| **Operating model canvas** | Process, people, technology, governance | Define domain-pack boundaries |
| **Queueing model** | Arrival, service, capacity, waiting | Size interpreter, audit, and review queues |
| **Discrete-event simulation** | Event-driven system behavior | Stress test latency, capacity, and recovery |
| **Agent-based model** | Interacting actors and adaptive behavior | Explore investigator, supplier, counterparty, or attacker behavior |
| **System dynamics model** | Stocks, flows, feedback loops | Study policy and outcome feedback over longer horizons |

These models are not substitutes for the canonical decision object. They provide context, performance estimates, resource constraints, or human-accountability structure.

## 9. Recommended integration architecture

### 9.1 Model registry

Create a **Process Model Registry** with these fields:

```yaml
model_id: process-aml-investigation-v1
model_kind: [bpmn, dmn, cmmn, statechart, petri_net, event_pattern]
source_format: bpmn20.xml
source_hash: sha256:...
semantic_version: 1.0.0
owner: role-compliance-operations
jurisdiction_scope: [ID, SG, US]
effective_interval:
  from: 2026-01-01T00:00:00Z
  to: null
execution_mode: [documentation, simulation, shadow, live]
compiled_artifact: policy-ir-aml-42
conformance_suite: suite-aml-2026-08
unmapped_constructs: []
```

### 9.2 Cross-model correlation

Every process or case event should be able to carry:

```json
{
  "process_definition_id": "process-aml-investigation-v1",
  "process_instance_id": "case-991",
  "activity_definition_id": "task-resolve-match",
  "activity_instance_id": "work-008",
  "decision_id": "dec-01J9SCREEN0001",
  "evidence_snapshot_id": "snap-01J9EVIDENCE0001",
  "policy_bundle_id": "policy-aml-id-2026-08-23",
  "model_version": "model-aml-19",
  "correlation_id": "corr-7f4b",
  "causation_id": "evt-01J9EVENT0001"
}
```

### 9.3 What remains stable

The stable kernel should preserve the following across BPMN, DMN, CMMN, state machines, process mining, and workflow runtimes:

1. Event identity, causation, correlation, tenant scope, and time semantics.
2. Decision episode identity and linkage to process/case/activity scope.
3. Evidence, claim, provenance, freshness, uncertainty, and contradiction.
4. Effective-dated policy and explicit unknown/conflicted behavior.
5. Action request, acknowledgement, reconciliation, and outcome closure.
6. Replay manifest and immutable historical record.
7. Authorization, data classification, and tenant isolation.
8. Model version, source mapping, unmapped constructs, and conformance results.

### 9.4 What remains pluggable

The following should remain replaceable:

- BPMN, DMN, CMMN, workflow, and state-machine authoring tools;
- process execution runtimes;
- event-stream and complex-event-processing engines;
- process-mining and conformance algorithms;
- graph, rule, probabilistic, causal, and optimization engines;
- visualization and workbench presentations;
- simulation and queueing methods;
- connector and integration technologies.

## 10. Practical model-selection guide

| Situation | Primary model | Secondary model | Decision Control Plane role |
|---|---|---|---|
| Deterministic straight-through transaction handling | BPMN or workflow DSL | DMN | Orchestrate actions; preserve policy trace |
| Eligibility, thresholds, and routing | DMN / decision table | Temporal rules | Compile policy, record facts and unknowns |
| Analyst investigation with changing evidence | CMMN | Statechart + DMN | Manage case work and decision episodes |
| Distributed action with rollback | Saga / workflow | BPMN transaction | Track action and compensation outcomes |
| High-volume stream pattern detection | CEP / event-condition-action | Temporal graph | Produce typed signals and reassessment events |
| Concurrent resource workflow | Petri net / workflow net | Queueing model | Verify deadlocks and size capacity |
| Discovering how work actually occurs | Process mining | Object-centric process model | Compare observed behavior to intended policy |
| Scenario and capacity planning | Discrete-event simulation | System dynamics | Compare alternatives under assumptions |
| Long-running uncertain investigation | POMDP or belief-state model | CMMN | Recommend evidence acquisition; preserve human authority |

## 11. Final design principle

The Decision Control Plane should be **process-model agnostic but process-semantics aware**. It should understand enough of BPMN, DMN, CMMN, state, event, graph, and case models to bind them to a common evidence and decision lifecycle, while refusing to pretend that flow, decision, case, and outcome are the same thing.

The product's differentiator is therefore not another notation. It is the ability to answer, across notations and runtimes:

> **Which process or case produced this decision, what evidence and policy were active, what authority acted, what happened afterward, and can the result be replayed without rewriting history?**

## References

[1]: https://www.omg.org/spec/BPMN/2.0.2/About-BPMN "OMG, Business Process Model and Notation Specification Version 2.0.2"

[2]: https://www.omg.org/spec/DMN/1.5/About-DMN "OMG, Decision Model and Notation Specification Version 1.5"

[3]: https://www.omg.org/spec/CMMN/1.1/About-CMMN "OMG, Case Management Model and Notation Specification Version 1.1"
