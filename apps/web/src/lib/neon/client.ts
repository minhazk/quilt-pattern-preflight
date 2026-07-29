"use client";

import { createClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";
import { getPublicNeonEnvironment } from "@/lib/env";

export function createBrowserNeonClient() {
  const environment = getPublicNeonEnvironment();

  return createClient({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: environment.NEXT_PUBLIC_NEON_AUTH_URL,
    },
    dataApi: {
      url: environment.NEXT_PUBLIC_NEON_DATA_API_URL,
    },
  });
}
