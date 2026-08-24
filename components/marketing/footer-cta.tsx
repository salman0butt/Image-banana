import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

import { Button } from "@/components/ui/button";

type FooterCtaProps = {
  authenticated: boolean;
};

export function FinalCtaAndFooter({ authenticated }: FooterCtaProps) {
  const primaryHref = authenticated ? "/editor" : "/auth/register?next=%2Feditor";
  const primaryLabel = authenticated ? "Open Editor" : "Start Creating Free";

  return (
    <>
      <section className="px-4 pb-20 pt-8 sm:px-6 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] px-6 py-12 sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-yellow-300">Ready to make the next edit?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Turn an instruction into an image change.</h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">Upload a source, describe what should change, and keep refining from one workspace.</p>
          </div>
          <Button asChild size="lg" className="mt-7 h-12 shrink-0 bg-yellow-400 px-6 font-semibold text-zinc-950 hover:bg-yellow-300 lg:mt-0">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-zinc-900 bg-black/20 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400">
                <Image src="/logo.png" width={38} height={38} alt="" className="size-9 rounded-lg" />
                <span className="font-semibold text-zinc-100">Image&apos;s <span className="text-yellow-400">Banana</span></span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">AI-powered image editing with precise controls, transparent generation credits, and a workflow built around iteration.</p>
              <Link
                href="https://github.com/salman0butt/Image-banana"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded text-sm text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              >
                <Github className="size-4" aria-hidden="true" />
                GitHub
              </Link>
            </div>

            <FooterColumn title="Product" links={[["Features", "#features"], ["Pricing", "#pricing"], ["Editor", "/editor"]]} />
            <FooterColumn title="Resources" links={[["How It Works", "#how-it-works"], ["FAQ", "#faq"]]} />
            <FooterColumn title="Account" links={authenticated ? [["Editor", "/editor"], ["Account", "/account"]] : [["Login", "/auth/login?next=%2Feditor"], ["Sign Up", "/auth/register?next=%2Feditor"]]} />
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Legal</h3>
              <div className="mt-4 space-y-3 text-sm text-zinc-600">
                <p>Privacy <span className="text-[0.65rem] uppercase tracking-wide">Coming soon</span></p>
                <p>Terms <span className="text-[0.65rem] uppercase tracking-wide">Coming soon</span></p>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-900 pt-6 text-sm text-zinc-600">
            © {new Date().getFullYear()} Image&apos;s Banana. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}

function FooterColumn({ title, links }: { title: string; links: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-zinc-500">
        {links.map(([label, href]) => (
          <li key={`${label}-${href}`}>
            <Link href={href} className="rounded transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
