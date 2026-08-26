# Decision Control Platform Release Roadmap

## Product evolution

> **Operate → Author → Explain → Reuse → Package → Govern AI → Improve → Extend**

This roadmap organizes the platform around capability milestones. It distinguishes the validated financial-crime pilot from future multi-domain, ecosystem, and commercial capabilities; later releases are directional discovery commitments, not delivered functionality or production claims.

| Release | Product goal | Status | Bounded deliverables |
| --- | --- | --- | --- |
| 1. Governed Decision Operations | Operate governed decisions safely. | **Pilot foundation in place** | Decision state, replay, rollout governance, investigation, evidence, documentation, bounded integrations, collaboration, and in-app SLA records. |
| 2. Governed Decision Authoring | Author governed decisions without code. | **Foundation and discovery** | Policy Studio, policy revisions, draft/review/approval/publish/rollback states, replay-linked comparison, and non-production simulation. |
| 3. Decision Knowledge Graph | Make each decision explainable. | Discovery | Evidence, decision, policy, workflow, impact, and lineage read models with source provenance. |
| 4. Workflow Platform | Reuse operational knowledge. | Discovery | BPMN, DMN, and CMMN templates; versioning; catalog; import/export; explicit human authority points. |
| 5. Industry Packs | Package governance for domains. | Discovery | Financial-crime, supplier-risk, procurement, public-sector, AI-governance, and audit pack manifests after kernel compatibility validation. |
| 6. AI Governance | Govern AI rather than merely calling AI. | Discovery | Prompt/model registries, AI evidence, human review, replay, audit, and approval. |
| 7. Decision Intelligence | Improve decision quality continuously. | Discovery | Policy quality, workload, queue-aging, drift, false-positive, impact, and optimization analysis. |
| 8. Ecosystem | Let partners extend the platform safely. | Discovery | Pack SDK, partner SDK, compatibility/certification process, curated distribution, and only later marketplace/commercial workflows. |

## Release 2 definition of done

Release 2 begins with the **Governed Decision Authoring Foundation** completed in this iteration: accountable reminder acknowledgement/dismissal, platform-operator workload oversight, and a Policy Studio discovery plan. The next implementation increment is a policy-revision registry and maker/checker review evidence, not a general-purpose no-code engine.

The release becomes pilot-validated only when an authorized reviewer can reconstruct a proposed policy revision, its source/hash, semantic comparison, replay-backed simulation cohort, approval decision, and publication/rollback posture inside the tenant boundary.

## Portfolio boundaries

| Capability | Explicitly not implied by this roadmap stage |
| --- | --- |
| Policy Studio | Live production policy deployment, arbitrary user code execution, or automated publication. |
| Knowledge Graph | Completeness of inferred relationships, cross-tenant traversal, or mutable graph authority. |
| Industry Packs | A production-ready pack, regulated-domain coverage, or an external marketplace. |
| AI Governance | Autonomous policy changes, decision outcomes, rollout control, or assurance/certification claims. |
| Ecosystem | Public marketplace commerce, revenue sharing, partner credentialing, or stable third-party SDK guarantees. |
