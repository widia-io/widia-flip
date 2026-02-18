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

  redirect("/app?auth=login");
}

export async function signUpEmailAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const terms = formData.get("terms");
  const marketingOptIn = formData.get("marketing") === "on";

  // Validate terms acceptance
  if (terms !== "on") {
    redirect(`/login?tab=signup&error=${encodeURIComponent("Voce deve aceitar os termos de uso")}`);
  }

  try {
    await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name,
        email,
        password,
        phone,
        accepted_terms_at: new Date().toISOString(),
        marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : undefined,
        callbackURL: "/app",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign-up failed";
    redirect(`/login?tab=signup&error=${encodeURIComponent(message)}`);
  }

  // Email verification enabled - redirect with email for confirmation message
  redirect(`/login?success=verify_email&email=${encodeURIComponent(email)}`);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: "/reset-password",
      },
    });
  } catch {
    // Silently ignore errors - don't reveal if email exists
  }

  // Always show success to prevent email enumeration
  redirect(`/forgot-password?success=email_sent&email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(formData: FormData) {
  const newPassword = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "");

  if (newPassword.length < 8) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=password_too_short`);
  }

  try {
    await auth.api.resetPassword({
      body: {
        newPassword,
        token,
      },
    });
  } catch {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid_token`);
  }

  redirect("/login?success=password_reset");
}

