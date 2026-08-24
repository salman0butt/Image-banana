import Link from "next/link";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSafeNextPath } from "@/lib/auth/redirect";

import { signIn } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = getSafeNextPath(single(params.next), "/editor");
  const error = single(params.error);
  const message = single(params.message);
  const registerHref = `/auth/register?next=${encodeURIComponent(next)}`;

  return (
    <AuthPageShell
      mode="login"
      title="Welcome back"
      description="Sign in to open your editor, continue recent generations, and keep creating from where you left off."
      alternatePrompt="New to Image's Banana?"
      alternateLabel="Start free"
      alternateHref={registerHref}
    >
      <form action={signIn} className="space-y-5">
        <input type="hidden" name="next" value={next} />

        {message ? (
          <p
            role="status"
            className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-4 py-3 text-sm leading-5 text-yellow-100"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200"
          >
            {error}
          </p>
        ) : null}

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
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400 focus-visible:ring-yellow-400/25"
          />
        </label>

        <div className="flex items-center justify-end">
          <Link
            className="rounded text-sm font-medium text-yellow-300 transition-colors hover:text-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
            href="/auth/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300"
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium text-zinc-200 transition-colors hover:text-yellow-300 hover:underline"
          href={registerHref}
        >
          Create account
        </Link>
      </p>
    </AuthPageShell>
  );
}
