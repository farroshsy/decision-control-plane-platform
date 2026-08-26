import { describe, expect, it } from "vitest";
import { canCreateCommentWithVisibility, canRedactComment, commentVisibleToRole, reminderEvaluationHour, shouldCreateAssignedInvestigatorReminder, teamViewVisibleToRole } from "./operatorEnablementPolicy";

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

  it("creates hourly in-app reminder work only for named assignees whose targets require attention", () => {
    expect(reminderEvaluationHour(new Date("2026-08-26T08:47:00.000Z"))).toBe("2026-08-26T08:00:00.000Z");
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: 9, dueAt: new Date(), serviceLevelState: "due_soon" })).toBe(true);
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: null, dueAt: new Date(), serviceLevelState: "overdue" })).toBe(false);
    expect(shouldCreateAssignedInvestigatorReminder({ assignedToUserId: 9, dueAt: new Date(), serviceLevelState: "on_track" })).toBe(false);
  });
});
