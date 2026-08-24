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
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[30rem] opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(250,204,21,0.14), transparent 55%)",
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-powered image editing
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
            Describe the change.
            <span className="block text-yellow-400">Keep creating.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            Upload an image, tell Image&apos;s Banana what you want changed, and refine the result with precision tools, references, and AI model presets.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
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

        <div className="mt-11 sm:mt-14">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const defaultMode = MARKETING_GENERATION_MODES[0];

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/logo.png" width={24} height={24} alt="" className="size-6 shrink-0 rounded-md" />
          <span className="truncate text-xs font-semibold text-zinc-200 sm:text-sm">Image&apos;s Banana Editor</span>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 text-[0.7rem] text-zinc-500 sm:flex">
          <Coins className="size-3.5 text-yellow-400" aria-hidden="true" />
          Cost shown before generation
        </div>
      </div>

      <div className="grid min-h-[19rem] sm:min-h-[22rem] md:grid-cols-[10.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-zinc-800 bg-zinc-950/80 p-3 md:block" aria-label="Editor preview tools">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-zinc-600">Tools</p>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {[
              { label: "Select", icon: Square },
              { label: "Brush", icon: Brush },
              { label: "AI", icon: Sparkles },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-1 py-2.5 text-[0.6rem] text-zinc-400">
                <Icon className="size-3.5" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
            <p className="text-[0.7rem] font-medium text-zinc-300">AI editing</p>
            <div className="mt-2 space-y-1.5 text-[0.65rem] leading-4 text-zinc-500">
              <p>Remove background</p>
              <p>Style filters</p>
              <p>Expand canvas</p>
              <p>Reference files</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col bg-zinc-900/30">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 sm:p-5 md:p-6">
            <div
              className="absolute inset-0 opacity-[0.05]"
              aria-hidden="true"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="relative aspect-[30/19] w-full max-w-xl overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl sm:rounded-xl">
              <Image
                src="/marketing/editor-source.svg"
                alt="Original studio scene with a yellow lounge chair shown inside the editor preview"
                fill
                priority
                unoptimized
                sizes="(max-width: 767px) 92vw, (max-width: 1100px) 68vw, 580px"
                className="object-cover"
              />
              <div className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/65 px-2 py-1 text-[0.65rem] font-medium text-white backdrop-blur sm:bottom-3 sm:left-3">
                Original image
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 bg-zinc-950 p-2.5 sm:p-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-2.5 sm:p-3">
              <div className="flex min-w-0 items-center gap-2.5 text-xs text-zinc-300 sm:text-sm">
                <ImageIcon className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 line-clamp-2">
                  Replace the studio wall with a warm sunset scene and keep the chair unchanged.
                </span>
                <span className="hidden shrink-0 rounded-md bg-yellow-400 px-2.5 py-1.5 text-[0.7rem] font-semibold text-zinc-950 sm:inline-flex">
                  Generate · {defaultMode.creditCost}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-zinc-800 pt-2 text-[0.62rem] text-zinc-500 sm:text-[0.68rem]">
                <span className="rounded border border-zinc-800 px-1.5 py-0.5">Reference</span>
                <span className="rounded border border-zinc-800 px-1.5 py-0.5">Search</span>
                <span className="max-w-full truncate rounded border border-zinc-800 px-1.5 py-0.5">{defaultMode.label}</span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-yellow-300 sm:hidden">
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
