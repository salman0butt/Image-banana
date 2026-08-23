import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { updatePassword } from "../actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <AuthPageShell
      title="Choose a new password"
      description="Your recovery session is verified server-side before the password can be changed."
    >
      <form action={updatePassword} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        <label className="block space-y-2 text-sm font-medium">
          New password
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Confirm password
          <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <Button type="submit" className="w-full">Update password</Button>
      </form>
    </AuthPageShell>
  );
}
