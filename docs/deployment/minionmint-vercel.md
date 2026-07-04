# MinionMint Vercel Deployment Plan

## Current deployment target

- Public app: Vercel project named `minionmint` or `agent-os-cloud-platform` with customer-facing display name MinionMint.
- Production domain: `minionmint.com` and `www.minionmint.com`.
- Database: managed Postgres, exposed through `DATABASE_URL`.
- VPS2: remains for automation, workers, builds, backups, and heavier agent infrastructure.

## Required environment variables

Set these in Vercel before production deploy:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
DATABASE_URL=
OPENAI_API_KEY=
CONCIERGE_MODEL=gpt-4o-mini
```

## DNS sequence

1. Create or link the Vercel project.
2. Add `minionmint.com` and `www.minionmint.com` in Vercel Domains.
3. Keep DNS pending until Vercel shows the exact records.
4. Update Porkbun DNS for the apex/root domain and `www` using only the Vercel-provided records.
5. Verify externally:
   - `curl -I -L https://minionmint.com`
   - `curl -I -L https://www.minionmint.com`
6. Do not call the app live until both hostnames return successful HTTPS responses and serve the MinionMint app.

## Current blocker

Vercel CLI is available on VPS2, but no Vercel credentials are configured. `npx vercel whoami` returns `No existing credentials found`. A Vercel login or token is required to create/link the project and retrieve DNS records.
