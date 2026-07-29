import {
  NeonPostgrestClient,
  fetchWithToken,
} from "@neondatabase/postgrest-js";
import { getPublicNeonEnvironment } from "@/lib/env";
import { neonAuth } from "@/lib/neon/auth";

async function getAccessToken(): Promise<string | null> {
  const response = await neonAuth.token();
  if (response.error) return null;
  return response.data?.token ?? null;
}

export async function createServerNeonClient() {
  const environment = getPublicNeonEnvironment();

  return new NeonPostgrestClient({
    dataApiUrl: environment.NEXT_PUBLIC_NEON_DATA_API_URL,
    options: {
      global: {
        fetch: fetchWithToken(getAccessToken),
        headers: {
          "x-client-info": "quilt-pattern-preflight",
        },
      },
    },
  });
}
