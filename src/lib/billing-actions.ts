"use server";

import { redirect } from "next/navigation";
import { db } from "./db";
import { findPlan } from "./plans";
import { requireUser } from "./session";
import { appUrl, fakeBillingEnabled, planPurchasable, stripe, stripePrice } from "./stripe";

export async function startCheckout(planId: string) {
  const user = await requireUser();
  const plan = findPlan(planId);
  if (!plan) throw new Error("Unknown plan");

  if (fakeBillingEnabled()) {
    const days = plan.id === "annual" ? 365 : 30;
    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionPlan: plan.id,
        currentPeriodEnd: new Date(Date.now() + days * 86_400_000),
      },
    });
    redirect("/billing?success=1");
  }
  // Half-finished Stripe set-up (e.g. a secret key but no price ids) shows a
  // message on the billing page instead of an error page.
  if (!planPurchasable(plan)) {
    console.error(`Cannot start checkout: STRIPE_SECRET_KEY or ${plan.stripePriceEnv} is not set`);
    redirect("/billing?unavailable=1");
  }
  const price = stripePrice(plan)!;

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id, plan: plan.id } },
    allow_promotion_codes: true,
    success_url: appUrl("/billing?success=1"),
    cancel_url: appUrl("/billing"),
  });
  redirect(session.url!);
}

export async function openBillingPortal() {
  const user = await requireUser();
  if (fakeBillingEnabled()) {
    await db.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: "CANCELED", subscriptionPlan: null, currentPeriodEnd: null },
    });
    redirect("/billing");
  }
  if (!user.stripeCustomerId) redirect("/billing");
  const session = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: appUrl("/billing"),
  });
  redirect(session.url);
}
