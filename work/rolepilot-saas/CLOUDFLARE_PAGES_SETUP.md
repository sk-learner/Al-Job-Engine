# Cloudflare Pages Setup

Use this repo as a Cloudflare Pages project so the board keeps updating from GitHub pushes without Netlify.

## What to delete in the Cloudflare dashboard

1. Open the existing Pages project that is showing the stale or unwanted deploy.
2. Delete that project if you want a clean start.
3. Reconnect this GitHub repo: `sk-learner/Al-Job-Engine`.

## Project settings

- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output: leave Cloudflare on the Next.js preset flow
- Environment variables: copy the same `NEXT_PUBLIC_SUPABASE_*`, `GEMINI_API_KEY`, and `RAZORPAY_*` values you already use locally

## What the GitHub Action does

- Runs every 30 minutes
- Updates `work/rolepilot-saas/public/gcc_product_feed.js`
- Commits feed/state changes back to GitHub
- Cloudflare Pages then rebuilds from the new commit

## Notes

- The repo has been cleaned of Netlify-specific config.
- The app still exposes the full Next.js experience, including API routes, under Cloudflare Pages.
