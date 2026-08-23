import Link from "next/link";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { requestPasswordReset } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AuthPageShell
      title="Reset your password"
      description="Enter your email and we will send a secure recovery link through Supabase Auth."
    >
      <form action={requestPasswordReset} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        <label className="block space-y-2 text-sm font-medium">
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link className="text-foreground hover:underline" href="/auth/login">Back to sign in</Link>
      </p>
    </AuthPageShell>
  );
}
