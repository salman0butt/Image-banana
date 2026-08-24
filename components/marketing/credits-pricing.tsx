import Link from "next/link";
import { Check, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getPricingPlanHref,
  getPublicPricingPlans,
  MARKETING_GENERATION_MODES,
} from "@/lib/marketing";

type CreditsPricingProps = {
  authenticated: boolean;
  signupCredits: number;
};

export function CreditsAndPricing({ authenticated, signupCredits }: CreditsPricingProps) {
  const plans = getPublicPricingPlans(signupCredits);

  return (
    <>
      <section className="border-y border-zinc-900 bg-zinc-900/20 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Credits</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              Know the generation cost before you create.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              Each preset has a server-controlled credit cost. Failed or cancelled provider requests are designed to refund their reserved generation charge.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MARKETING_GENERATION_MODES.map((mode) => (
              <article key={mode.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <Coins className="size-4 text-yellow-400" aria-hidden="true" />
                  <span className="text-lg font-semibold text-white">
                    {mode.creditCost}{" "}
                    <span className="text-xs font-normal text-zinc-500">credits</span>
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-zinc-100">{mode.label.replace("GPT Image 2 · ", "")}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500 sm:text-sm">{mode.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              Start free. Scale when you need more credits.
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              Free, Creator, and Pro use the same editor and trusted model presets. Pick the credit capacity that fits how often you create.
            </p>
          </div>

          <div className="mt-10 grid items-stretch gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.id === "creator";
              const isFree = plan.id === "free";
              const href = getPricingPlanHref(plan.id, authenticated);

              return (
                <article
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-2xl border p-5 sm:p-6 ${
                    featured
                      ? "border-yellow-400/45 bg-yellow-400/[0.045] shadow-[0_0_0_1px_rgba(250,204,21,0.04)]"
                      : "border-zinc-800 bg-zinc-900/20"
                  }`}
                >
                  {featured ? (
                    <span className="absolute right-4 top-4 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-yellow-300">
                      Creator
                    </span>
                  ) : null}

                  <div className="pr-16">
                    <h3 className="text-xl font-semibold text-zinc-100">{plan.name}</h3>
                    <p className="mt-2 text-sm leading-5 text-zinc-500">{plan.description}</p>
                  </div>

                  <div className="mt-6 flex items-end gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight text-white">
                      ${plan.monthlyPriceUsd}
                    </span>
                    <span className="pb-1 text-sm text-zinc-500">
                      {isFree ? "forever" : "/ month"}
                    </span>
                  </div>
                  <p className="mt-1 min-h-5 text-xs font-medium text-yellow-300/90">
                    {plan.monthlyCredits
                      ? `${plan.monthlyCredits.toLocaleString()} credits each month`
                      : `${signupCredits} credits when you sign up`}
                  </p>

                  <ul className="mt-6 space-y-2.5 text-sm text-zinc-400">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <Check className="mt-0.5 size-4 shrink-0 text-yellow-400" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-7">
                    <Button
                      asChild
                      variant={featured ? "default" : "outline"}
                      className={
                        featured
                          ? "w-full bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300"
                          : "w-full border-zinc-700 bg-zinc-950/40 font-semibold text-zinc-100 hover:bg-zinc-900 hover:text-white"
                      }
                    >
                      <Link href={href}>
                        {isFree
                          ? authenticated
                            ? "Open Editor"
                            : "Start Free"
                          : `Choose ${plan.name}`}
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-zinc-600">
            Paid plan selection is available now. Credits are added only after a trusted billing provider confirms payment; the browser cannot grant itself paid credits.
          </p>
        </div>
      </section>
    </>
  );
}
