"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { neonAuth } from "@/lib/neon/auth";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  mode: z.enum(["sign-in", "sign-up"]),
  next: z.string().startsWith("/dashboard"),
});

export async function authenticate(formData: FormData) {
  const values = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    mode: formData.get("mode"),
    next: formData.get("next"),
  });

  if (!values.success) {
    redirect("/auth/sign-in?error=invalid");
  }

  const credentials = {
    email: values.data.email,
    password: values.data.password,
  };
  const result =
    values.data.mode === "sign-up"
      ? await neonAuth.signUp.email({
          ...credentials,
          name: values.data.email.split("@")[0] ?? "Quilt designer",
        })
      : await neonAuth.signIn.email(credentials);

  if (result.error) {
    redirect(
      `/auth/sign-in?error=${values.data.mode === "sign-up" ? "signup" : "signin"}`,
    );
  }

  redirect(values.data.next as Route);
}
