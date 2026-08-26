import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type SignedPackageManifest = {
  manifestVersion: "dcp-evidence-manifest/v1";
  signatureAlgorithm: "HMAC-SHA-256";
  canonicalization: "json-key-sort/v1";
  tenantId: string;
  decisionId: string;
  caseId: string;
  packageHash: string;
  retentionPolicyId: string;
  retentionUntil: string;
  holdStatus: "not_on_hold" | "legal_hold";
  signedAt: string;
  signature: string;
};

function normalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key]!)]));
  return value;
}

export function canonicalJson(value: JsonValue) {
  return JSON.stringify(normalize(value));
}

export function packageHash(value: JsonValue) {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function unsignedManifest(manifest: SignedPackageManifest) {
  const { signature, ...unsigned } = manifest;
  return unsigned;
}

export function signEvidencePackage(input: Omit<SignedPackageManifest, "manifestVersion" | "signatureAlgorithm" | "canonicalization" | "packageHash" | "signature" | "signedAt"> & { package: JsonValue }, signingKey: string): SignedPackageManifest {
  const manifest: Omit<SignedPackageManifest, "signature"> = {
    manifestVersion: "dcp-evidence-manifest/v1",
    signatureAlgorithm: "HMAC-SHA-256",
    canonicalization: "json-key-sort/v1",
    tenantId: input.tenantId,
    decisionId: input.decisionId,
    caseId: input.caseId,
    packageHash: packageHash(input.package),
    retentionPolicyId: input.retentionPolicyId,
    retentionUntil: input.retentionUntil,
    holdStatus: input.holdStatus,
    signedAt: new Date().toISOString(),
  };
  const signature = createHmac("sha256", signingKey).update(canonicalJson(manifest)).digest("hex");
  return { ...manifest, signature };
}

export function verifyEvidenceManifest(manifest: SignedPackageManifest, signingKey: string) {
  const expected = createHmac("sha256", signingKey).update(canonicalJson(unsignedManifest(manifest))).digest("hex");
  const actualBytes = Buffer.from(manifest.signature, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
