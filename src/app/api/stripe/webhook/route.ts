import type Stripe from "stripe";
import { db } from "@/lib/db";
import { mapSubscriptionStatus, stripe } from "@/lib/stripe";

// Keeps users' subscription status in sync with Stripe.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Webhook not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.client_reference_id && typeof session.customer === "string") {
        await db.user.updateMany({
          where: { id: session.client_reference_id, stripeCustomerId: null },
          data: { stripeCustomerId: session.customer },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
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
      break;
    }
  }
  return Response.json({ received: true });
}
