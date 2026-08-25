export const phaseLabels: Record<string, string> = {
  planned: "Planned",
  expand: "Expand",
  dual_write: "Dual-write",
  backfill: "Backfill",
  read_canary: "Read canary",
  write_canary: "Write canary",
  contract: "Contract",
  completed: "Completed",
  rollback_required: "Rollback required",
  rolled_back: "Rolled back",
  paused: "Paused",
};

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

export function formatTimestamp(value: Date | string | number | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function gateTone(value: string) {
  if (["healthy", "normal", "active", "passed", "durable", "matched", "approved", "completed"].includes(value)) return "success";
  if (["blocked", "critical", "rollback_required", "rolled_back", "rejected", "declined", "diverged"].includes(value)) return "danger";
  if (["warning", "pending", "planned", "paused", "held"].includes(value)) return "warning";
  return "neutral";
}

