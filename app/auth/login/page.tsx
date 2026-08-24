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

  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in to open your Image's Banana editor and continue creating."
    >
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {message ? (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">{message}</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        <label className="block space-y-2 text-sm font-medium">
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Password
          <Input name="password" type="password" autoComplete="current-password" required />
        </label>
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
      <div className="mt-6 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link
          className="hover:text-foreground hover:underline"
          href={`/auth/register?next=${encodeURIComponent(next)}`}
        >
          Create account
        </Link>
        <Link className="hover:text-foreground hover:underline" href="/auth/forgot-password">Forgot password?</Link>
      </div>
    </AuthPageShell>
  );
}
