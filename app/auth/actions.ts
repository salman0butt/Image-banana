"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSafeAuthErrorMessage } from "@/lib/auth/errors";
import { getSafeNextPath } from "@/lib/auth/redirect";
import {
  isSupabaseConfigurationError,
  SUPABASE_CONFIGURATION_MESSAGE,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MAX_DISPLAY_NAME_LENGTH = 80;

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

async function createAuthClient(errorPath: string) {
  try {
    return await createClient();
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      redirectWithMessage(
        errorPath,
        "error",
        SUPABASE_CONFIGURATION_MESSAGE,
      );
    }

    throw error;
  }
}

function httpOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

async function getSiteUrl() {
  const configuredOrigin = httpOrigin(process.env.NEXT_PUBLIC_SITE_URL?.trim());
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const requestOrigin = httpOrigin(requestHeaders.get("origin"));
  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://localhost:3000";
}

export async function signIn(formData: FormData) {
  const email = stringField(formData, "email");
  const password = stringField(formData, "password");
  const next = getSafeNextPath(stringField(formData, "next"), "/editor");

  if (!email || !password) {
    redirectWithMessage("/auth/login", "error", "Email and password are required.");
  }

  const supabase = await createAuthClient("/auth/login");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithMessage(
      "/auth/login",
      "error",
      getSafeAuthErrorMessage(
        error,
        "Unable to sign in with those credentials.",
      ),
    );
  }

  redirect(next);
}

export async function signUp(formData: FormData) {
  const displayName = stringField(formData, "displayName");
  const email = stringField(formData, "email");
  const password = stringField(formData, "password");
  const next = getSafeNextPath(stringField(formData, "next"), "/editor");

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    redirectWithMessage(
      "/auth/register",
      "error",
      `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
    );
  }

  if (!email || password.length < 8) {
    redirectWithMessage(
      "/auth/register",
      "error",
      "Enter a valid email and a password with at least 8 characters.",
    );
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createAuthClient("/auth/register");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
      emailRedirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirectWithMessage(
      "/auth/register",
      "error",
      getSafeAuthErrorMessage(error, "Unable to create the account."),
    );
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
  const supabase = await createAuthClient("/auth/forgot-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`,
  });

  if (error) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      getSafeAuthErrorMessage(
        error,
        "Unable to send the reset email right now.",
      ),
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

  const supabase = await createAuthClient("/auth/update-password");
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (claimsError || !claims?.sub) {
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
      getSafeAuthErrorMessage(error, "Unable to update your password."),
    );
  }

  redirectWithMessage("/account", "message", "Password updated successfully.");
}

export async function signOut() {
  const supabase = await createAuthClient("/auth/login");
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirectWithMessage("/account", "error", "Unable to sign out right now. Please try again.");
  }

  redirect("/auth/login");
}
