import { describe, expect, it } from "vitest";
import { canAcknowledgeNotification, canViewNotification, evaluateCanaryGate } from "./controlPlaneSafety";
import { canRolePerformControlPlaneOperation, notificationScopeForRole } from "./controlPlaneStore";

const base = {
  currentPhase: "dual_write" as const,
  ownerRegion: "us-east-1",
  observedOwnerRegion: "us-east-1",
  ownershipEpoch: 48,
  observedOwnershipEpoch: 48,
  rpoHeadroomSeconds: 60,
  rpoTargetSeconds: 30,
  canaryHealth: "healthy" as const,
  approvalState: "pending" as const,
  auditLagMs: 42,
};

describe("Decision Control Plane canary safety", () => {
  it("allows a healthy owned tenant with sufficient RPO headroom", () => {
    expect(evaluateCanaryGate(base)).toMatchObject({ allowed: true, next: "backfill", reasons: [] });
  });

  it("blocks stale ownership epochs", () => {
    const result = evaluateCanaryGate({ ...base, observedOwnershipEpoch: 47 });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("epoch");
  });

  it("blocks writes when the tenant RPO safety target is missed", () => {
    const result = evaluateCanaryGate({ ...base, rpoHeadroomSeconds: 29 });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("RPO");
  });

  it("requires approval before write canary", () => {
    const result = evaluateCanaryGate({ ...base, currentPhase: "read_canary" });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Compliance approval");
  });

  it("blocks unhealthy canaries and slow audit durability", () => {
    const result = evaluateCanaryGate({ ...base, canaryHealth: "blocked", auditLagMs: 1500 });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("Canary health");
    expect(result.reasons.join(" ")).toContain("Audit durability");
  });

  it("keeps tenant notifications within their recipient-role boundary", () => {
    expect(canViewNotification("platform_operator", "customer_operator")).toBe(true);
    expect(canViewNotification("compliance_operator", "compliance_operator")).toBe(true);
    expect(canViewNotification("customer_operator", "compliance_operator")).toBe(false);
    expect(canViewNotification("developer", "platform_operator")).toBe(false);
    expect(canAcknowledgeNotification("customer_operator", "customer_operator")).toBe(true);
  });

  it("derives the workspace notification query scope from the tenant membership role", () => {
    expect(notificationScopeForRole("platform_operator")).toEqual({ mode: "all" });
    expect(notificationScopeForRole("compliance_operator")).toEqual({ mode: "recipient", recipientRole: "compliance_operator" });
    expect(notificationScopeForRole("customer_operator")).toEqual({ mode: "recipient", recipientRole: "customer_operator" });
    expect(notificationScopeForRole("developer")).toEqual({ mode: "none" });
    expect(notificationScopeForRole("viewer")).toEqual({ mode: "none" });
  });

  it("limits control-plane mutations to their declared tenant roles", () => {
    expect(canRolePerformControlPlaneOperation("compliance_operator", "approve")).toBe(true);
    expect(canRolePerformControlPlaneOperation("customer_operator", "approve")).toBe(false);
    expect(canRolePerformControlPlaneOperation("platform_operator", "advance")).toBe(true);
    expect(canRolePerformControlPlaneOperation("compliance_operator", "advance")).toBe(false);
    expect(canRolePerformControlPlaneOperation("developer", "replayVerify")).toBe(true);
    expect(canRolePerformControlPlaneOperation("viewer", "replayVerify")).toBe(false);
  });
});
