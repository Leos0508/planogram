import type Stripe from "stripe";
import { WorkspaceTier } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tierFromSubscriptionStatus } from "@/lib/workspaces/limits";

export async function applySubscriptionToWorkspace(input: {
  workspaceId: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
}): Promise<void> {
  const tier = tierFromSubscriptionStatus(input.status);
  await prisma.workspace.update({
    where: { id: input.workspaceId },
    data: {
      tier,
      stripeCustomerId: input.customerId ?? undefined,
      stripeSubscriptionId: input.subscriptionId,
      stripeSubscriptionStatus: input.status,
    },
  });
}

export async function clearWorkspaceSubscription(
  workspaceId: string,
): Promise<void> {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      tier: WorkspaceTier.FREE,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "canceled",
    },
  });
}

export async function findWorkspaceIdForStripeCustomer(
  customerId: string,
): Promise<string | null> {
  const byCustomer = await prisma.workspace.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return byCustomer?.id ?? null;
}

export async function syncWorkspaceFromSubscription(
  subscription: Stripe.Subscription,
  workspaceIdHint?: string | null,
): Promise<void> {
  const workspaceId =
    workspaceIdHint ??
    subscription.metadata?.workspaceId ??
    (typeof subscription.customer === "string"
      ? await findWorkspaceIdForStripeCustomer(subscription.customer)
      : null);

  if (!workspaceId) {
    console.error(
      "[billing] Missing workspaceId for subscription",
      subscription.id,
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await applySubscriptionToWorkspace({
    workspaceId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

export async function cancelStripeSubscriptionIfPresent(input: {
  stripeSubscriptionId: string | null;
}): Promise<void> {
  if (!input.stripeSubscriptionId) return;
  const { getStripe } = await import("@/lib/billing/stripe");
  const stripe = getStripe();
  try {
    await stripe.subscriptions.cancel(input.stripeSubscriptionId);
  } catch (error) {
    console.error("[billing] Failed to cancel subscription on delete", error);
  }
}
