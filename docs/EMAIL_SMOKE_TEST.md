# Resend transactional email smoke (S7 / PLA-65)

Manual check that Resend can send mail from the app.

**Full setup guide (account, domain DNS, Vercel, troubleshooting):** [`EMAIL_SETUP.md`](./EMAIL_SETUP.md).

Automated unit coverage: `lib/email/__tests__/send.test.ts`, `lib/auth/__tests__/password.test.ts`.

## Prerequisites

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) §3 (local) or §4 (production). Minimum:

1. [Resend](https://resend.com) account + API key
2. `EMAIL_FROM` — `onboarding@resend.dev` locally, or a **verified domain** address in production
3. In `.env` / Vercel (see `.env.example`):
   - `RESEND_API_KEY=re_…`
   - `EMAIL_FROM="Planogram <…>"`
   - `AUTH_URL` or `NEXT_PUBLIC_APP_URL` (reset links)

## Local one-shot send (Node)

With env loaded (`dotenv` reads `.env`):

```bash
pnpm exec tsx -e '
import "dotenv/config";
import { sendEmail } from "./lib/email/send.ts";
const r = await sendEmail({
  to: "you@example.com",
  subject: "Planogram email smoke",
  html: "<p>Resend OK</p>",
  text: "Resend OK",
});
console.log(r);
'
```

With `onboarding@resend.dev`, `to` must be **your Resend account email**. Expect `{ ok: true, data: { id: "…" } }`. Check the Resend dashboard and inbox.

## App flows

1. `/forgot-password` → submit a registered email → receive reset link.
2. Open link → set new password → sign in.
3. Settings → Account → Change password (PLA-41) does **not** require Resend.

## Out of scope

- Marketing / drip campaigns
- Email workspace invites (PLA-40 / S8)
