export type PolicyLifecycleState = "draft" | "in_review" | "approved" | "published" | "deprecated" | "archived";
export type PolicyReviewDecision = "approved" | "changes_requested" | "rejected";

export type RetainedReplayCase = {
  decisionId: string;
  baselineDisposition: "allowed" | "held" | "rejected";
  candidateDisposition: "allowed" | "held" | "rejected";
  baselineReplayStatus: "matched" | "diverged" | "not_run";
  candidateReplayStatus: "matched" | "diverged" | "not_run";
  evidenceBound: boolean;
  openInvestigation: boolean;
};

export function policyLifecycleTarget(current: PolicyLifecycleState, action: "submit_for_review" | "record_approval" | "record_changes_requested" | "record_rejection") {
  if (action === "submit_for_review" && current === "draft") return "in_review" as const;
  if (action === "record_approval" && current === "in_review") return "approved" as const;
  if ((action === "record_changes_requested" || action === "record_rejection") && current === "in_review") return "draft" as const;
  return null;
}

export function canRecordPolicyReview(input: { revisionState: PolicyLifecycleState; creatorUserId: number; reviewerUserId: number }) {
  return input.revisionState === "in_review" && input.creatorUserId !== input.reviewerUserId;
}

export function retainedCohortSimulation(cases: RetainedReplayCase[]) {
  const infeasibleReasons = cases.flatMap(item => {
    const reasons: string[] = [];
    if (!item.evidenceBound) reasons.push(`${item.decisionId}: missing retained evidence binding`);
    if (item.candidateReplayStatus === "not_run") reasons.push(`${item.decisionId}: candidate replay was not run`);
    return reasons;
  });
  const changedCases = cases.filter(item => item.baselineDisposition !== item.candidateDisposition);
  const newlyConservative = changedCases.filter(item => item.candidateDisposition !== "allowed" && item.baselineDisposition === "allowed");
  const resolvedDivergences = cases.filter(item => item.baselineReplayStatus === "diverged" && item.candidateReplayStatus === "matched");
  const affectedOpenCases = changedCases.filter(item => item.openInvestigation);
  const objective = {
    retainedCaseCount: cases.length,
    unchangedOutcomes: cases.length - changedCases.length,
    changedOutcomes: changedCases.length,
    resolvedDivergences: resolvedDivergences.length,
    newlyConservative: newlyConservative.length,
    affectedOpenCases: affectedOpenCases.length,
    score: (cases.length - changedCases.length) + (resolvedDivergences.length * 2) - newlyConservative.length - affectedOpenCases.length,
  };
  return {
    resultState: infeasibleReasons.length ? "infeasible" as const : "completed" as const,
    objective,
    feasibility: {
      feasible: infeasibleReasons.length === 0,
      hardConstraints: ["tenant-scoped retained evidence", "candidate replay completed", "no live policy or rollout mutation"],
      infeasibleReasons,
    },
    cases: cases.map(item => ({
      decisionId: item.decisionId,
      changed: item.baselineDisposition !== item.candidateDisposition,
      baselineDisposition: item.baselineDisposition,
      candidateDisposition: item.candidateDisposition,
      baselineReplayStatus: item.baselineReplayStatus,
      candidateReplayStatus: item.candidateReplayStatus,
      affectedOpenInvestigation: item.openInvestigation && item.baselineDisposition !== item.candidateDisposition,
    })),
  };
}
