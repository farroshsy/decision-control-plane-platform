import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.skip(!process.env.E2E_STORAGE_STATE, "An authenticated storage state is required to reach the tenant-scoped Control Room.");

test("sidebar resize smoke: drag persists width and produces no ResizeObserver loop", async ({ page, context }) => {
  const storageState = JSON.parse(readFileSync(process.env.E2E_STORAGE_STATE!, "utf8"));
  const sessionCookie = storageState.cookies.find((cookie: { name: string }) => cookie.name === "app_session_id");
  if (!sessionCookie) throw new Error("The local authenticated test state did not contain app_session_id.");
  await context.addCookies([{ name: "app_session_id", value: sessionCookie.value, url: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000", httpOnly: true, secure: false, sameSite: "Lax" }]);
  const observerWarnings: string[] = [];
  page.on("pageerror", error => {
    if (error.message.includes("ResizeObserver loop")) observerWarnings.push(error.message);
  });
  await page.goto("/app");
  const handle = page.getByTestId("sidebar-resize-handle");
  await expect(handle).toBeVisible();
  await handle.hover();
  await expect(handle).toHaveAttribute("title", "Drag to resize navigation");

  const box = await handle.boundingBox();
  if (!box) throw new Error("The sidebar resize handle did not expose a bounding box.");
  const initialWidth = await page.evaluate(() => Number(localStorage.getItem("sidebar-width")));
  await page.mouse.move(box.x + 1, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 64, box.y + 160, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => Number(localStorage.getItem("sidebar-width")))).toBeGreaterThan(initialWidth);
  expect(observerWarnings).toEqual([]);
});
