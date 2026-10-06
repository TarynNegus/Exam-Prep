import "server-only";
import type Stripe from "stripe";
import { db } from "./db";
import { mapSubscriptionStatus, stripe } from "./stripe";

/** Copies a Stripe subscription's status, plan and period end onto the user who owns its customer. */
export async function applySubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEnd = subscription.items.data[0]?.current_period_end;
  await db.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionStatus: mapSubscriptionStatus(subscription.status),
      subscriptionPlan: subscription.metadata.plan ?? null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}

/**
 * Activates a subscription as soon as the student returns from Stripe Checkout,
 * without waiting for the webhook. The session must belong to this user.
 */
export async function syncCheckoutSession(userId: string, sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.client_reference_id !== userId || typeof session.customer !== "string") return;
    await db.user.updateMany({
      where: { id: userId, stripeCustomerId: null },
      data: { stripeCustomerId: session.customer },
    });
    if (session.subscription && typeof session.subscription === "object") {
      await applySubscription(session.subscription);
    }
  } catch (error) {
    // The webhook will still update the subscription; never break the billing page.
    console.error("Could not sync Stripe checkout session", error);
  }
}
