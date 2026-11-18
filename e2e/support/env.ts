import { expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Seeded pilot accounts. Passwords come from .env.local and are never logged. */
export const OWNER_EMAIL = "shekar@example.com";
export const TENANT_EMAIL = "navya@example.com";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — copy .env.local into the repo root before running e2e tests`);
  return value;
}

export const demoPassword = () => requireEnv("SEED_DEMO_PASSWORD");
export const adminEmail = () => requireEnv("SEED_ADMIN_EMAIL");
export const adminPassword = () => requireEnv("SEED_ADMIN_PASSWORD");

let admin: SupabaseClient | null = null;

/** Service-role client for test setup/cleanup only. Bypasses RLS — never use it to assert app behaviour. */
export function serviceClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Sign in through the real login page (Password tab) and wait for the role dashboard. */
export async function login(page: Page, email: string, password: string, landing: RegExp) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: /^sign in/i }).click();
  await expect(page).toHaveURL(landing, { timeout: 30_000 });
}

export const loginAsOwner = (page: Page) =>
  login(page, OWNER_EMAIL, demoPassword(), /\/dashboard\/owner\/dashboard/);
export const loginAsTenant = (page: Page) =>
  login(page, TENANT_EMAIL, demoPassword(), /\/dashboard\/tenant\/dashboard/);
export const loginAsAdmin = (page: Page) =>
  login(page, adminEmail(), adminPassword(), /\/dashboard\/admin\/dashboard/);

/** Look up seeded ids so specs can navigate directly and clean up precisely. */
export async function seedIds() {
  const db = serviceClient();
  const { data: owner } = await db.from("profiles").select("id").eq("email", OWNER_EMAIL).single();
  const { data: props } = await db
    .from("properties")
    .select("id, name")
    .eq("owner_id", owner!.id)
    .is("deleted_at", null);
  const mckinney = props!.find((p) => p.name === "575 McKinney")!;
  const frisco = props!.find((p) => p.name === "Frisco house")!;
  const { data: cycle } = await db
    .from("billing_cycles")
    .select("id, label")
    .eq("property_id", mckinney.id)
    .eq("label", "Oct – Nov 2025")
    .single();
  return { ownerId: owner!.id as string, mckinneyId: mckinney.id as string, friscoId: frisco.id as string, octNovCycleId: cycle!.id as string };
}
