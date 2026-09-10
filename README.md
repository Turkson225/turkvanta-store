# JEDI’S STORE — Everyday, elevated.

A prelaunch Ghanaian ecommerce store built for Turk Innovation. Emerald green, white and charcoal branding; 24 illustrative products across Tech & Audio, Home & Living, Style & Carry, and Everyday Essentials.

**Contact:** turkinnovation@gmail.com · 055 459 8191 · WhatsApp +233554598191.

## Current state

The storefront, product pages, search and category/price/stock filters, wishlist, shopping bag, checkout steps, owner preview, editable product catalog and homepage, customer account screens, and support/policy pages are implemented. The preview is deliberately unconnected to a real Supabase project and cannot take payments. Demo product/content edits last for the current client session; the shopping bag and wishlist stay on that device. Real records use Supabase when configured.

The initial preview is privately hosted through ChatGPT Sites. The same application also builds with standard Next.js for Netlify. The source repository is [Turkson225/turkvanta-store](https://github.com/Turkson225/turkvanta-store). No Supabase migrations, merchant setup, emails, or financial transactions have been performed externally.

This is a working prelaunch foundation, not a claim that a live commerce operation has passed integration testing. Complete the launch checks below before setting STORE_LIVE=true.

## Project map

- `app/`: server-rendered pages, metadata, and same-origin API.
- `components/store/`: storefront, checkout, owner and customer experiences.
- `lib/store/catalog.ts`: illustrative sample catalog.
- `lib/store/server.ts`: trusted Supabase and session bridge.
- `lib/runtime.ts`: standard Next.js runtime environment.
- `lib/runtime.cloudflare.ts`: Sites environment adapter, selected only by Vite.
- `public/images/`: optimized, locally hosted sample product photos.
- `docs/image-sources.json`: image sources and reuse information.
- `supabase/migrations/`: database, RLS, stock, payment, and refund functions.
- `supabase/seed.sql`: optional sample catalog. Refuses to run when orders exist.
- `supabase/functions/commerce/`: Paystack integration and scheduled workers.
- `tests/payments.test.mjs`: payment input/status validation checks.
- `.github/workflows/check.yml`: type, payment validation, and Next.js build checks.
- `netlify.toml`: GitHub-connected Netlify build configuration.

## Run locally

Use Node 22 or later. Install the committed lockfile with `npm ci`. Copy `.env.example` to `.env.local` and add values privately if connecting a backend. Without a backend the store displays the sample collection.

Run `npm run dev:next` for native Next.js development, `npm run check`, `npm test`, and `npm run build:next` for verification. Use `npm run start:next` for a native production server. Authentication cookies are Secure, so use local HTTPS or a hosted HTTPS preview for authentication tests. Do not weaken production cookie settings.

Sites uses the established Vinext build and deployment scripts instead. Its runtime adapter leaves the actual Supabase database and payment processing outside the hosting platform.

## Connect your own Supabase project

1. Sign in to an account you control at Supabase and create an organization/project. Record your account recovery details and project identity in a password manager.
2. From the project Connect dialog / API Keys settings, obtain the project URL and publishable key. Create a server-only secret key when needed. Never put a secret key or database password in the browser or commit it to Git.
3. Apply the three files in `supabase/migrations/` in filename order using the Supabase CLI or SQL editor on this NEW project. These are transactional creation migrations, not an idempotent installer for an existing schema.
4. For a development database only, optionally apply `supabase/seed.sql`. It creates 24 samples and their variants. Do not seed fake customers, reviews, payments, or orders.
5. Configure the host environment using the table below and redeploy. There are no NEXT_PUBLIC_ secrets in this application; authentication goes through a same-origin backend.
6. Configure Supabase Auth: enable email/password, email confirmation, TOTP MFA, a strong password policy, and production SMTP when ready. Use the exact HTTPS store origin as Site URL and allow only your approved redirect URLs.
7. This application uses email verification codes. In the Confirm signup and Reset password email templates, include `{{ .Token }}` as the displayed code. Users choose “Enter an email verification code” on `/account`. Do not use the template's default magic-link callback unless you implement and verify that separate flow.
8. Sign up with the desired owner account, confirm its email, and find its verified auth.users UUID. Assign it with the SQL in `docs/owner-bootstrap.sql`. The public contact email is not automatically an owner account.
9. Log in, open Account → Security, and add the shown TOTP setup key to an authenticator. Verify a code to reach AAL2. Only verified owners at AAL2 can use actual admin operations.
10. Inspect Supabase's security advisors and execute the access-control tests in `docs/launch-checklist.md` before live activation.

### Host settings

| Name | Location / treatment |
| --- | --- |
| SUPABASE_URL | Host runtime; project URL |
| SUPABASE_PUBLISHABLE_KEY | Host runtime; public application key |
| SUPABASE_SECRET_KEY | Host secret; server-only writes and rate limiting |
| APP_ORIGIN | Exact HTTPS public store origin; no trailing slash |
| STORE_LIVE | false until configured and tested; enables checkout in the host |

Use the hosting platform's secure environment settings. Do not paste private credentials into chat, source code, screenshots, or public documentation. The publishable key identifies the app; RLS and backend authorization protect data.

## Paystack and transactional email

1. Create/verify your own Paystack merchant account. Start with its test key. Supported card and mobile-money channels depend on the merchant's configuration; the hosted checkout shows only available methods.
2. Deploy `supabase/functions/commerce` with `verify_jwt=false` as in `supabase/config.toml`. This is intentional: verified webhooks and narrowly scoped guest checkout need explicit authorization rather than an automatic user-JWT gate. Never remove the function's signature, user, guest-token, or owner checks.
3. Set Edge Function secrets: `PAYSTACK_SECRET_KEY`, `PAYMENT_ENV=test`, `APP_ORIGIN`, and `STORE_LIVE=false`. The function uses runtime-injected Supabase secret keys; if necessary set `STORE_SUPABASE_SECRET_KEY` explicitly. Set a publishable key in the function environment for owner refund authorization when the runtime does not inject one.
4. Set Paystack's webhook URL to `https://YOUR_PROJECT.supabase.co/functions/v1/commerce`. Payment returns go to `https://YOUR_STORE/checkout`.
5. Configure an approved transactional sender using `RESEND_API_KEY` and `EMAIL_FROM`. Do not use the Gmail contact address as a fabricated verified sending domain. Supabase Auth SMTP is configured separately.
6. Set a strong `SCHEDULER_SECRET` in the function environment. Configure a scheduled request every few minutes to the commerce endpoint, JSON body `{"action":"scheduled"}`, header `x-scheduler-secret` set securely. Use Supabase Cron with secrets in Vault or an authorized scheduler; never commit the header value.
7. The scheduled worker releases expired reservations, rotates through recent unconfirmed payments fairly, processes refund events, and sends notification jobs. Verify that it actually runs; deployment alone does not create a schedule.
8. For TEST transactions on an isolated development project, enable STORE_LIVE=true on both the frontend host and Edge Function while keeping PAYMENT_ENV=test and a test key. Test all acceptance paths before changing any live payment setting.
9. Before real trading, replace sample products and photos, finalize delivery/tax/returns/privacy/terms, use live credentials and PAYMENT_ENV=live, verify live webhook/sender configuration, and explicitly enable live checkout.

Payment success is determined from provider verification, expected reference, amount, currency, and environment. The browser cannot set prices or paid status. Database functions atomically allocate stock and make successful-payment processing idempotent. An order retains its purchased prices and address snapshot after later catalog changes.

Inventory mutation functions use one short transaction advisory lock for conservative initial correctness. This intentionally serializes inventory changes; load-test and move to consistent ordered SKU/product locks before high-volume scaling.

## Operational limits and recovery

- Taxes currently default to zero. This is an implementation default, not a determination of tax obligations. Configure and validate your actual tax calculation before trading where applicable.
- Shipping starts with no enabled zones and pickup disabled. Owner-added zones define available areas and fees. Delivery time estimates and courier API automation are not yet integrated.
- Owner catalog editing supports images by URL/path. The existing product-images bucket supports authorized uploads; use Supabase Storage to upload and paste the public asset URL. A dedicated drag-and-drop upload UI is not included yet.
- Admin manages core catalog, homepage, contact settings, delivery zones, coupons, review moderation, inquiries, and order statuses. Advanced category editing, bulk import, automated campaigns, per-category coupon restrictions and a full policy-content editor remain future work.
- Refund backend supports one full-refund intent per order. Partial refunds and a complete refund-management interface remain future work. Never reset an ambiguous refund intent and resubmit blindly; confirm the provider ledger first.
- If Paystack initialization succeeds but its response/attempt storage is lost, the same reference may already exist at Paystack. The system preserves the unpaid order and reservation instead of creating another charge. Inspect that reference in Paystack; recover the hosted transaction or expire/restart the checkout after confirming no payment occurred. A fully automatic initialization recovery workflow remains a launch hardening task.
- Signed refund events are persisted before acknowledgment. Unmatched events stay in `refund_event_inbox`; inspect those that remain unresolved. Full refund completion does not automatically restock goods.
- Pending-payment reconciliation looks back 24 hours. Investigate transactions older than that through Paystack and trusted server verification; do not manually set paid from a browser.
- Email jobs retry with provider idempotency keys and cap attempts. A prolonged outage or ambiguous provider response requires reconciliation. Do not claim guaranteed exactly-once email delivery across provider outages.
- Guest order verification uses an unpredictable HttpOnly browser cookie hashed in the database. Clearing the cookie requires support-assisted identity verification. Emailed guest-access links and self-service guest recovery are not yet included.
- Session refresh is implemented, but production authentication and MFA must be exercised against your actual Supabase project before launch.
- Policies are candid prelaunch notices. Replace them with reviewed business-specific policies before accepting real orders.

## GitHub and Netlify

The source repository is [Turkson225/turkvanta-store](https://github.com/Turkson225/turkvanta-store). Clone it to work locally, or select it when importing a project into Netlify. The GitHub repository and the private Sites preview are separate: a GitHub commit does not automatically update the Sites preview. Never commit real environment values or service credentials.

Connect the repository to Netlify. `netlify.toml` uses `npm run build:next`, Node 22, and the Next.js runtime. Configure the host settings above, then deploy to the assigned `netlify.app` address. An owned domain is optional at this stage. Review the hosting provider's current plan and usage limits.

GitHub Pages is not the live store host because its rules exclude ecommerce hosting. GitHub stores source; Supabase stores application records; Netlify or another compatible runtime serves the application.

On pull requests, CI runs source checks without live secrets. Do not give production credentials to untrusted preview builds or automatically run destructive database changes from pull requests.

When adding a domain later, configure DNS and HTTPS, select one canonical origin, and update APP_ORIGIN on both host and Edge Function, Supabase Site URL/redirects, payment callbacks, email links, and search metadata. Changing the frontend domain does not require moving the database.

## Validation status

- Private Sites production build: passed during implementation; final source rebuilt before publication.
- Standard Next.js production build: passed during implementation.
- TypeScript check: passed during implementation; rerun in CI.
- Five payment-validation tests: passed.
- SQL and PL/pgSQL syntax: accepted by a PostgreSQL parser.
- Independent static review: applied fixes for dispatch tampering, null money comparisons, inventory lock ordering, duplicate transaction binding, and refund-event timing.
- Not executed: live database migrations, RLS integration tests, concurrent database purchase tests, merchant transactions, notification delivery, or browser/end-to-end tests. Those require the actual connected project and explicit browser QA.

Refer to `docs/launch-checklist.md` for the remaining activation gate. Do not describe the full original brief as production-complete based on source/build checks alone.
