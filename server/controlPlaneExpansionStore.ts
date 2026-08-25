import { createHash, randomBytes } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  auditExports,
  decisionEvidence,
  integrationApiKeys,
  integrationDeliveries,
  integrationEndpoints,
  integrationRetryAudits,
  investigationCases,
  investigationRecords,
  mcpToolCalls,
  migrationRollouts,
  migrationSteps,
  replayTraces,
  stateManifests,
  telemetrySnapshots,
  tenants,
} from "../drizzle/schema";
import { getDb } from "./db";
import { advanceRollout, assertTenantRole, verifyReplay } from "./controlPlaneStore";
import { controlledRetryPlan, outcomeRequiresSeparateAuthority, type InvestigationOutcomeStatus } from "./investigationCasePolicy";

type IntegrationScope = "read_only" | "replay_operator" | "rollout_operator";
type ApiKeyRow = typeof integrationApiKeys.$inferSelect;

export const pilotMcpTools = [
  {
    name: "tenant.inspect",
    description: "Inspect tenant safety telemetry, owner authority, RPO headroom, and migration health.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" } }, required: ["tenantId"] },
  },
  {
    name: "rollout.inspect",
    description: "Inspect the active migration phase, canary posture, approvals, and evidence steps for a tenant.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" } }, required: ["tenantId"] },
  },
  {
    name: "replay.compare",
    description: "Inspect a tenant-scoped side-by-side semantic diff between two retained replay traces.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" }, decisionId: { type: "string" }, baselineTraceId: { type: "string" }, candidateTraceId: { type: "string" } }, required: ["tenantId", "decisionId"] },
  },
  {
    name: "migration.inspect",
    description: "Inspect tenant migration phases, evidence, approvals, and the current rollback recommendation without changing rollout authority.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" }, rolloutId: { type: "string" } }, required: ["tenantId"] },
  },
  {
    name: "webhook.diagnostics",
    description: "Inspect tenant-scoped simulated webhook delivery diagnostics and filters. No external endpoint is contacted.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" }, search: { type: "string" }, status: { type: "string" }, eventType: { type: "string" } }, required: ["tenantId"] },
  },
  {
    name: "replay.verify",
    description: "Record a deterministic replay-verification request for a decision that belongs to the tenant.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" }, decisionId: { type: "string" } }, required: ["tenantId", "decisionId"] },
  },
  {
    name: "rollout.advance",
    description: "Attempt one safety-gated rollout transition; ownership, RPO, audit, health, and approval rules remain enforced.",
    inputSchema: { type: "object", properties: { tenantId: { type: "string" }, rolloutId: { type: "string" } }, required: ["tenantId", "rolloutId"] },
  },
] as const;

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("The Decision Control Plane database is unavailable.");
  return db;
}

async function tenantFor(tenantId: string) {
  const db = await dbOrThrow();
  const tenant = (await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0];
  if (!tenant) throw new Error("Tenant was not found.");
  return { db, tenant };
}

async function insertOnce(table: any, id: string, values: Record<string, unknown>) {
  const db = await dbOrThrow();
  const exists = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
  if (!exists) await db.insert(table).values({ id, ...values });
}

/** Seeds deterministic pilot-only records; production tenants are never populated by this helper. */
export async function ensurePilotArtifacts(userId: number, tenantId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const { db, tenant } = await tenantFor(tenantId);
  if (tenant.name !== "Pilot Transaction Rail") return;

  // A single retained trace is the pilot seed sentinel. Once it exists, later
  // control-room refreshes must not fan out into dozens of select/insert checks.
  const alreadySeeded = (await db.select({ id: replayTraces.id }).from(replayTraces).where(and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, "dec_pilot_001"))).limit(1))[0];
  if (alreadySeeded) {
    const existingCase = (await db.select({ id: investigationCases.id }).from(investigationCases).where(and(eq(investigationCases.tenantId, tenantId), eq(investigationCases.decisionId, "dec_pilot_001"))).limit(1))[0];
    if (!existingCase) {
      const existingRollout = (await db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(1))[0];
      await insertOnce(investigationCases, `${tenantId}_case_pilot_001`, {
        tenantId,
        decisionId: "dec_pilot_001",
        rolloutId: existingRollout?.id ?? null,
        status: "open",
        approvalState: "pending",
        recommendedAction: "retain_read_canary_and_obtain_write_authority_approval",
        summary: "Staged state 2.2 and policy epoch 28 change the retained replay disposition from held to rejected.",
        outcomeRationale: null,
        createdByUserId: userId,
        resolvedByUserId: null,
      });
    }
    return;
  }

  const manifestId = `${tenantId}_manifest_220`;
  await insertOnce(stateManifests, manifestId, {
    tenantId,
    label: "Financial Crime Screening State — staged 2.2",
    schemaFamily: "decision-state.fincrime",
    semanticVersion: "2.2.0-rc.1",
    policyEpoch: 28,
    stateEpoch: 49,
    compatibility: "requires_dual_write",
    provenanceJson: JSON.stringify({ source: "pilot-observability-seed", change: "beneficial-owner evidence cardinality", validation: "shadow and replay required" }),
    contentHash: "sha256:staged220fincimepilot8c41",
    status: "staged",
  });

  const now = Date.now();
  const telemetrySeries = [
    [5, 980, 42, 4, 59, 90, "warning"],
    [10, 790, 55, 3, 52, 78, "normal"],
    [15, 870, 47, 3, 50, 82, "normal"],
    [20, 840, 62, 3, 48, 76, "normal"],
    [25, 810, 68, 3, 46, 72, "normal"],
  ] as const;
  for (let index = 0; index < telemetrySeries.length; index += 1) {
    const [minutesAgo, replicationLagMs, rpoHeadroomSeconds, fencingRejections, admissionP99Ms, auditLagMs, alertState] = telemetrySeries[index];
    await insertOnce(telemetrySnapshots, `${tenantId}_pulse_${index}`, {
      tenantId,
      region: "us-east-1",
      ownerRegion: "us-east-1",
      ownershipEpoch: 48,
      replicationLagMs,
      rpoHeadroomSeconds,
      fencingRejections,
      admissionP99Ms,
      auditLagMs,
      canaryPassRate: 100,
      alertState,
      recordedAt: new Date(now - minutesAgo * 60_000),
    });
  }

  const activeManifest = `${tenantId}_active_manifest`;
  const existingManifest = (await (await dbOrThrow()).select().from(stateManifests).where(and(eq(stateManifests.tenantId, tenantId), eq(stateManifests.status, "active"))).limit(1))[0];
  const sourceManifestId = existingManifest?.id ?? activeManifest;
  const traceRows = [
    ["baseline", "2.0.4", "aml-policy@27", "held", "matched", { candidateMatch: true, evidenceCompleteness: "complete", action: "hold_for_review", semanticNotes: ["Legacy address normalization", "Sanctions candidate threshold 0.82"] }],
    ["current", "2.1.0", "aml-policy@27", "held", "matched", { candidateMatch: true, evidenceCompleteness: "complete", action: "hold_for_review", semanticNotes: ["Canonical relationship graph", "Sanctions candidate threshold 0.82"] }],
    ["staged", "2.2.0-rc.1", "aml-policy@28", "rejected", "diverged", { candidateMatch: true, evidenceCompleteness: "conflicted", action: "reject", semanticNotes: ["Beneficial-owner confidence below new hard constraint", "Policy epoch 28 adds conflict precedence"] }],
  ] as const;
  for (const [slug, stateVersion, policyVersion, disposition, replayStatus, trace] of traceRows) {
    const id = `${tenantId}_trace_${slug}`;
    await insertOnce(replayTraces, id, {
      tenantId,
      decisionId: "dec_pilot_001",
      manifestId: sourceManifestId,
      policyVersion,
      stateVersion,
      disposition,
      replayStatus,
      traceHash: `sha256:pilot-${slug}-trace-4481`,
      traceJson: JSON.stringify(trace),
      createdAt: new Date(now - (slug === "baseline" ? 40 : slug === "current" ? 20 : 5) * 60_000),
    });
  }

  const seededRollout = (await db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(1))[0];
  await insertOnce(investigationRecords, `${tenantId}_assertion_seed`, {
    tenantId,
    recordKind: "replay_assertion",
    decisionId: "dec_pilot_001",
    rolloutId: seededRollout?.id ?? null,
    status: "asserted",
    summary: "Baseline and current replay representations retain the same held decision outcome.",
    detailJson: JSON.stringify({ baselineTraceId: `${tenantId}_trace_baseline`, candidateTraceId: `${tenantId}_trace_current`, conclusion: "equivalent_outcome", checked: ["candidateMatch", "evidenceCompleteness", "action", "disposition"], pilotOnly: true }),
    createdByUserId: userId,
  });
  await insertOnce(investigationCases, `${tenantId}_case_pilot_001`, {
    tenantId,
    decisionId: "dec_pilot_001",
    rolloutId: seededRollout?.id ?? null,
    status: "open",
    approvalState: "pending",
    recommendedAction: "retain_read_canary_and_obtain_write_authority_approval",
    summary: "Staged state 2.2 and policy epoch 28 change the retained replay disposition from held to rejected.",
    outcomeRationale: null,
    createdByUserId: userId,
    resolvedByUserId: null,
  });

  const webhookId = `${tenantId}_pilot_webhook`;
  const mcpId = `${tenantId}_pilot_mcp`;
  await insertOnce(integrationEndpoints, webhookId, {
    tenantId,
    name: "RiskOps event subscription",
    kind: "webhook",
    mode: "pilot_simulated",
    status: "pilot_ready",
    description: "Simulated audit and rollout-event delivery for pilot integration rehearsal. No outbound HTTP delivery occurs.",
    configJson: JSON.stringify({ events: ["rollout.phase_changed", "replay.diverged", "safety.gate_blocked"], delivery: "simulated" }),
  });
  await insertOnce(integrationEndpoints, mcpId, {
    tenantId,
    name: "Pilot MCP gateway",
    kind: "mcp",
    mode: "session_authenticated",
    status: "pilot_ready",
    description: "Session-authenticated JSON-RPC MCP pilot endpoint. It exposes governed read and operator tools without persistent streaming.",
    configJson: JSON.stringify({ path: "/api/mcp", transport: "request_response", longLivedConnections: false }),
  });
  await insertOnce(integrationDeliveries, `${tenantId}_delivery_1`, {
    tenantId,
    endpointId: webhookId,
    eventType: "rollout.phase_changed",
    status: "simulated_delivered",
    attemptCount: 1,
    payloadPreview: JSON.stringify({ tenantId, phase: "backfill", canaryPercent: 5 }),
    resultSummary: "Pilot simulation accepted. No external network call was made.",
    createdAt: new Date(now - 14 * 60_000),
  });
  await insertOnce(integrationDeliveries, `${tenantId}_delivery_2`, {
    tenantId,
    endpointId: webhookId,
    eventType: "replay.diverged",
    status: "simulated_failed",
    attemptCount: 1,
    payloadPreview: JSON.stringify({ tenantId, decisionId: "dec_pilot_001", candidateState: "2.2.0-rc.1" }),
    resultSummary: "Pilot simulation intentionally recorded a failed delivery for incident-handling rehearsal; retry guarantees are out of scope.",
    createdAt: new Date(now - 6 * 60_000),
  });
}

export async function operationalControlRoom(userId: number, tenantId: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const { db, tenant } = await tenantFor(tenantId);
  const [telemetry, rollouts, steps, traces] = await Promise.all([
    db.select().from(telemetrySnapshots).where(eq(telemetrySnapshots.tenantId, tenantId)).orderBy(desc(telemetrySnapshots.recordedAt)).limit(24),
    db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(5),
    db.select().from(migrationSteps).where(eq(migrationSteps.tenantId, tenantId)).orderBy(desc(migrationSteps.createdAt)).limit(30),
    db.select().from(replayTraces).where(eq(replayTraces.tenantId, tenantId)).orderBy(desc(replayTraces.createdAt)).limit(30),
  ]);
  const latest = telemetry[0] ?? null;
  const activeRollout = rollouts[0] ?? null;
  const health = latest && activeRollout
    ? {
      rpoSafe: latest.rpoHeadroomSeconds >= tenant.rpoTargetSeconds,
      ownerMatched: latest.ownerRegion === activeRollout.ownerRegion,
      epochMatched: latest.ownershipEpoch === activeRollout.ownershipEpoch,
      auditSafe: latest.auditLagMs <= 1_000,
      canaryHealthy: activeRollout.canaryHealth === "healthy",
      replayEquivalent: traces.some(trace => trace.replayStatus === "matched"),
    }
    : null;
  return { tenant, telemetry, rollouts, steps, traces, health, generatedAt: new Date(), pilotMode: tenant.name === "Pilot Transaction Rail" };
}

export async function replayExplorer(userId: number, tenantId: string, decisionId?: string, baselineTraceId?: string, candidateTraceId?: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const conditions = decisionId
    ? and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, decisionId))
    : eq(replayTraces.tenantId, tenantId);
  const traces = await db.select().from(replayTraces).where(conditions).orderBy(desc(replayTraces.createdAt)).limit(50);
  const normalized = traces.map(trace => ({ ...trace, parsedTrace: safelyParse(trace.traceJson) }));
  const baseline = normalized.find(trace => trace.id === baselineTraceId) ?? normalized[normalized.length - 1];
  const candidate = normalized.find(trace => trace.id === candidateTraceId) ?? normalized[0];
  const assertionDecisionId = decisionId ?? "dec_pilot_001";
  const assertions = await db.select().from(investigationRecords).where(and(eq(investigationRecords.tenantId, tenantId), eq(investigationRecords.recordKind, "replay_assertion"), eq(investigationRecords.decisionId, assertionDecisionId))).orderBy(desc(investigationRecords.createdAt)).limit(30);
  const comparison = baseline && candidate && baseline.id !== candidate.id
    ? compareTracePair(baseline, candidate)
    : null;
  return { traces: normalized, comparison, assertions: assertions.map(record => ({ ...record, details: safelyParse(record.detailJson) })), pilotOnly: true };
}

export async function recordReplayAssertion(userId: number, tenantId: string, input: { decisionId: string; baselineTraceId: string; candidateTraceId: string; conclusion: "equivalent" | "not_equivalent" | "needs_review"; rationale: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const result = await replayExplorer(userId, tenantId, input.decisionId, input.baselineTraceId, input.candidateTraceId);
  if (!result.comparison) throw new Error("Two distinct traces are required to record a replay assertion.");
  if (input.conclusion === "equivalent" && !result.comparison.equivalent) throw new Error("An equivalent assertion cannot be recorded while semantic, version, or disposition differences remain.");
  const db = await dbOrThrow();
  const id = `inv_${nanoid(16)}`;
  await db.insert(investigationRecords).values({
    id,
    tenantId,
    recordKind: "replay_assertion",
    decisionId: input.decisionId,
    status: "asserted",
    summary: `Replay assertion: ${input.conclusion.replace(/_/g, " ")}.`,
    detailJson: JSON.stringify({ ...input, comparison: result.comparison, pilotOnly: true }),
    createdByUserId: userId,
  });
  return { id, comparison: result.comparison, pilotOnly: true };
}

export async function versionComparison(userId: number, tenantId: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const [manifests, traces, rollout] = await Promise.all([
    db.select().from(stateManifests).where(eq(stateManifests.tenantId, tenantId)).orderBy(desc(stateManifests.createdAt)).limit(12),
    db.select().from(replayTraces).where(eq(replayTraces.tenantId, tenantId)).orderBy(desc(replayTraces.createdAt)).limit(12),
    db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(1),
  ]);
  const active = manifests.find(manifest => manifest.status === "active") ?? manifests[0] ?? null;
  const candidate = manifests.find(manifest => manifest.status === "staged") ?? null;
  const divergentTrace = traces.find(trace => trace.replayStatus === "diverged") ?? null;
  return {
    active,
    candidate,
    rollout: rollout[0] ?? null,
    verification: {
      semanticCompatibility: candidate?.compatibility ?? "compatible",
      dualWriteRequired: candidate?.compatibility === "requires_dual_write",
      replayEquivalent: !divergentTrace,
      divergenceReason: divergentTrace ? safelyParse(divergentTrace.traceJson).semanticNotes?.join("; ") ?? "A semantic trace difference was recorded." : null,
      rollbackReady: Boolean(rollout[0]) && !["completed", "rolled_back"].includes(rollout[0].phase),
    },
  };
}

export async function integrationWorkspace(userId: number, tenantId: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const [endpoints, deliveries, apiKeys, toolCalls, exports, retryAudits] = await Promise.all([
    db.select().from(integrationEndpoints).where(eq(integrationEndpoints.tenantId, tenantId)).orderBy(desc(integrationEndpoints.updatedAt)).limit(20),
    db.select().from(integrationDeliveries).where(eq(integrationDeliveries.tenantId, tenantId)).orderBy(desc(integrationDeliveries.createdAt)).limit(30),
    db.select().from(integrationApiKeys).where(eq(integrationApiKeys.tenantId, tenantId)).orderBy(desc(integrationApiKeys.createdAt)).limit(20),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(30),
    db.select().from(auditExports).where(eq(auditExports.tenantId, tenantId)).orderBy(desc(auditExports.createdAt)).limit(20),
    db.select().from(integrationRetryAudits).where(eq(integrationRetryAudits.tenantId, tenantId)).orderBy(desc(integrationRetryAudits.createdAt)).limit(30),
  ]);
  return { endpoints, deliveries, apiKeys: apiKeys.map(redactKey), toolCalls, exports, retryAudits: retryAudits.map(retry => ({ ...retry, details: safelyParse(retry.detailJson) })), mcp: { endpoint: "/api/mcp", transport: "JSON-RPC request/response", pilotOnly: true, tools: pilotMcpTools } };
}

export async function webhookDeliveryDiagnostics(userId: number, tenantId: string, filters: { search?: string; endpointId?: string; eventType?: string; status?: string }) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const [endpoints, deliveryRows] = await Promise.all([
    db.select().from(integrationEndpoints).where(and(eq(integrationEndpoints.tenantId, tenantId), eq(integrationEndpoints.kind, "webhook"))).orderBy(desc(integrationEndpoints.updatedAt)).limit(50),
    db.select().from(integrationDeliveries).where(eq(integrationDeliveries.tenantId, tenantId)).orderBy(desc(integrationDeliveries.createdAt)).limit(100),
  ]);
  const endpointById = new Map(endpoints.map(endpoint => [endpoint.id, endpoint]));
  const search = filters.search?.trim().toLowerCase() ?? "";
  const deliveries = deliveryRows.map(delivery => ({ ...delivery, endpointName: endpointById.get(delivery.endpointId)?.name ?? "Unknown tenant endpoint", payload: safelyParse(delivery.payloadPreview) })).filter(delivery => {
    const haystack = `${delivery.endpointName} ${delivery.eventType} ${delivery.status} ${delivery.resultSummary} ${delivery.payloadPreview}`.toLowerCase();
    return (!search || haystack.includes(search))
      && (!filters.endpointId || delivery.endpointId === filters.endpointId)
      && (!filters.eventType || delivery.eventType === filters.eventType)
      && (!filters.status || delivery.status === filters.status);
  });
  const statusCounts = deliveries.reduce<Record<string, number>>((counts, delivery) => ({ ...counts, [delivery.status]: (counts[delivery.status] ?? 0) + 1 }), {});
  const eventTypes = Array.from(new Set(deliveryRows.map(delivery => delivery.eventType))).sort();
  return { endpoints, deliveries, eventTypes, statusCounts, filters, pilotOnly: true, diagnosticBoundary: "Records represent simulated delivery attempts only; no external receiver, retry queue, or delivery guarantee exists." };
}

export async function migrationInvestigation(userId: number, tenantId: string, rolloutId?: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const rollout = rolloutId
    ? (await db.select().from(migrationRollouts).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId))).limit(1))[0]
    : (await db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(1))[0];
  if (!rollout) throw new Error("No tenant migration rollout was found.");
  const [steps, records, room] = await Promise.all([
    db.select().from(migrationSteps).where(and(eq(migrationSteps.tenantId, tenantId), eq(migrationSteps.rolloutId, rollout.id))).orderBy(desc(migrationSteps.createdAt)).limit(80),
    db.select().from(investigationRecords).where(and(eq(investigationRecords.tenantId, tenantId), eq(investigationRecords.rolloutId, rollout.id))).orderBy(desc(investigationRecords.createdAt)).limit(40),
    operationalControlRoom(userId, tenantId),
  ]);
  const recommendation = rollbackRecommendation(rollout, room.health, steps);
  return { rollout, steps, records: records.map(record => ({ ...record, details: safelyParse(record.detailJson) })), health: room.health, recommendation, pilotOnly: true };
}

export async function recordMigrationApprovalEvidence(userId: number, tenantId: string, input: { rolloutId: string; rationale: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const investigation = await migrationInvestigation(userId, tenantId, input.rolloutId);
  const db = await dbOrThrow();
  const id = `inv_${nanoid(16)}`;
  await db.insert(investigationRecords).values({
    id, tenantId, rolloutId: input.rolloutId, recordKind: "migration_approval", status: "approved",
    summary: `Approval evidence recorded for ${investigation.rollout.phase.replace(/_/g, " ")} phase.`,
    detailJson: JSON.stringify({ rationale: input.rationale, phase: investigation.rollout.phase, health: investigation.health, pilotOnly: true }),
    createdByUserId: userId,
  });
  await db.update(investigationCases).set({ approvalState: "approved" }).where(and(eq(investigationCases.tenantId, tenantId), eq(investigationCases.rolloutId, input.rolloutId)));
  return { id, recommendation: investigation.recommendation, pilotOnly: true };
}

export async function recordRollbackRecommendation(userId: number, tenantId: string, input: { rolloutId: string; rationale: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const investigation = await migrationInvestigation(userId, tenantId, input.rolloutId);
  const db = await dbOrThrow();
  const id = `inv_${nanoid(16)}`;
  await db.insert(investigationRecords).values({
    id, tenantId, rolloutId: input.rolloutId, recordKind: "rollback_recommendation", status: "recommended",
    summary: investigation.recommendation.summary,
    detailJson: JSON.stringify({ rationale: input.rationale, recommendation: investigation.recommendation, phase: investigation.rollout.phase, pilotOnly: true }),
    createdByUserId: userId,
  });
  await db.update(investigationCases).set({ recommendedAction: "review_rollback_recommendation" }).where(and(eq(investigationCases.tenantId, tenantId), eq(investigationCases.rolloutId, input.rolloutId)));
  return { id, recommendation: investigation.recommendation, pilotOnly: true };
}

export async function investigationCaseDetail(userId: number, tenantId: string, input: { caseId?: string; decisionId?: string; rolloutId?: string }) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const baseConditions = [eq(investigationCases.tenantId, tenantId)];
  if (input.caseId) baseConditions.push(eq(investigationCases.id, input.caseId));
  else if (input.decisionId) baseConditions.push(eq(investigationCases.decisionId, input.decisionId));
  else if (input.rolloutId) baseConditions.push(eq(investigationCases.rolloutId, input.rolloutId));
  const investigationCase = (await db.select().from(investigationCases).where(and(...baseConditions)).orderBy(desc(investigationCases.updatedAt)).limit(1))[0];
  if (!investigationCase) throw new Error("No tenant-scoped investigation case was found for the requested context.");
  const [evidence, traces, records, rollout, actions] = await Promise.all([
    db.select().from(decisionEvidence).where(and(eq(decisionEvidence.tenantId, tenantId), eq(decisionEvidence.decisionId, investigationCase.decisionId))).orderBy(desc(decisionEvidence.createdAt)).limit(20),
    db.select().from(replayTraces).where(and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, investigationCase.decisionId))).orderBy(desc(replayTraces.createdAt)).limit(30),
    db.select().from(investigationRecords).where(eq(investigationRecords.tenantId, tenantId)).orderBy(desc(investigationRecords.createdAt)).limit(100),
    investigationCase.rolloutId ? db.select().from(migrationRollouts).where(and(eq(migrationRollouts.tenantId, tenantId), eq(migrationRollouts.id, investigationCase.rolloutId))).limit(1) : Promise.resolve([]),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(30),
  ]);
  return {
    investigationCase,
    evidence,
    traces: traces.map(trace => ({ ...trace, parsedTrace: safelyParse(trace.traceJson) })),
    records: records.filter(record => record.decisionId === investigationCase.decisionId || (investigationCase.rolloutId !== null && record.rolloutId === investigationCase.rolloutId)).map(record => ({ ...record, details: safelyParse(record.detailJson) })),
    rollout: rollout[0] ?? null,
    relatedToolCalls: actions.filter(action => action.inputJson.includes(investigationCase.decisionId)),
    pilotOnly: true,
  };
}

export async function updateInvestigationOutcome(userId: number, tenantId: string, input: { caseId: string; status: InvestigationOutcomeStatus; rationale: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const investigationCase = (await db.select().from(investigationCases).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId))).limit(1))[0];
  if (!investigationCase) throw new Error("The investigation case is not available in this tenant scope.");
  const authorityBoundary = outcomeRequiresSeparateAuthority(input.status) ? "A rollback-required conclusion remains a recommendation; the separately protected rollout rollback control retains execution authority." : "This conclusion records accountable case evidence only and does not alter rollout authority.";
  await db.update(investigationCases).set({ status: input.status, outcomeRationale: `${input.rationale}\n\n${authorityBoundary}`, resolvedByUserId: userId }).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId)));
  await db.insert(investigationRecords).values({
    id: `inv_${nanoid(16)}`,
    tenantId,
    recordKind: "replay_assertion",
    decisionId: investigationCase.decisionId,
    rolloutId: investigationCase.rolloutId,
    status: "acknowledged",
    summary: `Investigation outcome recorded: ${input.status.replace(/_/g, " ")}.`,
    detailJson: JSON.stringify({ caseId: input.caseId, outcome: input.status, rationale: input.rationale, authorityBoundary, actorUserId: userId, pilotOnly: true }),
    createdByUserId: userId,
  });
  return { ok: true as const, caseId: input.caseId, status: input.status, pilotOnly: true };
}

export async function exportReplayInvestigation(userId: number, tenantId: string, input: { decisionId: string; baselineTraceId?: string; candidateTraceId?: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator"]);
  const [replay, detail] = await Promise.all([
    replayExplorer(userId, tenantId, input.decisionId, input.baselineTraceId, input.candidateTraceId),
    investigationCaseDetail(userId, tenantId, { decisionId: input.decisionId }),
  ]);
  const payload = {
    packageType: "dcp_pilot_replay_investigation",
    tenantId,
    decisionId: input.decisionId,
    exportedAt: new Date().toISOString(),
    semanticComparison: replay.comparison,
    replayAssertions: replay.assertions,
    evidenceBindings: detail.evidence,
    retainedTraces: detail.traces,
    investigationCase: detail.investigationCase,
    recommendationAndApprovalRecords: detail.records,
    auditReferences: detail.relatedToolCalls,
    pilotOnly: true,
    boundary: "This package is tenant-scoped pilot evidence. It does not establish external delivery, legal reporting, or infrastructure action authority.",
  };
  const content = JSON.stringify(payload, null, 2);
  const db = await dbOrThrow();
  await db.insert(auditExports).values({ id: `exp_${nanoid(16)}`, tenantId, requestedByUserId: userId, format: "json", scope: "replay_investigation_package", status: "prepared", summary: `Prepared replay investigation package for decision ${input.decisionId}.` });
  return { filename: `dcp-${tenantId}-${input.decisionId}-replay-investigation.json`, content, format: "json" as const, pilotOnly: true };
}

export async function createPilotApiKey(userId: number, tenantId: string, label: string, scope: IntegrationScope) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const token = `dcp_pilot_${randomBytes(24).toString("base64url")}`;
  const secretHash = createHash("sha256").update(token).digest("hex");
  const id = `key_${nanoid(16)}`;
  await db.insert(integrationApiKeys).values({ id, tenantId, label, tokenPrefix: token.slice(0, 18), secretHash, scope, status: "active", createdByUserId: userId });
  return { key: { id, label, tokenPrefix: token.slice(0, 18), scope, status: "active", createdAt: new Date() }, token, disclosure: "Copy this pilot token now. Only its prefix and hash are retained; it is not wired to a live external service in this release." };
}

export async function authenticatePilotApiKey(token: string, tenantId: string, toolName: string) {
  const db = await dbOrThrow();
  const secretHash = createHash("sha256").update(token).digest("hex");
  const key = (await db.select().from(integrationApiKeys).where(and(eq(integrationApiKeys.secretHash, secretHash), eq(integrationApiKeys.tenantId, tenantId), eq(integrationApiKeys.status, "active"))).limit(1))[0];
  if (!key) throw new Error("The pilot API key is invalid, revoked, or outside the requested tenant scope.");
  const requiredScope: IntegrationScope = toolName === "rollout.advance" ? "rollout_operator" : toolName === "replay.verify" ? "replay_operator" : "read_only";
  const ranks: Record<IntegrationScope, number> = { read_only: 1, replay_operator: 2, rollout_operator: 3 };
  if (ranks[key.scope] < ranks[requiredScope]) throw new Error("The pilot API key does not include the required tool scope.");
  await db.update(integrationApiKeys).set({ lastUsedAt: new Date() }).where(and(eq(integrationApiKeys.id, key.id), eq(integrationApiKeys.tenantId, tenantId)));
  return key;
}

export async function revokePilotApiKey(userId: number, tenantId: string, apiKeyId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const key = (await db.select().from(integrationApiKeys).where(and(eq(integrationApiKeys.id, apiKeyId), eq(integrationApiKeys.tenantId, tenantId))).limit(1))[0];
  if (!key) throw new Error("The tenant API key was not found.");
  await db.update(integrationApiKeys).set({ status: "revoked" }).where(and(eq(integrationApiKeys.id, apiKeyId), eq(integrationApiKeys.tenantId, tenantId)));
  return { ok: true as const };
}

export async function simulateWebhookDelivery(userId: number, tenantId: string, endpointId: string, eventType: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const endpoint = (await db.select().from(integrationEndpoints).where(and(eq(integrationEndpoints.id, endpointId), eq(integrationEndpoints.tenantId, tenantId))).limit(1))[0];
  if (!endpoint || endpoint.kind !== "webhook") throw new Error("The requested tenant webhook endpoint was not found.");
  const id = `del_${nanoid(16)}`;
  await db.insert(integrationDeliveries).values({
    id, tenantId, endpointId, eventType, status: "simulated_delivered", attemptCount: 1,
    payloadPreview: JSON.stringify({ eventType, tenantId, deliveryMode: "pilot_simulated", at: new Date().toISOString() }),
    resultSummary: "Pilot delivery simulation recorded. No external HTTP request or retry queue was used.",
  });
  return { ok: true as const, id };
}

export async function retrySimulatedWebhookDelivery(userId: number, tenantId: string, deliveryId: string, rationale: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const sourceDelivery = (await db.select().from(integrationDeliveries).where(and(eq(integrationDeliveries.id, deliveryId), eq(integrationDeliveries.tenantId, tenantId))).limit(1))[0];
  if (!sourceDelivery) throw new Error("The simulated delivery is not available within this tenant scope.");
  const endpoint = (await db.select().from(integrationEndpoints).where(and(eq(integrationEndpoints.id, sourceDelivery.endpointId), eq(integrationEndpoints.tenantId, tenantId), eq(integrationEndpoints.kind, "webhook"))).limit(1))[0];
  if (!endpoint || endpoint.status !== "pilot_ready") throw new Error("The delivery endpoint is not an active tenant-scoped webhook subscription.");
  const plan = controlledRetryPlan(sourceDelivery.attemptCount);
  const resultDeliveryId = `del_${nanoid(16)}`;
  await db.insert(integrationDeliveries).values({
    id: resultDeliveryId,
    tenantId,
    endpointId: sourceDelivery.endpointId,
    eventType: sourceDelivery.eventType,
    status: "simulated_delivered",
    attemptCount: plan.nextAttemptCount,
    payloadPreview: sourceDelivery.payloadPreview,
    resultSummary: `Controlled retry simulation recorded from attempt ${sourceDelivery.attemptCount} to ${plan.nextAttemptCount}. No external HTTP receiver was contacted.`,
  });
  await db.insert(integrationRetryAudits).values({
    id: `retry_${nanoid(16)}`,
    tenantId,
    endpointId: sourceDelivery.endpointId,
    sourceDeliveryId: sourceDelivery.id,
    resultDeliveryId,
    actionType: "retry_simulation",
    payloadVersion: plan.payloadVersion,
    resultStatus: plan.resultStatus,
    operatorUserId: userId,
    detailJson: JSON.stringify({ rationale, sourceStatus: sourceDelivery.status, sourceAttemptCount: sourceDelivery.attemptCount, resultAttemptCount: plan.nextAttemptCount, endpointName: endpoint.name, ...plan, pilotOnly: true }),
  });
  return { ok: true as const, sourceDeliveryId: sourceDelivery.id, resultDeliveryId, payloadVersion: plan.payloadVersion, resultStatus: plan.resultStatus, pilotOnly: true };
}

export async function createPilotWebhookEndpoint(userId: number, tenantId: string, input: { name: string; description: string; eventTypes: string[] }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const id = `hook_${nanoid(16)}`;
  await db.insert(integrationEndpoints).values({
    id,
    tenantId,
    name: input.name,
    kind: "webhook",
    mode: "pilot_simulated",
    status: "pilot_ready",
    description: input.description,
    configJson: JSON.stringify({ events: input.eventTypes, delivery: "simulated", externalUrl: null, retryGuarantees: false }),
  });
  return { id, status: "pilot_ready" as const };
}

export async function updatePilotWebhookEndpoint(userId: number, tenantId: string, endpointId: string, input: { status: "pilot_ready" | "paused"; name?: string; eventTypes?: string[] }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const endpoint = (await db.select().from(integrationEndpoints).where(and(eq(integrationEndpoints.id, endpointId), eq(integrationEndpoints.tenantId, tenantId), eq(integrationEndpoints.kind, "webhook"))).limit(1))[0];
  if (!endpoint) throw new Error("The requested tenant webhook subscription was not found.");
  const current = safelyParse(endpoint.configJson);
  await db.update(integrationEndpoints).set({
    status: input.status,
    name: input.name ?? endpoint.name,
    configJson: JSON.stringify({ ...current, events: input.eventTypes ?? current.events ?? [], delivery: "simulated", externalUrl: null, retryGuarantees: false }),
  }).where(and(eq(integrationEndpoints.id, endpointId), eq(integrationEndpoints.tenantId, tenantId)));
  return { ok: true as const };
}

export async function registerPilotExtension(userId: number, tenantId: string, input: { name: string; extensionKind: "policy_interpreter" | "evidence_provider" | "control_plane_extension"; description: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "developer"]);
  const db = await dbOrThrow();
  const id = `ext_${nanoid(16)}`;
  await db.insert(integrationEndpoints).values({
    id,
    tenantId,
    name: input.name,
    kind: "sdk",
    mode: "pilot_simulated",
    status: "draft",
    description: input.description,
    configJson: JSON.stringify({ extensionKind: input.extensionKind, contract: "PolicyInterpreterAdapter@pilot-0.1", execution: "not_enabled", registeredByUserId: userId }),
  });
  return { id, status: "draft" as const, contract: "PolicyInterpreterAdapter@pilot-0.1" };
}

export async function exportAuditTrail(userId: number, tenantId: string, format: "json" | "csv") {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const [evidence, actions, steps] = await Promise.all([
    db.select().from(decisionEvidence).where(eq(decisionEvidence.tenantId, tenantId)).orderBy(desc(decisionEvidence.createdAt)).limit(100),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(100),
    db.select().from(migrationSteps).where(eq(migrationSteps.tenantId, tenantId)).orderBy(desc(migrationSteps.createdAt)).limit(100),
  ]);
  const payload = { tenantId, exportedAt: new Date().toISOString(), decisionEvidence: evidence, mcpToolCalls: actions, migrationSteps: steps };
  const content = format === "json" ? JSON.stringify(payload, null, 2) : toCsv(payload);
  await db.insert(auditExports).values({ id: `exp_${nanoid(16)}`, tenantId, requestedByUserId: userId, format, scope: "pilot_audit_bundle", status: "prepared", summary: `Prepared ${format.toUpperCase()} audit bundle with ${evidence.length} decision evidence records, ${actions.length} MCP pilot calls, and ${steps.length} migration steps.` });
  return { filename: `dcp-${tenantId}-pilot-audit.${format}`, content, format, pilotOnly: true };
}

export async function listMcpPilotTools(userId: number, tenantId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  return { tools: pilotMcpTools, endpoint: "/api/mcp", transport: "JSON-RPC request/response", pilotOnly: true };
}

export async function executeMcpPilotTool(userId: number, input: { tenantId: string; toolName: string; args: Record<string, unknown>; apiKeyId?: string | null }) {
  const { db } = await tenantFor(input.tenantId);
  let result: unknown;
  let status: "succeeded" | "rejected" | "simulated" = "succeeded";
  try {
    if (input.toolName === "tenant.inspect") result = await operationalControlRoom(userId, input.tenantId);
    else if (input.toolName === "rollout.inspect") result = (await operationalControlRoom(userId, input.tenantId)).rollouts;
    else if (input.toolName === "replay.compare") {
      result = await replayExplorer(userId, input.tenantId, String(input.args.decisionId ?? ""), optionalString(input.args.baselineTraceId), optionalString(input.args.candidateTraceId));
    } else if (input.toolName === "migration.inspect") {
      result = await migrationInvestigation(userId, input.tenantId, optionalString(input.args.rolloutId));
    } else if (input.toolName === "webhook.diagnostics") {
      result = await webhookDeliveryDiagnostics(userId, input.tenantId, { search: optionalString(input.args.search), endpointId: optionalString(input.args.endpointId), eventType: optionalString(input.args.eventType), status: optionalString(input.args.status) });
    } else if (input.toolName === "replay.verify") {
      const decisionId = String(input.args.decisionId ?? "");
      result = await verifyReplay(userId, input.tenantId, decisionId, "MCP pilot replay verification requested through session-authenticated tool invocation.");
    } else if (input.toolName === "rollout.advance") {
      const rolloutId = String(input.args.rolloutId ?? "");
      result = await advanceRollout(userId, input.tenantId, rolloutId, "MCP pilot rollout advancement requested through session-authenticated tool invocation.");
    } else {
      status = "rejected";
      throw new Error(`Unknown MCP pilot tool: ${input.toolName}`);
    }
  } catch (error) {
    status = "rejected";
    const message = error instanceof Error ? error.message : "MCP pilot tool failed.";
    await db.insert(mcpToolCalls).values({ id: `mcp_${nanoid(16)}`, tenantId: input.tenantId, apiKeyId: input.apiKeyId ?? null, toolName: input.toolName, inputJson: JSON.stringify(input.args), status, resultSummary: message });
    throw error;
  }
  await db.insert(mcpToolCalls).values({ id: `mcp_${nanoid(16)}`, tenantId: input.tenantId, apiKeyId: input.apiKeyId ?? null, toolName: input.toolName, inputJson: JSON.stringify(input.args), status, resultSummary: "Pilot MCP tool completed through session-authenticated request/response transport." });
  return result;
}

function redactKey(key: ApiKeyRow) {
  const { secretHash: _secretHash, ...safe } = key;
  return safe;
}

function safelyParse(value: string): Record<string, any> {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed : { raw: value };
  } catch {
    return { raw: value };
  }
}

export function compareTracePair(baseline: { id: string; traceHash: string; parsedTrace: Record<string, any>; stateVersion: string; policyVersion: string; disposition: string }, candidate: { id: string; traceHash: string; parsedTrace: Record<string, any>; stateVersion: string; policyVersion: string; disposition: string }) {
  const baselineFields = flattenTrace(baseline.parsedTrace);
  const candidateFields = flattenTrace(candidate.parsedTrace);
  const fieldDiffs = Array.from(new Set([...Object.keys(baselineFields), ...Object.keys(candidateFields)])).sort().map(path => ({ path, baseline: baselineFields[path] ?? "∅", candidate: candidateFields[path] ?? "∅", changed: baselineFields[path] !== candidateFields[path] })).filter(diff => diff.changed);
  const versionDiffs = [
    baseline.stateVersion !== candidate.stateVersion ? { path: "stateVersion", baseline: baseline.stateVersion, candidate: candidate.stateVersion, changed: true } : null,
    baseline.policyVersion !== candidate.policyVersion ? { path: "policyVersion", baseline: baseline.policyVersion, candidate: candidate.policyVersion, changed: true } : null,
    baseline.disposition !== candidate.disposition ? { path: "disposition", baseline: baseline.disposition, candidate: candidate.disposition, changed: true } : null,
  ].filter((diff): diff is { path: string; baseline: string; candidate: string; changed: boolean } => Boolean(diff));
  const allDifferences = [...versionDiffs, ...fieldDiffs];
  return {
    baseline: { traceId: baseline.id, traceHash: baseline.traceHash, stateVersion: baseline.stateVersion, policyVersion: baseline.policyVersion, disposition: baseline.disposition, fields: baselineFields },
    candidate: { traceId: candidate.id, traceHash: candidate.traceHash, stateVersion: candidate.stateVersion, policyVersion: candidate.policyVersion, disposition: candidate.disposition, fields: candidateFields },
    dispositionChanged: baseline.disposition !== candidate.disposition,
    semanticDifferences: fieldDiffs.filter(diff => diff.path.startsWith("semanticNotes")).map(diff => `${diff.path}: ${diff.baseline} → ${diff.candidate}`),
    fieldDiffs,
    versionDiffs,
    allDifferences,
    equivalent: allDifferences.length === 0,
  };
}

function flattenTrace(value: unknown, path = ""): Record<string, string> {
  if (Array.isArray(value)) return value.reduce<Record<string, string>>((output, item, index) => ({ ...output, ...flattenTrace(item, `${path}[${index}]`) }), {});
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).reduce<Record<string, string>>((output, [key, item]) => ({ ...output, ...flattenTrace(item, path ? `${path}.${key}` : key) }), {});
  return { [path || "value"]: value === undefined ? "∅" : JSON.stringify(value) };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length ? value : undefined;
}

function rollbackRecommendation(rollout: { phase: string; canaryHealth: string; approvalState: string; rollbackReason: string | null }, health: { rpoSafe: boolean; ownerMatched: boolean; epochMatched: boolean; auditSafe: boolean; canaryHealthy: boolean; replayEquivalent: boolean } | null, steps: Array<{ status: string }>) {
  const blockingReasons = [
    health && !health.rpoSafe ? "RPO headroom is outside the tenant target." : null,
    health && !health.ownerMatched ? "Observed owner region does not match rollout authority." : null,
    health && !health.epochMatched ? "Observed ownership epoch differs from rollout authority." : null,
    health && !health.auditSafe ? "Audit durability is above the admitted boundary." : null,
    health && !health.canaryHealthy ? "Canary health is not healthy." : null,
    health && !health.replayEquivalent ? "Replay equivalence evidence is incomplete or divergent." : null,
    rollout.canaryHealth === "blocked" ? "Rollout has a blocked canary state." : null,
    steps.some(step => step.status === "blocked") ? "A persisted migration step is blocked." : null,
  ].filter(Boolean) as string[];
  return blockingReasons.length
    ? { level: "recommend_rollback", summary: "Recommendation: pause authority expansion and prepare controlled rollback.", reasons: blockingReasons, nextAction: "Record rationale, reconcile actions, fence authority if required, then use the governed rollback control." }
    : { level: "continue_observation", summary: "Recommendation: continue the bounded observation window; no automatic promotion occurs.", reasons: ["Current retained telemetry and replay evidence do not trigger a rollback recommendation."], nextAction: rollout.approvalState === "pending" ? "Collect required approval evidence before write-canary authority." : "Review the next phase’s gates and advance only through the governed rollout control." };
}

function toCsv(payload: Record<string, any>) {
  const rows = ["record_type,id,detail"];
  for (const evidence of payload.decisionEvidence) rows.push(["decision_evidence", evidence.decisionId, JSON.stringify(evidence)].map(csvCell).join(","));
  for (const call of payload.mcpToolCalls) rows.push(["mcp_tool_call", call.id, JSON.stringify(call)].map(csvCell).join(","));
  for (const step of payload.migrationSteps) rows.push(["migration_step", step.id, JSON.stringify(step)].map(csvCell).join(","));
  return rows.join("\n");
}

function csvCell(value: unknown) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
