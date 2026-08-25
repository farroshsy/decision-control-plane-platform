import { describe, expect, it } from "vitest";
import { compareTracePair } from "./controlPlaneExpansionStore";

const baseline = {
  id: "trace_baseline",
  traceHash: "sha256:baseline",
  stateVersion: "2.0.4",
  policyVersion: "aml-policy@27",
  disposition: "held",
  parsedTrace: { action: "hold_for_review", evidenceCompleteness: "complete", semanticNotes: ["Legacy address normalization"] },
};

describe("replay semantic comparison", () => {
  it("exposes state, policy, disposition, and semantic-field changes rather than reducing divergence to one status", () => {
    const comparison = compareTracePair(baseline, {
      id: "trace_candidate",
      traceHash: "sha256:candidate",
      stateVersion: "2.2.0-rc.1",
      policyVersion: "aml-policy@28",
      disposition: "rejected",
      parsedTrace: { action: "reject", evidenceCompleteness: "conflicted", semanticNotes: ["Conflict precedence added"] },
    });

    expect(comparison.equivalent).toBe(false);
    expect(comparison.dispositionChanged).toBe(true);
    expect(comparison.allDifferences.map(diff => diff.path)).toEqual(expect.arrayContaining(["stateVersion", "policyVersion", "disposition", "action", "evidenceCompleteness", "semanticNotes[0]"]));
  });

  it("marks equivalent retained representations as equivalent only when version, disposition, and all flattened trace fields agree", () => {
    const comparison = compareTracePair(baseline, { ...baseline, id: "trace_same", traceHash: "sha256:same" });
    expect(comparison.equivalent).toBe(true);
    expect(comparison.allDifferences).toEqual([]);
  });
});
