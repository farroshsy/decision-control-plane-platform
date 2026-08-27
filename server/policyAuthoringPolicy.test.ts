import { describe, expect, it } from "vitest";
import { canRecordPolicyReview, policyLifecycleTarget, retainedCohortSimulation } from "./policyAuthoringPolicy";

describe("governed Policy Studio lifecycle", () => {
  it("requires a distinct reviewer and permits only explicit draft/review transitions", () => {
    expect(policyLifecycleTarget("draft", "submit_for_review")).toBe("in_review");
    expect(policyLifecycleTarget("in_review", "record_approval")).toBe("approved");
    expect(policyLifecycleTarget("approved", "submit_for_review")).toBeNull();
    expect(canRecordPolicyReview({ revisionState: "in_review", creatorUserId: 1, reviewerUserId: 2 })).toBe(true);
    expect(canRecordPolicyReview({ revisionState: "in_review", creatorUserId: 1, reviewerUserId: 1 })).toBe(false);
  });
});

describe("retained cohort simulation", () => {
  it("scores bounded replay differences and treats missing evidence or replay as infeasible", () => {
    const result = retainedCohortSimulation([
      { decisionId: "d1", baselineDisposition: "held", candidateDisposition: "held", baselineReplayStatus: "diverged", candidateReplayStatus: "matched", evidenceBound: true, openInvestigation: false },
      { decisionId: "d2", baselineDisposition: "allowed", candidateDisposition: "held", baselineReplayStatus: "matched", candidateReplayStatus: "matched", evidenceBound: true, openInvestigation: true },
    ]);
    expect(result.resultState).toBe("completed");
    expect(result.objective).toMatchObject({ unchangedOutcomes: 1, changedOutcomes: 1, resolvedDivergences: 1, newlyConservative: 1, affectedOpenCases: 1 });
    expect(retainedCohortSimulation([{ decisionId: "d3", baselineDisposition: "held", candidateDisposition: "held", baselineReplayStatus: "matched", candidateReplayStatus: "not_run", evidenceBound: false, openInvestigation: false }]).resultState).toBe("infeasible");
  });
});
