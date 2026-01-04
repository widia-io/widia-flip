"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function signInEmailAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email,
        password,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-in failed";
    // Check if error is about email verification
    if (message.toLowerCase().includes("email") && message.toLowerCase().includes("verif")) {
      redirect(`/login?error=email_not_verified&email=${encodeURIComponent(email)}`);
    }
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/app");
}

export async function signUpEmailAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name,
        email,
        password,
        callbackURL: "/app",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-up failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  // Email verification enabled - redirect with email for confirmation message
  redirect(`/login?success=verify_email&email=${encodeURIComponent(email)}`);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}


