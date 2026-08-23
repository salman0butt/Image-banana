import Link from "next/link";

import { getConfiguredSignupCredits } from "@/lib/credits";

export default function HomePage() {
  const signupCredits = getConfiguredSignupCredits();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-24 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">
          AI-powered image editing
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          Describe the change. Keep creating.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
          Upload an image, describe what you want changed, and refine the result with Image&apos;s Banana.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-zinc-950" href="/auth/register?next=%2Feditor">
            Start Creating Free
          </Link>
          <Link className="rounded-lg border border-zinc-700 px-5 py-3 font-semibold" href="/auth/login?next=%2Feditor">
            Log in
          </Link>
        </div>
        {signupCredits > 0 ? (
          <p className="mt-4 text-sm text-zinc-500">{signupCredits} signup credits when your wallet is provisioned.</p>
        ) : null}
      </div>
    </main>
  );
}
