import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseEnvironment, isLocalSampleMode } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  role: "customer" | "operator" | "admin";
  sample: boolean;
};

const sampleUser: AppUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "sample@quiltpreflight.local",
  role: "admin",
  sample: true,
};

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  if (isLocalSampleMode()) {
    return sampleUser;
  }

  if (!hasSupabaseEnvironment()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  const appMetadata =
    typeof claims.app_metadata === "object" && claims.app_metadata
      ? claims.app_metadata
      : {};
  const role =
    "role" in appMetadata &&
    (appMetadata.role === "operator" || appMetadata.role === "admin")
      ? appMetadata.role
      : "customer";

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    role,
    sample: false,
  };
});

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?next=/dashboard");
  }
  return user;
}

export async function requireOperator(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "operator" && user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
