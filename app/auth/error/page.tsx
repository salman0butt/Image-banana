import Link from "next/link";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const message =
    typeof params.message === "string"
      ? params.message
      : "The authentication request could not be completed.";

  return (
    <AuthPageShell title="Authentication error" description={message}>
      <Button asChild className="w-full">
        <Link href="/auth/login">Return to sign in</Link>
      </Button>
    </AuthPageShell>
  );
}
