import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  decisionEvidence,
  migrationRollouts,
  migrationSteps,
  operatorActions,
  stateManifests,
  telemetrySnapshots,
  tenantMembers,
  tenantNotifications,
  tenants,
} from "../drizzle/schema";
import { getDb } from "./db";
import { canAcknowledgeNotification, canViewNotification, evaluateCanaryGate, type MigrationPhase, type NotificationRecipientRole, type TenantMemberRole } from "./controlPlaneSafety";

export const controlPlaneOperationRoles = {
  approve: ["platform_operator", "compliance_operator"],
  advance: ["platform_operator"],
  rollback: ["platform_operator", "compliance_operator"],
  acknowledge: ["platform_operator", "compliance_operator", "customer_operator"],
  replayVerify: ["platform_operator", "compliance_operator", "developer"],
} as const satisfies Record<string, readonly TenantMemberRole[]>;

export type ControlPlaneOperation = keyof typeof controlPlaneOperationRoles;

export function canRolePerformControlPlaneOperation(role: TenantMemberRole, operation: ControlPlaneOperation) {
  return (controlPlaneOperationRoles[operation] as readonly TenantMemberRole[]).includes(role);
}

export function notificationScopeForRole(role: TenantMemberRole):
  | { mode: "all" }
  | { mode: "recipient"; recipientRole: NotificationRecipientRole }
  | { mode: "none" } {
  if (role === "platform_operator") return { mode: "all" };
  if (role === "compliance_operator" || role === "customer_operator") return { mode: "recipient", recipientRole: role };
  return { mode: "none" };
}

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("The Decision Control Plane database is unavailable.");
  return db;
}

async function membershipFor(userId: number, tenantId: string) {
  const db = await dbOrThrow();
  const records = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
    .limit(1);
  return records[0];
}

export async function assertTenantRole(userId: number, tenantId: string, allowed: TenantMemberRole[]) {
  const membership = await membershipFor(userId, tenantId);
  if (!membership) throw new Error("Tenant access was not found for the current operator.");
  if (!allowed.includes(membership.role)) throw new Error("The current tenant role cannot perform this operation.");
  return membership;
}

export async function listTenantsForUser(userId: number) {
  const db = await dbOrThrow();
  const memberships = await db.select().from(tenantMembers).where(eq(tenantMembers.userId, userId));
  const rows = await Promise.all(
    memberships.map(async membership => {
      const tenant = (await db.select().from(tenants).where(eq(tenants.id, membership.tenantId)).limit(1))[0];
      return tenant ? { ...tenant, memberRole: membership.role } : null;
    })
  );
  return rows.filter(Boolean);
}

async function createNotification(input: {
  tenantId: string;
  category: "canary_gate" | "rpo_breach" | "fencing" | "approval_required";
  severity: "info" | "warning" | "critical";
  recipientRole: NotificationRecipientRole;
  title: string;
  content: string;
}) {
  const db = await dbOrThrow();
  await db.insert(tenantNotifications).values({ id: `ntf_${nanoid(16)}`, ...input });
}

export async function bootstrapPilotTenant(userId: number) {
  const db = await dbOrThrow();
  const existing = await listTenantsForUser(userId);
  if (existing.length > 0) return existing[0];

  const tenantId = `ten_${nanoid(14)}`;
  const manifestId = `man_${nanoid(14)}`;
  const rolloutId = `rol_${nanoid(14)}`;
  const now = new Date();

  await db.insert(tenants).values({
    id: tenantId,
    name: "Pilot Transaction Rail",
    slug: `pilot-${nanoid(6).toLowerCase()}`,
    primaryRegion: "us-east-1",
    residency: "US",
    rpoTargetSeconds: 30,
    status: "migration",
  });
  await db.insert(tenantMembers).values({ id: `mem_${nanoid(14)}`, tenantId, userId, role: "platform_operator" });
  await db.insert(stateManifests).values({
    id: manifestId,
    tenantId,
    label: "Financial Crime Screening State",
    schemaFamily: "decision-state.fincrime",
    semanticVersion: "2.1.0",
    policyEpoch: 27,
    stateEpoch: 48,
    compatibility: "requires_dual_write",
    provenanceJson: JSON.stringify({ source: "pilot-bootstrap", evidence: "replay verified", author: "Decision Control Plane" }),
    contentHash: "sha256:8c7c6b4ae21d7c1d7f0a2e4b3a5d9c06",
    status: "active",
  });
  await db.insert(migrationRollouts).values({
    id: rolloutId,
    tenantId,
    name: "Semantic state 2.1 canary",
    schemaFrom: "2.0.4",
    schemaTo: "2.1.0",
    ownerRegion: "us-east-1",
    ownershipEpoch: 48,
    phase: "dual_write",
    canaryPercent: 5,
    canaryHealth: "healthy",
    approvalState: "pending",
  });
  await db.insert(migrationSteps).values({
    id: `step_${nanoid(14)}`,
    tenantId,
    rolloutId,
    phase: "dual_write",
    region: "us-east-1",
    status: "passed",
    evidenceJson: JSON.stringify({ dualWriteMismatch: 0, replaySample: 128, contentHashMatched: true }),
    outcomeSummary: "Dual-write equivalence passed for the pilot canary cohort.",
    completedAt: now,
  });
  await db.insert(telemetrySnapshots).values({
    id: `tel_${nanoid(14)}`,
    tenantId,
    region: "us-east-1",
    ownerRegion: "us-east-1",
    ownershipEpoch: 48,
    replicationLagMs: 840,
    rpoHeadroomSeconds: 74,
    fencingRejections: 3,
    admissionP99Ms: 46,
    auditLagMs: 72,
    canaryPassRate: 100,
    alertState: "normal",
  });
  await db.insert(decisionEvidence).values({
    id: `evd_${nanoid(14)}`,
    tenantId,
    decisionId: "dec_pilot_001",
    manifestId,
    disposition: "held",
    replayStatus: "matched",
    auditStatus: "durable",
    policyVersion: "aml-policy@27",
    stateVersion: "2.1.0",
    contentHash: "sha256:0a91a4b2f29bc22c6e7e4e18c8d35a72",
  });
  await db.insert(operatorActions).values({
    id: `act_${nanoid(14)}`,
    tenantId,
    rolloutId,
    actorUserId: userId,
    actionType: "replay_verify",
    status: "applied",
    rationale: "Initial replay verification bound to the active manifest.",
  });
  await createNotification({
    tenantId,
    category: "approval_required",
    severity: "warning",
    recipientRole: "compliance_operator",
    title: "Write canary approval will be required",
    content: "The pilot rollout is healthy in dual-write mode. Compliance approval is required before write canary authority is granted.",
  });
  return (await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0];
}

export async function workspaceForUser(userId: number, tenantId: string) {
  const membership = await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const notificationScope = notificationScopeForRole(membership.role);
  const db = await dbOrThrow();
  const tenant = (await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0];
  if (!tenant) throw new Error("Tenant was not found.");
  const [manifests, rollouts, telemetry, evidence, actions, notifications, steps] = await Promise.all([
    db.select().from(stateManifests).where(eq(stateManifests.tenantId, tenantId)).orderBy(desc(stateManifests.createdAt)).limit(10),
    db.select().from(migrationRollouts).where(eq(migrationRollouts.tenantId, tenantId)).orderBy(desc(migrationRollouts.updatedAt)).limit(5),
    db.select().from(telemetrySnapshots).where(eq(telemetrySnapshots.tenantId, tenantId)).orderBy(desc(telemetrySnapshots.recordedAt)).limit(1),
    db.select().from(decisionEvidence).where(eq(decisionEvidence.tenantId, tenantId)).orderBy(desc(decisionEvidence.createdAt)).limit(10),
    db.select().from(operatorActions).where(eq(operatorActions.tenantId, tenantId)).orderBy(desc(operatorActions.createdAt)).limit(12),
    notificationScope.mode === "all"
      ? db.select().from(tenantNotifications).where(eq(tenantNotifications.tenantId, tenantId)).orderBy(desc(tenantNotifications.createdAt)).limit(10)
      : notificationScope.mode === "recipient"
        ? db.select().from(tenantNotifications).where(and(eq(tenantNotifications.tenantId, tenantId), eq(tenantNotifications.recipientRole, notificationScope.recipientRole))).orderBy(desc(tenantNotifications.createdAt)).limit(10)
        : Promise.resolve([]),
    db.select().from(migrationSteps).where(eq(migrationSteps.tenantId, tenantId)).orderBy(desc(migrationSteps.createdAt)).limit(12),
  ]);
  return { tenant, manifests, rollouts, telemetry: telemetry[0] ?? null, evidence, actions, notifications, steps };
}

export async function approveRollout(userId: number, tenantId: string, rolloutId: string, rationale: string) {
  await assertTenantRole(userId, tenantId, [...controlPlaneOperationRoles.approve]);
  const db = await dbOrThrow();
  const rollout = (await db.select().from(migrationRollouts).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId))).limit(1))[0];
  if (!rollout) throw new Error("The requested rollout was not found within this tenant.");
  await db.update(migrationRollouts).set({ approvalState: "approved" }).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId)));
  await db.insert(operatorActions).values({ id: `act_${nanoid(14)}`, tenantId, rolloutId, actorUserId: userId, actionType: "approve", status: "applied", rationale });
  return { ok: true as const };
}

export async function advanceRollout(userId: number, tenantId: string, rolloutId: string, rationale: string) {
  await assertTenantRole(userId, tenantId, [...controlPlaneOperationRoles.advance]);
  const db = await dbOrThrow();
  const rollout = (await db.select().from(migrationRollouts).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId))).limit(1))[0];
  const tenant = (await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1))[0];
  const telemetry = (await db.select().from(telemetrySnapshots).where(eq(telemetrySnapshots.tenantId, tenantId)).orderBy(desc(telemetrySnapshots.recordedAt)).limit(1))[0];
  if (!rollout || !tenant || !telemetry) throw new Error("Rollout telemetry or tenant context is unavailable.");
  if (["rollback_required", "rolled_back", "paused"].includes(rollout.phase)) throw new Error("A halted rollout must be resumed through an explicit operator process.");

  const gate = evaluateCanaryGate({
    currentPhase: rollout.phase as MigrationPhase,
    ownerRegion: rollout.ownerRegion,
    observedOwnerRegion: telemetry.ownerRegion,
    ownershipEpoch: rollout.ownershipEpoch,
    observedOwnershipEpoch: telemetry.ownershipEpoch,
    rpoHeadroomSeconds: telemetry.rpoHeadroomSeconds,
    rpoTargetSeconds: tenant.rpoTargetSeconds,
    canaryHealth: rollout.canaryHealth,
    approvalState: rollout.approvalState,
    auditLagMs: telemetry.auditLagMs,
  });

  if (!gate.allowed || !gate.next) {
    const category = gate.reasons.some(reason => reason.includes("RPO")) ? "rpo_breach" : gate.reasons.some(reason => reason.includes("ownership")) ? "fencing" : "canary_gate";
    await db.update(migrationRollouts).set({ phase: "rollback_required", canaryHealth: "blocked", rollbackReason: gate.reasons.join(" ") }).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId)));
    await db.insert(operatorActions).values({ id: `act_${nanoid(14)}`, tenantId, rolloutId, actorUserId: userId, actionType: "hold", status: "rejected", rationale: gate.reasons.join(" ") });
    await createNotification({ tenantId, category, severity: "critical", recipientRole: "platform_operator", title: "Canary gate blocked rollout", content: gate.reasons.join(" ") });
    throw new Error(`Canary gate blocked advancement: ${gate.reasons.join(" ")}`);
  }

  const nextCanary = gate.next === "read_canary" ? 10 : gate.next === "write_canary" ? 20 : gate.next === "contract" ? 100 : rollout.canaryPercent;
  await db.update(migrationRollouts).set({ phase: gate.next, canaryPercent: nextCanary }).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId)));
  await db.insert(migrationSteps).values({
    id: `step_${nanoid(14)}`,
    tenantId,
    rolloutId,
    phase: gate.next,
    region: rollout.ownerRegion,
    status: "passed",
    evidenceJson: JSON.stringify({ ownerRegion: telemetry.ownerRegion, ownershipEpoch: telemetry.ownershipEpoch, rpoHeadroomSeconds: telemetry.rpoHeadroomSeconds, admissionP99Ms: telemetry.admissionP99Ms, auditLagMs: telemetry.auditLagMs }),
    outcomeSummary: `Canary gate passed for ${gate.next}. ${rationale}`,
    completedAt: new Date(),
  });
  await db.insert(operatorActions).values({ id: `act_${nanoid(14)}`, tenantId, rolloutId, actorUserId: userId, actionType: "advance", status: "applied", rationale });
  return { ok: true as const, phase: gate.next };
}

export async function rollbackRollout(userId: number, tenantId: string, rolloutId: string, rationale: string) {
  await assertTenantRole(userId, tenantId, [...controlPlaneOperationRoles.rollback]);
  const db = await dbOrThrow();
  const rollout = (await db.select().from(migrationRollouts).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId))).limit(1))[0];
  if (!rollout) throw new Error("The requested rollout was not found within this tenant.");
  await db.update(migrationRollouts).set({ phase: "rolled_back", canaryHealth: "blocked", rollbackReason: rationale }).where(and(eq(migrationRollouts.id, rolloutId), eq(migrationRollouts.tenantId, tenantId)));
  await db.insert(operatorActions).values({ id: `act_${nanoid(14)}`, tenantId, rolloutId, actorUserId: userId, actionType: "rollback", status: "applied", rationale });
  await createNotification({ tenantId, category: "canary_gate", severity: "warning", recipientRole: "customer_operator", title: "Rollout rolled back", content: rationale });
  return { ok: true as const };
}

export async function acknowledgeNotification(userId: number, tenantId: string, notificationId: string) {
  const membership = await assertTenantRole(userId, tenantId, [...controlPlaneOperationRoles.acknowledge]);
  const db = await dbOrThrow();
  const notification = (await db.select().from(tenantNotifications).where(and(eq(tenantNotifications.id, notificationId), eq(tenantNotifications.tenantId, tenantId))).limit(1))[0];
  if (!notification) throw new Error("The tenant notification was not found.");
  if (!canAcknowledgeNotification(membership.role, notification.recipientRole)) throw new Error("The current tenant role cannot acknowledge this notification.");
  await db.update(tenantNotifications).set({ status: "acknowledged" }).where(and(eq(tenantNotifications.id, notificationId), eq(tenantNotifications.tenantId, tenantId)));
  return { ok: true as const };
}

export async function verifyReplay(userId: number, tenantId: string, decisionId: string, rationale: string) {
  await assertTenantRole(userId, tenantId, [...controlPlaneOperationRoles.replayVerify]);
  const db = await dbOrThrow();
  const evidence = (await db.select().from(decisionEvidence).where(and(eq(decisionEvidence.tenantId, tenantId), eq(decisionEvidence.decisionId, decisionId))).limit(1))[0];
  if (!evidence) throw new Error("The requested decision evidence was not found within this tenant.");
  await db.update(decisionEvidence).set({ replayStatus: "matched" }).where(and(eq(decisionEvidence.tenantId, tenantId), eq(decisionEvidence.decisionId, decisionId)));
  await db.insert(operatorActions).values({ id: `act_${nanoid(14)}`, tenantId, actorUserId: userId, actionType: "replay_verify", status: "applied", rationale });
  return { ok: true as const };
}
