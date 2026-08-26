import type { ServiceLevelState } from "./investigationLifecyclePolicy";

export type LifecycleQueueFilters = {
  search?: string;
  status?: string;
  assignedRole?: string;
  assignedToUserId?: number;
  serviceLevelState?: ServiceLevelState;
  escalationOnly?: boolean;
  sort?: "updated_desc" | "due_asc" | "service_level_asc" | "priority_desc" | "status_asc";
};

type QueueRow = {
  status: string;
  updatedAt: Date;
  searchText: string;
  latestAssignment: { assignedRole: string; assignedToUserId: number | null; dueAt: Date | null; serviceLevelTargetAt: Date | null } | null;
  activeEscalations: Array<{ priority: "standard" | "elevated" | "critical" }>;
  serviceLevel: { state: ServiceLevelState };
};

const priorityRank = (priority: "standard" | "elevated" | "critical") => ({ standard: 1, elevated: 2, critical: 3 })[priority];
const timestamp = (value: Date | null | undefined) => value ? value.getTime() : Number.MAX_SAFE_INTEGER;

export function filterAndSortLifecycleQueue<T extends QueueRow>(rows: T[], filters: LifecycleQueueFilters): T[] {
  const query = filters.search?.trim().toLowerCase();
  const filtered = rows.filter(row => {
    if (query && !row.searchText.toLowerCase().includes(query)) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.assignedRole && row.latestAssignment?.assignedRole !== filters.assignedRole) return false;
    if (filters.assignedToUserId && row.latestAssignment?.assignedToUserId !== filters.assignedToUserId) return false;
    if (filters.serviceLevelState && row.serviceLevel.state !== filters.serviceLevelState) return false;
    if (filters.escalationOnly && row.activeEscalations.length === 0) return false;
    return true;
  });
  return [...filtered].sort((left, right) => {
    if (filters.sort === "due_asc") return timestamp(left.latestAssignment?.dueAt) - timestamp(right.latestAssignment?.dueAt);
    if (filters.sort === "service_level_asc") return timestamp(left.latestAssignment?.serviceLevelTargetAt) - timestamp(right.latestAssignment?.serviceLevelTargetAt);
    if (filters.sort === "priority_desc") return Math.max(0, ...right.activeEscalations.map(item => priorityRank(item.priority))) - Math.max(0, ...left.activeEscalations.map(item => priorityRank(item.priority)));
    if (filters.sort === "status_asc") return left.status.localeCompare(right.status) || right.updatedAt.getTime() - left.updatedAt.getTime();
    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}
