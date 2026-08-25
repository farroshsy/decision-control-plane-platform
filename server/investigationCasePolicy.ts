export const investigationOutcomeStatuses = ["confirmed", "explained", "accepted", "rollback_required"] as const;
export type InvestigationOutcomeStatus = (typeof investigationOutcomeStatuses)[number];

export function outcomeRequiresSeparateAuthority(status: InvestigationOutcomeStatus) {
  return status === "rollback_required";
}

export function controlledRetryPlan(sourceAttemptCount: number) {
  return {
    nextAttemptCount: sourceAttemptCount + 1,
    payloadVersion: "pilot-v1" as const,
    resultStatus: "simulated_delivered" as const,
    externalRequestMade: false as const,
    deliveryGuarantee: "not_claimed" as const,
  };
}
