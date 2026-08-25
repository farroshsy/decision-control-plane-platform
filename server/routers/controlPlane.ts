import { z } from "zod";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import * as store from "../controlPlaneStore";

const tenantInput = z.object({ tenantId: z.string().min(3).max(64) });

export const controlPlaneRouter = router({
  tenants: router({
    list: protectedProcedure.query(({ ctx }) => store.listTenantsForUser(ctx.user.id)),
    bootstrapPilot: protectedProcedure.mutation(({ ctx }) => store.bootstrapPilotTenant(ctx.user.id)),
  }),
  workspace: protectedProcedure.input(tenantInput).query(({ ctx, input }) => store.workspaceForUser(ctx.user.id, input.tenantId)),
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

