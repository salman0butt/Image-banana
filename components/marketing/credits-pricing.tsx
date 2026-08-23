import Link from "next/link";
import { Check, Clock, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPublicPricingPlans, MARKETING_GENERATION_MODES } from "@/lib/marketing";

type CreditsPricingProps = {
  authenticated: boolean;
  signupCredits: number;
};

export function CreditsAndPricing({ authenticated, signupCredits }: CreditsPricingProps) {
  const plans = getPublicPricingPlans(signupCredits);

  return (
    <>
      <section className="border-y border-zinc-900 bg-zinc-900/20 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Credits</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Simple credits. Cost shown before you create.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
              Each image generation uses a server-controlled credit cost based on the selected generation preset. Failed or cancelled provider requests are designed to refund their reserved generation charge.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {MARKETING_GENERATION_MODES.map((mode) => (
              <article key={mode.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <Coins className="size-5 text-yellow-400" aria-hidden="true" />
                <h3 className="mt-6 font-semibold text-zinc-100">{mode.label.replace("GPT Image 2 · ", "")}</h3>
                <p className="mt-1 text-2xl font-semibold text-white">{mode.creditCost} <span className="text-sm font-normal text-zinc-500">credits</span></p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{mode.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Start free. Paid plans are not pretending to be live.</h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              The credit wallet is implemented today. Subscription payments are intentionally deferred, so Creator and Pro are presented as coming-soon plan slots with no invented price or allowance.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const available = plan.status === "available";
              return (
                <article key={plan.id} className={`relative flex min-h-[27rem] flex-col rounded-2xl border p-6 ${available ? "border-yellow-400/40 bg-yellow-400/[0.04]" : "border-zinc-800 bg-zinc-900/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-100">{plan.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">{plan.description}</p>
                    </div>
                    {!available ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                        <Clock className="size-3" aria-hidden="true" />
                        Coming Soon
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-7">
                    {plan.monthlyPriceUsd === 0 ? (
                      <p className="text-4xl font-semibold tracking-tight text-white">$0</p>
                    ) : (
                      <p className="text-2xl font-semibold text-zinc-300">Price to be announced</p>
                    )}
                  </div>

                  <ul className="mt-7 space-y-3 text-sm text-zinc-400">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5">
                        <Check className={`mt-0.5 size-4 shrink-0 ${available ? "text-yellow-400" : "text-zinc-600"}`} aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    {available ? (
                      <Button asChild className="w-full bg-yellow-400 font-semibold text-zinc-950 hover:bg-yellow-300">
                        <Link href={authenticated ? "/editor" : "/auth/register?next=%2Feditor"}>
                          {authenticated ? "Open Editor" : "Start Free"}
                        </Link>
                      </Button>
                    ) : (
                      <Button type="button" disabled variant="outline" className="w-full border-zinc-700 bg-transparent text-zinc-500">
                        Coming soon
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-zinc-600">
            No live Stripe checkout or fake payment-success path is exposed. Subscription prices, recurring credit allowances, and annual billing will be published only when payment infrastructure is implemented.
          </p>
        </div>
      </section>
    </>
  );
}
