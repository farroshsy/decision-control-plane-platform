# Workflow Management Expansion

## Purpose

This release extends the tenant-scoped investigation case from a retained evidence file into a **manual operator workflow**. It introduces accountable routing, explicit escalation records, outcome-focused work-queue navigation, and integrity metadata for replay evidence packages. The control plane continues to treat an investigation outcome as evidence; it does not convert an assignment, escalation, or manifest into decision or rollout execution authority.

## Case ownership and escalation

Each assignment records the tenant, case, accountable destination role, assigning actor, rationale, status, and time. A compliance or platform operator may route a case to a role-specific queue; the pilot does not assert the existence of a background dispatcher or a personnel directory.

Escalations are additive manual queue records. The pilot supports `compliance_review`, `platform_safety`, and `customer_exception` destinations with `standard`, `elevated`, or `critical` priority. Platform-safety escalation requires platform-operator authority. A queued escalation can be acknowledged by a member with the destination queue's permitted role. No escalation sends a notification, calls an external system, starts a worker, changes a policy, or executes a rollout action.

## Operator work queue

The Investigation workspace now exposes a tenant-scoped queue that filters retained cases by outcome and sorts them deterministically by most-recent or oldest activity. Each row preserves the case status, current role assignment, active escalations, decision identifier, summary, and last update time. Selecting a row preserves the tenant and case context.

## Signed semantic-diff export manifest

When a permitted operator exports a replay investigation package, the server canonicalizes the package with sorted JSON keys, computes a SHA-256 package hash, and signs the manifest with `HMAC-SHA-256` using the server-held signing key. The retained manifest binds the tenant, decision, investigation case, package hash, signing algorithm, canonicalization scheme, retention policy, hold state, and retention date. The exported JSON includes this manifest and the control plane retains a separate manifest record linked to the audit-export record.

The verification control re-computes the HMAC over the stored manifest using the server-held key. It verifies integrity within this pilot control plane only. It does **not** establish external delivery, third-party notarization, key-management certification, immutable storage, legal admissibility, or a regulatory filing.

## Retention policy boundary

The pilot seeds one tenant-scoped replay-investigation retention policy: **365 days**, no hold by default. Each signed export resolves the active policy and records its own retention-until date. A legal-hold field is modelled and changes a manifest's state to `on_hold`; this release does not run a deletion or retention-enforcement worker. Consequently, the retention record is governance evidence, not an assertion that files are automatically destroyed or preserved in external storage.

## Validation

The release includes canonicalization and signature-tamper tests. The full suite currently contains 24 passing tests across 7 files, alongside TypeScript validation and a production build. The browser verification retained previous replay and integration flows; tenant hydration remains intentionally represented with a compact loading skeleton before case data or queues render.
