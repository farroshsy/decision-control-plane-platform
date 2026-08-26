import { describe, expect, it } from "vitest";
import { admitPilotAttachment, defaultEscalationTargetMinutes, pilotAttachmentLimitBytes, serviceLevelPosture, serviceLevelTarget } from "./investigationLifecyclePolicy";

describe("investigation lifecycle service-level policy", () => {
  const now = new Date("2026-08-26T00:00:00.000Z");

  it("derives due and service target timestamps deterministically", () => {
    expect(serviceLevelTarget(undefined, now)).toBeNull();
    expect(serviceLevelTarget(90, now)?.toISOString()).toBe("2026-08-26T01:30:00.000Z");
  });

  it("classifies no target, on-track, due-soon, and overdue posture without a timer", () => {
    expect(serviceLevelPosture(null, now)).toEqual({ state: "not_set", remainingMinutes: null });
    expect(serviceLevelPosture(new Date("2026-08-26T02:00:00.000Z"), now)).toEqual({ state: "on_track", remainingMinutes: 120 });
    expect(serviceLevelPosture(new Date("2026-08-26T00:30:00.000Z"), now)).toEqual({ state: "due_soon", remainingMinutes: 30 });
    expect(serviceLevelPosture(new Date("2026-08-25T23:55:00.000Z"), now)).toEqual({ state: "overdue", remainingMinutes: -5 });
  });

  it("uses explicit manual escalation target defaults by priority", () => {
    expect(defaultEscalationTargetMinutes("standard")).toBe(1_440);
    expect(defaultEscalationTargetMinutes("elevated")).toBe(240);
    expect(defaultEscalationTargetMinutes("critical")).toBe(60);
  });

  it("admits only bounded pilot attachment references and normalizes their names", () => {
    expect(admitPilotAttachment("case evidence.pdf", 128)).toEqual({ ok: true, safeName: "case_evidence.pdf" });
    expect(admitPilotAttachment("empty.txt", 0)).toMatchObject({ ok: false });
    expect(admitPilotAttachment("too-large.bin", pilotAttachmentLimitBytes + 1)).toMatchObject({ ok: false });
  });
});
