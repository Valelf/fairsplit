import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page renders hero and calls to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("split by the day");
    await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  });

  test("signup page renders the landlord sign-up form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("Create your landlord account")).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("login page offers both sign-in tabs and links to signup", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("tab", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Email link" })).toBeVisible();
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });
});
