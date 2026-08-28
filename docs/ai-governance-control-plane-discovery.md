# AI Governance Control Plane Discovery

## Purpose and scope

This document records a **future discovery direction**, not a newly implemented capability. It responds to the supplied AI-cost-governance direction by treating an AI interaction as another governed decision episode rather than as a standalone token-tracking product. The current financial-crime screening pilot remains unchanged: it has no LLM execution endpoint, provider connection, prompt-cache operation, model-routing operation, token charge, subsidy, budget decision, or external delivery promise.

The durable proposition is that an AI interaction can be represented by the existing decision-state kernel, **S = (I, E, P, M, A, O, T)**. The AI domain adds a prompt, context reference, model/provider identity, cache posture, token/cost measurement, latency, and any required human approval as evidence-bound attributes of the episode. It does not weaken the distinction between an observed or recommended action and an authorized consequential action.

| Future AI episode element | Decision-state interpretation | Governance requirement |
|---|---|---|
| Tenant, team, workflow, user | Identity **I** | Tenant and role scope must be resolved before recording or routing. |
| Prompt and context references | Evidence **E** | Retain hashes/references under policy; do not assume raw prompt retention is appropriate. |
| Budget, model, cache, routing policy | Policy **P** | Version, review, simulate, and approve separately from provider execution. |
| Provider/model/context version | Manifest **M** | Bind reproducible model and configuration identity to every retained episode. |
| Request authority and approval | Authority **A** | Require accountable approval for high-impact use cases before consequences. |
| Output, cost, token usage, cache state | Outcome **O** | Record observed measures and policy decision separately from user-visible output. |
| Start, finish, TTL, ledger period | Time **T** | Use UTC timestamps, period boundaries, and explicit cache expiry semantics. |

## Product framing

The commercial framing is **AI cost governance**, not token tracking. A future tenant-scoped AI Governance Control Plane could unite an AI Activity Ledger, AI Budget Policy Engine, model and cache-routing policy, replay workspace, cost analytics, approval workflow, and provider abstraction behind the stable decision kernel. Those components should be introduced only after the platform validates a read-only evidence model and a clearly bounded policy-review path.

## Recommended discovery sequence

| Release candidate | Bounded objective | Explicit validation outcome | Not included in the first increment |
|---|---|---|---|
| AI Activity Ledger read model | Normalize tenant-scoped, provider-neutral AI usage events into hash/reference-based evidence records. | Operators can explain spend, latency, cache status, workflow attribution, and retention posture for retained synthetic or imported records. | Provider calls, raw prompt storage by default, billing, budget enforcement. |
| AI Budget Policy Studio | Reuse Policy Studio revisions and maker/checker review to describe cost, approval, cache, retention, and allowed-model rules. | A revision can be replay-simulated against a retained ledger cohort and shown as feasible or infeasible. | Automatic purchase authorization, chargeback, real-time routing. |
| Routing and cache recommendation | Produce explainable **recommendations** for provider/model/cache posture subject to hard policy constraints. | Every recommendation binds inputs, policy version, alternatives, cost/latency estimates, and a no-action result. | Silent fallback, provider credential use, cross-tenant cache sharing. |
| AI replay and approval | Reconstruct retained AI episodes and route high-impact outputs into a distinct accountable approval case. | A reviewer can compare prompt/context/model/policy/output references without making an external execution claim. | Re-executing sensitive prompts or outputs by default. |
| Cost analytics | Aggregate policy-quality and AI-governance outcomes by tenant, team, workflow, policy, model, and provider. | A dashboard distinguishes observed usage from modeled savings and preserves source lineage. | Financial invoices, guaranteed savings, real-time billing. |
| Provider abstraction | Define adapter contracts for OpenAI, Anthropic, Gemini, local models, and later providers. | Contract tests demonstrate tenant isolation, evidence binding, error semantics, and policy admission with synthetic adapters. | Production credentials, managed execution service, provider delivery SLA. |

## Optimization and dynamic-programming boundary

The retained-cohort simulator can use dynamic programming and constrained optimization for **analysis**, not execution. A suitable first formulation treats the finite budget or capacity as a hard bound and candidate AI tasks as evidence-bound options with value, expected cost, risk, required approval, and cache eligibility. The solver may identify a recommended allocation or frontier only after hard constraints are applied: tenant scope, allowed-model policy, sensitive-context rule, reviewer requirement, evidence retention requirement, and maximum cost/latency posture.

The implementation must favor transparent constrained methods over opaque optimization claims. An infeasible plan is a valid output. Missing usage evidence, a missing policy version, unknown provider assumptions, or a policy breach must block the recommendation rather than be assigned a favorable score. The platform must not fragment requests across a corporate subsidy or personal payment method, invoke a provider, or grant financial credit without separately authorized execution controls.

## Return on Research

| Workstream | Knowledge value | Engineering leverage | Cross-domain applicability | Validation cost | Maintenance burden | Strategic priority |
|---|---:|---:|---:|---:|---:|---|
| AI Activity Ledger read model | High | High | High | Medium | Medium | Do next only after Policy Studio review and graph read model are validated. |
| AI Budget Policy Studio | High | High | High | Medium | Medium | Next after the ledger establishes evidence quality. |
| Recommendation-only optimization | Medium–High | High | High | Medium | Medium | Run as a retained-cohort experiment before any routing authority. |
| AI replay and approval | High | Medium–High | High | Medium | Medium | Follow budget-policy validation; reuse investigation and Evidence Graph primitives. |
| Provider abstraction/execution | Medium | High | High | High | High | Later; only after security, procurement, and contractual validation. |

## Go, narrow, or stop criteria

Proceed from discovery only if the AI ledger can retain tenant-scoped provenance without defaulting to sensitive raw-content storage, and the Policy Studio can replay a sample policy against a retained cohort. Narrow scope if only imported provider-usage exports can be normalized reliably. Stop any execution-oriented work if model/provider identity, policy binding, approval authority, or tenant isolation cannot be demonstrated end to end.

> **Current pilot boundary:** The platform now supports Policy Studio revision evidence, retained-cohort simulation, and a provenance-only Evidence Graph for its financial-crime screening wedge. AI Governance Control Plane concepts are documented for future discovery only. No AI provider is connected and no budget, caching, routing, token, billing, or approval automation is activated.
