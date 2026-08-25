import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decisionEvidence,
  migrationRollouts,
  migrationSteps,
  operatorActions,
  stateManifests,
  telemetrySnapshots,
  tenantMembers,
  tenantNotifications,
  tenants,
} from "../drizzle/schema";

const getDb = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({ getDb }));

import {
  acknowledgeNotification,
  advanceRollout,
  approveRollout,
  rollbackRollout,
  verifyReplay,
  workspaceForUser,
} from "./controlPlaneStore";

type Role = "platform_operator" | "compliance_operator" | "customer_operator" | "developer" | "viewer";

const state: { role: Role; membershipFound: boolean; notificationSelects: number } = {
  role: "platform_operator",
  membershipFound: true,
  notificationSelects: 0,
};

const allNotifications = [
  { id: "notice_compliance", recipientRole: "compliance_operator", title: "Approval required" },
  { id: "notice_customer", recipientRole: "customer_operator", title: "Rollout update" },
];

class SelectQuery {
  private table: unknown;

  from(table: unknown) {
    this.table = table;
    return this;
  }

  where() {
    return this;
  }

  orderBy() {
    return this;
  }

  limit() {
    if (this.table === tenantMembers) {
      return Promise.resolve(state.membershipFound ? [{ id: "member_1", tenantId: "tenant_alpha", userId: 7, role: state.role }] : []);
    }
    if (this.table === tenants) return Promise.resolve([{ id: "tenant_alpha", name: "Tenant Alpha", primaryRegion: "us-east-1", rpoTargetSeconds: 30 }]);
    if (this.table === telemetrySnapshots) return Promise.resolve([{ id: "telemetry_1", tenantId: "tenant_alpha", ownerRegion: "us-east-1", ownershipEpoch: 1, rpoHeadroomSeconds: 60, replicationLagMs: 5, fencingRejections: 0, admissionP99Ms: 20, auditLagMs: 20, canaryPassRate: 100, alertState: "normal" }]);
    if (this.table === tenantNotifications) {
      state.notificationSelects += 1;
      if (state.role === "platform_operator") return Promise.resolve(allNotifications);
      if (state.role === "compliance_operator") return Promise.resolve([allNotifications[0]]);
      if (state.role === "customer_operator") return Promise.resolve([allNotifications[1]]);
    }
    if ([stateManifests, migrationRollouts, migrationSteps, decisionEvidence, operatorActions].includes(this.table as never)) return Promise.resolve([]);
    return Promise.resolve([]);
  }
}

const fakeDb = { select: () => new SelectQuery() };

describe("Decision Control Plane store tenant boundaries", () => {
  beforeEach(() => {
    state.role = "platform_operator";
    state.membershipFound = true;
    state.notificationSelects = 0;
    getDb.mockResolvedValue(fakeDb);
  });

  it("returns only the role-visible notification subset through workspaceForUser", async () => {
    state.role = "platform_operator";
    await expect(workspaceForUser(7, "tenant_alpha")).resolves.toMatchObject({ notifications: allNotifications });

    state.role = "compliance_operator";
    await expect(workspaceForUser(7, "tenant_alpha")).resolves.toMatchObject({ notifications: [allNotifications[0]] });

    state.role = "customer_operator";
    await expect(workspaceForUser(7, "tenant_alpha")).resolves.toMatchObject({ notifications: [allNotifications[1]] });

    state.role = "developer";
    const developerWorkspace = await workspaceForUser(7, "tenant_alpha");
    expect(developerWorkspace.notifications).toEqual([]);
    expect(state.notificationSelects).toBe(3);
  });

  it("rejects cross-tenant workspace access before any tenant records are returned", async () => {
    state.membershipFound = false;
    await expect(workspaceForUser(7, "tenant_other")).rejects.toThrow("Tenant access was not found");
  });

  it("rejects each guarded control-plane mutation for an unauthorized tenant role", async () => {
    state.role = "customer_operator";
    await expect(approveRollout(7, "tenant_alpha", "rollout_1", "test")).rejects.toThrow("cannot perform");

    state.role = "compliance_operator";
    await expect(advanceRollout(7, "tenant_alpha", "rollout_1", "test")).rejects.toThrow("cannot perform");

    state.role = "developer";
    await expect(rollbackRollout(7, "tenant_alpha", "rollout_1", "test")).rejects.toThrow("cannot perform");
    await expect(acknowledgeNotification(7, "tenant_alpha", "notice_1")).rejects.toThrow("cannot perform");

    state.role = "viewer";
    await expect(verifyReplay(7, "tenant_alpha", "decision_1", "test")).rejects.toThrow("cannot perform");
  });
});
