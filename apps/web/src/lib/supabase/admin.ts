import { createClient } from "@supabase/supabase-js";
import { getPrivateSupabaseEnvironment } from "@/lib/env";

export function createAdminSupabaseClient() {
  const environment = getPrivateSupabaseEnvironment();

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
