import { expect, test } from "@playwright/test";
import { loginAsAdmin, seedIds } from "./support/env";

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("admin dashboard renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Admin Dashboard", level: 1 })).toBeVisible();
  });

  test("user detail for shekar shows founding plan until Nov 18, 2027", async ({ page }) => {
    const { ownerId } = await seedIds();
    await page.goto(`/dashboard/admin/users/${ownerId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Shekar|shekar@example\.com/);
    const main = page.getByRole("main");
    await expect(main).toContainText(/founding/i);
    await expect(main).toContainText("Nov 18, 2027");
  });
});
