import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = !claimsError && typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    redirect("/auth/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : undefined;
  const email = typeof claims?.email === "string" ? claims.email : "";

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <section className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div>
          <p className="text-sm font-semibold text-primary">Image&apos;s Banana</p>
          <h1 className="mt-2 text-2xl font-semibold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your Supabase-authenticated application profile.</p>
        </div>
        {message ? <p className="rounded-lg bg-muted px-3 py-2 text-sm">{message}</p> : null}
        <dl className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Display name</dt>
            <dd className="mt-1 font-medium">{profile?.display_name || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
            <dd className="mt-1 break-all font-medium">{email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs">{userId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Created</dt>
            <dd className="mt-1 font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "Pending profile"}</dd>
          </div>
        </dl>
        <form action={signOut}>
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </section>
    </main>
  );
}
