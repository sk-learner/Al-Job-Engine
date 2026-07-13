# RolePilot Free-Tier Setup

This stack keeps fixed monthly infrastructure cost at zero while the product is still small.
The only paid usage here is usage-based or free-tier-limited third-party service consumption.

## 1. Hosting: Cloudflare Pages Free

- Connect `work/rolepilot-saas` to Cloudflare Pages.
- Framework preset: `Next.js`
- Build command: `npm run build`
- Cloudflare Pages will auto-deploy from GitHub pushes, so the GitHub Action can keep updating the board without any extra rebuild hook.

## 2. Auth and database: Supabase Free

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Add these environment variables locally and in Cloudflare Pages:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

RolePilot is local-first. When Supabase is configured, sign-in and workspace sync become available without changing the UI flow.

## 3. AI: Gemini API

Add:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
```

RolePilot uses Gemini API server-side for JD matching and resume building. Keep `Redacted` privacy mode on for the safest default.
If the free tier is unavailable in your region or quota is exhausted, switch the app to `Local` mode in Settings.

## 4. Payments: Razorpay transaction-only checkout

Add:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

The API route `app/api/billing/razorpay-link/route.ts` creates payment links for Sprint and Pro plans. The webhook route `app/api/billing/webhook/route.ts` can mark a workspace's plan as active when Razorpay confirms payment. Razorpay charges only per transaction; there is no fixed monthly app cost.

## 5. Alerts: ntfy

The job monitor posts qualifying GCC/product roles to `https://ntfy.sh/DE-Jobs`.

## Best zero-fixed-cost stack

```text
Next.js app on Cloudflare Pages Free
+ Supabase Free Auth/Postgres
+ Gemini API free tier if available, otherwise Local mode
+ Razorpay payment links
+ ntfy push alerts
```

## Production note

Free tiers are enough for a paid MVP test. Before inviting more users, verify current quota limits and add usage monitoring for AI, auth, and payment traffic. The app is wired so you can run it with zero fixed-cost infrastructure if you stay on the free tiers and transaction-only billing.
