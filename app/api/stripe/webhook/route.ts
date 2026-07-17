import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/billing/stripe";
import {
  clearWorkspaceSubscription,
  syncWorkspaceFromSubscription,
} from "@/lib/billing/sync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const workspaceId =
    session.metadata?.workspaceId ?? session.client_reference_id;
  if (!workspaceId) {
    console.error("[stripe webhook] checkout.session.completed missing workspaceId");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (customerId) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { stripeCustomerId: customerId },
    });
  }

  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncWorkspaceFromSubscription(subscription, workspaceId);
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    console.error("[stripe webhook] signature verify failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncWorkspaceFromSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId =
          subscription.metadata?.workspaceId ??
          (typeof subscription.customer === "string"
            ? (
                await prisma.workspace.findFirst({
                  where: { stripeCustomerId: subscription.customer },
                  select: { id: true },
                })
              )?.id
            : null);
        if (workspaceId) {
          await clearWorkspaceSubscription(workspaceId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe webhook] handler error", event.type, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
