import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getNeonAuthEnvironment, hasNeonEnvironment } from "@/lib/env";

const environment = hasNeonEnvironment()
  ? getNeonAuthEnvironment()
  : {
      NEON_AUTH_BASE_URL: "http://127.0.0.1:54321/auth",
      NEON_AUTH_COOKIE_SECRET: "local-sample-only-cookie-secret-000000000000",
    };

export const neonAuth = createNeonAuth({
  baseUrl: environment.NEON_AUTH_BASE_URL,
  cookies: {
    secret: environment.NEON_AUTH_COOKIE_SECRET,
    sessionDataTtl: 300,
    sameSite: "strict",
  },
  logLevel: "error",
});
