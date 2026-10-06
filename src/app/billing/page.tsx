import { hasSubscription } from "@/lib/access";
import { db } from "@/lib/db";
import { openBillingPortal, startCheckout } from "@/lib/billing-actions";
import { findPlan, PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { fakeBillingEnabled, planPurchasable } from "@/lib/stripe";
import { syncCheckoutSession } from "@/lib/subscriptions";

export const metadata = { title: "Subscription" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; unavailable?: string; session_id?: string }>;
}) {
  const { success, unavailable, session_id: sessionId } = await searchParams;
  let user = await requireUser();
  // Returning from Stripe Checkout: activate straight away rather than waiting for the
  // webhook, then re-read the user (currentUser is cached for this request).
  if (sessionId) {
    await syncCheckoutSession(user.id, sessionId);
    user = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  }
  const subscribed = hasSubscription(user);
  const fake = fakeBillingEnabled();
  const purchasable = (plan: (typeof PLANS)[number]) => fake || planPurchasable(plan);
  const available = PLANS.some(purchasable);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Subscription</h1>
      {success && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Thank you! Your subscription is being activated. It may take a few seconds to appear.
        </p>
      )}
      {fake && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Development mode: Stripe is not configured, so subscribing activates the plan immediately without payment.
        </p>
      )}

      {subscribed ? (
        <div className="card space-y-3">
          <p>
            You are subscribed to the <strong>{findPlan(user.subscriptionPlan ?? "")?.name ?? "Pro"}</strong> plan
            {user.currentPeriodEnd && <> until {user.currentPeriodEnd.toLocaleDateString("en-GB")}</>}.
          </p>
          <form action={openBillingPortal}>
            <button className="btn-secondary">{fake ? "Cancel subscription (dev)" : "Manage billing"}</button>
          </form>
        </div>
      ) : (
        <>
          {user.subscriptionStatus === "PAST_DUE" && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Your last payment failed. Update your payment details to keep access.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div key={plan.id} className="card flex flex-col">
                <h2 className="font-semibold">{plan.name}</h2>
                <p className="my-2 text-3xl font-bold">{plan.priceLabel}</p>
                <p className="flex-1 text-sm text-slate-600">{plan.description}</p>
                <form action={startCheckout.bind(null, plan.id)} className="mt-4">
                  <button className="btn-primary w-full" disabled={!purchasable(plan)}>
                    Subscribe
                  </button>
                </form>
              </div>
            ))}
          </div>
          {(!available || unavailable) && (
            <p className="text-sm text-slate-500">Subscriptions are not available yet. Please check back soon.</p>
          )}
        </>
      )}
    </div>
  );
}
