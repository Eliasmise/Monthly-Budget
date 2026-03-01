import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type SupabaseClient = ReturnType<typeof createClient<Database>>;

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseServerClient() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  supabaseClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
}
