# Stripe billing smoke checklist (S5 / PLA-56)

Manual verification in **Stripe test mode**. Automated unit coverage lives under `lib/workspaces/__tests__/limits.test.ts` and `lib/billing/__tests__/`.

## Prerequisites

1. Set in `.env` (see `.env.example`):
   - `STRIPE_SECRET_KEY` (test)
   - `STRIPE_PRICE_ID` (recurring Price for Unlimited)
   - `STRIPE_WEBHOOK_SECRET`
2. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Run `pnpm db:migrate` (applies `workspace_stripe_billing` migration) and `pnpm dev`.

## Checklist

### Checkout → Unlimited

1. Sign in as workspace **OWNER**.
2. Open **Settings → Billing**. Confirm Free plan badge.
3. Click **Upgrade to Unlimited** → complete Checkout with test card `4242…`.
4. Return to `/settings/billing?checkout=success`.
5. Confirm webhook logs `checkout.session.completed` / `customer.subscription.*`.
6. Refresh Billing: plan shows **Unlimited**; switcher badge shows Unlimited.

### Portal cancel → Free

1. From Billing, **Manage billing** → Customer Portal.
2. Cancel subscription (immediate or at period end per Portal config).
3. After `customer.subscription.deleted` (or status change), workspace returns to **Free**.
4. Free caps apply again (block new creates; existing planograms remain).

### Free caps

1. On a Free workspace with **20** planograms, **New** is disabled with upgrade hint; server rejects create.
2. User owning **3** Free workspaces cannot create a 4th until they own ≥1 Unlimited workspace.
3. After upgrading workspace A to Unlimited, user can create a 4th owned workspace (starts Free).
4. Workspace B (still Free) remains capped at 20 planograms.

### Permissions

1. Non-OWNER member sees plan badge but no Upgrade / Manage actions.
2. OWNER-only Checkout and Portal server.

### Delete workspace

1. Delete an Unlimited workspace (sole OWNER) → Stripe subscription canceled when `stripeSubscriptionId` is present.

## Out of scope

- Live-mode go-live / Tax / invoices UI
- Playwright automation of Stripe Checkout
