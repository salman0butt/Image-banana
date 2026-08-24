import Link from "next/link";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSafeNextPath } from "@/lib/auth/redirect";

import { signUp } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = getSafeNextPath(single(params.next), "/editor");
  const error = single(params.error);
  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;

  return (
    <AuthPageShell
      mode="register"
      title="Create your account"
      description="Set up your workspace, receive your configured signup credits, and start editing with AI in minutes."
      alternatePrompt="Already have an account?"
      alternateLabel="Sign in"
      alternateHref={loginHref}
    >
      <form action={signUp} className="space-y-5">
        <input type="hidden" name="next" value={next} />

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200"
          >
            {error}
          </p>
        ) : null}

        <label className="block space-y-2 text-sm font-medium text-zinc-200">
          Display name
          <Input
            name="displayName"
            autoComplete="name"
            maxLength={80}
            placeholder="Your name"
            className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400 focus-visible:ring-yellow-400/25"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-zinc-200">
          Email
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400 focus-visible:ring-yellow-400/25"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-zinc-200">
          Password
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
            className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400 focus-visible:ring-yellow-400/25"
          />
        </label>

        <p className="text-xs leading-5 text-zinc-500">
          By creating an account, you can access the editor, your credit wallet, and persistent generation history.
        </p>

        <Button
          type="submit"
          className="h-11 w-full bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300"
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          className="font-medium text-zinc-200 transition-colors hover:text-yellow-300 hover:underline"
          href={loginHref}
        >
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
