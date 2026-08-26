# Decision Control Plane

> **A tenant-scoped control plane for governing how consequential decisions evolve.**

The Decision Control Plane is an applied implementation of the reusable **Decision Infrastructure / Decision-State Evolution** theory. It treats a consequential decision as a replayable, evidence-bound event over versioned state rather than as a transient rule-engine result. Financial-crime screening is the current bounded pilot wedge; the stable kernel is designed to transfer to supplier risk, counterparty risk, procurement, safety, and other governed decision domains.

The central state model is:

> **S = (I, E, P, M, A, O, T)**
>
> Identity and tenant scope; evidence and provenance; policy semantics; manifest/state version; authority; outcome/action; and time.

No control should silently convert a stale, unknown, conflicted, unauditable, or unauthorized state into an allow-like consequential action.

## What is implemented

The application is a React, TypeScript, Express, tRPC, Drizzle, and MySQL/TiDB platform with authenticated, tenant-scoped workspaces. The implementation supports a governed pilot workflow—not merely a design mockup.

| Capability                     | Current implementation                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant scope and access**    | Tenant selection, membership/role checks in store operations, tenant-scoped evidence, rollout, integration, investigation, and audit records.                                                 |
| **Decision-state governance**  | Versioned state manifests, policy/version comparison, provenance visibility, compatibility signals, and explicit unknown/conflict posture.                                                    |
| **Rollout safety**             | Migration timeline, phase evidence, canary posture, ownership/RPO/audit/replay/approval gates, recommendations, and rollback context.                                                         |
| **Replay and evidence**        | Deterministic replay inspection, side-by-side semantic diff, replay assertions, verification, evidence links, and retained audit references.                                                  |
| **Investigation workflow**     | BPMN/DMN/CMMN-aware case workspace, accountable outcomes, advanced queue search/filter/sort, private saved views, named or role-based assignment, due/SLA targets, manual escalation, comments, attachment references, immutable activity evidence, and cross-workspace trace navigation. |
| **Evidence-package integrity** | Canonical JSON hashing, server-held HMAC-SHA-256 manifest signatures, signature verification, tenant-scoped retention-policy records, and retained export references.                         |
| **Integration foundation**     | Tenant-scoped pilot API keys, bounded JSON-RPC MCP endpoint, SDK/CLI examples, simulated webhook subscriptions/deliveries, searchable diagnostics, and controlled local retry audit.          |
| **Operator experience**        | Responsive dashboard navigation, dark mode, compact tenant-scoped loading skeletons, contextual notifications, personal in-app reminder acknowledgement/dismissal with retained evidence, tenant-admin workload oversight, and readable safety status. |

## Control flow

```text
Domain adapter / policy interpreter
             │
             ▼
Canonical decision episode ──► Evidence + version binding ──► Decision trace
             │                              │                       │
             │                              ▼                       ▼
             │                        Authority gates          Deterministic replay
             │                              │                       │
             ▼                              ▼                       ▼
Tenant-scoped audit ◄── Rollout/migration controls ◄── Semantic diff + investigation case
                                                              │
                                                              ▼
                                               Accountable outcome / manual queue
```

The architecture deliberately separates **recording or recommending** an outcome from **executing** an action. For example, an investigation outcome of `rollback_required` is evidence and a recommendation; it does not itself execute a rollback. A manual escalation writes a retained tenant-scoped queue record; it does not dispatch external work.

## Operator workspaces

| Route                 | Purpose                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `/app`                | Control-room overview of tenant safety posture, rollout progression, replay and migration signals.                              |
| `/app/state`          | State manifests, provenance, and state-evolution context.                                                                       |
| `/app/rollouts`       | Tenant rollout governance and gate posture.                                                                                     |
| `/app/operations`     | Operational telemetry and safety signals.                                                                                       |
| `/app/migration`      | Expand → dual-write → backfill → verify → canary → contract timeline with phase evidence.                                       |
| `/app/replay`         | Trace selection, semantic comparison, assertions, verification, signed investigation-package export, and manifest verification. |
| `/app/investigations` | CMMN-style investigation case, outcome evidence, role assignment, manual escalation, queue filtering, and trace navigation.     |
| `/app/versions`       | Version safety and compatibility workspace.                                                                                     |
| `/app/evidence`       | Audit and replay-evidence ledger.                                                                                               |
| `/app/integrations`   | Pilot API keys, bounded MCP, SDK/CLI material, simulated webhooks, diagnostics, controlled retry, and audit export.             |
| `/app/docs`           | Searchable in-application documentation portal for theory, architecture handbook, ADRs, guides, release notes, and the research archive. |

## Pilot boundary

This repository makes a deliberate distinction between **validated pilot capabilities** and capabilities that would need dedicated production infrastructure.

| Present in this pilot                                                                                                 | Not claimed by this pilot                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database-backed simulated webhook subscriptions, deliveries, retry attempts, and immutable local retry audit records. | External receiver calls, durable message queues, delivery guarantees, background retry workers, or operational SLAs.                                  |
| Session or tenant-scoped bearer access to the request/response JSON-RPC `/api/mcp` endpoint.                          | Persistent MCP streaming, long-lived connections, rate limiting, production credential rotation, or autonomous tool execution.                        |
| Server-side HMAC manifest signing and verification with a retention-policy record.                                    | Third-party notarization, immutable external storage, hardware-backed key custody, automatic legal holds, automatic deletion, or legal admissibility. |
| Application-level tenant controls, evidence records, ownership/RPO admission modelling, and deterministic replay.     | A deployed multi-region active-active service, autonomous regional failover, or cloud-region control.                                                 |

## Local development

### Prerequisites

Use Node.js 22+ and `pnpm`. The managed environment supplies a database connection and the OAuth-related environment variables. Do not commit `.env` secrets.

```bash
pnpm install
pnpm dev
```

The development server runs the Express/tRPC server, which serves the Vite application. Authentication is provided through the configured Manus OAuth flow.

### Quality checks

```bash
pnpm test     # Vitest unit/regression suite
pnpm check    # TypeScript without emitting files
pnpm build    # Vite client build + bundled server build
```

The current Governed Decision Authoring foundation validation passed **42 tests across 12 Vitest files**, TypeScript checking, the production build, and approved browser/persistence review of the tenant-scoped reminder lifecycle. Vite may warn that the client bundle exceeds its default 500 kB chunk guidance; the warning is non-blocking and should be addressed with deliberate code-splitting work rather than suppressed.

### Database changes

Schema changes live in [`drizzle/schema.ts`](drizzle/schema.ts). Generate an additive migration, review the generated SQL, apply it through the managed database workflow, and add focused tests before marking the work complete. Current migrations are preserved under [`drizzle/`](drizzle/).

## Repository layout

```text
client/                  React operator workspaces and reusable UI
server/                  tRPC contracts, tenant-scoped store logic, pilot MCP route, policy helpers
drizzle/                 Drizzle schema and additive migrations
docs/                    Current theory, workflow, release, and validation documents
docs/research-archive/   Preserved research, plans, runbooks, scripts, and slide-project sources
todo.md                  Durable implementation backlog
```

## Documentation map

### Current-state documents

| Document                                                                                               | Use it for                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [`docs/decision-state-evolution-theory.md`](docs/decision-state-evolution-theory.md)                   | Stable theory, seven laws, and the decision-state model.                                    |
| [`docs/observe-integrate-automate-release-notes.md`](docs/observe-integrate-automate-release-notes.md) | Maturity narrative and the explicit integration pilot boundary.                             |
| [`docs/governed-investigation-workflow.md`](docs/governed-investigation-workflow.md)                   | Observe → compare → interpret → act → retain workflow.                                      |
| [`docs/bpmn-aware-investigation-case-flow.md`](docs/bpmn-aware-investigation-case-flow.md)             | Why BPMN, DMN, and CMMN complement each other in a governed investigation.                  |
| [`docs/workflow-management-release-notes.md`](docs/workflow-management-release-notes.md)               | Role assignment, escalation queues, signed manifests, and retention-bound evidence exports. |
| [`docs/capability-roadmap.md`](docs/capability-roadmap.md)                                               | Capability-led product roadmap and deliberate deferrals. |
| [`docs/architecture-handbook.md`](docs/architecture-handbook.md)                                         | Layered architecture, safety separations, and process-model integration. |
| [`docs/knowledge-portal-investigation-lifecycle-release-notes.md`](docs/knowledge-portal-investigation-lifecycle-release-notes.md) | Searchable portal, advanced queues, ownership, service-level, comments, attachments, and activity release. |
| [`docs/operator-enablement-collaboration-plan.md`](docs/operator-enablement-collaboration-plan.md) | Selected operator-guidance, collaboration, and reminder scope with boundaries. |
| [`docs/operator-enablement-governed-collaboration-release-notes.md`](docs/operator-enablement-governed-collaboration-release-notes.md) | Five-minute guide, governed comments/redaction, shared queues, and draft/deployment-gated SLA reminders. |
| [`docs/governed-decision-authoring-discovery-plan.md`](docs/governed-decision-authoring-discovery-plan.md) | Bounded Policy Studio, simulation, Evidence Graph, workflow, pack, AI governance, analytics, and ecosystem discovery sequence. |
| [`docs/product-release-roadmap.md`](docs/product-release-roadmap.md) | Eight release milestones: operate, author, explain, reuse, package, govern AI, improve, and extend. |
| [`docs/validation-notes-governed-decision-authoring.md`](docs/validation-notes-governed-decision-authoring.md) | Browser and persistence evidence for immutable reminder acknowledgement/dismissal and tenant workload visibility. |
| [`docs/validation-notes-caseflow.md`](docs/validation-notes-caseflow.md)                               | Browser and automated evidence for the investigation-case flow.                             |

### Complete research and presentation archive

The full preserved archive is indexed at [`docs/research-archive/README.md`](docs/research-archive/README.md). It includes the Decision Infrastructure research and blueprint, canonical decision-model and integration-test work, resilience/stress analysis, multi-region and RPO/fencing material, tenant governance and security plans, migration and operations runbooks, pilot/developer integration guides, BPMN/CMMN process material, Return on Research and leverage planning, presentation scripts, and the six available slide-project source folders.

The archive did not contain supplied binary `.ppt`, `.pptx`, `.docx`, `.xls`, or `.xlsx` files. Instead, the actual available Markdown sources and editable presentation-project HTML/state files are committed directly so their lineage is visible in Git.

## Contribution principles

Preserve tenant scope at every data access boundary. Keep consequential decisions replayable and evidence-bound. Keep policy, schema, model, connector, and process-runtime concerns pluggable without weakening the stable kernel. Do not represent simulated integrations or design guidance as production operations.

When work adds a feature, record it in [`todo.md`](todo.md), add or update tests, run the quality checks, and update the relevant current-state documentation and research index where appropriate.

## License

This project is published under the [`MIT`](LICENSE) license.
