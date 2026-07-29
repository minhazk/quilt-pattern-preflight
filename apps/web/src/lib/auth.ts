import { cache } from "react";
import { redirect } from "next/navigation";
import { hasNeonEnvironment, isLocalSampleMode } from "@/lib/env";
import { neonAuth } from "@/lib/neon/auth";
import { createServerNeonClient } from "@/lib/neon/server";

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

  if (!hasNeonEnvironment()) {
    return null;
  }

  const { data: session, error } = await neonAuth.getSession();
  if (error || !session?.user?.id) {
    return null;
  }

  const neon = await createServerNeonClient();
  const { data: profile } = await neon
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const role =
    profile?.role === "operator" || profile?.role === "admin"
      ? profile.role
      : "customer";

  return {
    id: session.user.id,
    email: session.user.email,
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
