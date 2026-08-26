export type ServiceLevelState = "not_set" | "on_track" | "due_soon" | "overdue";

export const pilotAttachmentLimitBytes = 2_000_000;

export function serviceLevelTarget(minutes: number | undefined, from = new Date()) {
  if (!minutes || minutes <= 0) return null;
  return new Date(from.getTime() + minutes * 60_000);
}

export function serviceLevelPosture(targetAt: Date | null, now = new Date()): { state: ServiceLevelState; remainingMinutes: number | null } {
  if (!targetAt) return { state: "not_set", remainingMinutes: null };
  const remainingMinutes = Math.ceil((targetAt.getTime() - now.getTime()) / 60_000);
  if (remainingMinutes <= 0) return { state: "overdue", remainingMinutes };
  if (remainingMinutes <= 60) return { state: "due_soon", remainingMinutes };
  return { state: "on_track", remainingMinutes };
}

export function defaultEscalationTargetMinutes(priority: "standard" | "elevated" | "critical") {
  return priority === "critical" ? 60 : priority === "elevated" ? 240 : 1_440;
}

export function admitPilotAttachment(fileName: string, sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return { ok: false as const, reason: "Pilot attachments must be non-empty." };
  if (sizeBytes > pilotAttachmentLimitBytes) return { ok: false as const, reason: "Pilot attachments must be no larger than 2 MB." };
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "case-attachment";
  return { ok: true as const, safeName };
}
