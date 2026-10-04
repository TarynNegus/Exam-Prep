export type PlanId = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  description: string;
  /** Environment variable holding the Stripe price id for this plan. */
  stripePriceEnv: string;
}

export const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "Monthly",
    priceLabel: "$9.99/mo",
    description: "Every topic and full past paper in all subjects. Cancel any time.",
    stripePriceEnv: "STRIPE_PRICE_MONTHLY",
  },
  {
    id: "annual",
    name: "Annual",
    priceLabel: "$79/yr",
    description: "Everything in Monthly for a full exam year, saving over 30%.",
    stripePriceEnv: "STRIPE_PRICE_ANNUAL",
  },
];

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}
