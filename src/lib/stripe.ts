import "server-only";
import Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** The Stripe price id for a plan, or null if its environment variable is not set. */
export function stripePrice(plan: { stripePriceEnv: string }): string | null {
  return process.env[plan.stripePriceEnv] || null;
}

/** True when a plan can be bought: Stripe has a secret key and the plan has a price. */
export function planPurchasable(plan: { stripePriceEnv: string }): boolean {
  return stripeConfigured() && stripePrice(plan) !== null;
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Development fallback that activates subscriptions without Stripe. */
export function fakeBillingEnabled(): boolean {
  return !stripeConfigured() && process.env.DEV_FAKE_BILLING === "true" && process.env.NODE_ENV !== "production";
}

export function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "NONE";
  }
}

export function appUrl(path: string): string {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}
