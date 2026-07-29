import { z } from "zod";

const publicSupabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const privateSupabaseSchema = publicSupabaseSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export function hasSupabaseEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getPublicSupabaseEnvironment() {
  return publicSupabaseSchema.parse(process.env);
}

export function getPrivateSupabaseEnvironment() {
  return privateSupabaseSchema.parse(process.env);
}

export function isLocalSampleMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_ENABLED !== "false" &&
    !hasSupabaseEnvironment()
  );
}
