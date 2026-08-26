# Decision Control Plane Research Archive

## Purpose and scope

This directory preserves the **research, planning, technical specifications, operating guidance, business-process analysis, and presentation source** that informed the Decision Control Plane. It is intentionally separate from the concise, current-state documents in [`../`](../) so readers can distinguish between the reusable theory, the historical design work, and the functionality implemented in the application.

The archive is a source record, not a claim that every proposal is production-ready or currently active. The current application’s controlled pilot boundary remains authoritative: tenant-scoped records, deterministic replay, evidence-bound investigation, local simulated integration delivery, and no autonomous external infrastructure actions. See [`../observe-integrate-automate-release-notes.md`](../observe-integrate-automate-release-notes.md) and [`../workflow-management-release-notes.md`](../workflow-management-release-notes.md) for that boundary.

## How to use this archive

Begin with the theory and product thesis, then trace its consequences through the canonical decision model, the safety and migration work, and the bounded pilot. Presentation projects are preserved as source material rather than flattened screenshots so the original slide structure, notes, and individual HTML pages remain inspectable.

| Folder                                                                           | Primary question answered                                                                  | Contents                                                                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-decision-infrastructure/`](01-decision-infrastructure/)                     | What is the durable, cross-domain decision abstraction?                                    | Research notes, blueprint, product plan, canonical schema guide, technical specification, integration tests, and early slide narrative. |
| [`02-architecture-and-domain-contracts/`](02-architecture-and-domain-contracts/) | How does the abstract model become a control-plane architecture and financial-crime wedge? | Complete summary, domain-adapter API design, architecture-diagram review, and the early MVP guide.                                      |
| [`03-resilience-and-validation/`](03-resilience-and-validation/)                 | How should the policy interpreter behave under load and what validates the MVP?            | Resilience and latency analysis, stress-test report, and 90-day validation plan.                                                        |
| [`04-governance-security-and-migration/`](04-governance-security-and-migration/) | How are tenant isolation, governance, and state-store evolution controlled?                | Data governance, enterprise migration and security strategy, security notes, and zero-downtime state-store migration guidance.          |
| [`05-operations-and-active-active/`](05-operations-and-active-active/)           | What makes active-active operation and recovery safe?                                      | Active-active and DR strategy, operational runbook, DR research notes, and observability model.                                         |
| [`06-business-processes/`](06-business-processes/)                               | Where do BPMN, DMN, CMMN, stakeholders, and business exceptions fit?                       | Process-model catalog, business-process research, delivery quickstart, and BPMN graph reviews.                                          |
| [`07-pilot-and-developer-integration/`](07-pilot-and-developer-integration/)     | How is the first bounded pilot operated and integrated?                                    | First-pilot production runbook and SDK/developer onboarding guide.                                                                      |
| [`08-economics-and-leverage/`](08-economics-and-leverage/)                       | Which work is strategically reusable and how is it justified?                              | TCO analysis, leverage plan and execution guide, and compliance/XAI report material.                                                    |
| [`09-presentation-scripts/`](09-presentation-scripts/)                           | How were the technical ideas presented to executives and operators?                        | Speaker scripts for DR, RPO/fencing, observability, pilot runbook, governance, and TCO/gRPC material.                                   |
| [`10-presentation-source/`](10-presentation-source/)                             | What are the original editable slide-project sources?                                      | Six slide-project folders with page HTML, slide state, and available notes.                                                             |
| [`11-external-source-snapshots/`](11-external-source-snapshots/)                 | What source snapshots and external reference context informed the work?                    | Preserved snapshots of referenced public material and the Venture repository context.                                                   |

## Reading paths

### Product and theory path

The fastest conceptual route begins with [`01-decision-infrastructure/decision_infrastructure_research_notes.md`](01-decision-infrastructure/decision_infrastructure_research_notes.md), continues through the [`decision_infrastructure_blueprint.md`](01-decision-infrastructure/decision_infrastructure_blueprint.md) and [`decision_infrastructure_product_plan.md`](01-decision-infrastructure/decision_infrastructure_product_plan.md), then moves to the current [`../decision-state-evolution-theory.md`](../decision-state-evolution-theory.md). This path explains why the stable kernel is a replayable, evidence-bound decision episode rather than a domain-specific rules engine.

### Safety, deployment, and operations path

Read the state-store migration guidance in [`04-governance-security-and-migration/decision_control_plane_state_store_migration.md`](04-governance-security-and-migration/decision_control_plane_state_store_migration.md), then the active-active work in [`05-operations-and-active-active/decision_control_plane_dr_active_active.md`](05-operations-and-active-active/decision_control_plane_dr_active_active.md), followed by the first-pilot runbook in [`07-pilot-and-developer-integration/decision_control_plane_first_pilot_production_runbook.md`](07-pilot-and-developer-integration/decision_control_plane_first_pilot_production_runbook.md). These materials motivate the product’s ownership, fencing, RPO, replay, approval, and rollback controls.

### Business-process and investigation path

Start with [`06-business-processes/decision_control_plane_process_model_catalog.md`](06-business-processes/decision_control_plane_process_model_catalog.md), then compare the current [`../bpmn-aware-investigation-case-flow.md`](../bpmn-aware-investigation-case-flow.md) and [`../governed-investigation-workflow.md`](../governed-investigation-workflow.md). BPMN guides deterministic flow, DMN informs explicit decisions, and CMMN accommodates discretionary investigation case work around the control plane.

## Presentation source projects

| Project folder                                                                                                    | Subject                                       | Notes                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`decision_infrastructure_deck/`](10-presentation-source/decision_infrastructure_deck/)                           | Cross-industry Decision Infrastructure theory | Contains canonical-object, invariant, pluggable-surface, and financial-crime path pages. |
| [`decision_control_plane_deck/`](10-presentation-source/decision_control_plane_deck/)                             | Decision Control Plane product plan           | Contains architecture, interaction sequence, MVP scorecard, and roadmap pages.           |
| [`decision_control_plane_dr_deck/`](10-presentation-source/decision_control_plane_dr_deck/)                       | Disaster recovery and active-active safety    | Contains failure model, failover protocol, simulation, and runbook pages.                |
| [`decision_control_plane_rpo_deck/`](10-presentation-source/decision_control_plane_rpo_deck/)                     | RPO admission and fencing                     | Contains admission gate, ownership epoch, sequence, and test-result pages.               |
| [`decision_control_plane_pilot_deck/`](10-presentation-source/decision_control_plane_pilot_deck/)                 | First-pilot production operation              | Contains pilot boundary, developer, gates, observability, and rollback pages.            |
| [`decision_control_plane_observability_deck/`](10-presentation-source/decision_control_plane_observability_deck/) | Observability and operator response           | Contains dashboard, operator questions, architecture, chaos, and decision pages.         |

No binary `.ppt`, `.pptx`, `.docx`, `.xls`, or `.xlsx` file was present in the supplied workspace at archive time. Where presentation materials existed, their editable slide-project sources were preserved under `10-presentation-source/`; where plans and research existed, their Markdown originals were preserved without conversion. This avoids fabricating a binary office artifact while keeping the actual available source in Git.

## Archive maintenance

Add new source material to the numbered folder that best matches its subject and link it here. Do not overwrite a historical research document to describe a new release; instead, add a dated or purpose-specific document and update the relevant current-state release note in `docs/`. Operational claims must remain bounded by what the application and its validation demonstrate.
