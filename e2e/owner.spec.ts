import { expect, test } from "@playwright/test";
import { loginAsOwner, seedIds, serviceClient } from "./support/env";

test.describe("owner", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("dashboard lists both properties", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("You have 2 properties")).toBeVisible();
    await expect(page.getByRole("link", { name: /575 McKinney/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Frisco house/ })).toBeVisible();
  });

  test("575 McKinney Oct – Nov 2025 split shows CoServ $220.00 shares", async ({ page }) => {
    await page.getByRole("link", { name: /575 McKinney/ }).first().click();
    await expect(page).toHaveURL(/\/overview$/);
    await page.getByRole("tab", { name: "Cycles" }).click();
    await page.getByRole("link", { name: /Oct – Nov 2025/ }).click();
    await expect(page).toHaveURL(/\/cycles\/[0-9a-f-]{36}$/);

    const table = page.locator("table").filter({ hasText: "CoServ" }).first();
    await expect(table).toBeVisible();
    // Header cell for the CoServ electricity bill carries the bill total.
    const coservHeader = table.locator("th").filter({ hasText: "CoServ" });
    await expect(coservHeader).toContainText("$220.00");

    // Column index of the CoServ bill → read each tenant's share in that column.
    const headers = await table.locator("thead th").allInnerTexts();
    const col = headers.findIndex((h) => h.includes("CoServ"));
    expect(col).toBeGreaterThan(0);
    const shares = await table
      .locator("tbody tr")
      .evaluateAll(
        (rows, c) => rows.map((r) => (r.querySelectorAll("td")[c] as HTMLElement | undefined)?.innerText ?? ""),
        col
      );
    const amounts = shares.map((s) => s.split("\n")[0].trim());
    expect(amounts).toEqual(expect.arrayContaining(["$60.00", "$34.00", "$6.00", "$220.00"]));
  });

  test("payments page loads", async ({ page }) => {
    await page.goto("/dashboard/owner/payments");
    await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
  });

  test.describe("settings payment handles", () => {
    type Row = Record<string, unknown> | null;
    let original: Row = null;

    test.beforeAll(async () => {
      const { ownerId } = await seedIds();
      const { data } = await serviceClient()
        .from("owner_payment_methods")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();
      original = data;
    });

    test.afterAll(async () => {
      // Safety net: put the row back exactly as it was, whatever the UI did.
      const { ownerId } = await seedIds();
      const db = serviceClient();
      if (original) await db.from("owner_payment_methods").upsert(original);
      else await db.from("owner_payment_methods").delete().eq("owner_id", ownerId);
    });

    test("save then restore round-trips through the form", async ({ page }) => {
      await page.goto("/dashboard/owner/settings");
      await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

      const venmo = page.getByLabel("Venmo username");
      const payee = page.getByLabel("Name tenants should pay");
      const before = { venmo: await venmo.inputValue(), payee: await payee.inputValue() };
      const marker = `e2e-${Date.now()}`;

      await venmo.fill(marker);
      await payee.fill("E2E Payee");
      await page.getByRole("button", { name: "Save payment details" }).click();
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

      await page.reload();
      await expect(page.getByLabel("Venmo username")).toHaveValue(marker);
      await expect(page.getByLabel("Name tenants should pay")).toHaveValue("E2E Payee");

      // Restore the original values through the UI too.
      await page.getByLabel("Venmo username").fill(before.venmo);
      await page.getByLabel("Name tenants should pay").fill(before.payee);
      await page.getByRole("button", { name: "Save payment details" }).click();
      await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel("Venmo username")).toHaveValue(before.venmo);
      await expect(page.getByLabel("Name tenants should pay")).toHaveValue(before.payee);
    });
  });
});
