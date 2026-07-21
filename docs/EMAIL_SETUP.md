# Resend email setup guide (Planogram)

Transactional email for **forgot-password** (S7) and later **workspace invites** (S8).  
Stack: [Resend](https://resend.com) · env vars · `lib/email/send.ts`.

Related: smoke checklist [`EMAIL_SMOKE_TEST.md`](./EMAIL_SMOKE_TEST.md) · Linear [PLA-65](https://linear.app/planogram/issue/PLA-65/resend-transactional-email-foundation).

---

## 1. What you need (and what you do not)

| You need | You do **not** need |
| -- | -- |
| A Resend account | A mailbox that receives mail for `noreply@…` |
| An API key (`RESEND_API_KEY`) | Gmail/Outlook “app passwords” |
| A **From** address Resend will accept (`EMAIL_FROM`) | Running your own SMTP server |
| Correct app base URL (`AUTH_URL` / `NEXT_PUBLIC_APP_URL`) so reset links work | OAuth / Google login for email |

Planogram only **sends** mail (password reset links, later invites). Recipients get them in *their* inbox. The From address is a **sending identity**, not an inbox you must create at a mail host.

---

## 2. Concepts

```text
User clicks “Forgot password”
        → app creates a one-time token
        → Resend sends email From: EMAIL_FROM  To: user@…
        → user opens link → /reset-password?token=…
```

| Env var | Role |
| -- | -- |
| `RESEND_API_KEY` | Auth to Resend API (`re_…`) |
| `EMAIL_FROM` | Sender shown to users, e.g. `Planogram <noreply@yourdomain.com>` |
| `AUTH_URL` or `NEXT_PUBLIC_APP_URL` | Base URL baked into reset links (must match how users open the app) |

Code path: [`lib/email/send.ts`](../lib/email/send.ts) → [`lib/auth/password-actions.ts`](../lib/auth/password-actions.ts).

---

## 3. Path A — Local / first test (no domain yet)

Use this to prove the integration before buying/verifying a domain.

### 3.1 Create a Resend account

1. Go to [https://resend.com/signup](https://resend.com/signup) and sign up.
2. Open [API Keys](https://resend.com/api-keys) → **Create API Key**.
3. Name it e.g. `planogram-local`, permission **Sending access**.
4. Copy the key once (`re_…`). Store it only in `.env` / Vercel — never commit it.

### 3.2 Use Resend’s test sender

For early testing Resend allows a shared onboarding sender:

```text
EMAIL_FROM="Planogram <onboarding@resend.dev>"
```

**Limits (important):**

- Intended for **development / testing only** — do **not** use in production.
- With `onboarding@resend.dev`, you can typically only send **to the email address of your Resend account** (not arbitrary customers).
- Prefer Resend’s test recipients when experimenting with the API alone: `delivered@resend.dev`, `bounced@resend.dev`, etc. (see [Resend Node.js docs](https://resend.com/docs/send-with-nodejs)).

### 3.3 Local `.env`

In the project root `.env` (or `.env.local`):

```bash
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="Planogram <onboarding@resend.dev>"

# Reset links must point at your running app
AUTH_URL="http://localhost:3000"
# or:
# NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Restart `pnpm dev` after changing env.

### 3.4 Smoke the API

```bash
pnpm exec tsx -e '
import "dotenv/config";
import { sendEmail } from "./lib/email/send.ts";
const r = await sendEmail({
  to: "YOUR_RESEND_ACCOUNT_EMAIL@example.com",
  subject: "Planogram email smoke",
  html: "<p>Resend OK</p>",
  text: "Resend OK",
});
console.log(r);
'
```

Expect `{ ok: true, data: { id: "…" } }`. Check [Resend → Emails](https://resend.com/emails) and your inbox.

### 3.5 Smoke forgot-password in the app

1. Register / sign in with the **same email** you can receive on (usually your Resend account email while on `onboarding@resend.dev`).
2. Sign out → `/forgot-password` → submit that email.
3. Open the message → follow the link → set a new password → `/login`.

**Change password** (Settings → Account) does **not** need Resend.

---

## 4. Path B — Production (your domain)

Required before real users. Resend will reject production sends from `onboarding@resend.dev`.

### 4.1 Add a domain in Resend

1. Open [https://resend.com/domains](https://resend.com/domains) → **Add Domain**.
2. Enter the domain you control, e.g. `yourdomain.com` (or a subdomain like `mail.yourdomain.com` if you prefer).
3. Resend shows DNS records to add (typically):
   - **DKIM** — TXT (or CNAME) for signing
   - **SPF** — TXT authorizing Resend to send
   - Often **MX** / return-path related records for bounce handling (follow the dashboard exactly)

Use your DNS host (Cloudflare, Namecheap, Vercel Domains, etc.). Copy values **exactly** as Resend shows them.

### 4.2 Wait for verification

1. After DNS propagates, click **Verify** in Resend (can take minutes to hours).
2. Status must be **Verified** before using that domain in `EMAIL_FROM`.

Useful checks:

- [https://mxtoolbox.com/SuperTool.aspx](https://mxtoolbox.com/SuperTool.aspx) — SPF/DKIM lookup
- Resend domain page — green / verified

### 4.3 Pick a From address

You do **not** create a mailbox at Google/Microsoft unless you want people to reply somewhere.

Recommended:

```text
EMAIL_FROM="Planogram <noreply@yourdomain.com>"
```

Optional later:

```text
EMAIL_FROM="Planogram <noreply@yourdomain.com>"
# and set replyTo in code to support@… if you add that field
```

Rules:

- Domain part of the address (`yourdomain.com`) must be the **verified** domain.
- Local part (`noreply`, `auth`, `hello`) can be anything; `noreply@` is conventional for transactional mail.

### 4.4 Production API key

1. Create a **separate** API key for production (e.g. `planogram-prod`) in [API Keys](https://resend.com/api-keys).
2. Prefer restricting by domain if Resend offers it for your plan.
3. Put the key only in **Vercel → Project → Settings → Environment Variables → Production** (and Preview if you want preview deploys to send mail).

### 4.5 Vercel environment variables

| Variable | Production example | Preview / Development |
| -- | -- | -- |
| `RESEND_API_KEY` | `re_…` (prod key) | test/local key or same restricted key |
| `EMAIL_FROM` | `Planogram <noreply@yourdomain.com>` | `onboarding@resend.dev` **or** verified domain |
| `AUTH_URL` | `https://your-production-domain.com` | Preview URL or leave Vercel default carefully |

**Reset links:** `AUTH_URL` / `NEXT_PUBLIC_APP_URL` must be the URL users actually open. Wrong base URL → reset link goes to localhost or the wrong host.

After saving env vars, **redeploy** Production.

### 4.6 Production smoke

1. Use a real user email (not only `delivered@resend.dev`).
2. `/forgot-password` → confirm mail arrives (check spam once).
3. Confirm From shows `Planogram <noreply@…>` and the link opens your production host.
4. Complete reset and sign in.
5. Confirm event in [Resend → Emails](https://resend.com/emails).

---

## 5. DNS cheat sheet (verify what Resend shows you)

Exact hostnames/values come from the Resend UI — do not invent them. Typical pattern:

| Type | Purpose |
| -- | -- |
| TXT / CNAME (DKIM) | Cryptographic signature; improves deliverability |
| TXT (SPF) | Lists Resend as allowed sender for the domain |
| MX / custom return-path (if requested) | Bounce / feedback handling |

If verification fails:

1. Wait for DNS TTL (up to 24–48h in bad cases; often &lt; 1h).
2. Confirm no conflicting SPF (`v=spf1` should include Resend’s include, not two competing policies without `include:` merge).
3. Re-check copy/paste (trailing dots, wrong subdomain).

Official: [Resend Domains](https://resend.com/docs/dashboard/domains/introduction).

DNS often verifies within **15 minutes**; worst case allow up to **72 hours**, then use **Restart verification** in Resend.

---

## 6. Security & ops habits

- Never commit `RESEND_API_KEY`.
- Rotate keys if leaked (create new → update Vercel → delete old).
- Keep **local** and **production** keys separate when possible.
- Password-reset tokens are single-use, hashed at rest, ~1h expiry (see `lib/auth/password-actions.ts`).
- Forgot-password UI always returns a **generic** success message (does not reveal whether the email exists).
- **Session revocation (PLA-67 / PLA-99):** Auth uses **JWT** sessions (`session.strategy: "jwt"`). Deleting Prisma `Session` rows alone does not clear browser cookies. On password reset/change we set `User.passwordChangedAt`. At sign-in the Node `jwt` callback stamps `pwdChangedAt` (and `pwdCheckedAt`) from the DB. Later Node `auth()` refreshes **re-check Postgres at most once per 60s** (`PWD_CHECK_INTERVAL_MS` in `lib/auth/pwd-check.ts`); within that window the JWT skips the DB hit. After the interval, if the DB timestamp is newer than `pwdChangedAt`, the callback returns `null` (clear cookie). Deleted users still invalidate on the next check. Middleware only checks the JWT signature (Edge-safe); full revocation applies on the next Node `auth()` after the throttle window (worst case ~60s for other browsers). Change-password also signs the current user out to `/login`.
- Rate limits: Resend defaults are generous for our volume; watch [429](https://resend.com/docs/api-reference/errors) if you bulk-test.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| -- | -- | -- |
| `RESEND_API_KEY is not configured` | Env missing / not loaded | Add to `.env`, restart `pnpm dev`; on Vercel redeploy |
| `EMAIL_FROM is not configured` | Missing `EMAIL_FROM` | Set friendly From string |
| Resend error about domain / from | Unverified domain or wrong From | Verify domain; match `EMAIL_FROM` domain |
| Mail only works to your own address | Still on `onboarding@resend.dev` | Verify domain (Path B) |
| Reset link opens wrong host | Bad `AUTH_URL` | Set production URL; redeploy |
| `{ ok: false, message: "Failed to send email." }` | API/network/Resend rejection | Check server logs + Resend Emails / Logs |
| Landed in spam | New domain / no DKIM | Finish DNS; warm domain; avoid spammy subject lines |

---

## 8. Checklist

### Local

- [ ] Resend account + API key
- [ ] `.env`: `RESEND_API_KEY`, `EMAIL_FROM`, `AUTH_URL=http://localhost:3000`
- [ ] One-shot `sendEmail` smoke succeeds
- [ ] Forgot-password flow works for an email you can receive

### Production

- [ ] Domain verified in Resend (DKIM/SPF green)
- [ ] `EMAIL_FROM` uses that domain (not `onboarding@resend.dev`)
- [ ] Production `RESEND_API_KEY` + `EMAIL_FROM` + `AUTH_URL` on Vercel
- [ ] Redeployed after env change
- [ ] Real-user forgot-password smoke passed

---

## 9. What comes next (S8)

[PLA-40](https://linear.app/planogram/issue/PLA-40/email-workspace-invites) will reuse the same `sendEmail` helper and `EMAIL_FROM` for workspace invite emails. No second provider.
