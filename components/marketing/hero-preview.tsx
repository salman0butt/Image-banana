import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Brush, Coins, ImageIcon, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MARKETING_GENERATION_MODES } from "@/lib/marketing";

type HeroProps = {
  authenticated: boolean;
  signupCredits: number;
};

export function Hero({ authenticated, signupCredits }: HeroProps) {
  const primaryHref = authenticated ? "/editor" : "/auth/register?next=%2Feditor";
  const primaryLabel = authenticated ? "Open Editor" : "Start Creating Free";

  return (
    <section className="relative overflow-hidden border-b border-zinc-900">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[34rem] opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(250,204,21,0.14), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-powered image editing
          </div>
          <h1 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Describe the change.
            <span className="block text-yellow-400">Keep creating.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            Upload an image, tell Image&apos;s Banana what you want changed, and refine the result with precision tools, references, and AI model presets.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 bg-yellow-400 px-6 font-semibold text-zinc-950 hover:bg-yellow-300">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-zinc-700 bg-zinc-950/60 px-6 text-zinc-200 hover:bg-zinc-900 hover:text-white">
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            {signupCredits > 0
              ? `${signupCredits} signup credits · No payment details required to create an account`
              : "No payment details required to create an account"}
          </p>
        </div>

        <div className="mt-14 sm:mt-16">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const defaultMode = MARKETING_GENERATION_MODES[0];

  return (
    <div className="mx-auto overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 lg:max-w-6xl">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" width={28} height={28} alt="" className="size-7 rounded-lg" />
          <span className="text-sm font-semibold text-zinc-200">Image&apos;s Banana Editor</span>
        </div>
        <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
          <Coins className="size-3.5 text-yellow-400" aria-hidden="true" />
          Clear credit cost before generation
        </div>
      </div>

      <div className="grid min-h-[29rem] md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-zinc-800 bg-zinc-950/80 p-4 md:block" aria-label="Editor preview tools">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-600">Tools</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Select", icon: Square },
              { label: "Brush", icon: Brush },
              { label: "AI Edit", icon: Sparkles },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-[0.7rem] text-zinc-400">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs font-medium text-zinc-300">AI editing</p>
            <div className="mt-3 space-y-2 text-xs text-zinc-500">
              <p>Remove background</p>
              <p>Style filters</p>
              <p>Expand canvas</p>
              <p>Reference files</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col bg-zinc-900/30">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5 sm:p-8">
            <div
              className="absolute inset-0 opacity-[0.05]"
              aria-hidden="true"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            <div className="relative aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
              <Image
                src="/image.jpg"
                alt="Example image displayed inside the Image's Banana editor preview"
                fill
                priority
                sizes="(max-width: 768px) 90vw, 60vw"
                className="object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/65 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur">
                Source image
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 bg-zinc-950 p-3 sm:p-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex min-h-12 items-center gap-3 text-sm text-zinc-300">
                <ImageIcon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate sm:whitespace-normal">
                  Replace the background with a neon city at night and keep the subject unchanged.
                </span>
                <span className="hidden shrink-0 rounded-md bg-yellow-400 px-3 py-2 text-xs font-semibold text-zinc-950 sm:inline-flex">
                  Generate · {defaultMode.creditCost}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2 text-[0.7rem] text-zinc-500">
                <span className="rounded border border-zinc-800 px-2 py-1">Reference</span>
                <span className="rounded border border-zinc-800 px-2 py-1">Search</span>
                <span className="rounded border border-zinc-800 px-2 py-1">{defaultMode.label}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-yellow-300 sm:hidden">
                  <Coins className="size-3" aria-hidden="true" />
                  {defaultMode.creditCost} credits
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
