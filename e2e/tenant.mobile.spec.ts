import { expect, test } from "@playwright/test";
import { loginAsTenant } from "./support/env";

test("tenant dashboard has no horizontal scroll at 375px", async ({ page }) => {
  await loginAsTenant(page);
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
