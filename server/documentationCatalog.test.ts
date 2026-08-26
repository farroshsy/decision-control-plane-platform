import { describe, expect, it } from "vitest";
import { documentationCatalog, searchDocumentation } from "../client/src/lib/documentationCatalog";

describe("documentation portal catalog", () => {
  it("includes the rendered theory, architecture handbook, ADRs, and research archive", () => {
    const ids = new Set(documentationCatalog.map(entry => entry.id));
    expect(ids.size).toBeGreaterThanOrEqual(10);
    expect(ids).toContain("decision-state-theory");
    expect(ids).toContain("architecture-handbook");
    expect(ids).toContain("adr-canonical-episode");
    expect(ids).toContain("research-archive");
  });

  it("matches punctuation-insensitive full-text queries", () => {
    const results = searchDocumentation("service level", "All");
    expect(results.map(entry => entry.id)).toEqual(expect.arrayContaining(["architecture-handbook", "capability-roadmap", "adr-investigation-ownership"]));
  });

  it("filters catalog results by document kind", () => {
    const decisions = searchDocumentation("", "ADR");
    expect(decisions).toHaveLength(3);
    expect(decisions.every(entry => entry.kind === "ADR")).toBe(true);
  });
});
