# GitHub Actions Job Monitor

The Codex heartbeat can be replaced by `.github/workflows/gcc-product-job-monitor.yml`.

## What It Does

- Runs every 30 minutes with GitHub Actions cron.
- Uses the same monitor entrypoint as the local Codex heartbeat:
  `work/job-monitor/run_gcc_product_monitor.ps1`
- Refreshes:
  - `outputs/gcc_product_feed.js`
  - `outputs/linkedin_discovery_feed.js`
  - `work/rolepilot-saas/public/gcc_product_feed.js`
  - `work/rolepilot-saas/public/linkedin_discovery_feed.js`
  - `work/job-monitor/seen-jobs.json`
  - `work/job-monitor/recent-feed-jobs.json`
  - `work/job-monitor/gcc-product-companies.json`
- Posts ntfy alerts to `https://ntfy.sh/DE-Jobs` using the existing monitor logic.
- Commits changed feed/state files back to the repository.
- Optionally triggers a Netlify rebuild if `NETLIFY_BUILD_HOOK_URL` is configured.

## Required GitHub Settings

In GitHub, enable workflow write access:

`Settings > Actions > General > Workflow permissions > Read and write permissions`

The workflow uses GitHub's built-in `GITHUB_TOKEN`; no secret is needed for that.

## Optional GitHub Secrets

Add these in:

`Settings > Secrets and variables > Actions > New repository secret`

- `GOOGLE_API_KEY`: optional, enables Google CSE discovery.
- `GOOGLE_CSE_ID`: optional, enables Google CSE discovery.
- `NETLIFY_BUILD_HOOK_URL`: optional, triggers Netlify deploy after feed changes.

If Netlify is already connected to the GitHub repository, the commit itself should trigger a deploy. In that case, `NETLIFY_BUILD_HOOK_URL` is not required.

## Manual Run

Go to:

`GitHub > Actions > India GCC Product Data Job Monitor > Run workflow`

This runs the same process immediately, without waiting for the next 30-minute cron.
