import { expect, test } from "@playwright/test";
import { loginAsTenant, seedIds, serviceClient, TENANT_EMAIL } from "./support/env";

const SPLIT_PAYMENT_COLS = "id, payment_status, marked_paid_at, confirmed_at, confirmed_by, payment_note";

test.describe("tenant (navya)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page);
  });

  test("dashboard → Oct – Nov 2025 cycle shows her electricity share", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    const { mckinneyId, octNovCycleId } = await seedIds();
    await page.goto(`/dashboard/tenant/properties/${mckinneyId}/bills/${octNovCycleId}`);
    await expect(page.getByRole("heading", { name: "Oct – Nov 2025", level: 1 })).toBeVisible();

    const breakdown = page.locator("table").filter({ hasText: "Your Share" }).first();
    const coserv = breakdown.getByRole("row").filter({ hasText: "CoServ" });
    await expect(coserv).toContainText("$220.00");
    await expect(coserv).toContainText("30 / 110");
    await expect(coserv).toContainText("$60.00");
    await expect(page.getByText("Pay your share")).toBeVisible();
  });

  test.describe("mark paid / undo", () => {
    type SplitRow = { id: string } & Record<string, unknown>;
    let snapshot: SplitRow[] = [];
    let startedAt = "";

    test.beforeAll(async () => {
      startedAt = new Date().toISOString();
      const { mckinneyId, octNovCycleId } = await seedIds();
      const db = serviceClient();
      const { data: pt } = await db
        .from("property_tenants")
        .select("id")
        .eq("property_id", mckinneyId)
        .eq("email", TENANT_EMAIL)
        .single();
      const { data: bills } = await db.from("bills").select("id").eq("cycle_id", octNovCycleId);
      const { data } = await db
        .from("bill_splits")
        .select(SPLIT_PAYMENT_COLS)
        .eq("tenant_id", pt!.id)
        .in(
          "bill_id",
          (bills ?? []).map((b) => b.id)
        );
      snapshot = (data ?? []) as SplitRow[];
      expect(snapshot.length).toBeGreaterThan(0);
    });

    test.afterAll(async () => {
      // Put every split's payment fields back exactly as they were and drop notifications the test caused.
      const db = serviceClient();
      for (const row of snapshot) {
        const { id, ...fields } = row;
        await db.from("bill_splits").update(fields).eq("id", id);
      }
      const { ownerId } = await seedIds();
      await db.from("notifications").delete().eq("user_id", ownerId).gte("created_at", startedAt);
    });

    test("mark paid then undo restores the owed state", async ({ page }) => {
      const { mckinneyId, octNovCycleId } = await seedIds();
      await page.goto(`/dashboard/tenant/properties/${mckinneyId}/bills/${octNovCycleId}`);
      const paidButton = page.getByRole("button", { name: /^I've paid \$/ });
      test.skip(!(await paidButton.isVisible()), "Navya's share is not in the owed state; nothing to toggle");

      // A unique note proves the "marked paid" state on screen is the one this test created
      // (the pilot DB is shared with other agents/scripts).
      const note = `e2e mark-paid ${Date.now()}`;
      await page.getByLabel("Note for your landlord (optional)").fill(note);
      await paidButton.click();
      const undo = page.getByRole("button", { name: "Undo" });
      await expect(undo).toBeVisible();
      await expect(page.getByText(/You marked this paid/)).toBeVisible();
      await expect(page.getByText(`Note: ${note}`)).toBeVisible();

      await undo.click();
      await expect(page.getByRole("button", { name: /^I've paid \$/ })).toBeVisible();
    });
  });

  test("cannot open owner routes", async ({ page }) => {
    await page.goto("/dashboard/owner/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard\/owner\//);
    const { mckinneyId } = await seedIds();
    await page.goto(`/dashboard/owner/properties/${mckinneyId}/overview`);
    await expect(page).not.toHaveURL(/\/dashboard\/owner\//);
  });

  test("cannot see Frisco house", async ({ page }) => {
    await expect(page.getByText("Frisco house")).toHaveCount(0);
    await page.goto("/dashboard/tenant/properties");
    await expect(page.getByText("575 McKinney").first()).toBeVisible();
    await expect(page.getByText("Frisco house")).toHaveCount(0);

    const { friscoId } = await seedIds();
    await page.goto(`/dashboard/tenant/properties/${friscoId}/bills`);
    await expect(page.getByText("Frisco house")).toHaveCount(0);
  });
});
