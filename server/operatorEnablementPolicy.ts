export type TenantOperatorRole = "platform_operator" | "compliance_operator" | "customer_operator" | "developer" | "viewer";
export type CommentVisibility = "tenant_members" | "operator_team" | "platform_compliance";

export function commentVisibleToRole(visibility: CommentVisibility, role: TenantOperatorRole): boolean {
  if (visibility === "tenant_members") return true;
  if (visibility === "operator_team") return role !== "viewer";
  return role === "platform_operator" || role === "compliance_operator";
}

export function canCreateCommentWithVisibility(role: TenantOperatorRole, visibility: CommentVisibility): boolean {
  if (visibility === "tenant_members") return role !== "viewer";
  if (visibility === "operator_team") return role !== "viewer";
  return role === "platform_operator" || role === "compliance_operator";
}

export function canRedactComment(role: TenantOperatorRole): boolean {
  return role === "platform_operator" || role === "compliance_operator";
}

export function teamViewVisibleToRole(allowedRoles: TenantOperatorRole[], role: TenantOperatorRole): boolean {
  return allowedRoles.includes(role);
}

export function teamViewVisibleToTenantMember(input: {
  viewTenantId: string;
  memberTenantId: string;
  allowedRoles: TenantOperatorRole[];
  memberRole: TenantOperatorRole;
}): boolean {
  return input.viewTenantId === input.memberTenantId && teamViewVisibleToRole(input.allowedRoles, input.memberRole);
}

export function reminderEvaluationHour(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())).toISOString();
}

export function shouldCreateAssignedInvestigatorReminder(input: { assignedToUserId: number | null; dueAt: Date | null; serviceLevelState: "not_set" | "on_track" | "due_soon" | "overdue" }): boolean {
  return input.assignedToUserId !== null && input.dueAt !== null && (input.serviceLevelState === "due_soon" || input.serviceLevelState === "overdue");
}

export type ReminderStatus = "open" | "acknowledged" | "dismissed";
export type ReminderResolutionAction = "acknowledge" | "dismiss";

export function canResolveAssignedInvestigatorReminder(input: { recipientUserId: number; actorUserId: number }): boolean {
  return input.recipientUserId === input.actorUserId;
}

export function reminderResolutionTarget(status: ReminderStatus, action: ReminderResolutionAction): ReminderStatus | null {
  if (action === "acknowledge") return status === "open" ? "acknowledged" : null;
  return status === "open" || status === "acknowledged" ? "dismissed" : null;
}
