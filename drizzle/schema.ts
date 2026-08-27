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

export const policyDefinitions = mysqlTable(
  "policyDefinitions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyKey: varchar("policyKey", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    domainAdapter: varchar("domainAdapter", { length: 120 }).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("policy_definitions_tenant_key_idx").on(table.tenantId, table.policyKey),
    index("policy_definitions_tenant_idx").on(table.tenantId, table.updatedAt),
  ]
);

export const policyRevisions = mysqlTable(
  "policyRevisions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyId: varchar("policyId", { length: 64 }).notNull(),
    parentRevisionId: varchar("parentRevisionId", { length: 64 }),
    revisionNumber: int("revisionNumber").notNull(),
    semanticVersion: varchar("semanticVersion", { length: 64 }).notNull(),
    summary: text("summary").notNull(),
    sourceJson: text("sourceJson").notNull(),
    sourceHash: varchar("sourceHash", { length: 128 }).notNull(),
    lifecycleState: mysqlEnum("lifecycleState", ["draft", "in_review", "approved", "published", "deprecated", "archived"]).default("draft").notNull(),
    simulationState: mysqlEnum("simulationState", ["not_run", "completed", "infeasible"]).default("not_run").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("policy_revisions_policy_number_idx").on(table.tenantId, table.policyId, table.revisionNumber),
    index("policy_revisions_tenant_state_idx").on(table.tenantId, table.lifecycleState, table.updatedAt),
    index("policy_revisions_policy_idx").on(table.tenantId, table.policyId, table.updatedAt),
  ]
);

export const policyRevisionReviews = mysqlTable(
  "policyRevisionReviews",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyRevisionId: varchar("policyRevisionId", { length: 64 }).notNull(),
    reviewerUserId: int("reviewerUserId").notNull(),
    decision: mysqlEnum("decision", ["approved", "changes_requested", "rejected"]).notNull(),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("policy_revision_reviews_revision_idx").on(table.tenantId, table.policyRevisionId, table.createdAt),
  ]
);

export const policyRevisionActivities = mysqlTable(
  "policyRevisionActivities",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyId: varchar("policyId", { length: 64 }).notNull(),
    policyRevisionId: varchar("policyRevisionId", { length: 64 }).notNull(),
    activityKind: mysqlEnum("activityKind", ["revision_created", "review_requested", "review_recorded", "revision_approved", "simulation_recorded"]).notNull(),
    summary: varchar("summary", { length: 280 }).notNull(),
    detailJson: text("detailJson").notNull(),
    actorUserId: int("actorUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("policy_revision_activities_revision_idx").on(table.tenantId, table.policyRevisionId, table.createdAt),
    index("policy_revision_activities_tenant_idx").on(table.tenantId, table.createdAt),
  ]
);

export const policySimulationReports = mysqlTable(
  "policySimulationReports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyRevisionId: varchar("policyRevisionId", { length: 64 }).notNull(),
    cohortLabel: varchar("cohortLabel", { length: 160 }).notNull(),
    cohortDefinitionJson: text("cohortDefinitionJson").notNull(),
    basePolicyVersion: varchar("basePolicyVersion", { length: 64 }).notNull(),
    resultState: mysqlEnum("resultState", ["completed", "infeasible"]).notNull(),
    objectiveJson: text("objectiveJson").notNull(),
    feasibilityJson: text("feasibilityJson").notNull(),
    resultsJson: text("resultsJson").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("policy_simulation_reports_revision_idx").on(table.tenantId, table.policyRevisionId, table.createdAt),
  ]
);

export const evidenceGraphEdges = mysqlTable(
  "evidenceGraphEdges",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    sourceType: mysqlEnum("sourceType", ["decision", "evidence", "policy_revision", "replay_trace", "investigation_case", "outcome", "audit_activity", "simulation_report"]).notNull(),
    sourceId: varchar("sourceId", { length: 96 }).notNull(),
    edgeType: mysqlEnum("edgeType", ["used_evidence", "evaluated_by_policy", "evaluated_against_state", "replayed_as", "opened_investigation", "resolved_by_outcome", "recorded_in_audit", "simulated_by"]).notNull(),
    targetType: mysqlEnum("targetType", ["decision", "evidence", "policy_revision", "replay_trace", "investigation_case", "outcome", "audit_activity", "simulation_report"]).notNull(),
    targetId: varchar("targetId", { length: 96 }).notNull(),
    provenanceJson: text("provenanceJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("evidence_graph_edge_unique_idx").on(table.tenantId, table.sourceType, table.sourceId, table.edgeType, table.targetType, table.targetId),
    index("evidence_graph_source_idx").on(table.tenantId, table.sourceType, table.sourceId),
    index("evidence_graph_target_idx").on(table.tenantId, table.targetType, table.targetId),
  ]
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

export const investigationCaseAssignments = mysqlTable(
  "investigationCaseAssignments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    assignedRole: mysqlEnum("assignedRole", ["platform_operator", "compliance_operator", "customer_operator", "developer", "viewer"]).notNull(),
    assignedToUserId: int("assignedToUserId"),
    assignedByUserId: int("assignedByUserId").notNull(),
    status: mysqlEnum("status", ["assigned", "accepted", "reassigned", "closed"]).default("assigned").notNull(),
    rationale: text("rationale").notNull(),
    dueAt: timestamp("dueAt"),
    serviceLevelTargetMinutes: int("serviceLevelTargetMinutes"),
    serviceLevelTargetAt: timestamp("serviceLevelTargetAt"),
    assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("case_assignments_tenant_idx").on(table.tenantId, table.updatedAt),
    index("case_assignments_case_idx").on(table.tenantId, table.caseId, table.updatedAt),
  ]
);

export const investigationEscalations = mysqlTable(
  "investigationEscalations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    queue: mysqlEnum("queue", ["compliance_review", "platform_safety", "customer_exception"]).notNull(),
    priority: mysqlEnum("priority", ["standard", "elevated", "critical"]).default("standard").notNull(),
    status: mysqlEnum("status", ["queued", "acknowledged", "resolved", "cancelled"]).default("queued").notNull(),
    reason: text("reason").notNull(),
    serviceLevelTargetMinutes: int("serviceLevelTargetMinutes"),
    serviceLevelTargetAt: timestamp("serviceLevelTargetAt"),
    createdByUserId: int("createdByUserId").notNull(),
    acknowledgedByUserId: int("acknowledgedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("investigation_escalations_tenant_idx").on(table.tenantId, table.updatedAt),
    index("investigation_escalations_queue_idx").on(table.tenantId, table.queue, table.status, table.updatedAt),
    index("investigation_escalations_case_idx").on(table.tenantId, table.caseId, table.updatedAt),
  ]
);

export const investigationComments = mysqlTable(
  "investigationComments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    body: text("body").notNull(),
    visibility: mysqlEnum("visibility", ["tenant_members", "operator_team", "platform_compliance"]).default("tenant_members").notNull(),
    redactionState: mysqlEnum("redactionState", ["active", "redacted"]).default("active").notNull(),
    redactionReason: text("redactionReason"),
    originalBodyHash: varchar("originalBodyHash", { length: 128 }),
    redactedByUserId: int("redactedByUserId"),
    redactedAt: timestamp("redactedAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("investigation_comments_case_idx").on(table.tenantId, table.caseId, table.createdAt),
  ]
);

export const investigationAttachments = mysqlTable(
  "investigationAttachments",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    fileName: varchar("fileName", { length: 240 }).notNull(),
    contentType: varchar("contentType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 640 }).notNull(),
    summary: varchar("summary", { length: 280 }),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("investigation_attachments_case_idx").on(table.tenantId, table.caseId, table.createdAt),
  ]
);

export const investigationActivities = mysqlTable(
  "investigationActivities",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    activityKind: mysqlEnum("activityKind", ["case_created", "outcome_recorded", "assignment_recorded", "escalation_queued", "escalation_acknowledged", "comment_added", "comment_redacted", "attachment_added", "team_view_created", "sla_reminder_recorded", "sla_reminder_acknowledged", "sla_reminder_dismissed"]).notNull(),
    summary: varchar("summary", { length: 280 }).notNull(),
    detailJson: text("detailJson").notNull(),
    actorUserId: int("actorUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("investigation_activities_case_idx").on(table.tenantId, table.caseId, table.createdAt),
    index("investigation_activities_tenant_idx").on(table.tenantId, table.createdAt),
  ]
);

export const investigationSavedViews = mysqlTable(
  "investigationSavedViews",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    filterJson: text("filterJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("investigation_saved_views_owner_name_idx").on(table.tenantId, table.ownerUserId, table.name),
    index("investigation_saved_views_tenant_owner_idx").on(table.tenantId, table.ownerUserId, table.updatedAt),
  ]
);

export const investigationTeamViews = mysqlTable(
  "investigationTeamViews",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    filterJson: text("filterJson").notNull(),
    allowedRolesJson: text("allowedRolesJson").notNull(),
    status: mysqlEnum("status", ["active", "retired"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("investigation_team_views_tenant_name_idx").on(table.tenantId, table.name),
    index("investigation_team_views_tenant_idx").on(table.tenantId, table.status, table.updatedAt),
  ]
);

export const investigationSlaReminderPolicies = mysqlTable(
  "investigationSlaReminderPolicies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    cadenceCron: varchar("cadenceCron", { length: 64 }).notNull(),
    recipientMode: mysqlEnum("recipientMode", ["assigned_investigator"]).default("assigned_investigator").notNull(),
    operationalOwnerRole: mysqlEnum("operationalOwnerRole", ["platform_operator"]).default("platform_operator").notNull(),
    status: mysqlEnum("status", ["draft", "active", "paused"]).default("draft").notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    lastEvaluatedAt: timestamp("lastEvaluatedAt"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("sla_reminder_policies_tenant_idx").on(table.tenantId, table.status, table.updatedAt),
    index("sla_reminder_policies_task_idx").on(table.scheduleCronTaskUid),
  ]
);

export const investigationSlaReminders = mysqlTable(
  "investigationSlaReminders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    policyId: varchar("policyId", { length: 64 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    assignmentId: varchar("assignmentId", { length: 64 }).notNull(),
    recipientUserId: int("recipientUserId").notNull(),
    serviceLevelState: mysqlEnum("serviceLevelState", ["on_track", "due_soon", "overdue"]).notNull(),
    dueAt: timestamp("dueAt").notNull(),
    evaluationHour: varchar("evaluationHour", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["open", "acknowledged", "dismissed"]).default("open").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt"),
    acknowledgedByUserId: int("acknowledgedByUserId"),
    dismissedAt: timestamp("dismissedAt"),
    dismissedByUserId: int("dismissedByUserId"),
    dismissalReason: varchar("dismissalReason", { length: 1_000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("sla_reminders_hourly_dedupe_idx").on(table.policyId, table.assignmentId, table.evaluationHour),
    index("sla_reminders_recipient_idx").on(table.tenantId, table.recipientUserId, table.status, table.createdAt),
    index("sla_reminders_case_idx").on(table.tenantId, table.caseId, table.createdAt),
  ]
);

export const evidenceRetentionPolicies = mysqlTable(
  "evidenceRetentionPolicies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    scope: mysqlEnum("scope", ["replay_investigation_package"]).default("replay_investigation_package").notNull(),
    retentionDays: int("retentionDays").notNull(),
    holdStatus: mysqlEnum("holdStatus", ["not_on_hold", "legal_hold"]).default("not_on_hold").notNull(),
    status: mysqlEnum("status", ["active", "superseded", "suspended"]).default("active").notNull(),
    summary: text("summary").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("evidence_retention_policies_tenant_idx").on(table.tenantId, table.status, table.updatedAt),
  ]
);

export const evidencePackageManifests = mysqlTable(
  "evidencePackageManifests",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    decisionId: varchar("decisionId", { length: 96 }).notNull(),
    caseId: varchar("caseId", { length: 64 }).notNull(),
    auditExportId: varchar("auditExportId", { length: 64 }).notNull(),
    retentionPolicyId: varchar("retentionPolicyId", { length: 64 }).notNull(),
    packageHash: varchar("packageHash", { length: 128 }).notNull(),
    signature: varchar("signature", { length: 256 }).notNull(),
    signatureAlgorithm: varchar("signatureAlgorithm", { length: 64 }).notNull(),
    canonicalization: varchar("canonicalization", { length: 64 }).notNull(),
    manifestJson: text("manifestJson").notNull(),
    retentionUntil: timestamp("retentionUntil").notNull(),
    status: mysqlEnum("status", ["active", "expired", "on_hold"]).default("active").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("evidence_package_manifests_tenant_idx").on(table.tenantId, table.createdAt),
    index("evidence_package_manifests_case_idx").on(table.tenantId, table.caseId, table.createdAt),
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
