import { describe, expect, it } from "vitest";
import { filterAndSortLifecycleQueue } from "./investigationQueuePolicy";

const rows = [
  { id: "case-a", status: "open", updatedAt: new Date("2026-08-26T10:00:00.000Z"), searchText: "dec_a sanctions replay", latestAssignment: { assignedRole: "compliance_operator", assignedToUserId: 7, dueAt: new Date("2026-08-27T09:00:00.000Z"), serviceLevelTargetAt: new Date("2026-08-26T12:00:00.000Z") }, activeEscalations: [{ priority: "standard" as const }], serviceLevel: { state: "on_track" as const } },
  { id: "case-b", status: "rollback_required", updatedAt: new Date("2026-08-26T09:00:00.000Z"), searchText: "dec_b replay conflict", latestAssignment: { assignedRole: "platform_operator", assignedToUserId: null, dueAt: new Date("2026-08-26T11:00:00.000Z"), serviceLevelTargetAt: new Date("2026-08-26T10:30:00.000Z") }, activeEscalations: [{ priority: "critical" as const }], serviceLevel: { state: "due_soon" as const } },
  { id: "case-c", status: "explained", updatedAt: new Date("2026-08-26T08:00:00.000Z"), searchText: "dec_c resolved", latestAssignment: null, activeEscalations: [], serviceLevel: { state: "not_set" as const } },
];

describe("investigation queue policy", () => {
  it("filters by retained search terms, owner role, and service-level posture", () => {
    expect(filterAndSortLifecycleQueue(rows, { search: "conflict", assignedRole: "platform_operator", serviceLevelState: "due_soon" }).map(row => row.id)).toEqual(["case-b"]);
  });

  it("orders workload by due date or active escalation priority without mutating source rows", () => {
    expect(filterAndSortLifecycleQueue(rows, { sort: "due_asc" }).map(row => row.id)).toEqual(["case-b", "case-a", "case-c"]);
    expect(filterAndSortLifecycleQueue(rows, { sort: "priority_desc", escalationOnly: true }).map(row => row.id)).toEqual(["case-b", "case-a"]);
    expect(rows.map(row => row.id)).toEqual(["case-a", "case-b", "case-c"]);
  });
});
