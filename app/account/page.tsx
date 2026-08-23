import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { getCreditBalance } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type LedgerEntry = {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  created_at: string;
};

function formatReason(reason: string): string {
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

  const [{ data: profile }, params] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle(),
    searchParams,
  ]);

  let creditBalance: number | null = null;
  try {
    creditBalance = await getCreditBalance(userId);
  } catch (error) {
    console.error("Unable to provision account credit wallet:", error);
  }

  const { data: ledgerData } = await supabase
    .from("credit_ledger")
    .select("id, delta, balance_after, reason, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  const ledger = (ledgerData ?? []) as LedgerEntry[];

  const message = typeof params.message === "string" ? params.message : undefined;
  const email = typeof claims?.email === "string" ? claims.email : "";

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <section className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div>
          <p className="text-sm font-semibold text-primary">Image&apos;s Banana</p>
          <h1 className="mt-2 text-2xl font-semibold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your profile, generation credits, and recent credit activity.
          </p>
        </div>
        {message ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>
        ) : null}

        <dl className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Display name
            </dt>
            <dd className="mt-1 font-medium">{profile?.display_name || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </dt>
            <dd className="mt-1 break-all font-medium">{email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Credits
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-primary">
              {creditBalance ?? "Unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Created
            </dt>
            <dd className="mt-1 font-medium">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "Pending profile"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              User ID
            </dt>
            <dd className="mt-1 break-all font-mono text-xs">{userId}</dd>
          </div>
        </dl>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Recent credit activity</h2>
            <p className="text-sm text-muted-foreground">
              Generation charges and automatic refunds are recorded here.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            {ledger.length ? (
              <ul className="divide-y divide-border">
                {ledger.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{formatReason(entry.reason)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          entry.delta > 0
                            ? "font-semibold text-emerald-500"
                            : "font-semibold text-foreground"
                        }
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance {entry.balance_after}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No credit activity yet.
              </p>
            )}
          </div>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </section>
    </main>
  );
}
