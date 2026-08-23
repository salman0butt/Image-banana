import { getPublicImageModelPresets } from "@/lib/image-models";

export type PublicPricingPlan = {
  id: "free" | "creator" | "pro";
  name: string;
  description: string;
  monthlyPriceUsd: number | null;
  monthlyCredits: number | null;
  status: "available" | "coming-soon";
  features: string[];
};

export const MARKETING_GENERATION_MODES = getPublicImageModelPresets();

export function getPublicPricingPlans(signupCredits: number): PublicPricingPlan[] {
  return [
    {
      id: "free",
      name: "Free",
      description: "Try the editor with a real credit wallet and the core creative workflow.",
      monthlyPriceUsd: 0,
      monthlyCredits: null,
      status: "available",
      features: [
        signupCredits > 0
          ? `${signupCredits} signup credits`
          : "Credit wallet included",
        "AI image editor",
        "Selection, brush, and erase tools",
        "Reference files and model presets",
        "Session edit history",
      ],
    },
    {
      id: "creator",
      name: "Creator",
      description: "A future subscription for people who create and iterate more often.",
      monthlyPriceUsd: null,
      monthlyCredits: null,
      status: "coming-soon",
      features: [
        "Planned recurring credit allowance",
        "Planned subscription billing",
        "Final limits published before launch",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      description: "A future higher-capacity option for professional creative workflows.",
      monthlyPriceUsd: null,
      monthlyCredits: null,
      status: "coming-soon",
      features: [
        "Planned higher generation capacity",
        "Planned subscription billing",
        "Final limits published before launch",
      ],
    },
  ];
}
