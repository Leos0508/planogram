# Stripe live-mode go-live checklist (S10 / PLA-75)

Ops path from **test** billing ([`BILLING_SMOKE_TEST.md`](./BILLING_SMOKE_TEST.md)) to **live** payments. App code is key-agnostic — this is configuration and verification only.

> **Warning:** Never mix test and live. Live keys (`sk_live_`, `pk_live_`, live Price ids, live webhook secrets) must not point at test Customers or test webhook endpoints. After swapping keys, existing test Customers in the DB will not work with live Stripe — treat go-live as a clean billing cutover for production.

## Prerequisites

- [ ] Stripe account activated for live charges (business details / payouts as required by Stripe).
- [ ] Test-mode smoke already passed (`docs/BILLING_SMOKE_TEST.md`).
- [ ] Production app URL stable (e.g. `https://your-app.vercel.app` or custom domain).

## 1. Live product + price

1. In Stripe Dashboard, switch to **Live** mode.
2. Create (or confirm) Product **Planogram Unlimited** with a recurring Price.
3. Copy the live `price_…` id for `STRIPE_PRICE_ID`.

## 2. Live API keys

1. Developers → API keys (Live): copy Secret key `sk_live_…`.
2. Optional: Publishable key `pk_live_…` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` if used later.

## 3. Live webhook

1. Developers → Webhooks → Add endpoint:
   - URL: `https://<production-host>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
2. Copy the endpoint signing secret `whsec_…` → `STRIPE_WEBHOOK_SECRET` (Production).

Do **not** reuse the test-mode `whsec_` or `stripe listen` secret in production.

## 4. Vercel env (Production)

Set / replace for **Production** (and only when ready for Preview):

| Variable | Live value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | live endpoint `whsec_…` |
| `STRIPE_PRICE_ID` | live `price_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` (if used) |
| `NEXT_PUBLIC_APP_URL` | production origin |

Redeploy after changing secrets.

## 5. Customer Portal (live)

1. Settings → Billing → Customer portal (Live): enable cancel / update payment method as for test.
2. Optional: branding, business name, support link.

## 6. Verify on live

Use a real card with a **small** charge you can refund, or Stripe’s recommended live verification flow for your region:

1. OWNER → Settings → Billing → Upgrade → complete Checkout.
2. Confirm webhook delivery (Stripe Dashboard → Webhooks → successful deliveries).
3. Workspace shows **Unlimited**.
4. Manage billing → Portal → cancel (or refund + cancel) → workspace returns to **Free** after webhook.
5. Confirm Free caps still enforce.

## Optional follow-ups

- [ ] Tax (Stripe Tax) — product decision; not required for Plan 01.
- [ ] Invoice PDF / receipts UI — out of scope; Stripe emails invoices by default.
- [ ] Separate Preview env staying on **test** keys while Production uses **live**.

## Out of scope

- App billing code changes
- Tax / invoices product UI
