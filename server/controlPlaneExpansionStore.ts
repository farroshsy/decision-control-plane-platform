import { createHash, randomBytes } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  auditExports,
  decisionEvidence,
  evidencePackageManifests,
  evidenceRetentionPolicies,
  integrationApiKeys,
  integrationDeliveries,
  integrationEndpoints,
  integrationRetryAudits,
  investigationActivities,
  investigationAttachments,
  investigationCaseAssignments,
  investigationCases,
  investigationComments,
  investigationEscalations,
  investigationRecords,
  investigationSavedViews,
  investigationSlaReminderPolicies,
  investigationSlaReminders,
  investigationTeamViews,
  mcpToolCalls,
  migrationRollouts,
  migrationSteps,
  policyDefinitions,
  policyRevisionActivities,
  policyRevisionReviews,
  policyRevisions,
  policySimulationReports,
  replayTraces,
  stateManifests,
  telemetrySnapshots,
  tenantMembers,
  tenants,
  users,
  evidenceGraphEdges,
} from "../drizzle/schema";
import { getDb } from "./db";
import { advanceRollout, assertTenantRole, verifyReplay } from "./controlPlaneStore";
import { signEvidencePackage, verifyEvidenceManifest, type SignedPackageManifest } from "./evidencePackagePolicy";
import { controlledRetryPlan, outcomeRequiresSeparateAuthority, type InvestigationOutcomeStatus } from "./investigationCasePolicy";
import { admitPilotAttachment, defaultEscalationTargetMinutes, serviceLevelPosture, serviceLevelTarget } from "./investigationLifecyclePolicy";
import { filterAndSortLifecycleQueue } from "./investigationQueuePolicy";
import { assignmentActivity, attachmentActivity, commentActivity, escalationActivity, slaReminderResolutionActivity } from "./investigationMutationActivityPolicy";
import { storagePut } from "./storage";
import { createHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { COOKIE_NAME } from "../shared/const";
import { canCreateCommentWithVisibility, canRedactComment, canResolveAssignedInvestigatorReminder, commentVisibleToRole, reminderEvaluationHour, reminderResolutionTarget, shouldCreateAssignedInvestigatorReminder, teamViewVisibleToTenantMember, type CommentVisibility, type ReminderResolutionAction, type TenantOperatorRole } from "./operatorEnablementPolicy";
import { canRecordPolicyReview, policyLifecycleTarget, retainedCohortSimulation, type PolicyReviewDecision } from "./policyAuthoringPolicy";

type IntegrationScope = "read_only" | "replay_operator" | "rollout_operator";
type ApiKeyRow = typeof integrationApiKeys.$inferSelect;
type InvestigatorRole = "platform_operator" | "compliance_operator" | "customer_operator";
type InvestigationQueueInput = {
  search?: string;
  status?: "open" | "confirmed" | "explained" | "accepted" | "rollback_required" | "closed";
  assignedRole?: InvestigatorRole;
  assignedToUserId?: number;
  serviceLevelState?: "not_set" | "on_track" | "due_soon" | "overdue";
  escalationOnly?: boolean;
  sort?: "updated_desc" | "due_asc" | "service_level_asc" | "priority_desc" | "status_asc";
};

const collaborationRoles: TenantOperatorRole[] = ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"];
const shareableQueueRoles: TenantOperatorRole[] = ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"];

function commentContentHash(body: string): string {
  return `sha256:${createHash("sha256").update(body, "utf8").digest("hex")}`;
}

function parseTeamRoles(value: string): TenantOperatorRole[] {
  const parsed = safelyParse(value);
  return Array.isArray(parsed) ? parsed.filter((role): role is TenantOperatorRole => typeof role === "string" && collaborationRoles.includes(role as TenantOperatorRole)) : [];
}

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

async function recordInvestigationActivity(
  db: any,
  input: {
    tenantId: string;
    caseId: string;
    activityKind: "case_created" | "outcome_recorded" | "assignment_recorded" | "escalation_queued" | "escalation_acknowledged" | "comment_added" | "comment_redacted" | "attachment_added" | "team_view_created" | "sla_reminder_recorded" | "sla_reminder_acknowledged" | "sla_reminder_dismissed";
    summary: string;
    detail: Record<string, unknown>;
    actorUserId: number;
  }
) {
  await db.insert(investigationActivities).values({
    id: `activity_${nanoid(16)}`,
    tenantId: input.tenantId,
    caseId: input.caseId,
    activityKind: input.activityKind,
    summary: input.summary,
    detailJson: JSON.stringify({ ...input.detail, pilotOnly: true }),
    actorUserId: input.actorUserId,
  });
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

async function ensurePilotRetentionPolicy(tenantId: string, userId: number) {
  const db = await dbOrThrow();
  const id = `${tenantId}_retention_replay_default`;
  const exists = (await db.select({ id: evidenceRetentionPolicies.id }).from(evidenceRetentionPolicies).where(eq(evidenceRetentionPolicies.id, id)).limit(1))[0];
  if (exists) return;
  const values = {
    tenantId,
    scope: "replay_investigation_package",
    retentionDays: 365,
    holdStatus: "not_on_hold",
    status: "active",
    summary: "Pilot default: retain semantic-diff investigation packages for 365 days. No automatic deletion worker is enabled in this pilot.",
    createdByUserId: userId,
  } as const;
  try {
    await db.insert(evidenceRetentionPolicies).values({ id, ...values });
  } catch (error) {
    const concurrentInsert = (await db.select({ id: evidenceRetentionPolicies.id }).from(evidenceRetentionPolicies).where(eq(evidenceRetentionPolicies.id, id)).limit(1))[0];
    if (!concurrentInsert) throw error;
  }
}

async function activeRetentionPolicy(tenantId: string) {
  const db = await dbOrThrow();
  const policy = (await db.select().from(evidenceRetentionPolicies).where(and(eq(evidenceRetentionPolicies.tenantId, tenantId), eq(evidenceRetentionPolicies.status, "active"))).orderBy(desc(evidenceRetentionPolicies.updatedAt)).limit(1))[0];
  if (!policy) throw new Error("No active tenant-scoped retention policy exists for replay investigation packages.");
  return policy;
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
    const caseId = existingCase?.id ?? `${tenantId}_case_pilot_001`;
    if (!existingCase) {
      const existingRollout = (await db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(1))[0];
      await insertOnce(investigationCases, caseId, {
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
    await insertOnce(investigationActivities, `${caseId}_activity_created`, {
      tenantId,
      caseId,
      activityKind: "case_created",
      summary: "Pilot investigation case opened from retained replay divergence evidence.",
      detailJson: JSON.stringify({ decisionId: "dec_pilot_001", source: "pilot_artifact_backfill", pilotOnly: true }),
      actorUserId: userId,
    });
    await ensurePilotRetentionPolicy(tenantId, userId);
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
  await insertOnce(investigationActivities, `${tenantId}_case_pilot_001_activity_created`, {
    tenantId,
    caseId: `${tenantId}_case_pilot_001`,
    activityKind: "case_created",
    summary: "Pilot investigation case opened from retained replay divergence evidence.",
    detailJson: JSON.stringify({ decisionId: "dec_pilot_001", source: "pilot_artifact_seed", pilotOnly: true }),
    actorUserId: userId,
  });
  await ensurePilotRetentionPolicy(tenantId, userId);

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
  const membership = await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const baseConditions = [eq(investigationCases.tenantId, tenantId)];
  if (input.caseId) baseConditions.push(eq(investigationCases.id, input.caseId));
  else if (input.decisionId) baseConditions.push(eq(investigationCases.decisionId, input.decisionId));
  else if (input.rolloutId) baseConditions.push(eq(investigationCases.rolloutId, input.rolloutId));
  const investigationCase = (await db.select().from(investigationCases).where(and(...baseConditions)).orderBy(desc(investigationCases.updatedAt)).limit(1))[0];
  if (!investigationCase) throw new Error("No tenant-scoped investigation case was found for the requested context.");
  const [evidence, traces, records, rollout, actions, assignments, escalations, manifests, retentionPolicies, comments, attachments, activities, reminderPolicies, reminders] = await Promise.all([
    db.select().from(decisionEvidence).where(and(eq(decisionEvidence.tenantId, tenantId), eq(decisionEvidence.decisionId, investigationCase.decisionId))).orderBy(desc(decisionEvidence.createdAt)).limit(20),
    db.select().from(replayTraces).where(and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, investigationCase.decisionId))).orderBy(desc(replayTraces.createdAt)).limit(30),
    db.select().from(investigationRecords).where(eq(investigationRecords.tenantId, tenantId)).orderBy(desc(investigationRecords.createdAt)).limit(100),
    investigationCase.rolloutId ? db.select().from(migrationRollouts).where(and(eq(migrationRollouts.tenantId, tenantId), eq(migrationRollouts.id, investigationCase.rolloutId))).limit(1) : Promise.resolve([]),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(30),
    db.select().from(investigationCaseAssignments).where(and(eq(investigationCaseAssignments.tenantId, tenantId), eq(investigationCaseAssignments.caseId, investigationCase.id))).orderBy(desc(investigationCaseAssignments.updatedAt)).limit(30),
    db.select().from(investigationEscalations).where(and(eq(investigationEscalations.tenantId, tenantId), eq(investigationEscalations.caseId, investigationCase.id))).orderBy(desc(investigationEscalations.updatedAt)).limit(30),
    db.select().from(evidencePackageManifests).where(and(eq(evidencePackageManifests.tenantId, tenantId), eq(evidencePackageManifests.caseId, investigationCase.id))).orderBy(desc(evidencePackageManifests.createdAt)).limit(30),
    db.select().from(evidenceRetentionPolicies).where(and(eq(evidenceRetentionPolicies.tenantId, tenantId), eq(evidenceRetentionPolicies.status, "active"))).orderBy(desc(evidenceRetentionPolicies.updatedAt)).limit(5),
    db.select().from(investigationComments).where(and(eq(investigationComments.tenantId, tenantId), eq(investigationComments.caseId, investigationCase.id))).orderBy(desc(investigationComments.createdAt)).limit(100),
    db.select().from(investigationAttachments).where(and(eq(investigationAttachments.tenantId, tenantId), eq(investigationAttachments.caseId, investigationCase.id))).orderBy(desc(investigationAttachments.createdAt)).limit(100),
    db.select().from(investigationActivities).where(and(eq(investigationActivities.tenantId, tenantId), eq(investigationActivities.caseId, investigationCase.id))).orderBy(desc(investigationActivities.createdAt)).limit(200),
    db.select().from(investigationSlaReminderPolicies).where(eq(investigationSlaReminderPolicies.tenantId, tenantId)).orderBy(desc(investigationSlaReminderPolicies.updatedAt)).limit(10),
    db.select().from(investigationSlaReminders).where(and(eq(investigationSlaReminders.tenantId, tenantId), eq(investigationSlaReminders.caseId, investigationCase.id), eq(investigationSlaReminders.recipientUserId, userId))).orderBy(desc(investigationSlaReminders.createdAt)).limit(50),
  ]);
  return {
    investigationCase,
    evidence,
    traces: traces.map(trace => ({ ...trace, parsedTrace: safelyParse(trace.traceJson) })),
    records: records.filter(record => record.decisionId === investigationCase.decisionId || (investigationCase.rolloutId !== null && record.rolloutId === investigationCase.rolloutId)).map(record => ({ ...record, details: safelyParse(record.detailJson) })),
    rollout: rollout[0] ?? null,
    relatedToolCalls: actions.filter(action => action.inputJson.includes(investigationCase.decisionId)),
    assignments: assignments.map(assignment => ({ ...assignment, serviceLevel: serviceLevelPosture(assignment.serviceLevelTargetAt) })),
    escalations: escalations.map(escalation => ({ ...escalation, serviceLevel: serviceLevelPosture(escalation.serviceLevelTargetAt) })),
    comments: comments
      .filter(comment => commentVisibleToRole(comment.visibility as CommentVisibility, membership.role as TenantOperatorRole))
      .map(comment => comment.redactionState === "redacted" ? { ...comment, body: "[Redacted under the governed comment workflow.]" } : comment),
    attachments,
    activities: activities.map(activity => ({ ...activity, details: safelyParse(activity.detailJson) })),
    manifests: manifests.map(manifest => ({ ...manifest, parsedManifest: safelyParse(manifest.manifestJson) })),
    retentionPolicy: retentionPolicies[0] ?? null,
    reminderPolicies: reminderPolicies.map(policy => ({ ...policy, activationBoundary: policy.status === "draft" ? "Draft only. A platform operator may manually evaluate in-app records; hourly activation requires a deployed site and an explicit follow-up action." : "In-app reminder records only; no external notification, delivery guarantee, or automatic escalation is provided." })),
    reminders,
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
  await recordInvestigationActivity(db, {
    tenantId,
    caseId: input.caseId,
    activityKind: "outcome_recorded",
    summary: `Investigation outcome recorded: ${input.status.replace(/_/g, " ")}.`,
    detail: { outcome: input.status, rationale: input.rationale, authorityBoundary },
    actorUserId: userId,
  });
  return { ok: true as const, caseId: input.caseId, status: input.status, pilotOnly: true };
}

export async function investigationCaseQueue(userId: number, tenantId: string, input: InvestigationQueueInput = {}) {
  await ensurePilotArtifacts(userId, tenantId);
  const membership = await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const [cases, assignments, escalations, comments, savedViews, teamViews] = await Promise.all([
    db.select().from(investigationCases).where(eq(investigationCases.tenantId, tenantId)).orderBy(desc(investigationCases.updatedAt)).limit(100),
    db.select().from(investigationCaseAssignments).where(eq(investigationCaseAssignments.tenantId, tenantId)).orderBy(desc(investigationCaseAssignments.updatedAt)).limit(200),
    db.select().from(investigationEscalations).where(eq(investigationEscalations.tenantId, tenantId)).orderBy(desc(investigationEscalations.updatedAt)).limit(200),
    db.select().from(investigationComments).where(eq(investigationComments.tenantId, tenantId)).orderBy(desc(investigationComments.createdAt)).limit(300),
    db.select().from(investigationSavedViews).where(and(eq(investigationSavedViews.tenantId, tenantId), eq(investigationSavedViews.ownerUserId, userId))).orderBy(desc(investigationSavedViews.updatedAt)).limit(30),
    db.select().from(investigationTeamViews).where(and(eq(investigationTeamViews.tenantId, tenantId), eq(investigationTeamViews.status, "active"))).orderBy(desc(investigationTeamViews.updatedAt)).limit(30),
  ]);
  const latestAssignment = new Map<string, typeof assignments[number]>();
  assignments.forEach(assignment => { if (!latestAssignment.has(assignment.caseId)) latestAssignment.set(assignment.caseId, assignment); });
  const activeEscalations = new Map<string, typeof escalations[number][]>();
  escalations.filter(escalation => escalation.status === "queued" || escalation.status === "acknowledged").forEach(escalation => activeEscalations.set(escalation.caseId, [...(activeEscalations.get(escalation.caseId) ?? []), escalation]));
  const commentSummaryByCase = new Map<string, { activeBodies: string[]; visibleCommentCount: number; redactedCommentCount: number }>();
  comments
    .filter(comment => commentVisibleToRole(comment.visibility as CommentVisibility, membership.role as TenantOperatorRole))
    .forEach(comment => {
      const existing = commentSummaryByCase.get(comment.caseId) ?? { activeBodies: [], visibleCommentCount: 0, redactedCommentCount: 0 };
      commentSummaryByCase.set(comment.caseId, {
        activeBodies: comment.redactionState === "active" ? [...existing.activeBodies, comment.body] : existing.activeBodies,
        visibleCommentCount: existing.visibleCommentCount + 1,
        redactedCommentCount: existing.redactedCommentCount + (comment.redactionState === "redacted" ? 1 : 0),
      });
    });
  const rows = cases.map(investigationCase => {
    const assignment = latestAssignment.get(investigationCase.id) ?? null;
    const active = activeEscalations.get(investigationCase.id) ?? [];
    const targets = [assignment?.serviceLevelTargetAt, ...active.map(escalation => escalation.serviceLevelTargetAt)].filter((target): target is Date => Boolean(target));
    const serviceLevelTargetAt = targets.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
    const commentSummary = commentSummaryByCase.get(investigationCase.id) ?? { activeBodies: [], visibleCommentCount: 0, redactedCommentCount: 0 };
    return {
      ...investigationCase,
      latestAssignment: assignment ? { ...assignment, serviceLevel: serviceLevelPosture(assignment.serviceLevelTargetAt) } : null,
      activeEscalations: active.map(escalation => ({ ...escalation, serviceLevel: serviceLevelPosture(escalation.serviceLevelTargetAt) })),
      serviceLevel: serviceLevelPosture(serviceLevelTargetAt),
      visibleCommentCount: commentSummary.visibleCommentCount,
      redactedCommentCount: commentSummary.redactedCommentCount,
      searchText: [investigationCase.id, investigationCase.decisionId, investigationCase.summary, investigationCase.recommendedAction, investigationCase.status, assignment?.assignedRole, ...commentSummary.activeBodies].filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const sorted = filterAndSortLifecycleQueue(rows, input);
  const workload = Array.from(latestAssignment.values()).reduce<Record<string, { key: string; assignedRole: string; assignedToUserId: number | null; openCases: number; overdueCases: number }>>((accumulator, assignment) => {
    const key = assignment.assignedToUserId ? `user:${assignment.assignedToUserId}` : `role:${assignment.assignedRole}`;
    const assignedCase = rows.find(row => row.id === assignment.caseId);
    if (!accumulator[key]) accumulator[key] = { key, assignedRole: assignment.assignedRole, assignedToUserId: assignment.assignedToUserId, openCases: 0, overdueCases: 0 };
    if (assignedCase && assignedCase.status === "open") accumulator[key].openCases += 1;
    if (assignedCase?.serviceLevel.state === "overdue") accumulator[key].overdueCases += 1;
    return accumulator;
  }, {});
  return {
    cases: sorted.map(({ searchText, ...caseRow }) => caseRow),
    assignments: assignments.map(assignment => ({ ...assignment, serviceLevel: serviceLevelPosture(assignment.serviceLevelTargetAt) })),
    escalations: escalations.map(escalation => ({ ...escalation, serviceLevel: serviceLevelPosture(escalation.serviceLevelTargetAt) })),
    savedViews: savedViews.map(view => ({ ...view, filters: safelyParse(view.filterJson) })),
    teamViews: teamViews
      .map(view => ({ ...view, filters: safelyParse(view.filterJson), allowedRoles: parseTeamRoles(view.allowedRolesJson), ownership: { createdByUserId: view.createdByUserId, accessPolicy: "explicit_allowed_tenant_roles" as const } }))
      .filter(view => teamViewVisibleToTenantMember({ viewTenantId: view.tenantId, memberTenantId: tenantId, allowedRoles: view.allowedRoles, memberRole: membership.role as TenantOperatorRole })),
    workload: Object.values(workload),
    appliedFilters: input,
    pilotOnly: true,
  };
}

export async function personalSlaReminderInbox(userId: number, tenantId: string, input: { serviceLevelState?: "due_soon" | "overdue" } = {}) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const [reminders, cases] = await Promise.all([
    db.select().from(investigationSlaReminders).where(and(eq(investigationSlaReminders.tenantId, tenantId), eq(investigationSlaReminders.recipientUserId, userId))).orderBy(desc(investigationSlaReminders.createdAt)).limit(50),
    db.select().from(investigationCases).where(eq(investigationCases.tenantId, tenantId)).orderBy(desc(investigationCases.updatedAt)).limit(100),
  ]);
  const casesById = new Map(cases.map(investigationCase => [investigationCase.id, investigationCase]));
  const openReminders = reminders.filter(reminder => reminder.status === "open");
  const acknowledgedReminders = reminders.filter(reminder => reminder.status === "acknowledged");
  const filtered = input.serviceLevelState ? openReminders.filter(reminder => reminder.serviceLevelState === input.serviceLevelState) : openReminders;
  const presentReminder = (reminder: typeof reminders[number]) => {
    const investigationCase = casesById.get(reminder.caseId);
    return {
      ...reminder,
      case: investigationCase ? { id: investigationCase.id, decisionId: investigationCase.decisionId, summary: investigationCase.summary, status: investigationCase.status } : null,
    };
  };
  return {
    pendingCount: openReminders.length,
    reminders: filtered.map(presentReminder),
    acknowledgedReminders: acknowledgedReminders.map(presentReminder),
    delivery: "in_app_record_only" as const,
    pilotOnly: true,
  };
}

export async function resolvePersonalSlaReminder(userId: number, tenantId: string, input: { reminderId: string; action: ReminderResolutionAction; dismissalReason?: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const reminder = (await db.select().from(investigationSlaReminders).where(and(eq(investigationSlaReminders.id, input.reminderId), eq(investigationSlaReminders.tenantId, tenantId))).limit(1))[0];
  if (!reminder) throw new Error("The SLA reminder is not available in this tenant scope.");
  if (!canResolveAssignedInvestigatorReminder({ recipientUserId: reminder.recipientUserId, actorUserId: userId })) throw new Error("Only the named assigned investigator can resolve this in-app SLA reminder.");
  const targetStatus = reminderResolutionTarget(reminder.status, input.action);
  if (!targetStatus) throw new Error("This SLA reminder cannot transition from its current state through the requested action.");
  if (input.action === "dismiss" && !input.dismissalReason?.trim()) throw new Error("A dismissal reason is required to preserve accountable reminder evidence.");
  const now = new Date();
  const update = input.action === "acknowledge"
    ? { status: targetStatus, acknowledgedAt: now, acknowledgedByUserId: userId }
    : { status: targetStatus, dismissedAt: now, dismissedByUserId: userId, dismissalReason: input.dismissalReason!.trim() };
  await db.update(investigationSlaReminders).set(update).where(and(eq(investigationSlaReminders.id, reminder.id), eq(investigationSlaReminders.tenantId, tenantId)));
  await recordInvestigationActivity(db, { tenantId, caseId: reminder.caseId, actorUserId: userId, ...slaReminderResolutionActivity({ reminderId: reminder.id, policyId: reminder.policyId, assignmentId: reminder.assignmentId, recipientUserId: reminder.recipientUserId, priorStatus: reminder.status, action: input.action, dismissalReason: input.action === "dismiss" ? input.dismissalReason!.trim() : null }) });
  return { reminderId: reminder.id, status: targetStatus, action: input.action, resolvedAt: now, pilotOnly: true, delivery: "in_app_record_only" as const };
}

export async function tenantSlaReminderWorkload(userId: number, tenantId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const [reminders, members] = await Promise.all([
    db.select().from(investigationSlaReminders).where(eq(investigationSlaReminders.tenantId, tenantId)).orderBy(desc(investigationSlaReminders.createdAt)).limit(500),
    db.select({ userId: tenantMembers.userId, role: tenantMembers.role, name: users.name, email: users.email }).from(tenantMembers).leftJoin(users, eq(users.id, tenantMembers.userId)).where(eq(tenantMembers.tenantId, tenantId)).orderBy(tenantMembers.role),
  ]);
  const workload = new Map<number, { userId: number; role: string; name: string | null; email: string | null; openCount: number; dueSoonCount: number; overdueCount: number; acknowledgedCount: number; dismissedCount: number; latestReminderAt: Date | null }>();
  members.forEach(member => workload.set(member.userId, { userId: member.userId, role: member.role, name: member.name ?? null, email: member.email ?? null, openCount: 0, dueSoonCount: 0, overdueCount: 0, acknowledgedCount: 0, dismissedCount: 0, latestReminderAt: null }));
  reminders.forEach(reminder => {
    const member = workload.get(reminder.recipientUserId);
    if (!member) return;
    if (!member.latestReminderAt || reminder.createdAt > member.latestReminderAt) member.latestReminderAt = reminder.createdAt;
    if (reminder.status === "open") {
      member.openCount += 1;
      if (reminder.serviceLevelState === "due_soon") member.dueSoonCount += 1;
      if (reminder.serviceLevelState === "overdue") member.overdueCount += 1;
    } else if (reminder.status === "acknowledged") member.acknowledgedCount += 1;
    else member.dismissedCount += 1;
  });
  const assignees = Array.from(workload.values()).sort((left, right) => right.overdueCount - left.overdueCount || right.openCount - left.openCount || left.role.localeCompare(right.role));
  return {
    assignees,
    totals: {
      openCount: assignees.reduce((total, assignee) => total + assignee.openCount, 0),
      dueSoonCount: assignees.reduce((total, assignee) => total + assignee.dueSoonCount, 0),
      overdueCount: assignees.reduce((total, assignee) => total + assignee.overdueCount, 0),
      acknowledgedCount: assignees.reduce((total, assignee) => total + assignee.acknowledgedCount, 0),
      dismissedCount: assignees.reduce((total, assignee) => total + assignee.dismissedCount, 0),
    },
    pilotOnly: true,
    delivery: "in_app_record_only" as const,
  };
}

export async function investigationCaseAssignees(userId: number, tenantId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  return db.select({ userId: tenantMembers.userId, role: tenantMembers.role, name: users.name, email: users.email }).from(tenantMembers).leftJoin(users, eq(users.id, tenantMembers.userId)).where(eq(tenantMembers.tenantId, tenantId)).orderBy(tenantMembers.role);
}

export async function assignInvestigationCase(userId: number, tenantId: string, input: { caseId: string; assignedRole: InvestigatorRole; assignedToUserId?: number; rationale: string; dueAt?: Date; serviceLevelTargetMinutes?: number }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const investigationCase = (await db.select().from(investigationCases).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId))).limit(1))[0];
  if (!investigationCase) throw new Error("The investigation case is not available in this tenant scope.");
  if (input.assignedToUserId) {
    const assignee = (await db.select().from(tenantMembers).where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, input.assignedToUserId))).limit(1))[0];
    if (!assignee || assignee.role !== input.assignedRole) throw new Error("The named assignee must be a member of this tenant and belong to the selected operator role.");
  }
  const prior = (await db.select({ id: investigationCaseAssignments.id }).from(investigationCaseAssignments).where(and(eq(investigationCaseAssignments.tenantId, tenantId), eq(investigationCaseAssignments.caseId, input.caseId))).orderBy(desc(investigationCaseAssignments.updatedAt)).limit(1))[0];
  const id = `assign_${nanoid(16)}`;
  const serviceLevelTargetAt = serviceLevelTarget(input.serviceLevelTargetMinutes);
  await db.insert(investigationCaseAssignments).values({ id, tenantId, caseId: input.caseId, assignedRole: input.assignedRole, assignedToUserId: input.assignedToUserId ?? null, assignedByUserId: userId, status: prior ? "reassigned" : "assigned", rationale: input.rationale, dueAt: input.dueAt ?? null, serviceLevelTargetMinutes: input.serviceLevelTargetMinutes ?? null, serviceLevelTargetAt });
  await db.insert(investigationRecords).values({
    id: `inv_${nanoid(16)}`,
    tenantId,
    decisionId: investigationCase.decisionId,
    rolloutId: investigationCase.rolloutId,
    recordKind: "replay_assertion",
    status: "acknowledged",
    summary: `Case assigned to the ${input.assignedRole.replace(/_/g, " ")} work queue.`,
    detailJson: JSON.stringify({ action: "case_assignment", caseId: input.caseId, assignedRole: input.assignedRole, assignedToUserId: input.assignedToUserId ?? null, dueAt: input.dueAt?.toISOString() ?? null, serviceLevelTargetMinutes: input.serviceLevelTargetMinutes ?? null, rationale: input.rationale, assignedByUserId: userId, pilotOnly: true }),
    createdByUserId: userId,
  });
  await recordInvestigationActivity(db, { tenantId, caseId: input.caseId, actorUserId: userId, ...assignmentActivity({ assignmentId: id, assignedRole: input.assignedRole, assignedToUserId: input.assignedToUserId ?? null, dueAt: input.dueAt ?? null, serviceLevelTargetAt, rationale: input.rationale }) });
  return { id, caseId: input.caseId, assignedRole: input.assignedRole, assignedToUserId: input.assignedToUserId ?? null, dueAt: input.dueAt ?? null, serviceLevelTargetAt, serviceLevel: serviceLevelPosture(serviceLevelTargetAt), pilotOnly: true, automaticTimer: false };
}

export async function escalateInvestigationCase(userId: number, tenantId: string, input: { caseId: string; queue: "compliance_review" | "platform_safety" | "customer_exception"; priority: "standard" | "elevated" | "critical"; reason: string; serviceLevelTargetMinutes?: number }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  if (input.queue === "platform_safety") await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const investigationCase = (await db.select().from(investigationCases).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId))).limit(1))[0];
  if (!investigationCase) throw new Error("The investigation case is not available in this tenant scope.");
  const id = `esc_${nanoid(16)}`;
  const serviceLevelTargetMinutes = input.serviceLevelTargetMinutes ?? defaultEscalationTargetMinutes(input.priority);
  const serviceLevelTargetAt = serviceLevelTarget(serviceLevelTargetMinutes);
  await db.insert(investigationEscalations).values({ id, tenantId, caseId: input.caseId, queue: input.queue, priority: input.priority, status: "queued", reason: input.reason, serviceLevelTargetMinutes, serviceLevelTargetAt, createdByUserId: userId, acknowledgedByUserId: null });
  await db.insert(investigationRecords).values({
    id: `inv_${nanoid(16)}`,
    tenantId,
    decisionId: investigationCase.decisionId,
    rolloutId: investigationCase.rolloutId,
    recordKind: "rollback_recommendation",
    status: "recommended",
    summary: `Case escalated to the ${input.queue.replace(/_/g, " ")} queue at ${input.priority} priority.`,
    detailJson: JSON.stringify({ action: "case_escalation", caseId: input.caseId, queue: input.queue, priority: input.priority, serviceLevelTargetMinutes, serviceLevelTargetAt: serviceLevelTargetAt?.toISOString() ?? null, reason: input.reason, createdByUserId: userId, pilotOnly: true, automaticDispatch: false }),
    createdByUserId: userId,
  });
  await recordInvestigationActivity(db, { tenantId, caseId: input.caseId, actorUserId: userId, ...escalationActivity({ escalationId: id, queue: input.queue, priority: input.priority, reason: input.reason, serviceLevelTargetMinutes, serviceLevelTargetAt }) });
  return { id, caseId: input.caseId, queue: input.queue, priority: input.priority, serviceLevelTargetAt, serviceLevel: serviceLevelPosture(serviceLevelTargetAt), pilotOnly: true, automaticDispatch: false, automaticTimer: false };
}

export async function acknowledgeInvestigationEscalation(userId: number, tenantId: string, escalationId: string) {
  const db = await dbOrThrow();
  const escalation = (await db.select().from(investigationEscalations).where(and(eq(investigationEscalations.id, escalationId), eq(investigationEscalations.tenantId, tenantId))).limit(1))[0];
  if (!escalation) throw new Error("The escalation is not available in this tenant scope.");
  const requiredRoles = escalation.queue === "platform_safety" ? ["platform_operator"] : escalation.queue === "compliance_review" ? ["platform_operator", "compliance_operator"] : ["platform_operator", "compliance_operator", "customer_operator"];
  await assertTenantRole(userId, tenantId, requiredRoles as ("platform_operator" | "compliance_operator" | "customer_operator")[]);
  if (escalation.status !== "queued") throw new Error("Only a queued escalation can be acknowledged.");
  await db.update(investigationEscalations).set({ status: "acknowledged", acknowledgedByUserId: userId }).where(and(eq(investigationEscalations.id, escalationId), eq(investigationEscalations.tenantId, tenantId)));
  await recordInvestigationActivity(db, { tenantId, caseId: escalation.caseId, activityKind: "escalation_acknowledged", summary: "Escalation acknowledgement recorded.", detail: { escalationId, queue: escalation.queue, priority: escalation.priority }, actorUserId: userId });
  return { ok: true as const, escalationId, pilotOnly: true, automaticDispatch: false };
}

export async function saveInvestigationView(userId: number, tenantId: string, input: { name: string; filters: InvestigationQueueInput }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const id = `view_${nanoid(16)}`;
  await db.insert(investigationSavedViews).values({ id, tenantId, ownerUserId: userId, name: input.name, filterJson: JSON.stringify(input.filters) });
  return { id, name: input.name, filters: input.filters, pilotOnly: true };
}

export async function deleteInvestigationSavedView(userId: number, tenantId: string, viewId: string) {
  const db = await dbOrThrow();
  const view = (await db.select().from(investigationSavedViews).where(and(eq(investigationSavedViews.id, viewId), eq(investigationSavedViews.tenantId, tenantId), eq(investigationSavedViews.ownerUserId, userId))).limit(1))[0];
  if (!view) throw new Error("The saved investigation view is not available to this tenant user.");
  await db.delete(investigationSavedViews).where(and(eq(investigationSavedViews.id, viewId), eq(investigationSavedViews.tenantId, tenantId), eq(investigationSavedViews.ownerUserId, userId)));
  return { ok: true as const, viewId, pilotOnly: true };
}

export async function createInvestigationTeamView(userId: number, tenantId: string, input: { name: string; filters: InvestigationQueueInput; allowedRoles: TenantOperatorRole[] }) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const allowedRoles = Array.from(new Set(input.allowedRoles)).filter(role => shareableQueueRoles.includes(role));
  if (allowedRoles.length === 0) throw new Error("A team view must explicitly name at least one tenant role that may access it.");
  const db = await dbOrThrow();
  const id = `team_view_${nanoid(16)}`;
  await db.insert(investigationTeamViews).values({ id, tenantId, name: input.name, filterJson: JSON.stringify(input.filters), allowedRolesJson: JSON.stringify(allowedRoles), createdByUserId: userId });
  await recordInvestigationActivity(db, { tenantId, caseId: `team_view_${id}`, activityKind: "team_view_created", summary: "Shared investigation team view created.", detail: { teamViewId: id, name: input.name, allowedRoles, action: "created", accessPolicy: "explicit_allowed_tenant_roles" }, actorUserId: userId });
  return { id, name: input.name, filters: input.filters, allowedRoles, status: "active" as const, pilotOnly: true };
}

export async function retireInvestigationTeamView(userId: number, tenantId: string, viewId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const view = (await db.select().from(investigationTeamViews).where(and(eq(investigationTeamViews.id, viewId), eq(investigationTeamViews.tenantId, tenantId))).limit(1))[0];
  if (!view) throw new Error("The shared team view is not available in this tenant scope.");
  await db.update(investigationTeamViews).set({ status: "retired" }).where(and(eq(investigationTeamViews.id, viewId), eq(investigationTeamViews.tenantId, tenantId)));
  await recordInvestigationActivity(db, { tenantId, caseId: `team_view_${view.id}`, activityKind: "team_view_created", summary: "Shared investigation team view retired.", detail: { teamViewId: view.id, name: view.name, allowedRoles: parseTeamRoles(view.allowedRolesJson), action: "retired", accessPolicy: "explicit_allowed_tenant_roles" }, actorUserId: userId });
  return { ok: true as const, viewId, pilotOnly: true };
}

export async function redactInvestigationComment(userId: number, tenantId: string, input: { commentId: string; reason: string }) {
  const membership = await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  if (!canRedactComment(membership.role as TenantOperatorRole)) throw new Error("The current tenant role cannot redact an investigation comment.");
  const db = await dbOrThrow();
  const comment = (await db.select().from(investigationComments).where(and(eq(investigationComments.id, input.commentId), eq(investigationComments.tenantId, tenantId))).limit(1))[0];
  if (!comment) throw new Error("The investigation comment is not available in this tenant scope.");
  if (comment.redactionState === "redacted") throw new Error("This investigation comment has already been redacted.");
  const originalBodyHash = comment.originalBodyHash ?? commentContentHash(comment.body);
  const redactedAt = new Date();
  await db.update(investigationComments).set({ body: "[Redacted under the governed comment workflow.]", redactionState: "redacted", redactionReason: input.reason, originalBodyHash, redactedByUserId: userId, redactedAt }).where(and(eq(investigationComments.id, input.commentId), eq(investigationComments.tenantId, tenantId)));
  await recordInvestigationActivity(db, { tenantId, caseId: comment.caseId, activityKind: "comment_redacted", summary: "Investigation comment redaction recorded.", detail: { commentId: comment.id, visibility: comment.visibility, originalBodyHash, redactionReason: input.reason, redactedByUserId: userId, redactedAt: redactedAt.toISOString() }, actorUserId: userId });
  return { ok: true as const, commentId: comment.id, originalBodyHash, redactedAt, pilotOnly: true };
}

export async function configureHourlySlaReminderPolicy(userId: number, tenantId: string, name: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const existing = (await db.select().from(investigationSlaReminderPolicies).where(and(eq(investigationSlaReminderPolicies.tenantId, tenantId), eq(investigationSlaReminderPolicies.name, name))).limit(1))[0];
  if (existing) {
    await db.update(investigationSlaReminderPolicies).set({ cadenceCron: "0 0 * * * *", recipientMode: "assigned_investigator", operationalOwnerRole: "platform_operator", status: "draft", scheduleCronTaskUid: null, lastEvaluatedAt: null, createdByUserId: userId }).where(and(eq(investigationSlaReminderPolicies.id, existing.id), eq(investigationSlaReminderPolicies.tenantId, tenantId)));
    return { id: existing.id, status: "draft" as const, cadenceCron: "0 0 * * * *", pilotOnly: true, activationBoundary: "Draft only. No Heartbeat task has been created; deployment and explicit user confirmation are required before activation." };
  }
  const id = `sla_policy_${nanoid(16)}`;
  await db.insert(investigationSlaReminderPolicies).values({ id, tenantId, name, cadenceCron: "0 0 * * * *", recipientMode: "assigned_investigator", operationalOwnerRole: "platform_operator", status: "draft", createdByUserId: userId });
  return { id, status: "draft" as const, cadenceCron: "0 0 * * * *", pilotOnly: true, activationBoundary: "Draft only. No Heartbeat task has been created; deployment and explicit user confirmation are required before activation." };
}

async function evaluateSlaReminderPolicyRecords(db: any, policy: typeof investigationSlaReminderPolicies.$inferSelect, actorUserId: number, now: Date) {
  const assignments = await db.select().from(investigationCaseAssignments).where(eq(investigationCaseAssignments.tenantId, policy.tenantId)).orderBy(desc(investigationCaseAssignments.updatedAt)).limit(500);
  const latestByCase = new Map<string, typeof assignments[number]>();
  assignments.forEach((assignment: any) => { if (!latestByCase.has(assignment.caseId)) latestByCase.set(assignment.caseId, assignment); });
  const evaluationHour = reminderEvaluationHour(now);
  let recorded = 0;
  for (const assignment of Array.from(latestByCase.values()) as any[]) {
    const dueAt = assignment.serviceLevelTargetAt ?? assignment.dueAt;
    const serviceLevel = serviceLevelPosture(dueAt);
    if (!shouldCreateAssignedInvestigatorReminder({ assignedToUserId: assignment.assignedToUserId, dueAt, serviceLevelState: serviceLevel.state })) continue;
    const existing = (await db.select({ id: investigationSlaReminders.id }).from(investigationSlaReminders).where(and(eq(investigationSlaReminders.policyId, policy.id), eq(investigationSlaReminders.assignmentId, assignment.id), eq(investigationSlaReminders.evaluationHour, evaluationHour))).limit(1))[0];
    if (existing) continue;
    const id = `sla_reminder_${nanoid(16)}`;
    try {
      await db.insert(investigationSlaReminders).values({ id, tenantId: policy.tenantId, policyId: policy.id, caseId: assignment.caseId, assignmentId: assignment.id, recipientUserId: assignment.assignedToUserId!, serviceLevelState: serviceLevel.state, dueAt: dueAt!, evaluationHour, status: "open" });
    } catch (error) {
      const concurrent = (await db.select({ id: investigationSlaReminders.id }).from(investigationSlaReminders).where(and(eq(investigationSlaReminders.policyId, policy.id), eq(investigationSlaReminders.assignmentId, assignment.id), eq(investigationSlaReminders.evaluationHour, evaluationHour))).limit(1))[0];
      if (!concurrent) throw error;
      continue;
    }
    await recordInvestigationActivity(db, { tenantId: policy.tenantId, caseId: assignment.caseId, activityKind: "sla_reminder_recorded", summary: "Assigned-investigator SLA attention record created.", detail: { reminderId: id, policyId: policy.id, assignmentId: assignment.id, recipientUserId: assignment.assignedToUserId, serviceLevelState: serviceLevel.state, dueAt: dueAt!.toISOString(), evaluationHour, delivery: "in_app_record_only", automaticEscalation: false }, actorUserId });
    recorded += 1;
  }
  await db.update(investigationSlaReminderPolicies).set({ lastEvaluatedAt: now }).where(and(eq(investigationSlaReminderPolicies.id, policy.id), eq(investigationSlaReminderPolicies.tenantId, policy.tenantId)));
  return { policyId: policy.id, evaluationHour, recorded, delivery: "in_app_record_only" as const, automaticEscalation: false, pilotOnly: true };
}

export async function evaluateHourlySlaReminderPolicy(userId: number, tenantId: string, policyId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  const db = await dbOrThrow();
  const policy = (await db.select().from(investigationSlaReminderPolicies).where(and(eq(investigationSlaReminderPolicies.id, policyId), eq(investigationSlaReminderPolicies.tenantId, tenantId))).limit(1))[0];
  if (!policy) throw new Error("The SLA reminder policy is not available in this tenant scope.");
  if (policy.status === "paused") throw new Error("The SLA reminder policy is paused.");
  return evaluateSlaReminderPolicyRecords(db, policy, userId, new Date());
}

export async function activateDeployedHourlySlaReminderPolicy(userId: number, tenantId: string, policyId: string, rawCookieHeader: string | undefined) {
  await assertTenantRole(userId, tenantId, ["platform_operator"]);
  if (process.env.NODE_ENV !== "production") throw new Error("Hourly schedule activation is available only from the deployed application after this release checkpoint is published.");
  const session = parseCookieHeader(rawCookieHeader ?? "")[COOKIE_NAME] ?? "";
  if (!session) throw new Error("A platform-operator session is required to activate an hourly reminder schedule.");
  const db = await dbOrThrow();
  const policy = (await db.select().from(investigationSlaReminderPolicies).where(and(eq(investigationSlaReminderPolicies.id, policyId), eq(investigationSlaReminderPolicies.tenantId, tenantId))).limit(1))[0];
  if (!policy) throw new Error("The SLA reminder policy is not available in this tenant scope.");
  if (policy.status === "active" && policy.scheduleCronTaskUid) return { policyId, taskUid: policy.scheduleCronTaskUid, status: "active" as const, alreadyActive: true, delivery: "in_app_record_only" as const };
  if (policy.scheduleCronTaskUid) throw new Error("This policy retains a scheduled-task reference. Resolve or pause that schedule before activating another task.");
  const job = await createHeartbeatJob({ name: `dcp-sla-${tenantId}-${policy.id}`, cron: "0 0 * * * *", path: "/api/scheduled/investigation-sla-reminders", method: "POST", payload: {}, description: "Decision Control Plane pilot: hourly assigned-investigator SLA in-app record evaluation only. No external delivery or automatic escalation." }, session);
  try {
    await db.update(investigationSlaReminderPolicies).set({ status: "active", scheduleCronTaskUid: job.taskUid }).where(and(eq(investigationSlaReminderPolicies.id, policy.id), eq(investigationSlaReminderPolicies.tenantId, tenantId)));
  } catch (error) {
    await deleteHeartbeatJob(job.taskUid, session).catch(() => undefined);
    throw error;
  }
  return { policyId: policy.id, taskUid: job.taskUid, status: "active" as const, alreadyActive: false, delivery: "in_app_record_only" as const, automaticEscalation: false };
}

export async function evaluateHourlySlaReminderPolicyByTaskUid(taskUid: string) {
  const db = await dbOrThrow();
  const policy = (await db.select().from(investigationSlaReminderPolicies).where(and(eq(investigationSlaReminderPolicies.scheduleCronTaskUid, taskUid), eq(investigationSlaReminderPolicies.status, "active"))).limit(1))[0];
  if (!policy) throw new Error("No active SLA reminder policy is bound to this scheduled task.");
  return evaluateSlaReminderPolicyRecords(db, policy, -1, new Date());
}

export async function addInvestigationComment(userId: number, tenantId: string, input: { caseId: string; body: string; visibility: CommentVisibility }) {
  const membership = await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer"]);
  if (!canCreateCommentWithVisibility(membership.role as TenantOperatorRole, input.visibility)) throw new Error("The current tenant role cannot create a comment with this visibility scope.");
  const db = await dbOrThrow();
  const investigationCase = (await db.select().from(investigationCases).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId))).limit(1))[0];
  if (!investigationCase) throw new Error("The investigation case is not available in this tenant scope.");
  const id = `comment_${nanoid(16)}`;
  const contentHash = commentContentHash(input.body);
  await db.insert(investigationComments).values({ id, tenantId, caseId: input.caseId, body: input.body, visibility: input.visibility, originalBodyHash: contentHash, createdByUserId: userId });
  await recordInvestigationActivity(db, { tenantId, caseId: input.caseId, actorUserId: userId, ...commentActivity({ commentId: id, visibility: input.visibility, contentHash }) });
  return { id, caseId: input.caseId, visibility: input.visibility, pilotOnly: true };
}

export async function addInvestigationAttachment(userId: number, tenantId: string, input: { caseId: string; fileName: string; contentType: string; contentBase64: string; summary?: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator"]);
  const db = await dbOrThrow();
  const investigationCase = (await db.select().from(investigationCases).where(and(eq(investigationCases.id, input.caseId), eq(investigationCases.tenantId, tenantId))).limit(1))[0];
  if (!investigationCase) throw new Error("The investigation case is not available in this tenant scope.");
  const content = Buffer.from(input.contentBase64, "base64");
  const admission = admitPilotAttachment(input.fileName, content.byteLength);
  if (!admission.ok) throw new Error(admission.reason);
  const safeName = admission.safeName;
  const stored = await storagePut(`tenants/${tenantId}/investigations/${input.caseId}/${safeName}`, content, input.contentType);
  const id = `attachment_${nanoid(16)}`;
  await db.insert(investigationAttachments).values({ id, tenantId, caseId: input.caseId, fileName: safeName, contentType: input.contentType, sizeBytes: content.byteLength, storageKey: stored.key, storageUrl: stored.url, summary: input.summary ?? null, uploadedByUserId: userId });
  await recordInvestigationActivity(db, { tenantId, caseId: input.caseId, actorUserId: userId, ...attachmentActivity({ attachmentId: id, fileName: safeName, contentType: input.contentType, sizeBytes: content.byteLength, summary: input.summary ?? null }) });
  return { id, caseId: input.caseId, fileName: safeName, contentType: input.contentType, sizeBytes: content.byteLength, storageUrl: stored.url, pilotOnly: true, lifecycleBoundary: "Attachment bytes are stored in the project object store with tenant-scoped metadata. This pilot does not provide malware scanning, automatic deletion, or legal-hold enforcement." };
}

export async function exportReplayInvestigation(userId: number, tenantId: string, input: { decisionId: string; baselineTraceId?: string; candidateTraceId?: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator"]);
  const [replay, detail] = await Promise.all([
    replayExplorer(userId, tenantId, input.decisionId, input.baselineTraceId, input.candidateTraceId),
    investigationCaseDetail(userId, tenantId, { decisionId: input.decisionId }),
  ]);
  const retentionPolicy = await activeRetentionPolicy(tenantId);
  const retentionUntil = new Date(Date.now() + retentionPolicy.retentionDays * 86_400_000);
  const packageCore = {
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
  const db = await dbOrThrow();
  const auditExportId = `exp_${nanoid(16)}`;
  const signingKey = process.env.JWT_SECRET;
  if (!signingKey) throw new Error("The server signing key is unavailable; this pilot export cannot be signed.");
  const manifest = signEvidencePackage({
    tenantId,
    decisionId: input.decisionId,
    caseId: detail.investigationCase.id,
    retentionPolicyId: retentionPolicy.id,
    retentionUntil: retentionUntil.toISOString(),
    holdStatus: retentionPolicy.holdStatus,
    package: JSON.parse(JSON.stringify(packageCore)) as any,
  }, signingKey);
  const payload = { ...packageCore, evidenceManifest: manifest };
  const content = JSON.stringify(payload, null, 2);
  await db.insert(auditExports).values({ id: auditExportId, tenantId, requestedByUserId: userId, format: "json", scope: "replay_investigation_package", status: "prepared", summary: `Prepared signed replay investigation package for decision ${input.decisionId}.` });
  const manifestId = `manifest_${nanoid(16)}`;
  await db.insert(evidencePackageManifests).values({
    id: manifestId,
    tenantId,
    decisionId: input.decisionId,
    caseId: detail.investigationCase.id,
    auditExportId,
    retentionPolicyId: retentionPolicy.id,
    packageHash: manifest.packageHash,
    signature: manifest.signature,
    signatureAlgorithm: manifest.signatureAlgorithm,
    canonicalization: manifest.canonicalization,
    manifestJson: JSON.stringify(manifest),
    retentionUntil,
    status: retentionPolicy.holdStatus === "legal_hold" ? "on_hold" : "active",
    createdByUserId: userId,
  });
  return { filename: `dcp-${tenantId}-${input.decisionId}-replay-investigation.json`, content, format: "json" as const, manifestId, manifest, retentionPolicy: { id: retentionPolicy.id, retentionDays: retentionPolicy.retentionDays, holdStatus: retentionPolicy.holdStatus, retentionUntil }, pilotOnly: true };
}

export async function verifyEvidencePackageManifest(userId: number, tenantId: string, manifestId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const manifestRow = (await db.select().from(evidencePackageManifests).where(and(eq(evidencePackageManifests.id, manifestId), eq(evidencePackageManifests.tenantId, tenantId))).limit(1))[0];
  if (!manifestRow) throw new Error("The evidence-package manifest is not available in this tenant scope.");
  const signingKey = process.env.JWT_SECRET;
  if (!signingKey) throw new Error("The server signing key is unavailable; this pilot manifest cannot be verified.");
  const manifest = safelyParse(manifestRow.manifestJson) as SignedPackageManifest | null;
  if (!manifest || typeof manifest !== "object" || !manifest.signature) throw new Error("The retained manifest is malformed and cannot be verified.");
  const valid = verifyEvidenceManifest(manifest, signingKey);
  return {
    manifest: manifestRow,
    valid,
    verificationBoundary: "This verifies the stored pilot manifest signature against the server signing key. It does not prove external delivery, third-party notarization, or legal admissibility.",
    pilotOnly: true,
  };
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
  const [evidence, actions, steps, activities, teamViews, reminderPolicies, reminders] = await Promise.all([
    db.select().from(decisionEvidence).where(eq(decisionEvidence.tenantId, tenantId)).orderBy(desc(decisionEvidence.createdAt)).limit(100),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(100),
    db.select().from(migrationSteps).where(eq(migrationSteps.tenantId, tenantId)).orderBy(desc(migrationSteps.createdAt)).limit(100),
    db.select().from(investigationActivities).where(eq(investigationActivities.tenantId, tenantId)).orderBy(desc(investigationActivities.createdAt)).limit(200),
    db.select().from(investigationTeamViews).where(eq(investigationTeamViews.tenantId, tenantId)).orderBy(desc(investigationTeamViews.updatedAt)).limit(100),
    db.select().from(investigationSlaReminderPolicies).where(eq(investigationSlaReminderPolicies.tenantId, tenantId)).orderBy(desc(investigationSlaReminderPolicies.updatedAt)).limit(100),
    db.select().from(investigationSlaReminders).where(eq(investigationSlaReminders.tenantId, tenantId)).orderBy(desc(investigationSlaReminders.createdAt)).limit(200),
  ]);
  const payload = { tenantId, exportedAt: new Date().toISOString(), decisionEvidence: evidence, mcpToolCalls: actions, migrationSteps: steps, investigationActivities: activities, sharedTeamViews: teamViews, slaReminderPolicies: reminderPolicies, slaReminderRecords: reminders, pilotOnly: true };
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

async function recordPolicyRevisionActivity(db: any, input: { tenantId: string; policyId: string; policyRevisionId: string; activityKind: "revision_created" | "review_requested" | "review_recorded" | "revision_approved" | "simulation_recorded"; summary: string; detail: Record<string, unknown>; actorUserId: number }) {
  await db.insert(policyRevisionActivities).values({
    id: `policy_activity_${nanoid(16)}`,
    tenantId: input.tenantId,
    policyId: input.policyId,
    policyRevisionId: input.policyRevisionId,
    activityKind: input.activityKind,
    summary: input.summary,
    detailJson: JSON.stringify({ ...input.detail, pilotOnly: true }),
    actorUserId: input.actorUserId,
  });
}

async function ensurePolicyStudioPilotArtifacts(userId: number, tenantId: string) {
  const { db, tenant } = await tenantFor(tenantId);
  if (tenant.name !== "Pilot Transaction Rail") return;
  const policyId = `${tenantId}_policy_aml_screening`;
  const baselineRevisionId = `${policyId}_revision_27`;
  const candidateRevisionId = `${policyId}_revision_28_draft`;
  await insertOnce(policyDefinitions, policyId, {
    tenantId,
    policyKey: "aml-screening-disposition",
    name: "AML screening disposition",
    description: "Pilot policy definition for evidence-bound screening disposition. This registry records governed authoring evidence; it does not execute or publish a live policy.",
    domainAdapter: "financial-crime-screening",
    createdByUserId: userId,
  });
  const baselineSource = JSON.stringify({ evidenceCompleteness: "complete", sanctionsThreshold: 0.82, conflictPrecedence: "hold_for_review", simulatedDisposition: "held" });
  const candidateSource = JSON.stringify({ evidenceCompleteness: "conflicted", sanctionsThreshold: 0.82, conflictPrecedence: "reject", simulatedDisposition: "rejected" });
  await insertOnce(policyRevisions, baselineRevisionId, {
    tenantId,
    policyId,
    parentRevisionId: null,
    revisionNumber: 27,
    semanticVersion: "aml-policy@27",
    summary: "Retained baseline screening policy used by matched pilot replay traces.",
    sourceJson: baselineSource,
    sourceHash: commentContentHash(baselineSource),
    lifecycleState: "published",
    simulationState: "completed",
    createdByUserId: userId,
  });
  await insertOnce(policyRevisions, candidateRevisionId, {
    tenantId,
    policyId,
    parentRevisionId: baselineRevisionId,
    revisionNumber: 28,
    semanticVersion: "aml-policy@28-draft",
    summary: "Pilot candidate: conflicts take precedence after retained replay comparison. Draft only; no live policy changes occur.",
    sourceJson: candidateSource,
    sourceHash: commentContentHash(candidateSource),
    lifecycleState: "draft",
    simulationState: "not_run",
    createdByUserId: userId,
  });
  await insertOnce(policyRevisionActivities, `${baselineRevisionId}_activity_created`, {
    tenantId,
    policyId,
    policyRevisionId: baselineRevisionId,
    activityKind: "revision_created",
    summary: "Retained baseline Policy Studio revision indexed for pilot comparison.",
    detailJson: JSON.stringify({ sourceHash: commentContentHash(baselineSource), seeded: true, pilotOnly: true }),
    actorUserId: userId,
  });
  await insertOnce(policyRevisionActivities, `${candidateRevisionId}_activity_created`, {
    tenantId,
    policyId,
    policyRevisionId: candidateRevisionId,
    activityKind: "revision_created",
    summary: "Draft Policy Studio candidate indexed for simulation and maker/checker review.",
    detailJson: JSON.stringify({ sourceHash: commentContentHash(candidateSource), seeded: true, pilotOnly: true }),
    actorUserId: userId,
  });
}

export async function policyStudio(userId: number, tenantId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  await ensurePilotArtifacts(userId, tenantId);
  await ensurePolicyStudioPilotArtifacts(userId, tenantId);
  const db = await dbOrThrow();
  const [definitions, revisions, reviews, activities, reports] = await Promise.all([
    db.select().from(policyDefinitions).where(eq(policyDefinitions.tenantId, tenantId)).orderBy(desc(policyDefinitions.updatedAt)).limit(30),
    db.select().from(policyRevisions).where(eq(policyRevisions.tenantId, tenantId)).orderBy(desc(policyRevisions.updatedAt)).limit(100),
    db.select().from(policyRevisionReviews).where(eq(policyRevisionReviews.tenantId, tenantId)).orderBy(desc(policyRevisionReviews.createdAt)).limit(100),
    db.select().from(policyRevisionActivities).where(eq(policyRevisionActivities.tenantId, tenantId)).orderBy(desc(policyRevisionActivities.createdAt)).limit(150),
    db.select().from(policySimulationReports).where(eq(policySimulationReports.tenantId, tenantId)).orderBy(desc(policySimulationReports.createdAt)).limit(50),
  ]);
  return {
    definitions,
    revisions: revisions.map(revision => ({
      ...revision,
      source: safelyParse(revision.sourceJson),
      reviews: reviews.filter(review => review.policyRevisionId === revision.id),
      activities: activities.filter(activity => activity.policyRevisionId === revision.id),
      reports: reports.filter(report => report.policyRevisionId === revision.id).map(report => ({ ...report, objective: safelyParse(report.objectiveJson), feasibility: safelyParse(report.feasibilityJson), results: safelyParse(report.resultsJson) })),
    })),
    boundaries: [
      "Draft, review, approval, and simulation records are tenant-scoped evidence; none changes a live policy interpreter or rollout.",
      "Publication remains an explicitly deferred, separately governed control in this pilot.",
      "Maker and checker must be different tenant members for review evidence to be accepted.",
    ],
  };
}

export async function createPolicyRevision(userId: number, tenantId: string, input: { policyKey: string; name: string; description: string; domainAdapter: string; semanticVersion: string; summary: string; sourceJson: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const parsedSource = safelyParse(input.sourceJson);
  if (!parsedSource || typeof parsedSource !== "object" || Array.isArray(parsedSource)) throw new Error("Policy source must be a JSON object so its authored semantics can be retained and hashed.");
  const db = await dbOrThrow();
  const existing = (await db.select().from(policyDefinitions).where(and(eq(policyDefinitions.tenantId, tenantId), eq(policyDefinitions.policyKey, input.policyKey))).limit(1))[0];
  const policyId = existing?.id ?? `policy_${nanoid(16)}`;
  if (!existing) await db.insert(policyDefinitions).values({ id: policyId, tenantId, policyKey: input.policyKey, name: input.name, description: input.description, domainAdapter: input.domainAdapter, createdByUserId: userId });
  const prior = (await db.select().from(policyRevisions).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.policyId, policyId))).orderBy(desc(policyRevisions.revisionNumber)).limit(1))[0];
  const sourceHash = commentContentHash(input.sourceJson);
  const revisionId = `policy_revision_${nanoid(16)}`;
  await db.insert(policyRevisions).values({
    id: revisionId,
    tenantId,
    policyId,
    parentRevisionId: prior?.id ?? null,
    revisionNumber: (prior?.revisionNumber ?? 0) + 1,
    semanticVersion: input.semanticVersion,
    summary: input.summary,
    sourceJson: input.sourceJson,
    sourceHash,
    lifecycleState: "draft",
    simulationState: "not_run",
    createdByUserId: userId,
  });
  await recordPolicyRevisionActivity(db, { tenantId, policyId, policyRevisionId: revisionId, activityKind: "revision_created", summary: `Policy revision ${input.semanticVersion} created as draft.`, detail: { sourceHash, parentRevisionId: prior?.id ?? null, pilotOnly: true }, actorUserId: userId });
  return { id: revisionId, policyId, lifecycleState: "draft" as const, sourceHash, pilotOnly: true };
}

export async function submitPolicyRevisionForReview(userId: number, tenantId: string, revisionId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const revision = (await db.select().from(policyRevisions).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, revisionId))).limit(1))[0];
  if (!revision) throw new Error("Policy revision was not found in this tenant.");
  const next = policyLifecycleTarget(revision.lifecycleState, "submit_for_review");
  if (!next) throw new Error("Only a draft policy revision can be submitted for maker/checker review.");
  await db.update(policyRevisions).set({ lifecycleState: next }).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, revisionId)));
  await recordPolicyRevisionActivity(db, { tenantId, policyId: revision.policyId, policyRevisionId: revisionId, activityKind: "review_requested", summary: "Policy revision submitted for distinct maker/checker review.", detail: { priorState: revision.lifecycleState, nextState: next, pilotOnly: true }, actorUserId: userId });
  return { id: revisionId, lifecycleState: next, pilotOnly: true };
}

export async function recordPolicyRevisionReview(userId: number, tenantId: string, input: { revisionId: string; decision: PolicyReviewDecision; rationale: string }) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  const db = await dbOrThrow();
  const revision = (await db.select().from(policyRevisions).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, input.revisionId))).limit(1))[0];
  if (!revision) throw new Error("Policy revision was not found in this tenant.");
  if (!canRecordPolicyReview({ revisionState: revision.lifecycleState, creatorUserId: revision.createdByUserId, reviewerUserId: userId })) throw new Error("Maker/checker review requires an in-review revision and a reviewer different from the revision creator.");
  const action = input.decision === "approved" ? "record_approval" : input.decision === "changes_requested" ? "record_changes_requested" : "record_rejection";
  const next = policyLifecycleTarget(revision.lifecycleState, action);
  if (!next) throw new Error("This policy review decision is not valid for the current lifecycle state.");
  await db.insert(policyRevisionReviews).values({ id: `policy_review_${nanoid(16)}`, tenantId, policyRevisionId: revision.id, reviewerUserId: userId, decision: input.decision, rationale: input.rationale });
  await db.update(policyRevisions).set({ lifecycleState: next }).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, revision.id)));
  await recordPolicyRevisionActivity(db, { tenantId, policyId: revision.policyId, policyRevisionId: revision.id, activityKind: input.decision === "approved" ? "revision_approved" : "review_recorded", summary: input.decision === "approved" ? "Distinct checker approved the policy revision; live publication remains deferred." : `Checker recorded ${input.decision.replace(/_/g, " ")} for the policy revision.`, detail: { priorState: revision.lifecycleState, nextState: next, decision: input.decision, rationale: input.rationale, pilotOnly: true }, actorUserId: userId });
  return { id: revision.id, lifecycleState: next, decision: input.decision, pilotOnly: true };
}

export async function simulatePolicyRevision(userId: number, tenantId: string, revisionId: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator"]);
  await ensurePilotArtifacts(userId, tenantId);
  const db = await dbOrThrow();
  const revision = (await db.select().from(policyRevisions).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, revisionId))).limit(1))[0];
  if (!revision) throw new Error("Policy revision was not found in this tenant.");
  const [traces, evidence, cases] = await Promise.all([
    db.select().from(replayTraces).where(eq(replayTraces.tenantId, tenantId)).orderBy(desc(replayTraces.createdAt)).limit(80),
    db.select().from(decisionEvidence).where(eq(decisionEvidence.tenantId, tenantId)).orderBy(desc(decisionEvidence.createdAt)).limit(80),
    db.select().from(investigationCases).where(eq(investigationCases.tenantId, tenantId)).orderBy(desc(investigationCases.updatedAt)).limit(80),
  ]);
  const simulatedSource = safelyParse(revision.sourceJson) as { simulatedDisposition?: "allowed" | "held" | "rejected" } | null;
  const decisionIds = Array.from(new Set(traces.map(trace => trace.decisionId)));
  const cohort = decisionIds.map(decisionId => {
    const decisionTraces = traces.filter(trace => trace.decisionId === decisionId);
    const baseline = decisionTraces.find(trace => trace.replayStatus === "matched") ?? decisionTraces[decisionTraces.length - 1];
    const candidate = decisionTraces.find(trace => trace.replayStatus === "diverged") ?? decisionTraces[0] ?? baseline;
    return {
      decisionId,
      baselineDisposition: baseline?.disposition ?? "held",
      candidateDisposition: simulatedSource?.simulatedDisposition ?? candidate?.disposition ?? baseline?.disposition ?? "held",
      baselineReplayStatus: baseline?.replayStatus ?? "not_run",
      candidateReplayStatus: candidate?.replayStatus ?? "not_run",
      evidenceBound: evidence.some(item => item.decisionId === decisionId),
      openInvestigation: cases.some(item => item.decisionId === decisionId && item.status === "open"),
    };
  });
  const simulation = retainedCohortSimulation(cohort);
  const reportId = `simulation_${nanoid(16)}`;
  const basePolicyVersion = traces.find(trace => trace.replayStatus === "matched")?.policyVersion ?? "retained-baseline-unavailable";
  await db.insert(policySimulationReports).values({ id: reportId, tenantId, policyRevisionId: revisionId, cohortLabel: "Retained tenant replay cohort", cohortDefinitionJson: JSON.stringify({ decisionIds, source: "retained_replay_traces", liveExecution: false, pilotOnly: true }), basePolicyVersion, resultState: simulation.resultState, objectiveJson: JSON.stringify(simulation.objective), feasibilityJson: JSON.stringify(simulation.feasibility), resultsJson: JSON.stringify(simulation.cases), createdByUserId: userId });
  await db.update(policyRevisions).set({ simulationState: simulation.resultState === "completed" ? "completed" : "infeasible" }).where(and(eq(policyRevisions.tenantId, tenantId), eq(policyRevisions.id, revisionId)));
  await recordPolicyRevisionActivity(db, { tenantId, policyId: revision.policyId, policyRevisionId: revisionId, activityKind: "simulation_recorded", summary: `Retained-cohort simulation ${simulation.resultState}; no live policy or rollout state changed.`, detail: { reportId, objective: simulation.objective, feasibility: simulation.feasibility, pilotOnly: true }, actorUserId: userId });
  await db.insert(evidenceGraphEdges).values({ id: `graph_edge_${nanoid(16)}`, tenantId, sourceType: "policy_revision", sourceId: revisionId, edgeType: "simulated_by", targetType: "simulation_report", targetId: reportId, provenanceJson: JSON.stringify({ source: "policy_simulation_report", createdByUserId: userId, pilotOnly: true }) }).onDuplicateKeyUpdate({ set: { provenanceJson: JSON.stringify({ source: "policy_simulation_report", createdByUserId: userId, pilotOnly: true }) } });
  return { id: reportId, revisionId, ...simulation, pilotOnly: true };
}

export async function evidenceGraph(userId: number, tenantId: string, decisionId?: string) {
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  await ensurePilotArtifacts(userId, tenantId);
  await ensurePolicyStudioPilotArtifacts(userId, tenantId);
  const db = await dbOrThrow();
  const traceCondition = decisionId ? and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, decisionId)) : eq(replayTraces.tenantId, tenantId);
  const [traces, evidence, cases, activities, revisions, reports, storedEdges] = await Promise.all([
    db.select().from(replayTraces).where(traceCondition).orderBy(desc(replayTraces.createdAt)).limit(80),
    db.select().from(decisionEvidence).where(decisionId ? and(eq(decisionEvidence.tenantId, tenantId), eq(decisionEvidence.decisionId, decisionId)) : eq(decisionEvidence.tenantId, tenantId)).orderBy(desc(decisionEvidence.createdAt)).limit(80),
    db.select().from(investigationCases).where(decisionId ? and(eq(investigationCases.tenantId, tenantId), eq(investigationCases.decisionId, decisionId)) : eq(investigationCases.tenantId, tenantId)).orderBy(desc(investigationCases.updatedAt)).limit(80),
    db.select().from(investigationActivities).where(eq(investigationActivities.tenantId, tenantId)).orderBy(desc(investigationActivities.createdAt)).limit(200),
    db.select().from(policyRevisions).where(eq(policyRevisions.tenantId, tenantId)).orderBy(desc(policyRevisions.updatedAt)).limit(80),
    db.select().from(policySimulationReports).where(eq(policySimulationReports.tenantId, tenantId)).orderBy(desc(policySimulationReports.createdAt)).limit(40),
    db.select().from(evidenceGraphEdges).where(eq(evidenceGraphEdges.tenantId, tenantId)).orderBy(desc(evidenceGraphEdges.createdAt)).limit(200),
  ]);
  const nodes = new Map<string, { id: string; type: string; label: string; detail: string }>();
  const edges: Array<{ id: string; source: string; target: string; type: string; provenance: string }> = [];
  const addNode = (id: string, type: string, label: string, detail: string) => nodes.set(id, { id, type, label, detail });
  const addEdge = (source: string, target: string, type: string, provenance: string) => edges.push({ id: `${source}:${type}:${target}`, source, target, type, provenance });
  for (const trace of traces) {
    const decisionNode = `decision:${trace.decisionId}`;
    const traceNode = `replay_trace:${trace.id}`;
    const policyNode = `policy_revision:version:${trace.policyVersion}`;
    addNode(decisionNode, "decision", trace.decisionId, "Retained decision episode");
    addNode(traceNode, "replay_trace", trace.id, `${trace.stateVersion} · ${trace.disposition} · ${trace.replayStatus}`);
    addNode(policyNode, "policy_revision", trace.policyVersion, "Policy version referenced by retained replay");
    addEdge(decisionNode, policyNode, "evaluated_by_policy", "replay trace policyVersion");
    addEdge(decisionNode, traceNode, "replayed_as", "retained replay trace");
  }
  for (const item of evidence) {
    const decisionNode = `decision:${item.decisionId}`;
    const evidenceNode = `evidence:${item.id}`;
    addNode(decisionNode, "decision", item.decisionId, "Retained decision episode");
    addNode(evidenceNode, "evidence", item.id, `${item.disposition} · audit ${item.auditStatus}`);
    addEdge(decisionNode, evidenceNode, "used_evidence", "decision evidence record");
  }
  for (const investigationCase of cases) {
    const decisionNode = `decision:${investigationCase.decisionId}`;
    const caseNode = `investigation_case:${investigationCase.id}`;
    addNode(decisionNode, "decision", investigationCase.decisionId, "Retained decision episode");
    addNode(caseNode, "investigation_case", investigationCase.id, investigationCase.summary);
    addEdge(decisionNode, caseNode, "opened_investigation", "tenant-scoped investigation record");
    if (investigationCase.status !== "open") {
      const outcomeNode = `outcome:${investigationCase.id}:${investigationCase.status}`;
      addNode(outcomeNode, "outcome", investigationCase.status.replace(/_/g, " "), "Recorded case outcome");
      addEdge(caseNode, outcomeNode, "resolved_by_outcome", "investigation case status");
    }
    for (const activity of activities.filter(item => item.caseId === investigationCase.id)) {
      const activityNode = `audit_activity:${activity.id}`;
      addNode(activityNode, "audit_activity", activity.activityKind.replace(/_/g, " "), activity.summary);
      addEdge(caseNode, activityNode, "recorded_in_audit", "immutable investigation activity");
    }
  }
  for (const revision of revisions) addNode(`policy_revision:${revision.id}`, "policy_revision", revision.semanticVersion, `${revision.lifecycleState} · ${revision.summary}`);
  for (const report of reports) {
    const reportNode = `simulation_report:${report.id}`;
    addNode(reportNode, "simulation_report", report.cohortLabel, `${report.resultState} retained-cohort simulation`);
    addEdge(`policy_revision:${report.policyRevisionId}`, reportNode, "simulated_by", "stored simulation report");
  }
  for (const stored of storedEdges) {
    const source = `${stored.sourceType}:${stored.sourceId}`;
    const target = `${stored.targetType}:${stored.targetId}`;
    if (!nodes.has(source)) addNode(source, stored.sourceType, stored.sourceId, "Stored provenance reference");
    if (!nodes.has(target)) addNode(target, stored.targetType, stored.targetId, "Stored provenance reference");
    addEdge(source, target, stored.edgeType, "persisted provenance edge");
  }
  return { nodes: Array.from(nodes.values()), edges: edges.filter((edge, index, list) => list.findIndex(candidate => candidate.id === edge.id) === index), boundaries: ["The graph is a read model over tenant-scoped retained records.", "Every edge identifies a source record or stored provenance reference.", "Graph exploration does not edit relationships, execute policy, publish a revision, or traverse tenants."], pilotOnly: true };
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
