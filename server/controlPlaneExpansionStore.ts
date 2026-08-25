import { createHash, randomBytes } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  auditExports,
  decisionEvidence,
  integrationApiKeys,
  integrationDeliveries,
  integrationEndpoints,
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
  if (alreadySeeded) return;

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

export async function replayExplorer(userId: number, tenantId: string, decisionId?: string) {
  await ensurePilotArtifacts(userId, tenantId);
  await assertTenantRole(userId, tenantId, ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]);
  const db = await dbOrThrow();
  const conditions = decisionId
    ? and(eq(replayTraces.tenantId, tenantId), eq(replayTraces.decisionId, decisionId))
    : eq(replayTraces.tenantId, tenantId);
  const traces = await db.select().from(replayTraces).where(conditions).orderBy(desc(replayTraces.createdAt)).limit(50);
  const normalized = traces.map(trace => ({ ...trace, parsedTrace: safelyParse(trace.traceJson) }));
  const comparison = normalized.length >= 2
    ? compareTracePair(normalized[normalized.length - 1], normalized[0])
    : null;
  return { traces: normalized, comparison, pilotOnly: true };
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
  const [endpoints, deliveries, apiKeys, toolCalls, exports] = await Promise.all([
    db.select().from(integrationEndpoints).where(eq(integrationEndpoints.tenantId, tenantId)).orderBy(desc(integrationEndpoints.updatedAt)).limit(20),
    db.select().from(integrationDeliveries).where(eq(integrationDeliveries.tenantId, tenantId)).orderBy(desc(integrationDeliveries.createdAt)).limit(30),
    db.select().from(integrationApiKeys).where(eq(integrationApiKeys.tenantId, tenantId)).orderBy(desc(integrationApiKeys.createdAt)).limit(20),
    db.select().from(mcpToolCalls).where(eq(mcpToolCalls.tenantId, tenantId)).orderBy(desc(mcpToolCalls.createdAt)).limit(30),
    db.select().from(auditExports).where(eq(auditExports.tenantId, tenantId)).orderBy(desc(auditExports.createdAt)).limit(20),
  ]);
  return { endpoints, deliveries, apiKeys: apiKeys.map(redactKey), toolCalls, exports, mcp: { endpoint: "/api/mcp", transport: "JSON-RPC request/response", pilotOnly: true, tools: pilotMcpTools } };
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
    else if (input.toolName === "replay.verify") {
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

function compareTracePair(baseline: { parsedTrace: Record<string, any>; stateVersion: string; policyVersion: string; disposition: string }, candidate: { parsedTrace: Record<string, any>; stateVersion: string; policyVersion: string; disposition: string }) {
  const baselineNotes = Array.isArray(baseline.parsedTrace.semanticNotes) ? baseline.parsedTrace.semanticNotes : [];
  const candidateNotes = Array.isArray(candidate.parsedTrace.semanticNotes) ? candidate.parsedTrace.semanticNotes : [];
  return {
    baseline: { stateVersion: baseline.stateVersion, policyVersion: baseline.policyVersion, disposition: baseline.disposition },
    candidate: { stateVersion: candidate.stateVersion, policyVersion: candidate.policyVersion, disposition: candidate.disposition },
    dispositionChanged: baseline.disposition !== candidate.disposition,
    semanticDifferences: candidateNotes.filter((note: string) => !baselineNotes.includes(note)),
  };
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
