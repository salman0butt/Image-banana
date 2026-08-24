import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Coins,
  Github,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthMode = "login" | "register";

type AuthPageShellProps = {
  mode: AuthMode;
  title: string;
  description: string;
  alternateHref: string;
  alternateLabel: string;
  alternatePrompt: string;
  children: ReactNode;
};

const navItems = [
  ["Features", "/#features"],
  ["How It Works", "/#how-it-works"],
  ["Pricing", "/#pricing"],
  ["FAQ", "/#faq"],
] as const;

const benefits = [
  "Precision selection, brush, and erase tools",
  "Server-controlled model presets and credit costs",
  "Persistent generation history across sessions",
] as const;

export function AuthPageShell({
  mode,
  title,
  description,
  alternateHref,
  alternateLabel,
  alternatePrompt,
  children,
}: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Image's Banana home"
            className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
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

          <nav
            aria-label="Authentication page navigation"
            className="hidden items-center gap-6 text-sm text-zinc-400 lg:flex"
          >
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-sm transition-colors hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-zinc-500 md:inline">
              {alternatePrompt}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900 hover:text-white"
            >
              <Link href={alternateHref}>{alternateLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(250,204,21,0.09), transparent 28%), radial-gradient(circle at 88% 82%, rgba(250,204,21,0.05), transparent 25%)",
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/80 shadow-2xl shadow-black/40 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative hidden min-h-[640px] overflow-hidden border-r border-zinc-800 lg:block">
            <Image
              src="/marketing/editor-source.svg"
              alt="Original yellow lounge chair studio scene used in the Image's Banana editor"
              fill
              unoptimized
              priority
              sizes="560px"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/10"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.14]"
              aria-hidden="true"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />

            <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-black/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-yellow-300 backdrop-blur-md">
                <Sparkles className="size-3.5" aria-hidden="true" />
                AI image editing workspace
              </div>
              <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-[-0.035em] text-white xl:text-4xl">
                Create, refine, and keep your best image generations in one place.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-300/80">
                Start with a source image, describe the change, and iterate with transparent credit costs and persistent history.
              </p>

              <ul className="mt-6 space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-zinc-200">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-300">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="flex min-h-[560px] items-center bg-zinc-950/70 px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[640px] lg:px-10 xl:px-14">
            <div className="mx-auto w-full max-w-md">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 rounded-md text-sm text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to homepage
              </Link>

              <div className="mb-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">
                  {mode === "login" ? "Welcome back" : "Create your workspace"}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
                  {description}
                </p>
              </div>

              {children}

              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-yellow-400" aria-hidden="true" />
                  Secure account access
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="size-4 shrink-0 text-yellow-400" aria-hidden="true" />
                  Transparent credits
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-black/20 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Image&apos;s Banana. All rights reserved.</p>
          <nav aria-label="Authentication footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link className="transition-colors hover:text-zinc-300" href="/#pricing">
              Pricing
            </Link>
            <Link className="transition-colors hover:text-zinc-300" href="/#faq">
              FAQ
            </Link>
            <Link
              className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-300"
              href="https://github.com/salman0butt/Image-banana"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="size-3.5" aria-hidden="true" />
              GitHub
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
