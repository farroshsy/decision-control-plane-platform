import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import * as store from "../controlPlaneStore";
import * as expansion from "../controlPlaneExpansionStore";

const tenantInput = z.object({ tenantId: z.string().min(3).max(64) });

export const controlPlaneRouter = router({
  tenants: router({
    list: protectedProcedure.query(({ ctx }) => store.listTenantsForUser(ctx.user.id)),
    bootstrapPilot: protectedProcedure.mutation(({ ctx }) => store.bootstrapPilotTenant(ctx.user.id)),
  }),
  workspace: protectedProcedure.input(tenantInput).query(({ ctx, input }) => store.workspaceForUser(ctx.user.id, input.tenantId)),
  operationalControlRoom: protectedProcedure.input(tenantInput).query(({ ctx, input }) => expansion.operationalControlRoom(ctx.user.id, input.tenantId)),
  replayExplorer: protectedProcedure
    .input(tenantInput.extend({ decisionId: z.string().min(3).max(96).optional(), baselineTraceId: z.string().min(3).max(64).optional(), candidateTraceId: z.string().min(3).max(64).optional() }))
    .query(({ ctx, input }) => expansion.replayExplorer(ctx.user.id, input.tenantId, input.decisionId, input.baselineTraceId, input.candidateTraceId)),
  versionComparison: protectedProcedure.input(tenantInput).query(({ ctx, input }) => expansion.versionComparison(ctx.user.id, input.tenantId)),
  integrations: protectedProcedure.input(tenantInput).query(({ ctx, input }) => expansion.integrationWorkspace(ctx.user.id, input.tenantId)),
  webhookDeliveryDiagnostics: protectedProcedure
    .input(tenantInput.extend({ search: z.string().max(180).optional(), endpointId: z.string().min(3).max(64).optional(), eventType: z.string().min(3).max(96).optional(), status: z.string().min(3).max(64).optional() }))
    .query(({ ctx, input }) => expansion.webhookDeliveryDiagnostics(ctx.user.id, input.tenantId, input)),
  migrationInvestigation: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3).max(64).optional() }))
    .query(({ ctx, input }) => expansion.migrationInvestigation(ctx.user.id, input.tenantId, input.rolloutId)),
  investigationCase: protectedProcedure
    .input(tenantInput.extend({ caseId: z.string().min(3).max(64).optional(), decisionId: z.string().min(3).max(96).optional(), rolloutId: z.string().min(3).max(64).optional() }))
    .query(({ ctx, input }) => expansion.investigationCaseDetail(ctx.user.id, input.tenantId, input)),
  recordReplayAssertion: protectedProcedure
    .input(tenantInput.extend({ decisionId: z.string().min(3).max(96), baselineTraceId: z.string().min(3).max(64), candidateTraceId: z.string().min(3).max(64), conclusion: z.enum(["equivalent", "not_equivalent", "needs_review"]), rationale: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.recordReplayAssertion(ctx.user.id, input.tenantId, input)),
  recordMigrationApprovalEvidence: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3).max(64), rationale: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.recordMigrationApprovalEvidence(ctx.user.id, input.tenantId, input)),
  recordRollbackRecommendation: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3).max(64), rationale: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.recordRollbackRecommendation(ctx.user.id, input.tenantId, input)),
  updateInvestigationOutcome: protectedProcedure
    .input(tenantInput.extend({ caseId: z.string().min(3).max(64), status: z.enum(["confirmed", "explained", "accepted", "rollback_required"]), rationale: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.updateInvestigationOutcome(ctx.user.id, input.tenantId, input)),
  exportReplayInvestigation: protectedProcedure
    .input(tenantInput.extend({ decisionId: z.string().min(3).max(96), baselineTraceId: z.string().min(3).max(64).optional(), candidateTraceId: z.string().min(3).max(64).optional() }))
    .mutation(({ ctx, input }) => expansion.exportReplayInvestigation(ctx.user.id, input.tenantId, input)),
  createPilotApiKey: protectedProcedure
    .input(tenantInput.extend({ label: z.string().min(3).max(120), scope: z.enum(["read_only", "replay_operator", "rollout_operator"]) }))
    .mutation(({ ctx, input }) => expansion.createPilotApiKey(ctx.user.id, input.tenantId, input.label, input.scope)),
  revokePilotApiKey: protectedProcedure
    .input(tenantInput.extend({ apiKeyId: z.string().min(3).max(64) }))
    .mutation(({ ctx, input }) => expansion.revokePilotApiKey(ctx.user.id, input.tenantId, input.apiKeyId)),
  simulateWebhookDelivery: protectedProcedure
    .input(tenantInput.extend({ endpointId: z.string().min(3).max(64), eventType: z.string().min(3).max(96) }))
    .mutation(({ ctx, input }) => expansion.simulateWebhookDelivery(ctx.user.id, input.tenantId, input.endpointId, input.eventType)),
  retrySimulatedWebhookDelivery: protectedProcedure
    .input(tenantInput.extend({ deliveryId: z.string().min(3).max(64), rationale: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.retrySimulatedWebhookDelivery(ctx.user.id, input.tenantId, input.deliveryId, input.rationale)),
  createPilotWebhookEndpoint: protectedProcedure
    .input(tenantInput.extend({ name: z.string().min(3).max(140), description: z.string().min(12).max(1_000), eventTypes: z.array(z.string().min(3).max(96)).min(1).max(12) }))
    .mutation(({ ctx, input }) => expansion.createPilotWebhookEndpoint(ctx.user.id, input.tenantId, input)),
  updatePilotWebhookEndpoint: protectedProcedure
    .input(tenantInput.extend({ endpointId: z.string().min(3).max(64), status: z.enum(["pilot_ready", "paused"]), name: z.string().min(3).max(140).optional(), eventTypes: z.array(z.string().min(3).max(96)).min(1).max(12).optional() }))
    .mutation(({ ctx, input }) => expansion.updatePilotWebhookEndpoint(ctx.user.id, input.tenantId, input.endpointId, input)),
  registerPilotExtension: protectedProcedure
    .input(tenantInput.extend({ name: z.string().min(3).max(140), extensionKind: z.enum(["policy_interpreter", "evidence_provider", "control_plane_extension"]), description: z.string().min(12).max(1_000) }))
    .mutation(({ ctx, input }) => expansion.registerPilotExtension(ctx.user.id, input.tenantId, input)),
  exportAuditTrail: protectedProcedure
    .input(tenantInput.extend({ format: z.enum(["json", "csv"]) }))
    .mutation(({ ctx, input }) => expansion.exportAuditTrail(ctx.user.id, input.tenantId, input.format)),
  mcp: router({
    tools: protectedProcedure.input(tenantInput).query(({ ctx, input }) => expansion.listMcpPilotTools(ctx.user.id, input.tenantId)),
    invoke: protectedProcedure
      .input(tenantInput.extend({ toolName: z.string().min(3).max(96), args: z.record(z.string(), z.unknown()) }))
      .mutation(({ ctx, input }) => expansion.executeMcpPilotTool(ctx.user.id, { tenantId: input.tenantId, toolName: input.toolName, args: input.args })),
  }),
  approveRollout: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3), rationale: z.string().min(6).max(1_000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await store.approveRollout(ctx.user.id, input.tenantId, input.rolloutId, input.rationale);
      await notifyOwner({ title: "Decision Control Plane approval recorded", content: `Tenant ${input.tenantId} approved rollout ${input.rolloutId}.` });
      return result;
    }),
  advanceRollout: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3), rationale: z.string().min(6).max(1_000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await store.advanceRollout(ctx.user.id, input.tenantId, input.rolloutId, input.rationale);
      } catch (error) {
        await notifyOwner({ title: "Decision Control Plane canary gate blocked", content: `Tenant ${input.tenantId}: ${error instanceof Error ? error.message : "Unknown canary gate failure"}` });
        throw error;
      }
    }),
  rollbackRollout: protectedProcedure
    .input(tenantInput.extend({ rolloutId: z.string().min(3), rationale: z.string().min(6).max(1_000) }))
    .mutation(async ({ ctx, input }) => {
      const result = await store.rollbackRollout(ctx.user.id, input.tenantId, input.rolloutId, input.rationale);
      await notifyOwner({ title: "Decision Control Plane rollout rolled back", content: `Tenant ${input.tenantId}: ${input.rationale}` });
      return result;
    }),
  acknowledgeNotification: protectedProcedure
    .input(tenantInput.extend({ notificationId: z.string().min(3) }))
    .mutation(({ ctx, input }) => store.acknowledgeNotification(ctx.user.id, input.tenantId, input.notificationId)),
  verifyReplay: protectedProcedure
    .input(tenantInput.extend({ decisionId: z.string().min(3), rationale: z.string().min(6).max(1_000) }))
    .mutation(({ ctx, input }) => store.verifyReplay(ctx.user.id, input.tenantId, input.decisionId, input.rationale)),
});
