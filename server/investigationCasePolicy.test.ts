import { describe, expect, it } from "vitest";
import { controlledRetryPlan, outcomeRequiresSeparateAuthority } from "./investigationCasePolicy";

describe("BPMN-aware investigation case policy", () => {
  it("keeps a rollback-required case conclusion separate from execution authority", () => {
    expect(outcomeRequiresSeparateAuthority("rollback_required")).toBe(true);
    expect(outcomeRequiresSeparateAuthority("confirmed")).toBe(false);
    expect(outcomeRequiresSeparateAuthority("explained")).toBe(false);
    expect(outcomeRequiresSeparateAuthority("accepted")).toBe(false);
  });

  it("plans controlled retry simulation as an additive pilot record without an external delivery claim", () => {
    expect(controlledRetryPlan(1)).toEqual({
      nextAttemptCount: 2,
      payloadVersion: "pilot-v1",
      resultStatus: "simulated_delivered",
      externalRequestMade: false,
      deliveryGuarantee: "not_claimed",
    });
  });
});
