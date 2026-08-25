# Project TODO

- [x] Define tenant-scoped domain models for tenants, state manifests, compatibility assessments, migration epochs, rollout steps, evidence, operator approvals, and notifications.
- [x] Implement tRPC APIs that enforce tenant context and ownership/RPO gates for state evolution and migration execution.
- [x] Create decision-state evolution workspace with provenance, schema versions, compatibility, replay verification, and rollback state visibility.
- [x] Create multi-region rollout and canary controller for expand, dual-write, backfill, read cutover, write cutover, and contract phases.
- [x] Create operations dashboard for migration progress, regional ownership, RPO headroom, fencing rejections, admission latency, alerts, and canary health.
- [x] Add tenant-scoped drill-down views for decisions, manifests, rollout evidence, replay checks, and operator actions.
- [x] Build customer documentation portal with SDK onboarding, request and response contracts, error semantics, schema reference, replay, shadow-mode guidance, and production checklists.
- [x] Add tenant-scoped safety notifications for canary failure, RPO breach, fencing, and approval-required migration states.
- [x] Add end-to-end architecture and project-summary presentation content for the platform and pilot deployment path.
- [x] Write and run Vitest coverage for control-plane safety rules and tenant scoping.
- [x] Verify responsive user experience and capture final UI screenshots.
- [ ] Save a release checkpoint after all completed work is verified.
- [x] Add replay verification controls and explicit rollback phase/reason visibility directly into the Decision-state evolution workspace.
- [x] Expand the developer portal with a concrete schema reference surface and keep the portal route-gated inside the pilot application.
- [x] Add Vitest coverage for store-level tenant notification visibility and role-gated control-plane mutation permissions.
- [x] Add direct store-level tests for workspace notification filtering and cross-tenant or unauthorized control-plane mutations.
