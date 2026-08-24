import { getPublicImageModelPresets } from "@/lib/image-models";

export type PublicPricingPlan = {
  id: "free" | "creator" | "pro";
  name: string;
  description: string;
  monthlyPriceUsd: number;
  monthlyCredits: number | null;
  status: "available";
  features: string[];
};

export const MARKETING_GENERATION_MODES = getPublicImageModelPresets();

export function getPublicPricingPlans(signupCredits: number): PublicPricingPlan[] {
  return [
    {
      id: "free",
      name: "Free",
      description: "Try the complete editor workflow and decide what you want to create next.",
      monthlyPriceUsd: 0,
      monthlyCredits: null,
      status: "available",
      features: [
        signupCredits > 0
          ? `${signupCredits} signup credits`
          : "Credit wallet included",
        "AI image editor",
        "Selection, brush, and erase tools",
        "Reference images and PDFs",
        "Persistent generation history",
      ],
    },
    {
      id: "creator",
      name: "Creator",
      description: "For regular creators who need more room to experiment and iterate.",
      monthlyPriceUsd: 12,
      monthlyCredits: 300,
      status: "available",
      features: [
        "300 monthly generation credits",
        "Everything in Free",
        "All generation presets",
        "Reference images and PDFs",
        "Persistent generation history",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      description: "For higher-volume professional image editing and production workflows.",
      monthlyPriceUsd: 29,
      monthlyCredits: 1000,
      status: "available",
      features: [
        "1,000 monthly generation credits",
        "Everything in Creator",
        "All generation presets",
        "Full editor toolset",
        "Persistent generation history",
      ],
    },
  ];
}

export function getPublicPricingPlan(
  signupCredits: number,
  planId: string | undefined,
): PublicPricingPlan | null {
  if (!planId) return null;
  return getPublicPricingPlans(signupCredits).find((plan) => plan.id === planId) ?? null;
}

export function getPricingPlanHref(
  planId: PublicPricingPlan["id"],
  authenticated: boolean,
): string {
  if (planId === "free") {
    return authenticated ? "/editor" : "/auth/register?next=%2Feditor";
  }

  const destination = `/account?plan=${planId}`;
  return authenticated
    ? destination
    : `/auth/register?next=${encodeURIComponent(destination)}`;
}
