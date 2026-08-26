type AssignmentActivityInput = {
  assignmentId: string;
  assignedRole: string;
  assignedToUserId: number | null;
  dueAt: Date | null;
  serviceLevelTargetAt: Date | null;
  rationale: string;
};

export function assignmentActivity(input: AssignmentActivityInput) {
  return {
    activityKind: "assignment_recorded" as const,
    summary: `Case assignment recorded for ${input.assignedRole.replace(/_/g, " ")}.`,
    detail: { ...input, dueAt: input.dueAt?.toISOString() ?? null, serviceLevelTargetAt: input.serviceLevelTargetAt?.toISOString() ?? null },
  };
}

export function escalationActivity(input: { escalationId: string; queue: string; priority: string; reason: string; serviceLevelTargetMinutes: number; serviceLevelTargetAt: Date | null }) {
  return {
    activityKind: "escalation_queued" as const,
    summary: `Case escalated to ${input.queue.replace(/_/g, " ")} at ${input.priority} priority.`,
    detail: { ...input, serviceLevelTargetAt: input.serviceLevelTargetAt?.toISOString() ?? null, automaticDispatch: false },
  };
}

export function commentActivity(input: { commentId: string; body: string }) {
  return { activityKind: "comment_added" as const, summary: "Investigation comment retained.", detail: input };
}

export function attachmentActivity(input: { attachmentId: string; fileName: string; contentType: string; sizeBytes: number; summary: string | null }) {
  return { activityKind: "attachment_added" as const, summary: `Attachment retained: ${input.fileName}.`, detail: input };
}
