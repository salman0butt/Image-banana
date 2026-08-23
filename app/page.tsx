import { BenefitsStrip, FeaturesAndTools, HowItWorks, TransformationShowcase, UseCases } from "@/components/marketing/product-sections";
import { CreditsAndPricing } from "@/components/marketing/credits-pricing";
import { FinalCtaAndFooter } from "@/components/marketing/footer-cta";
import { Hero } from "@/components/marketing/hero-preview";
import { MarketingNavbar } from "@/components/marketing/marketing-navbar";
import { SecurityAndFaq } from "@/components/marketing/trust-faq";
import { getConfiguredSignupCredits } from "@/lib/credits";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

async function isAuthenticated(): Promise<boolean> {
  if (!getSupabasePublicConfig()) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    return !error && typeof data?.claims?.sub === "string";
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const authenticated = await isAuthenticated();
  const signupCredits = getConfiguredSignupCredits();

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <MarketingNavbar authenticated={authenticated} />
      <main>
        <Hero authenticated={authenticated} signupCredits={signupCredits} />
        <BenefitsStrip />
        <FeaturesAndTools />
        <TransformationShowcase />
        <HowItWorks />
        <UseCases />
        <CreditsAndPricing authenticated={authenticated} signupCredits={signupCredits} />
        <SecurityAndFaq signupCredits={signupCredits} />
        <FinalCtaAndFooter authenticated={authenticated} />
      </main>
    </div>
  );
}
