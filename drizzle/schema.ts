import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 96 }).notNull(),
    primaryRegion: varchar("primaryRegion", { length: 64 }).notNull(),
    residency: varchar("residency", { length: 64 }).default("global").notNull(),
    rpoTargetSeconds: int("rpoTargetSeconds").default(30).notNull(),
    status: mysqlEnum("status", ["active", "migration", "paused"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("tenants_slug_unique").on(table.slug)]
);

export const tenantMembers = mysqlTable(
  "tenantMembers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", [
      "platform_operator",
      "compliance_operator",
      "customer_operator",
      "developer",
      "viewer",
    ]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("tenant_member_unique").on(table.tenantId, table.userId),
    index("tenant_members_tenant_idx").on(table.tenantId),
  ]
);

export const stateManifests = mysqlTable(
  "stateManifests",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    schemaFamily: varchar("schemaFamily", { length: 128 }).notNull(),
    semanticVersion: varchar("semanticVersion", { length: 64 }).notNull(),
    policyEpoch: int("policyEpoch").notNull(),
    stateEpoch: int("stateEpoch").notNull(),
    compatibility: mysqlEnum("compatibility", ["compatible", "requires_dual_write", "breaking"]).notNull(),
    provenanceJson: text("provenanceJson").notNull(),
    contentHash: varchar("contentHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["active", "staged", "retired"]).default("staged").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("state_manifests_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const migrationRollouts = mysqlTable(
  "migrationRollouts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    schemaFrom: varchar("schemaFrom", { length: 64 }).notNull(),
    schemaTo: varchar("schemaTo", { length: 64 }).notNull(),
    ownerRegion: varchar("ownerRegion", { length: 64 }).notNull(),
    ownershipEpoch: int("ownershipEpoch").notNull(),
    phase: mysqlEnum("phase", [
      "planned",
      "expand",
      "dual_write",
      "backfill",
      "read_canary",
      "write_canary",
      "contract",
      "completed",
      "rollback_required",
      "rolled_back",
      "paused",
    ]).default("planned").notNull(),
    canaryPercent: int("canaryPercent").default(5).notNull(),
    canaryHealth: mysqlEnum("canaryHealth", ["healthy", "warning", "blocked"]).default("healthy").notNull(),
    approvalState: mysqlEnum("approvalState", ["not_required", "pending", "approved", "declined"]).default("pending").notNull(),
    rollbackReason: text("rollbackReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("migration_rollouts_tenant_idx").on(table.tenantId, table.updatedAt)]
);

export const migrationSteps = mysqlTable(
  "migrationSteps",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    rolloutId: varchar("rolloutId", { length: 64 }).notNull(),
    phase: varchar("phase", { length: 64 }).notNull(),
    region: varchar("region", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["queued", "running", "passed", "blocked", "rolled_back"]).notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    outcomeSummary: text("outcomeSummary").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  table => [index("migration_steps_rollout_idx").on(table.rolloutId, table.createdAt)]
);

export const telemetrySnapshots = mysqlTable(
  "telemetrySnapshots",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    region: varchar("region", { length: 64 }).notNull(),
    ownerRegion: varchar("ownerRegion", { length: 64 }).notNull(),
    ownershipEpoch: int("ownershipEpoch").notNull(),
    replicationLagMs: int("replicationLagMs").notNull(),
    rpoHeadroomSeconds: int("rpoHeadroomSeconds").notNull(),
    fencingRejections: int("fencingRejections").default(0).notNull(),
    admissionP99Ms: int("admissionP99Ms").notNull(),
    auditLagMs: int("auditLagMs").notNull(),
    canaryPassRate: int("canaryPassRate").notNull(),
    alertState: mysqlEnum("alertState", ["normal", "warning", "critical"]).default("normal").notNull(),
    recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  },
  table => [index("telemetry_snapshots_tenant_idx").on(table.tenantId, table.recordedAt)]
);

export const replayTraces = mysqlTable(
  "replayTraces",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    decisionId: varchar("decisionId", { length: 96 }).notNull(),
    manifestId: varchar("manifestId", { length: 64 }).notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
    stateVersion: varchar("stateVersion", { length: 64 }).notNull(),
    disposition: mysqlEnum("disposition", ["allowed", "held", "rejected"]).notNull(),
    replayStatus: mysqlEnum("replayStatus", ["matched", "diverged", "not_run"]).notNull(),
    traceHash: varchar("traceHash", { length: 128 }).notNull(),
    traceJson: text("traceJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("replay_traces_tenant_idx").on(table.tenantId, table.decisionId, table.createdAt)]
);

export const investigationRecords = mysqlTable(
  "investigationRecords",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    recordKind: mysqlEnum("recordKind", ["replay_assertion", "migration_approval", "rollback_recommendation"]).notNull(),
    decisionId: varchar("decisionId", { length: 96 }),
    rolloutId: varchar("rolloutId", { length: 64 }),
    status: mysqlEnum("status", ["asserted", "approved", "recommended", "acknowledged", "superseded"]).notNull(),
    summary: varchar("summary", { length: 280 }).notNull(),
    detailJson: text("detailJson").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("investigation_records_tenant_idx").on(table.tenantId, table.createdAt),
    index("investigation_records_decision_idx").on(table.tenantId, table.decisionId, table.createdAt),
    index("investigation_records_rollout_idx").on(table.tenantId, table.rolloutId, table.createdAt),
  ]
);

export const investigationCases = mysqlTable(
  "investigationCases",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    decisionId: varchar("decisionId", { length: 96 }).notNull(),
    rolloutId: varchar("rolloutId", { length: 64 }),
    status: mysqlEnum("status", ["open", "confirmed", "explained", "accepted", "rollback_required", "closed"]).default("open").notNull(),
    approvalState: mysqlEnum("approvalState", ["not_required", "pending", "approved", "declined"]).default("pending").notNull(),
    recommendedAction: varchar("recommendedAction", { length: 96 }).notNull(),
    summary: varchar("summary", { length: 280 }).notNull(),
    outcomeRationale: text("outcomeRationale"),
    createdByUserId: int("createdByUserId").notNull(),
    resolvedByUserId: int("resolvedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("investigation_cases_tenant_idx").on(table.tenantId, table.updatedAt),
    index("investigation_cases_decision_idx").on(table.tenantId, table.decisionId, table.updatedAt),
  ]
);

export const integrationApiKeys = mysqlTable(
  "integrationApiKeys",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    tokenPrefix: varchar("tokenPrefix", { length: 24 }).notNull(),
    secretHash: varchar("secretHash", { length: 128 }).notNull(),
    scope: mysqlEnum("scope", ["read_only", "replay_operator", "rollout_operator"]).default("read_only").notNull(),
    status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("integration_api_keys_hash_unique").on(table.secretHash),
    index("integration_api_keys_tenant_idx").on(table.tenantId, table.createdAt),
  ]
);

export const integrationEndpoints = mysqlTable(
  "integrationEndpoints",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 140 }).notNull(),
    kind: mysqlEnum("kind", ["webhook", "mcp", "sdk", "cli", "audit_export"]).notNull(),
    mode: mysqlEnum("mode", ["pilot_simulated", "session_authenticated", "api_key_authenticated"]).default("pilot_simulated").notNull(),
    status: mysqlEnum("status", ["draft", "pilot_ready", "paused"]).default("draft").notNull(),
    description: text("description").notNull(),
    configJson: text("configJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("integration_endpoints_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const integrationDeliveries = mysqlTable(
  "integrationDeliveries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    endpointId: varchar("endpointId", { length: 64 }).notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["queued", "simulated_delivered", "simulated_failed"]).default("queued").notNull(),
    attemptCount: int("attemptCount").default(0).notNull(),
    payloadPreview: text("payloadPreview").notNull(),
    resultSummary: text("resultSummary").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("integration_deliveries_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const integrationRetryAudits = mysqlTable(
  "integrationRetryAudits",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    endpointId: varchar("endpointId", { length: 64 }).notNull(),
    sourceDeliveryId: varchar("sourceDeliveryId", { length: 64 }).notNull(),
    resultDeliveryId: varchar("resultDeliveryId", { length: 64 }).notNull(),
    actionType: mysqlEnum("actionType", ["retry_simulation"]).notNull(),
    payloadVersion: varchar("payloadVersion", { length: 32 }).notNull(),
    resultStatus: mysqlEnum("resultStatus", ["simulated_delivered", "simulated_failed"]).notNull(),
    operatorUserId: int("operatorUserId").notNull(),
    detailJson: text("detailJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("integration_retry_audits_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const mcpToolCalls = mysqlTable(
  "mcpToolCalls",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    apiKeyId: varchar("apiKeyId", { length: 64 }),
    toolName: varchar("toolName", { length: 96 }).notNull(),
    inputJson: text("inputJson").notNull(),
    status: mysqlEnum("status", ["succeeded", "rejected", "simulated"]).notNull(),
    resultSummary: text("resultSummary").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("mcp_tool_calls_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const auditExports = mysqlTable(
  "auditExports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    format: mysqlEnum("format", ["json", "csv"]).notNull(),
    scope: varchar("scope", { length: 96 }).notNull(),
    status: mysqlEnum("status", ["prepared", "downloaded"]).default("prepared").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_exports_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const decisionEvidence = mysqlTable(
  "decisionEvidence",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    decisionId: varchar("decisionId", { length: 96 }).notNull(),
    manifestId: varchar("manifestId", { length: 64 }).notNull(),
    disposition: mysqlEnum("disposition", ["allowed", "held", "rejected"]).notNull(),
    replayStatus: mysqlEnum("replayStatus", ["matched", "diverged", "not_run"]).default("not_run").notNull(),
    auditStatus: mysqlEnum("auditStatus", ["durable", "pending"]).default("durable").notNull(),
    policyVersion: varchar("policyVersion", { length: 64 }).notNull(),
    stateVersion: varchar("stateVersion", { length: 64 }).notNull(),
    contentHash: varchar("contentHash", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("decision_evidence_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const operatorActions = mysqlTable(
  "operatorActions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    rolloutId: varchar("rolloutId", { length: 64 }),
    actorUserId: int("actorUserId").notNull(),
    actionType: mysqlEnum("actionType", ["approve", "advance", "hold", "rollback", "replay_verify", "fence_region"]).notNull(),
    status: mysqlEnum("status", ["requested", "applied", "rejected"]).notNull(),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("operator_actions_tenant_idx").on(table.tenantId, table.createdAt)]
);

export const tenantNotifications = mysqlTable(
  "tenantNotifications",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    category: mysqlEnum("category", ["canary_gate", "rpo_breach", "fencing", "approval_required"]).notNull(),
    severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
    recipientRole: mysqlEnum("recipientRole", ["platform_operator", "compliance_operator", "customer_operator"]).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    content: text("content").notNull(),
    status: mysqlEnum("status", ["open", "acknowledged"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("tenant_notifications_tenant_idx").on(table.tenantId, table.createdAt)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
