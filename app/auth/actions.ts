"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(
  path: string,
  key: "error" | "message",
  message: string,
): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`${path}?${params.toString()}`);
}

async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the request origin below.
    }
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Use the local development default below.
    }
  }

  return "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = stringField(formData, "email");
  const password = stringField(formData, "password");
  const next = getSafeNextPath(stringField(formData, "next"), "/");

  if (!email || !password) {
    redirectWithMessage("/auth/login", "error", "Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithMessage("/auth/login", "error", "Unable to sign in with those credentials.");
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const displayName = stringField(formData, "displayName");
  const email = stringField(formData, "email");
  const password = stringField(formData, "password");
  const next = getSafeNextPath(stringField(formData, "next"), "/");

  if (!email || password.length < 8) {
    redirectWithMessage(
      "/auth/register",
      "error",
      "Enter a valid email and a password with at least 8 characters.",
    );
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirectWithMessage("/auth/register", "error", "Unable to create the account.");
  }

  if (data.session) {
    redirect(next);
  }

  redirectWithMessage(
    "/auth/login",
    "message",
    "Check your email to verify your account before signing in.",
  );
}

export async function requestPasswordReset(formData: FormData) {
  const email = stringField(formData, "email");

  if (!email) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Enter the email address for your account.",
    );
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`,
  });

  if (error) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Unable to send the reset email right now.",
    );
  }

  redirectWithMessage(
    "/auth/login",
    "message",
    "If an account exists for that email, a password reset link has been sent.",
  );
}

export async function updatePassword(formData: FormData) {
  const password = stringField(formData, "password");
  const confirmPassword = stringField(formData, "confirmPassword");

  if (password.length < 8 || password !== confirmPassword) {
    redirectWithMessage(
      "/auth/update-password",
      "error",
      "Passwords must match and contain at least 8 characters.",
    );
  }

  const supabase = await createClient();
  const {
    data: { claims },
  } = await supabase.auth.getClaims();

  if (!claims?.sub) {
    redirectWithMessage(
      "/auth/login",
      "error",
      "Your password reset session has expired. Request a new reset link.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirectWithMessage(
      "/auth/update-password",
      "error",
      "Unable to update your password.",
    );
  }

  redirectWithMessage("/account", "message", "Password updated successfully.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
