import { expect, test } from "@playwright/test";
import { loginAsOwner, seedIds, serviceClient } from "./support/env";

// A unique, obviously-fake tenant on Frisco house. Move-in is far in the future so adding it
// re-splits no existing bill; afterAll deletes the record with the service-role client.
const stamp = Date.now();
const TEST_NAME = `E2E Invitee ${stamp}`;
const TEST_EMAIL = `e2e-invitee-${stamp}@example.com`;

test.describe("invite flow", () => {
  let startedAt = "";
  test.beforeAll(() => {
    startedAt = new Date().toISOString();
  });

  test.afterAll(async () => {
    const db = serviceClient();
    const { data: rows } = await db.from("property_tenants").select("id").eq("email", TEST_EMAIL);
    const ids = (rows ?? []).map((r) => r.id as string);
    const { error } = await db.from("property_tenants").delete().eq("email", TEST_EMAIL);
    if (error) throw new Error(`cleanup failed: ${error.message}`);
    const { count } = await db
      .from("property_tenants")
      .select("id", { count: "exact", head: true })
      .eq("email", TEST_EMAIL);
    expect(count).toBe(0);
    // Drop audit rows written about the throwaway tenant record (if auditing is on).
    if (ids.length) await db.from("audit_log").delete().in("record_id", ids).gte("created_at", startedAt);
  });

  test("owner adds a tenant to Frisco and the claim link renders logged out", async ({ page, browser }) => {
    await loginAsOwner(page);
    const { friscoId } = await seedIds();
    await page.goto(`/dashboard/owner/properties/${friscoId}/tenants/invite`);
    await expect(page.getByRole("heading", { name: "Add Tenant" })).toBeVisible();

    await page.getByLabel("Full Name").fill(TEST_NAME);
    await page.getByLabel("Email Address").fill(TEST_EMAIL);
    await page.getByLabel("Move-in Date").fill("2099-01-01");
    await page.getByRole("button", { name: "Add Tenant" }).click();

    await expect(page.getByText(`${TEST_NAME} added`)).toBeVisible();
    const link = await page.getByRole("textbox", { name: "Invite link" }).inputValue();
    expect(link).toMatch(/\/claim\/[A-Za-z0-9_-]+$/);
    const claimPath = new URL(link).pathname;

    const anon = await browser.newContext();
    try {
      const anonPage = await anon.newPage();
      await anonPage.goto(claimPath);
      await expect(anonPage.getByRole("heading", { name: "Welcome to FairSplit", level: 1 })).toBeVisible();
      await expect(anonPage.getByRole("main")).toContainText("Frisco house");
      await expect(anonPage.getByText(`Hi ${TEST_NAME},`)).toBeVisible();
      await expect(anonPage.getByRole("textbox", { name: "Invited email" })).toHaveValue(TEST_EMAIL);
      await expect(anonPage.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
    } finally {
      await anon.close();
    }
  });
});
