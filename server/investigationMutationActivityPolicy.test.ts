import { describe, expect, it } from "vitest";
import { assignmentActivity, attachmentActivity, commentActivity, escalationActivity } from "./investigationMutationActivityPolicy";

describe("investigation mutation activity contracts", () => {
  it("preserves accountable assignment evidence including due and service-level targets", () => {
    const result = assignmentActivity({ assignmentId: "assignment_1", assignedRole: "platform_operator", assignedToUserId: 7, dueAt: new Date("2026-08-27T09:30:00.000Z"), serviceLevelTargetAt: new Date("2026-08-26T09:30:00.000Z"), rationale: "Pilot ownership validation" });
    expect(result).toMatchObject({ activityKind: "assignment_recorded", summary: "Case assignment recorded for platform operator.", detail: { assignedToUserId: 7, dueAt: "2026-08-27T09:30:00.000Z" } });
  });

  it("preserves explicit manual escalation posture without autonomous dispatch", () => {
    const result = escalationActivity({ escalationId: "escalation_1", queue: "compliance_review", priority: "elevated", reason: "Separate review", serviceLevelTargetMinutes: 240, serviceLevelTargetAt: new Date("2026-08-26T12:00:00.000Z") });
    expect(result).toMatchObject({ activityKind: "escalation_queued", detail: { automaticDispatch: false, serviceLevelTargetMinutes: 240 } });
  });

  it("preserves governed comment evidence without copying a comment body into the shared activity payload", () => {
    expect(commentActivity({ commentId: "comment_1", visibility: "operator_team", contentHash: "sha256:abc" })).toEqual({ activityKind: "comment_added", summary: "Investigation comment retained.", detail: { commentId: "comment_1", visibility: "operator_team", contentHash: "sha256:abc" } });
    expect(attachmentActivity({ attachmentId: "attachment_1", fileName: "evidence.txt", contentType: "text/plain", sizeBytes: 42, summary: null })).toMatchObject({ activityKind: "attachment_added", summary: "Attachment retained: evidence.txt.", detail: { sizeBytes: 42 } });
  });
});
