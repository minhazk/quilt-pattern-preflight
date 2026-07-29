import { createServerNeonClient } from "@/lib/neon/server";

/**
 * Server actions still use the caller's Neon Auth token. Database RLS remains
 * the authority; this helper does not bypass customer or operator boundaries.
 */
export async function createActionNeonClient() {
  return createServerNeonClient();
}
