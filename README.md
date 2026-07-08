# snack.

Marketing + sign-up site for snack. — the "$100 bite-size build" website service.

## Model
- **$100 (+GST)** one-off buy-in to start the build (non-refundable).
- Add-ons: **logo design +$200**, **full brand kit +$250**.
- Then **$75/month (+GST)** from the day the site goes live. No lock-in. Buy-out $1,500.

## Structure
- `index.html` — the static site + the "Create my site" modal form (single file, styles inline).
- `api/checkout.js` — Vercel serverless function that creates a Stripe Checkout Session for the upfront charge and saves the card for the future subscription.
- `package.json` — declares the `stripe` dependency so Vercel installs it for the function.

## How the flow works
1. Visitor clicks **Create my site** → fills the modal form (business details, logo upload or "design one for me", optional brand kit).
2. On submit, the browser POSTs the selections to `/api/checkout`, which returns a Stripe-hosted Checkout URL, and the visitor is redirected there to pay.
3. Card details are entered on Stripe (never on our site). The upfront total (build + add-ons + GST) is charged now; the card is saved (`setup_future_usage`) so the $75/mo subscription can be started at go-live.
4. On success they return to `/?paid=true` and see a confirmation banner.

Form details are also emailed best-effort to hello@snack.com.au (FormSubmit); the source of truth is the Stripe payment's metadata.

## Required config (Vercel → Project → Settings → Environment Variables)
- `STRIPE_SECRET_KEY` — your Stripe secret key. Use a **test** key (`sk_test_...`) while testing, then a live key (`sk_live_...`) to go live. Redeploy after changing.

Until this is set, `/api/checkout` returns a friendly "payments not configured yet" message and the form tells the user to email instead.

## Deploy
```
cd snack-site
vercel --prod
```
Static files are served directly; `api/*` becomes serverless functions automatically.

## To go live (later)
1. Set up your real Stripe products/prices and switch `STRIPE_SECRET_KEY` to the live key.
2. Decide how the $75/mo subscription is created at go-live (from the saved card) — via the Stripe dashboard or a small admin step.
3. Confirm hello@snack.com.au is activated in FormSubmit (click the one-time activation email) if you want the email copy of submissions.
