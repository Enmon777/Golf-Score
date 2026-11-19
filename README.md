# Fairway — Golf Tournament Manager

A React and TypeScript application for administering golf tournaments, recording verified scores, and sharing spectator results. The browser connects to Supabase with the publishable key. PostgreSQL owns scoring, rankings, and the approval transaction.

## Run on Windows

Use Node.js 24.15 or a newer supported LTS release and the VS Code PowerShell terminal.

```powershell
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

If `.env.local` already exists, keep it and review its settings before copying the example. The development server prints its URL. Install uses the versions pinned in `package-lock.json`.

```dotenv
VITE_SUPABASE_URL=https://szxtdhrtutktujtlqixi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Find the publishable key in the existing project's Connect dialog. Keep `.env.local` out of source control. Only the URL, publishable key, and optional browser feature flag belong in `VITE_` variables.

## Review and apply the migration

Review [the migration](supabase/migrations/20261118210944_golf_foundation.sql) before running these commands. It creates the application tables, RLS policies, scoped functions, two private storage buckets, and a trigger that creates a profile when someone signs up. It also creates profiles for any existing Auth users. It does not drop tables or delete existing rows.

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref szxtdhrtutktujtlqixi
npx.cmd supabase db push --remote --dry-run
# After confirming the project and reviewing the migration:
npx.cmd supabase db push --remote
```

In Supabase Auth, enable email/password sign-in and set the site URL and redirect allowlist for your deployed site and local development. Include `/signin` and `/reset-password` on each approved origin. Email confirmation follows your project's Auth settings. If email delivery is enabled, complete the confirmation before signing in.

Spectator access goes through the `public_golf_tournament` RPC, which validates the code and returns a curated response. Codes are generated from UUID randomness and guarded by a unique constraint. Code rotation takes effect on the next fetch. Public Realtime messages contain only a refresh notification. The browser also polls every 25 seconds while visible, including when the project's public channels are disabled. Lookup requests are syntax-checked in PostgreSQL. Per-client lookup throttling at the gateway is not configured.

## Tournament operations

1. Sign up, confirm the email if prompted, and sign in.
2. Create a tournament. Add teams and players, configure a course with 9 or 18 holes, and schedule a round in the tournament time zone.
3. Choose **Scorecards**, then **Manual entry** or **Scan scorecard**. A verified card requires a player and a stroke count for every hole. Handicaps are roster information. The two supported formats use gross stroke totals.
4. Review the totals and confirm the scorecard. A revision requires the existing version, a reason, and explicit confirmation.
5. Copy the tournament code in **Settings**. Open **Enter tournament code** in a separate browser session to see the spectator view.

A player's approved round is complete when every applicable hole has a valid score. Standings rank more completed cards ahead of fewer and sort by total strokes within equal completion. Equal scores and completion share a rank. Cancelled rounds are excluded from reports. The round status is managed separately. Missing par stays blank in relative-to-par calculations. Approval snapshots hole pars and team assignment for historical scores. The **All rostered players** policy uses active roster size and any larger number of historical cards for that team in the round. The **Best N** policy counts the lowest N approved scores each round and leaves the team unranked for rounds with fewer than N eligible cards.

## Scorecard recognition

Upload or capture JPEG, PNG, or WebP images up to 10 MB. Use the crop controls to retain the name column, hole headings, and scores. Rotate the image until the headings read from left to right. Browser OCR uses bundled Tesseract.js and English model files. It locates columns from detected hole headings and marks missing or low-confidence values for review. The parser compares recognized OUT, IN, or total values when available. Course settings supply official par.

The browser stores the original photo in a private Storage bucket and the extracted draft separately. Every suggested score and identity must be reviewed. OCR can miss pencil marks, cells obscured by annotations, and strongly skewed photos. Enter or correct those scores on the review screen, or use manual entry without a photo. Signed image URLs are loaded for the owner.

### Optional advanced vision

The included [Edge Function](supabase/functions/scorecard-vision/index.ts) authenticates the caller, checks tournament ownership, validates the PNG, and calls a configured HTTPS provider. Browser OCR works without it. Deploy the function only after you have a compatible provider and permission to send scorecard images to it.

Set these Edge Function secrets in Supabase:

- `GOLF_SUPABASE_PUBLISHABLE_KEY`
- `GOLF_VISION_PROVIDER_URL`
- `GOLF_VISION_PROVIDER_TOKEN`

The provider receives raw PNG bytes with Bearer authentication. Its response is JSON with `text: string` and a `words` array. Each word object contains `text`, `confidence` (0–100), and pixel coordinates `left`, `right`, `top`, and `bottom`. Configure the provider to return OCR coordinates in the submitted image's coordinate system. Deploy with `npx.cmd supabase functions deploy scorecard-vision` while linked to the intended project. Set `VITE_ADVANCED_VISION_ENABLED=true` and rebuild the frontend to show the advanced option. If the function or provider is unavailable, scanning falls back to browser OCR.

## Checks

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Vitest runs React Testing Library, parser fixtures, and the complete SQL migration against embedded PostgreSQL with local Auth, Storage, and Realtime test interfaces. The SQL test exercises two owners and an anonymous visitor, cross-tournament foreign keys, approval rollback, retry idempotency, revisions, standings, protected paths, and code rotation. Playwright exercises desktop and mobile welcome flows and reads a generated printed scorecard using the real browser OCR worker.

To use an installed Microsoft Edge instead of Playwright Chromium:

```powershell
$env:GOLF_PLAYWRIGHT_CHANNEL = 'msedge'
npm.cmd run test:e2e
```

The persistent browser integration test requires Docker and local Supabase. Use `npx.cmd supabase start` and apply the local migration with `npx.cmd supabase db push`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the terminal to the local API URL and local publishable key printed by the CLI. Set `GOLF_RUN_LOCAL_SUPABASE_E2E=1` and run Playwright. Stop any existing Vite server first so Playwright starts one with the local configuration. The test creates accounts and a tournament in the local instance. It never runs by default against a hosted project.

Regenerate the database types after changing the migrations:

```powershell
npm.cmd run db:types
```

## Deploy the frontend

Build with `npm.cmd run build`. Deploy `dist/` to a static host with HTTPS and a history fallback that serves `index.html` for app routes. A Netlify-compatible redirect file is included. Preserve the generated worker files and `dist/ocr/eng.traineddata.gz` when deploying, and serve asset paths directly. Set the same browser configuration in the host's build environment and configure the live origin in Supabase Auth.
