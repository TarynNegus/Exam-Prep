import type { User } from "@prisma/client";

export function hasSubscription(user: Pick<User, "subscriptionStatus" | "currentPeriodEnd">): boolean {
  if (user.subscriptionStatus !== "ACTIVE" && user.subscriptionStatus !== "TRIALING") return false;
  return !user.currentPeriodEnd || user.currentPeriodEnd.getTime() > Date.now();
}
