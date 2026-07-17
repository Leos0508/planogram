"use server";

import type { ActionResult } from "@/lib/result";
import {
  getAppBaseUrl,
  getStripe,
  getStripePriceId,
} from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceOwner } from "@/lib/workspaces/current";

export async function createCheckoutSession(): Promise<
  ActionResult<{ url: string }>
> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) {
      return {
        ok: false,
        message:
          access.message === "You must be signed in."
            ? access.message
            : "Only the workspace owner can manage billing.",
      };
    }

    const { workspace } = access;
    const stripe = getStripe();
    const priceId = getStripePriceId();
    const baseUrl = getAppBaseUrl();

    let customerId = (
      await prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: { stripeCustomerId: true },
      })
    )?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: workspace.user.email,
        name: workspace.name,
        metadata: {
          workspaceId: workspace.id,
        },
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/billing?checkout=success`,
      cancel_url: `${baseUrl}/settings/billing?checkout=cancel`,
      client_reference_id: workspace.id,
      metadata: {
        workspaceId: workspace.id,
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
        },
      },
    });

    if (!session.url) {
      return { ok: false, message: "Stripe did not return a Checkout URL." };
    }

    return { ok: true, data: { url: session.url } };
  } catch (error) {
    console.error("[createCheckoutSession]", error);
    return {
      ok: false,
      message:
        error instanceof Error && error.message.includes("not configured")
          ? error.message
          : "Failed to start checkout.",
    };
  }
}

export async function createBillingPortalSession(): Promise<
  ActionResult<{ url: string }>
> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) {
      return {
        ok: false,
        message:
          access.message === "You must be signed in."
            ? access.message
            : "Only the workspace owner can manage billing.",
      };
    }

    const row = await prisma.workspace.findUnique({
      where: { id: access.workspace.id },
      select: { stripeCustomerId: true },
    });

    if (!row?.stripeCustomerId) {
      return {
        ok: false,
        message: "No billing account yet. Upgrade first.",
      };
    }

    const stripe = getStripe();
    const baseUrl = getAppBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripeCustomerId,
      return_url: `${baseUrl}/settings/billing`,
    });

    return { ok: true, data: { url: session.url } };
  } catch (error) {
    console.error("[createBillingPortalSession]", error);
    return {
      ok: false,
      message:
        error instanceof Error && error.message.includes("not configured")
          ? error.message
          : "Failed to open billing portal.",
    };
  }
}
