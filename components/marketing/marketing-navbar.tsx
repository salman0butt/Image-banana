"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

type MarketingNavbarProps = {
  authenticated: boolean;
};

export function MarketingNavbar({ authenticated }: MarketingNavbarProps) {
  const [open, setOpen] = useState(false);
  const primaryHref = authenticated ? "/editor" : "/auth/register?next=%2Feditor";
  const primaryLabel = authenticated ? "Open Editor" : "Start Creating Free";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          aria-label="Image's Banana home"
        >
          <Image
            src="/logo.png"
            width={40}
            height={40}
            alt=""
            priority
            className="size-10 rounded-xl object-cover p-0.5"
          />
          <span className="truncate text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">
            Image&apos;s <span className="text-yellow-400">Banana</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-zinc-400 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {authenticated ? (
            <Button asChild variant="ghost" className="text-zinc-300 hover:bg-zinc-900 hover:text-white">
              <Link href="/account">
                <UserRound aria-hidden="true" />
                Account
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" className="text-zinc-300 hover:bg-zinc-900 hover:text-white">
              <Link href="/auth/login?next=%2Feditor">Log in</Link>
            </Button>
          )}
          <Button asChild className="bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 lg:hidden"
          aria-controls="mobile-navigation"
          aria-expanded={open}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-navigation" className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-zinc-800 pt-4 sm:grid-cols-2">
              {authenticated ? (
                <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950">
                  <Link href="/account" onClick={() => setOpen(false)}>
                    Account
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950">
                  <Link href="/auth/login?next=%2Feditor" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
              )}
              <Button asChild className="bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300">
                <Link href={primaryHref} onClick={() => setOpen(false)}>
                  {primaryLabel}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
