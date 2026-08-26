import { describe, expect, it } from "vitest";
import { canonicalJson, packageHash, signEvidencePackage, verifyEvidenceManifest } from "./evidencePackagePolicy";

describe("evidence package policy", () => {
  it("canonicalizes equivalent object key orders into the same package hash", () => {
    const first = { evidence: { state: "2.2", policy: "28" }, decisionId: "dec_001" };
    const second = { decisionId: "dec_001", evidence: { policy: "28", state: "2.2" } };
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(packageHash(first)).toBe(packageHash(second));
  });

  it("verifies a signed manifest and rejects a retention or package-hash change", () => {
    const key = "unit-test-signing-key";
    const manifest = signEvidencePackage({
      tenantId: "tenant_alpha",
      decisionId: "dec_001",
      caseId: "case_001",
      retentionPolicyId: "retention_001",
      retentionUntil: "2027-01-01T00:00:00.000Z",
      holdStatus: "not_on_hold",
      package: { semanticDiff: [{ field: "disposition", from: "held", to: "rejected" }] },
    }, key);
    expect(verifyEvidenceManifest(manifest, key)).toBe(true);
    expect(verifyEvidenceManifest({ ...manifest, retentionUntil: "2028-01-01T00:00:00.000Z" }, key)).toBe(false);
    expect(verifyEvidenceManifest({ ...manifest, packageHash: "sha256:tampered" }, key)).toBe(false);
  });
});
