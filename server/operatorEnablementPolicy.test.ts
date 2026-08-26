import { describe, expect, it } from "vitest";
import { canCreateCommentWithVisibility, canRedactComment, canResolveAssignedInvestigatorReminder, commentVisibleToRole, reminderEvaluationHour, reminderResolutionTarget, shouldCreateAssignedInvestigatorReminder, teamViewVisibleToRole, teamViewVisibleToTenantMember } from "./operatorEnablementPolicy";

describe("operator enablement collaboration policy", () => {
  it("enforces role-visible comment scopes and controlled redaction authority", () => {
    expect(commentVisibleToRole("tenant_members", "viewer")).toBe(true);
    expect(commentVisibleToRole("operator_team", "viewer")).toBe(false);
    expect(commentVisibleToRole("platform_compliance", "customer_operator")).toBe(false);
    expect(canCreateCommentWithVisibility("customer_operator", "platform_compliance")).toBe(false);
    expect(canRedactComment("compliance_operator")).toBe(true);
    expect(canRedactComment("developer")).toBe(false);
  });

  it("enforces an explicit team-view access policy", () => {
    expect(teamViewVisibleToRole(["platform_operator", "compliance_operator"], "compliance_operator")).toBe(true);
    expect(teamViewVisibleToRole(["platform_operator", "compliance_operator"], "customer_operator")).toBe(false);
  });

  it("enforces shared-queue policy separately for a second tenant member and never crosses tenant scope", () => {
    const sharedQueue = { viewTenantId: "tenant_alpha", allowedRoles: ["platform_operator", "compliance_operator"] as const };
    const firstTenantMember = { memberTenantId: "tenant_alpha", memberRole: "platform_operator" as const };
    const secondTenantMember = { memberTenantId: "tenant_alpha", memberRole: "customer_operator" as const };
    const crossTenantComplianceMember = { memberTenantId: "tenant_bravo", memberRole: "compliance_operator" as const };

    expect(teamViewVisibleToTenantMember({ ...sharedQueue, ...firstTenantMember })).toBe(true);
    expect(teamViewVisibleToTenantMember({ ...sharedQueue, ...secondTenantMember })).toBe(false);
    expect(teamViewVisibleToTenantMember({ ...sharedQueue, ...crossTenantComplianceMember })).toBe(false);
  });

  it("creates hourly in-app reminder work only for named assignees whose targets require attention", () => {
    expect(reminderEvaluationHour(new Date("2026-08-26T08:47:00.000Z"))).toBe("2026-08-26T08:00:00.000Z");
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: 9, dueAt: new Date(), serviceLevelState: "due_soon" })).toBe(true);
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: null, dueAt: new Date(), serviceLevelState: "overdue" })).toBe(false);
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: 9, dueAt: new Date(), serviceLevelState: "on_track" })).toBe(false);
  });

  it("allows only the named investigator to resolve a reminder and preserves terminal dismissal", () => {
    expect(canResolveAssignedInvestigatorReminder({ recipientUserId: 17, actorUserId: 17 })).toBe(true);
    expect(canResolveAssignedInvestigatorReminder({ recipientUserId: 17, actorUserId: 18 })).toBe(false);
    expect(reminderResolutionTarget("open", "acknowledge")).toBe("acknowledged");
    expect(reminderResolutionTarget("acknowledged", "dismiss")).toBe("dismissed");
    expect(reminderResolutionTarget("dismissed", "acknowledge")).toBeNull();
  });
});
