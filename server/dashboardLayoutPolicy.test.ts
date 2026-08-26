import { describe, expect, it } from "vitest";
import { resolveSidebarWidth } from "../client/src/components/dashboardLayoutPolicy";

describe("resolveSidebarWidth", () => {
  it("rounds eligible drag widths and ignores values outside the supported range", () => {
    expect(resolveSidebarWidth(280.4, 0)).toBe(280);
    expect(resolveSidebarWidth(199, 0)).toBeNull();
    expect(resolveSidebarWidth(481, 0)).toBeNull();
  });
});
