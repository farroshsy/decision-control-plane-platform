# Business Process Deliverable — Quickstart

## One-sentence explanation

The Business Process deliverable shows **who participates, what work happens, where decisions occur, what evidence is required, how exceptions are handled, and what outcome closes the loop**.

## Start with the right view

| Audience | Start here | Key question answered |
|---|---|---|
| Executive sponsor / economic buyer | `bpmn_target_market_stakeholder_journey.png` | Why does the organization need this, who owns the decision, and what is the path to adoption? |
| Compliance and operations | `bpmn_people_of_interest_screening.png` | How do people, organizations, relationships, evidence, review, reporting, and reassessment connect? |
| Process architect | `bpmn_aml_screening_flow.png` | What is the end-to-end control flow from transaction to action and outcome? |
| Enterprise architect | `bpmn_decision_case_event_graph.png` | How do BPMN, DMN, CMMN, state, event, and evidence models relate? |
| Engineering and platform | `bpmn_model_family_integration.png` | Which model or runtime owns each concern, and where does the Decision Control Plane kernel sit? |
| Auditor / model risk | `decision_control_plane_data_governance.md` | What is immutable, what is versioned, who may access it, and how can it be replayed? |

## The four-layer presentation method

### Layer 1 — People and purpose

Start with the target-market and stakeholder map. Explain the buying center and the operating roles: economic buyer, compliance owner, operations analyst, engineering/platform, security/privacy, legal/audit/model risk, business product owner, regulator, and transaction participants.

### Layer 2 — Work and flow

Show the AML process flow. Walk from transaction proposal through canonicalization, state-manifest validation, candidate-fact generation, policy decision, decision episode, action, acknowledgement, outcome, and reassessment.

### Layer 3 — Models and responsibilities

Use the relationship graph to explain that BPMN models flow, DMN models decisions, CMMN models discretionary case work, state/Petri models execution correctness, CEP models event patterns, and process mining models observed behavior. The Decision Control Plane binds them through canonical events, evidence, decision episodes, action, outcome, and replay.

### Layer 4 — Controls and proof

Finish with governance, tenant isolation, audit, replay, and measurable validation. The message is that the system does not merely diagram work; it proves what happened, under which authority, using which evidence and policy, and with what result.

## Recommended 20-minute walkthrough

| Time | View | Message |
|---:|---|---|
| 0–3 min | Stakeholder journey | This is an enterprise operating and buying-center problem, not only a software component |
| 3–7 min | People-of-interest screening | Roles and relationships create the context for a decision |
| 7–11 min | AML process flow | The transaction moves through bounded steps, decision, action, outcome, and reassessment |
| 11–15 min | Model-family graph | Different notations are complementary and should remain pluggable |
| 15–18 min | Decision Control Plane architecture | The kernel supplies evidence, policy, event, audit, replay, and tenant controls |
| 18–20 min | Validation and next action | Choose the next adapter, benchmark, or governance gate based on RoR |

## Glossary for non-specialists

| Term | Plain-language meaning |
|---|---|
| BPMN | A standard way to draw and execute business process flow |
| DMN | A standard way to represent decisions and decision logic |
| CMMN | A standard way to represent flexible case work and investigation |
| Domain Adapter | The translator from local business data and terminology into canonical facts and events |
| Decision Episode | One bounded question, its context, evidence, policy, conclusion, action, and outcome |
| Evidence | An artifact or claim that supports or challenges a decision |
| State Manifest | The exact versions of policy, lists, graph, features, and models used |
| Replay | Re-running a historical decision from its pinned inputs and versions |
| Reassessment | A new decision evaluation caused by late or material evidence |
| People of interest | Transaction participants, controllers, intermediaries, counterparties, or subjects represented as typed roles and relationships |

## What to avoid when presenting it

Do not begin with all model names or a dense architecture diagram. Do not describe people of interest as a universal risk score. Do not imply that BPMN, DMN, and CMMN are interchangeable. Do not show a process path without showing evidence, authority, action, and outcome. Do not describe replay as a permission to reveal every underlying artifact.

## The deliverable bundle

```text
bpmn_target_market_stakeholder_journey.png
  Commercial and enterprise stakeholder journey

bpmn_people_of_interest_screening.png
  People, roles, relationships, evidence, review, reporting, reassessment

bpmn_aml_screening_flow.png
  Operational transaction screening process

bpmn_decision_case_event_graph.png
  BPMN / DMN / CMMN / state / CEP relationship to runtime and ledger

bpmn_model_family_integration.png
  Model-family integration around the Decision Control Plane kernel

business_process_model_catalog.md
  Detailed taxonomy, selection guide, and integration semantics

decision_control_plane_data_governance.md
  Governance, isolation, lifecycle, authorization, and RoR
```

## Final takeaway

The easiest way to present the Business Process deliverable is to tell one story in four views:

> **People create the context; processes move the work; decisions govern the action; evidence and outcomes prove whether the system behaved correctly.**

Use one graph per question, then connect all graphs through the stable Decision Episode and Canonical Event Model.
