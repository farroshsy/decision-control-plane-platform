# Governed Investigation Workflow

## Purpose

The next Decision Control Plane increment should not be treated as a collection of dashboard widgets. The semantic diff, Migration Timeline, webhook diagnostics, replay assertion, approval evidence, and rollback recommendation surfaces together form a **governed investigation workflow**. Its purpose is to turn a potentially material difference in a tenant-scoped decision system into an accountable, replayable, and non-destructive operator process.

> A visual difference is not itself a decision to promote, hold, or roll back. It is evidence that must be interpreted in a tenant, policy, state, authority, and process context.

## Business Process

| Stage | Primary actor | Control-plane evidence | Allowed output | Explicitly not allowed |
|---|---|---|---|---|
| **Observe** | Operator or developer | Telemetry, RPO headroom, owner epoch, migration phase, delivery record | A tenant-scoped investigation entry point | Automatic production action |
| **Compare** | Compliance or platform operator | Baseline and candidate trace fields, state/policy versions, disposition, trace hash | An equivalence, divergence, or review conclusion | Treating readable traces as equivalent without a field comparison |
| **Interpret** | Compliance and domain owner | Phase purpose, expected evidence, stop conditions, replay findings, process/case context | Approval evidence or a rollback recommendation | Silent exception handling or implied authority transfer |
| **Act** | Authorized rollout operator | Existing ownership, RPO, audit, health, approval, and action-idempotency gates | A separately governed advance, hold, or rollback request | Bypassing gates through the investigation interface |
| **Retain** | Audit and platform operations | Assertion, approval/recommendation, migration step, trace, diagnostic payload | Audit export and replay corpus | Rewriting historical evidence |

The implementation follows the project’s stable kernel: canonical decision identity; tenant scope; immutable evidence; policy and state-version binding; explicit unknown, divergence, and hold posture; authority epochs; and additive reversibility. BPMN-style flow, DMN-derived policy content, and case-management work remain complementary process representations rather than replacements for the control plane.

## Workflow Rules

The workflow adopts six rules.

1. **Compare semantics before judging outcomes.** A changed disposition is material, but equal dispositions may still conceal a policy, state, or evidence interpretation change. The side-by-side diff therefore exposes trace fields and version bindings, not only a pass/fail badge.
2. **Preserve process phase context.** A migration phase explains which evidence is required, which stop conditions apply, and whether an action is even permissible. The timeline must expose this context before an operator records an approval or recommendation.
3. **Separate recommendation from execution.** A rollback recommendation is an accountable evidence record. It does not itself fence a region, mutate a rollout, or invoke an action rail. Existing protected rollout controls retain that authority.
4. **Maintain tenant-scoped discovery.** Search and filters in webhook diagnostics operate only over retained deliveries for the selected tenant. They do not query external receivers or claim a delivery guarantee.
5. **Keep integration tools bounded.** MCP and developer examples surface inspection capabilities through request/response calls. API key scope, tenant binding, and existing role controls apply to every call.
6. **Retain the evidence package.** Assertions, approvals, recommendations, trace comparisons, migration steps, and tool calls remain additive records that can be exported and replayed.

## Pilot Boundary

The present implementation is a validated **pilot foundation**. It uses tenant-scoped database records and simulated integration deliveries to rehearse the workflow. It does not claim real external webhooks, retry guarantees, rate limiting, production credential rotation, long-lived MCP sessions, or automatic multi-region infrastructure control.

| Validated pilot capability | Production handoff required before expanding claim |
|---|---|
| Semantic replay diff and retained assertion evidence | Representative customer replay corpus and domain-owner sign-off |
| Migration phase investigation and recommendation evidence | Infrastructure-specific ownership, RPO, audit, and action reconciliation integration |
| Simulated delivery diagnostics and subscription lifecycle | Signed external delivery, idempotent receiver contract, durable queue, retry/backoff policy, and delivery SLO |
| Request/response MCP inspection tools | External client authentication, rate limits, audit retention policy, threat model, and availability SLO |

## Return on Research

| Workstream | Knowledge value | Engineering leverage | Validation cost | Maintenance burden | Priority |
|---|---|---|---|---|---|
| Semantic diff and replay assertion | High: tests whether version changes preserve decision meaning | High: reusable across policy, state, and schema evolution | Low to moderate: deterministic retained traces | Low: stable comparison contract | Now |
| Interactive phase investigation | High: links technical rollout mechanics to accountable process gates | High: reusable across migrations and DR exercises | Moderate: requires scenario evidence | Moderate: phase guidance evolves with runbooks | Now |
| Searchable webhook diagnostics | Medium: reveals integration failure patterns and operator needs | Medium: reusable for every connector | Low in pilot simulation | Moderate when real delivery begins | Now, bounded |
| External delivery and persistent automation | Medium until a customer receiver contract is chosen | Potentially high but domain and infrastructure dependent | High: requires security, SLO, retry, and failure testing | High | Later, only after pilot gates pass |

The business objective remains clear: **observe, investigate, decide, act, and retain**—without converting uncertainty, a visual diff, or a dashboard interaction into unsafe automation.
