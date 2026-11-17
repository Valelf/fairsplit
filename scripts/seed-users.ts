/**
 * Seed Script: Create Auth Users for 575 McKinney Demo Data
 *
 * This script creates the demo users via Supabase Admin API.
 * Run this BEFORE running the SQL seed file.
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 2. Run: npx tsx scripts/seed-users.ts
 *
 * After running this script, run the SQL seed:
 * - Go to Supabase Dashboard > SQL Editor
 * - Run the contents of supabase/seed.sql
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING");
  console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "OK" : "MISSING");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UserToCreate {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "owner" | "tenant";
}

const usersToCreate: UserToCreate[] = [
  // Admin user (platform owner)
  { email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com", password: process.env.SEED_ADMIN_PASSWORD ?? "demo123!", fullName: "Admin", role: "admin" },
  // Property owner
  { email: "shekar@example.com", password: "demo123!", fullName: "Shekar", role: "owner" },
  // Tenants
  { email: "anil@example.com", password: "demo123!", fullName: "Anil", role: "tenant" },
  { email: "navya@example.com", password: "demo123!", fullName: "Navya", role: "tenant" },
  { email: "vineesh@example.com", password: "demo123!", fullName: "Vineesh", role: "tenant" },
  { email: "val@example.com", password: "demo123!", fullName: "Val", role: "tenant" },
  { email: "divya@example.com", password: "demo123!", fullName: "Divya", role: "tenant" },
];

async function seedUsers() {
  console.log("Starting user seed...\n");

  for (const user of usersToCreate) {
    console.log(`Creating user: ${user.email} (${user.role})...`);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === user.email);

    if (existingUser) {
      console.log(`  User already exists, skipping.`);

      // Update profile role if needed
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: user.role, full_name: user.fullName })
        .eq("id", existingUser.id);

      if (updateError) {
        console.log(`  Warning: Could not update profile: ${updateError.message}`);
      } else {
        console.log(`  Updated profile role to ${user.role}`);
      }
      continue;
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: user.fullName,
      },
    });

    if (error) {
      console.error(`  Error creating user: ${error.message}`);
      continue;
    }

    console.log(`  Created with ID: ${data.user.id}`);

    // Update profile role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: user.role, full_name: user.fullName })
      .eq("id", data.user.id);

    if (updateError) {
      console.error(`  Warning: Could not update profile: ${updateError.message}`);
    } else {
      console.log(`  Profile updated with role: ${user.role}`);
    }
  }

  console.log("\nUser seed complete!");
  console.log("\nNext steps:");
  console.log("1. Go to Supabase Dashboard > SQL Editor");
  console.log("2. Run the contents of supabase/seed.sql");
  console.log("3. Start the dev server: npm run dev");
  console.log("4. Login as shekar@example.com (owner) or any tenant");
}

seedUsers().catch(console.error);
