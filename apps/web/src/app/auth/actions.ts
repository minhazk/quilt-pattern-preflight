"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const magicLinkSchema = z.object({
  email: z.string().email(),
  next: z.string().startsWith("/dashboard"),
});

export async function sendMagicLink(formData: FormData) {
  const values = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next"),
  });

  if (!values.success) {
    redirect("/auth/sign-in?error=invalid");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createServerSupabaseClient();
  const callback = new URL("/auth/callback", appUrl);
  callback.searchParams.set("next", values.data.next);
  const { error } = await supabase.auth.signInWithOtp({
    email: values.data.email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect("/auth/sign-in?error=delivery");
  }

  redirect("/auth/check-email");
}
