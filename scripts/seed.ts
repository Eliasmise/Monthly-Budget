import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { hashPassword } from "../lib/password";
import type { Database } from "../lib/supabase/database.types";

const DEFAULT_CATEGORIES = [
  "Food",
  "Supplements",
  "Gym",
  "Clothes",
  "Going Out",
  "Miscellanies",
  "Relationship",
  "Medicines"
];

loadEnvConfig(process.cwd());

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin";

  if (!supabaseUrl || !serviceRole) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error: adminError } = await supabase.from("users").upsert(
    {
      username: adminUsername,
      role: "admin",
      password_hash: hashPassword(adminPassword)
    },
    { onConflict: "username" }
  );

  if (adminError) {
    throw adminError;
  }

  const rows = DEFAULT_CATEGORIES.map((name) => ({ name, is_active: true }));
  const { error: categoryError } = await supabase.from("categories").upsert(rows, { onConflict: "name" });

  if (categoryError) {
    throw categoryError;
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete. Admin user: ${adminUsername}`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
