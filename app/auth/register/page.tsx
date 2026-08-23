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

  return (
    <AuthPageShell
      title="Create your account"
      description="Create an account to receive your configured signup credits and start editing with AI."
    >
      <form action={signUp} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        <label className="block space-y-2 text-sm font-medium">
          Display name
          <Input name="displayName" autoComplete="name" maxLength={80} />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Password
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <Button type="submit" className="w-full">Create account</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-foreground hover:underline" href="/auth/login?next=%2Feditor">Sign in</Link>
      </p>
    </AuthPageShell>
  );
}
