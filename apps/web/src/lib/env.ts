import { z } from "zod";

const publicNeonSchema = z.object({
  NEXT_PUBLIC_NEON_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_NEON_DATA_API_URL: z.string().url(),
});

const neonAuthSchema = z.object({
  NEON_AUTH_BASE_URL: z.string().url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
});

const privateNeonSchema = publicNeonSchema.merge(neonAuthSchema).extend({
  DATABASE_URL: z.string().url(),
});

export function hasNeonEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_NEON_AUTH_URL &&
    process.env.NEXT_PUBLIC_NEON_DATA_API_URL &&
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET,
  );
}

export function getPublicNeonEnvironment() {
  return publicNeonSchema.parse(process.env);
}

export function getNeonAuthEnvironment() {
  return neonAuthSchema.parse(process.env);
}

export function getPrivateNeonEnvironment() {
  return privateNeonSchema.parse(process.env);
}

export function isLocalSampleMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_ENABLED !== "false" &&
    !hasNeonEnvironment()
  );
}
