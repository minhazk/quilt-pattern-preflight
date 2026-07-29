"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnvironment } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const environment = getPublicSupabaseEnvironment();

  return createBrowserClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
