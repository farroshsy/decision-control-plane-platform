export const migrationPhases = [
  "planned",
  "expand",
  "dual_write",
  "backfill",
  "read_canary",
  "write_canary",
  "contract",
  "completed",
] as const;

export type MigrationPhase = (typeof migrationPhases)[number];

export type TenantMemberRole = "platform_operator" | "compliance_operator" | "customer_operator" | "developer" | "viewer";
export type NotificationRecipientRole = "platform_operator" | "compliance_operator" | "customer_operator";

export const nextPhase: Record<MigrationPhase, MigrationPhase | null> = {
  planned: "expand",
  expand: "dual_write",
  dual_write: "backfill",
  backfill: "read_canary",
  read_canary: "write_canary",
  write_canary: "contract",
  contract: "completed",
  completed: null,
};

export type CanaryGateInput = {
  currentPhase: MigrationPhase;
  ownerRegion: string;
  observedOwnerRegion: string;
  ownershipEpoch: number;
  observedOwnershipEpoch: number;
  rpoHeadroomSeconds: number;
  rpoTargetSeconds: number;
  canaryHealth: "healthy" | "warning" | "blocked";
  approvalState: "not_required" | "pending" | "approved" | "declined";
  auditLagMs: number;
};

export type CanaryGateResult = {
  allowed: boolean;
  next: MigrationPhase | null;
  reasons: string[];
};

export function evaluateCanaryGate(input: CanaryGateInput): CanaryGateResult {
  const next = nextPhase[input.currentPhase];
  const reasons: string[] = [];

  if (!next) reasons.push("Migration is already complete.");
  if (input.ownerRegion !== input.observedOwnerRegion) reasons.push("Current telemetry owner does not match rollout ownership.");
  if (input.ownershipEpoch !== input.observedOwnershipEpoch) reasons.push("Observed ownership epoch is stale or mismatched.");
  if (input.rpoHeadroomSeconds < input.rpoTargetSeconds) reasons.push("RPO headroom is below the tenant safety target.");
  if (input.canaryHealth !== "healthy") reasons.push("Canary health must be healthy before the rollout can advance.");
  if (input.auditLagMs > 1_000) reasons.push("Audit durability lag exceeds the 1 second canary boundary.");
  if (next === "write_canary" && input.approvalState !== "approved") reasons.push("Compliance approval is required before write canary.");
  if (input.approvalState === "declined") reasons.push("The rollout approval was declined.");

  return { allowed: reasons.length === 0, next, reasons };
}

export function requiresApproval(phase: MigrationPhase) {
  return nextPhase[phase] === "write_canary";
}

/** Platform operators may inspect a tenant's complete safety inbox; all other roles see only notices addressed to their operating role. */
export function canViewNotification(memberRole: TenantMemberRole, recipientRole: NotificationRecipientRole) {
  return memberRole === "platform_operator" || memberRole === recipientRole;
}

export function canAcknowledgeNotification(memberRole: TenantMemberRole, recipientRole: NotificationRecipientRole) {
  return canViewNotification(memberRole, recipientRole) && memberRole !== "developer" && memberRole !== "viewer";
}
