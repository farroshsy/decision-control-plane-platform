export type DocumentationSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

export type DocumentationEntry = {
  id: string;
  title: string;
  kind: "Theory" | "Architecture" | "Guide" | "ADR" | "Release" | "Research archive";
  summary: string;
  tags: string[];
  sourcePath: string;
  relatedIds: string[];
  workspaceHref?: string;
  workspaceLabel?: string;
  sections: DocumentationSection[];
};

export const documentationCatalog: DocumentationEntry[] = [
  {
    id: "decision-state-theory",
    title: "Decision-State Evolution Theory",
    kind: "Theory",
    summary: "The reusable theory for governing consequential decisions as evidence-bound, replayable state transitions.",
    tags: ["S=(I,E,P,M,A,O,T)", "replay", "invariants", "tenant scope", "authority"],
    sourcePath: "docs/decision-state-evolution-theory.md",
    relatedIds: ["architecture-handbook", "adr-canonical-episode", "bpmn-case-flow"],
    workspaceHref: "/app/state",
    workspaceLabel: "Open State Evolution",
    sections: [
      { heading: "Core proposition", body: ["A decision is not only an outcome. It is a time-bound relationship between identity, evidence, policy semantics, state meaning, authority, action, and auditability.", "The stable model is S = (I, E, P, M, A, O, T): identity, evidence, policy, manifest/state, authority, outcome, and time."] },
      { heading: "Stable kernel", body: ["Canonical decision episodes, explicit unknown and conflict states, immutable audit, deterministic replay, ownership epochs, RPO admission, fencing, and idempotent actions should outlive any particular domain model or reasoning engine."], bullets: ["Do not infer allow from stale or unknown state.", "Bind policy and manifest versions to the recorded result.", "Keep outcome evidence separate from execution authority."] },
    ],
  },
  {
    id: "architecture-handbook",
    title: "Architecture Handbook",
    kind: "Architecture",
    summary: "How the domain adapter, stable decision kernel, safety gates, investigation lifecycle, evidence lifecycle, and integration boundary work together.",
    tags: ["domain adapter", "policy interpreter", "safety gates", "BPMN", "CMMN", "DMN"],
    sourcePath: "docs/architecture-handbook.md",
    relatedIds: ["decision-state-theory", "adr-canonical-episode", "adr-pilot-boundary", "adr-investigation-ownership"],
    workspaceHref: "/app/operations",
    workspaceLabel: "Open Control Room",
    sections: [
      { heading: "Layered responsibility", body: ["Domain adapters normalize source events; the decision kernel binds evidence and versions; safety controls decide admission; investigation cases coordinate human work; retained evidence supports review; integrations expose bounded access."], bullets: ["Adapters and policy interpreters are pluggable.", "Authority gates are stable and explicit.", "A recommendation does not execute an action."] },
      { heading: "Process complementarity", body: ["BPMN-like phases make migration stop rules deterministic. DMN-style decisions make comparison and recommendation logic explicit. CMMN-style cases hold the discretionary investigation work that does not fit a linear flow."] },
      { heading: "Pilot boundary", body: ["Service-level posture is calculated at read time. This application does not run a background timer, automatic dispatch, external delivery, or automatic escalation worker."] },
    ],
  },
  {
    id: "capability-roadmap",
    title: "Capability-Led Roadmap",
    kind: "Guide",
    summary: "A roadmap that prioritizes durable control-plane capabilities instead of accumulating unrelated screens.",
    tags: ["Return on Research", "investigation", "governance", "simulation", "evidence lifecycle"],
    sourcePath: "docs/capability-roadmap.md",
    relatedIds: ["investigation-workflow", "architecture-handbook", "research-archive"],
    workspaceHref: "/app/investigations",
    workspaceLabel: "Open Investigations",
    sections: [
      { heading: "Operator lifecycle", body: ["The end-to-end journey is Observe → Investigate → Compare → Interpret → Recommend → Approve → Execute → Verify → Retain → Review.", "This increment strengthens the ownership, service-level, evidence, and documentation layer between investigation and recommendation. Approval and execution remain independently protected." ] },
      { heading: "Current priority", body: ["Investigation productivity and evidence lifecycle work offer high engineering leverage because they improve accountable human case work around every domain adapter without changing the stable kernel."] },
    ],
  },
  {
    id: "operator-enablement-collaboration",
    title: "Operator Enablement and Governed Collaboration Plan",
    kind: "Guide",
    summary: "The five-minute operator path, role-visible comments, controlled redaction, shared tenant queues, and draft-only hourly in-app SLA reminder design.",
    tags: ["getting started", "Observe Compare Interpret Act Retain", "comment visibility", "redaction", "shared queue", "SLA reminder"],
    sourcePath: "docs/operator-enablement-collaboration-plan.md",
    relatedIds: ["capability-roadmap", "investigation-workflow", "adr-investigation-ownership", "architecture-handbook"],
    workspaceHref: "/app/getting-started",
    workspaceLabel: "Open Getting Started",
    sections: [
      { heading: "Five-minute operator enablement", body: ["The guide translates the operating model into Observe → Compare → Interpret → Act → Retain and deep-links to the live tenant-scoped workspaces.", "A recommended next action is derived from visible case posture, but it remains a navigation aid rather than an automatic decision or execution trigger."] },
      { heading: "Governed collaboration", body: ["Comments are role-visible according to tenant membership. Redaction preserves the row, original body hash, reason, actor, timestamp, and an immutable activity record instead of deleting evidence.", "Shared team queues are tenant-scoped and expose an explicit allowed-role policy. Personal saved views remain private."] },
      { heading: "Hourly reminder boundary", body: ["The policy is fixed to hourly evaluation, named assigned investigators only, platform-operator ownership, and in-app/audit records only. Manual deterministic evaluation is supported before deployment.", "No background schedule is activated until a checkpoint exists, the site is deployed, and the user explicitly confirms activation. No email, SMS, Slack, Teams, webhook delivery, automatic escalation, or external delivery guarantee is claimed."] },
    ],
  },
  {
    id: "governed-decision-authoring-discovery",
    title: "Governed Decision Authoring Discovery Plan",
    kind: "Guide",
    summary: "A bounded sequence for Policy Studio, replay-backed simulation, Evidence Graph, workflow packs, AI governance, analytics, and partner ecosystem discovery.",
    tags: ["Policy Studio", "maker checker", "simulation", "Evidence Graph", "industry packs", "AI governance", "Return on Research"],
    sourcePath: "docs/governed-decision-authoring-discovery-plan.md",
    relatedIds: ["decision-state-theory", "architecture-handbook", "operator-enablement-collaboration", "product-release-roadmap"],
    workspaceHref: "/app/getting-started",
    workspaceLabel: "Open Getting Started",
    sections: [
      { heading: "Authoring foundation", body: ["The next implementation increment is a tenant-scoped policy-revision registry, lifecycle state machine, maker/checker approval evidence, and replay-linked comparison—not a general-purpose code execution surface.", "A policy publication is an accountable state transition and must be evidence-bound, reviewable, replay-backed, and reversible by a separately protected control."] },
      { heading: "Evidence and simulation boundary", body: ["The Evidence Graph is a provenance-preserving read model over retained sources. Simulation uses bounded historical cohorts and reports impact without modifying a live rollout or policy interpreter."] },
    ],
  },
  {
    id: "policy-studio-implementation",
    title: "Policy Studio and Retained-Cohort Simulation Guide",
    kind: "Guide",
    summary: "How to create hash-bound policy revisions, obtain distinct maker/checker review, and assess a proposed revision against a retained tenant cohort without changing live policy or rollout state.",
    tags: ["Policy Studio", "revision registry", "maker checker", "simulation", "source hash", "retained cohort"],
    sourcePath: "docs/research-optimization-simulation-notes.md",
    relatedIds: ["governed-decision-authoring-discovery", "evidence-graph-guide", "adr-pilot-boundary"],
    workspaceHref: "/app/policy-studio",
    workspaceLabel: "Open Policy Studio",
    sections: [
      { heading: "Intent and use", body: ["Create a source-hashed draft, run the retained replay cohort, and submit it for a distinct tenant checker. A reviewer cannot be the revision creator, and approval records review evidence only.", "The expected outcome is a reconstructable chain from authored source to simulation to review. The current pilot does not publish policy code, alter an interpreter, or mutate rollout authority."] },
      { heading: "Optimization method", body: ["The initial report calculates replay-observable counts, a transparent bounded score, and hard feasibility gates. Missing evidence or an unrun candidate replay is infeasible rather than traded away for a higher score.", "Dynamic programming and constrained optimization remain analysis methods for finite, retained cohorts; no learned or approximate optimizer controls a consequential action in this pilot."] },
    ],
  },
  {
    id: "evidence-graph-guide",
    title: "Provenance-only Evidence Graph Guide",
    kind: "Guide",
    summary: "A read-model guide for navigating retained links among decisions, evidence, policy versions, replay traces, investigations, outcomes, simulations, and immutable audit activity.",
    tags: ["Evidence Graph", "provenance", "decision", "replay", "investigation", "audit", "simulation"],
    sourcePath: "docs/governed-decision-authoring-discovery-plan.md",
    relatedIds: ["policy-studio-implementation", "decision-state-theory", "investigation-workflow"],
    workspaceHref: "/app/evidence-graph",
    workspaceLabel: "Open Evidence Graph",
    sections: [
      { heading: "Intent and use", body: ["Use the optional decision filter to focus on one retained episode, then inspect node detail and edge provenance. Each edge is derived from a tenant-scoped source record or a stored provenance reference.", "The expected outcome is an explanation of why a decision, replay, case, or simulation belongs in the same traceable network. The graph does not infer missing links, edit relationships, or traverse tenant boundaries."] },
    ],
  },
  {
    id: "ai-governance-control-plane-discovery",
    title: "AI Governance Control Plane Discovery",
    kind: "Guide",
    summary: "A future, policy-first path for AI activity evidence, budget policies, cache and routing recommendations, replay, approval, cost analytics, and provider abstraction—without claiming current LLM execution.",
    tags: ["AI governance", "AI Activity Ledger", "budget policy", "model routing", "prompt caching", "AI replay", "Return on Research"],
    sourcePath: "docs/ai-governance-control-plane-discovery.md",
    relatedIds: ["policy-studio-implementation", "evidence-graph-guide", "governed-decision-authoring-discovery"],
    workspaceHref: "/app/policy-studio",
    workspaceLabel: "Open Policy Studio",
    sections: [
      { heading: "Future governed domain", body: ["AI interactions can reuse the decision-state kernel by binding prompt/context references, model/provider identity, cache posture, token/cost measures, policy, authority, outcome, and time to a tenant-scoped episode.", "The current pilot does not connect an AI provider or implement token tracking, routing, caching, budget enforcement, subsidy allocation, or billing."] },
      { heading: "How to use the roadmap", body: ["Start with a provenance-safe activity-ledger read model, then reuse Policy Studio and retained-cohort simulation for budget-policy evidence. Treat routing as a recommendation until separate execution authority and provider controls are validated."] },
    ],
  },
  {
    id: "policy-studio-evidence-graph-release",
    title: "Policy Studio, Simulation, and Evidence Graph Release Notes",
    kind: "Release",
    summary: "Delivered tenant-scoped policy revisions, maker/checker review controls, retained-cohort simulation reports, provenance-only graph exploration, detailed in-app guidance, resize smoke coverage, and route-level code splitting.",
    tags: ["Policy Studio", "maker checker", "simulation", "Evidence Graph", "sidebar resize", "code splitting", "pilot boundary"],
    sourcePath: "docs/policy-studio-evidence-graph-release-notes.md",
    relatedIds: ["policy-studio-implementation", "evidence-graph-guide", "ai-governance-control-plane-discovery", "product-release-roadmap"],
    workspaceHref: "/app/policy-studio",
    workspaceLabel: "Open Policy Studio",
    sections: [
      { heading: "What was delivered", body: ["Policy Studio records source-hashed revisions and requires a distinct checker for a review decision. Retained-cohort reports impose hard evidence/replay constraints before emitting a completed or infeasible result.", "Evidence Graph reads tenant-scoped source records and identifies the provenance behind each decision, evidence, replay, case, outcome, simulation, and audit relationship."] },
      { heading: "Boundary and validation", body: ["The approved validation seeded exactly one baseline and one draft policy revision with immutable activities. No policy was published, executed, reviewed, or allowed to change a replay, investigation, rollout, schedule, or external system.", "The release passed 45 Vitest tests across 14 files, TypeScript checking, the production build, and browser review. The optional authenticated Playwright resize smoke test skips without an exported test-session storage state."] },
    ],
  },
  {
    id: "product-release-roadmap",
    title: "Decision Control Platform Release Roadmap",
    kind: "Guide",
    summary: "The product evolution from operated decisions to authoring, explanation, reuse, packaged governance, AI governance, intelligence, and partner ecosystem capabilities.",
    tags: ["Operate Author Explain Reuse Package", "Policy Studio", "Knowledge Graph", "Workflow Library", "Ecosystem"],
    sourcePath: "docs/product-release-roadmap.md",
    relatedIds: ["governed-decision-authoring-discovery", "capability-roadmap", "architecture-handbook"],
    workspaceHref: "/app/docs",
    workspaceLabel: "Open Documentation Portal",
    sections: [
      { heading: "Eight coherent releases", body: ["The roadmap presents Governed Decision Operations, Authoring, Knowledge Graph, Workflow Platform, Industry Packs, AI Governance, Decision Intelligence, and Ecosystem as sequenced capability milestones.", "Only the current pilot foundation is represented as implemented; later stages are discovery and validation commitments with explicit boundaries."] },
    ],
  },
  {
    id: "bpmn-case-flow",
    title: "BPMN-Aware Investigation Case Flow",
    kind: "Guide",
    summary: "Why deterministic process gates and discretionary case management must coexist in a governed investigation workflow.",
    tags: ["BPMN", "DMN", "CMMN", "investigation", "rollback recommendation"],
    sourcePath: "docs/bpmn-aware-investigation-case-flow.md",
    relatedIds: ["investigation-workflow", "adr-investigation-ownership", "architecture-handbook"],
    workspaceHref: "/app/migration",
    workspaceLabel: "Open Migration Timeline",
    sections: [
      { heading: "Deterministic flow and discretionary work", body: ["Migration controls follow explicit evidence and stop rules. A replay divergence can then open a case that accepts evidence, comments, accountable outcomes, assignments, and escalations without turning that case into an execution rail."] },
      { heading: "Authority separation", body: ["A case may conclude rollback is required. The conclusion is retained evidence and recommendation; the safety-gated rollback control remains the only path that can change rollout state."] },
    ],
  },
  {
    id: "investigation-workflow",
    title: "Governed Investigation Workflow",
    kind: "Guide",
    summary: "Observe, compare, interpret, act through protected controls, retain evidence, and review the case lifecycle.",
    tags: ["replay diff", "semantic comparison", "assignment", "escalation", "activity history"],
    sourcePath: "docs/governed-investigation-workflow.md",
    relatedIds: ["bpmn-case-flow", "adr-investigation-ownership", "workflow-release"],
    workspaceHref: "/app/investigations",
    workspaceLabel: "Open Investigation Workspace",
    sections: [
      { heading: "Evidence-first investigation", body: ["Operators move from a replay divergence to semantic comparison, evidence bindings, an accountable outcome, a recommendation or approval record, and retained audit evidence."], bullets: ["Search and saved views reduce queue friction.", "Named ownership and due targets make work accountable.", "Comments and attachment metadata preserve rationale without granting execution authority."] },
    ],
  },
  {
    id: "workflow-release",
    title: "Workflow Management Release Notes",
    kind: "Release",
    summary: "The bounded controls for role queues, manual escalation, signed manifests, and retention-aware replay exports.",
    tags: ["assignment", "escalation", "signed manifest", "retention", "pilot boundary"],
    sourcePath: "docs/workflow-management-release-notes.md",
    relatedIds: ["adr-pilot-boundary", "adr-investigation-ownership", "investigation-workflow"],
    workspaceHref: "/app/replay",
    workspaceLabel: "Open Replay Explorer",
    sections: [
      { heading: "Evidence integrity", body: ["Replay packages use canonical JSON hashing with server-held HMAC signatures and a retained tenant-scoped manifest. Verification proves the stored pilot manifest against the server key, not third-party notarization or legal admissibility."] },
      { heading: "Manual operating controls", body: ["Assignment and escalation records are local tenant-scoped workflow evidence. Simulated retries record local attempts and do not make outbound receiver calls."] },
    ],
  },
  {
    id: "lifecycle-release",
    title: "Knowledge Portal and Investigation Lifecycle Release Notes",
    kind: "Release",
    summary: "The bounded implementation of searchable documentation, advanced queues, accountable ownership, service-level posture, comments, attachments, and immutable activity evidence.",
    tags: ["documentation portal", "saved views", "due dates", "SLA", "comments", "attachments"],
    sourcePath: "docs/knowledge-portal-investigation-lifecycle-release-notes.md",
    relatedIds: ["architecture-handbook", "adr-investigation-ownership", "capability-roadmap", "investigation-workflow"],
    workspaceHref: "/app/investigations",
    workspaceLabel: "Open Investigation Lifecycle",
    sections: [
      { heading: "Delivered operating layer", body: ["The portal makes theory, architecture, ADRs, release notes, and the research archive searchable in the application. The investigation workspace adds queue search, filtering, sorting, private saved views, workload posture, named or role-based ownership, due targets, service-level targets, comments, attachment references, and immutable activity records."] },
      { heading: "Safety boundary", body: ["No persistent worker or in-process timer is added. Service-level posture is read-time calculation; no automatic notification, dispatch, escalation, execution, closure, or deletion occurs in this pilot."] },
    ],
  },
  {
    id: "adr-canonical-episode",
    title: "ADR 0001: Canonical Decision Episode",
    kind: "ADR",
    summary: "Preserve the canonical decision episode as the stable kernel across domains.",
    tags: ["ADR", "canonical model", "cross-domain", "kernel"],
    sourcePath: "docs/adr/0001-canonical-decision-episode.md",
    relatedIds: ["decision-state-theory", "architecture-handbook"],
    sections: [
      { heading: "Decision", body: ["The platform preserves S = (I, E, P, M, A, O, T) as the stable kernel. Domain adapters translate local models into this kernel rather than replacing it."] },
      { heading: "Consequence", body: ["Replay, evidence provenance, tenant isolation, ownership/RPO admission, and auditability evolve once while domain taxonomies and reasoning surfaces remain replaceable."] },
    ],
  },
  {
    id: "adr-pilot-boundary",
    title: "ADR 0002: Pilot Integration Boundary",
    kind: "ADR",
    summary: "Keep simulated pilot integration records explicit instead of claiming unvalidated production infrastructure.",
    tags: ["ADR", "MCP", "webhooks", "simulation", "integration"],
    sourcePath: "docs/adr/0002-pilot-integration-boundary.md",
    relatedIds: ["workflow-release", "architecture-handbook"],
    workspaceHref: "/app/integrations",
    workspaceLabel: "Open Integrations",
    sections: [
      { heading: "Decision", body: ["Webhook retries are database-backed simulations. MCP is request/response JSON-RPC. Manifest signatures are server-held integrity records. These controls do not claim external delivery guarantees, streaming, queues, or automatic infrastructure control."] },
    ],
  },
  {
    id: "adr-investigation-ownership",
    title: "ADR 0003: Investigation Lifecycle Ownership",
    kind: "ADR",
    summary: "Keep human investigation work accountable and separate from approval or execution authority.",
    tags: ["ADR", "ownership", "SLA", "comments", "attachments", "activity history"],
    sourcePath: "docs/adr/0003-investigation-lifecycle-ownership.md",
    relatedIds: ["investigation-workflow", "bpmn-case-flow", "capability-roadmap"],
    workspaceHref: "/app/investigations",
    workspaceLabel: "Open Case Workspace",
    sections: [
      { heading: "Decision", body: ["Cases may have named or role-based ownership, due targets, manually created escalation targets, immutable comments, attachment metadata, activity history, and private saved views. Service-level posture is evaluated when the case is read, without a background worker."] },
    ],
  },
  {
    id: "research-archive",
    title: "Research and Presentation Archive",
    kind: "Research archive",
    summary: "A structured repository archive of theory, plans, operational guidance, process research, technical scripts, and editable slide-project sources.",
    tags: ["research", "plans", "runbooks", "presentation source", "Return on Research"],
    sourcePath: "docs/research-archive/README.md",
    relatedIds: ["capability-roadmap", "decision-state-theory", "architecture-handbook"],
    sections: [
      { heading: "Archive map", body: ["The archive is structured around decision infrastructure, architecture and contracts, resilience validation, governance and migration, operations and active-active safety, business processes, pilot integration, economics and leverage, scripts, and source presentation projects."], bullets: ["Decision Infrastructure and canonical schema work.", "Migration, RPO, fencing, observability, and runbook material.", "BPMN, DMN, CMMN, business process, and stakeholder research.", "Six editable slide-project source folders, preserved without fabricating missing office binaries."] },
      { heading: "How to interpret it", body: ["Archive records explain the lineage of the product. Current release notes and the Architecture Handbook define what the application actually implements and which pilot boundaries apply today."] },
    ],
  },
];

export function searchDocumentation(query: string, kind: DocumentationEntry["kind"] | "All") {
  const normalizeForSearch = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalized = normalizeForSearch(query);
  return documentationCatalog.filter(entry => {
    if (kind !== "All" && entry.kind !== kind) return false;
    if (!normalized) return true;
    const searchable = normalizeForSearch([entry.title, entry.kind, entry.summary, entry.sourcePath, ...entry.tags, ...entry.sections.flatMap(section => [section.heading, ...section.body, ...(section.bullets ?? [])])].join(" "));
    return searchable.includes(normalized);
  });
}
