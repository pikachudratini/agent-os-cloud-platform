# MinionMint Deployment and Provisioning Modes

This document separates what works today from the provisioning system MinionMint is intended to become.

## Status summary

Phase 1 is a blueprint product. It is not a real Orgo/Hermes provisioning system yet.

Current app can:

- run in local demo mode without external services,
- run in production Phase 1 mode with Clerk, Postgres, and optional OpenAI,
- create, refine, approve, save, and review Minion Blueprints,
- preview planned identity surfaces for phone, email, payment, apps, credentials, workspace, knowledge vault, observability, and owner takeover,
- report provisioning readiness through `/api/provisioning`.

Current app cannot yet:

- create a real Orgo computer,
- install or launch Hermes in that computer,
- create a live phone number or SMS/iMessage channel,
- create a live email inbox,
- issue a payment card,
- connect Composio apps,
- store user API keys in a production credential vault,
- open a live Minion workspace from the dashboard.

## Tier 1: Local demo mode

Purpose: prove the UI and blueprint flow.

Required environment:

```bash
# No required external credentials.
MINIONMINT_FORCE_LOCAL_STORE=true # optional
```

Capabilities:

- local demo identity,
- local fallback storage,
- deterministic blueprint generation if OpenAI is absent,
- dashboard preview only.

Limitations:

- no real auth,
- no managed Postgres,
- no real model generation unless OpenAI is configured,
- no provisioning.

## Tier 2: Production Phase 1 mode

Purpose: make the blueprint product usable by signed-in users.

Required environment:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
DATABASE_URL=postgresql://...
OPENAI_API_KEY=... # optional but recommended
CONCIERGE_MODEL=gpt-4o-mini # optional
```

Clerk Google OAuth setup:

1. Create or open the Clerk application.
2. In Clerk, enable Google as a social connection.
3. Configure Google OAuth credentials if Clerk asks for custom credentials.
4. Add the production domain and local development domains to Clerk’s allowed origins and redirect URLs.
5. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel or the hosting environment.
6. Deploy and verify a real Google sign-in before inviting users.

Capabilities:

- sign in through Clerk,
- save per-user Minion Blueprint state to managed Postgres,
- generate or refine blueprints with OpenAI when configured,
- review planned operating identity surfaces on the dashboard.

Limitations:

- still no real Orgo/Hermes Minion provisioning.

## Tier 3: Provisioning mode

Purpose: bridge from approved Minion Blueprint to a real Minion workspace.

Required environment:

```bash
ORGO_API_KEY=...
HERMES_TEMPLATE_REF=...
CREDENTIAL_VAULT_PROVIDER=...
```

Optional environment:

```bash
AGENTPHONE_API_KEY=...
AGENTMAIL_API_KEY=...
AGENTCARD_API_KEY=...
COMPOSIO_API_KEY=...
LATITUDE_API_KEY=...
```

Required implementation before this tier is genuinely live:

1. Secure credential setup flow that writes encrypted credential references only.
2. Orgo provider implementation behind the provisioning interface.
3. Hermes template generation and launch code.
4. Per-Minion Hermes config generated from the approved blueprint.
5. Workspace status persistence.
6. Dashboard launch/open workspace controls that are enabled only for connected providers.
7. Audit logs for provisioning attempts, provider errors, launches, stops, and owner takeover.

Current implementation:

- `apps/web/app/lib/provisioning.ts` defines the provider interface, readiness model, Hermes config preview, and safe stub provider.
- `apps/web/app/api/provisioning/route.ts` exposes readiness and prepare endpoints.
- Dashboard displays provisioning mode and blocks launch when providers are missing.
- Live Orgo/Hermes API calls are not implemented yet.

## Safety rules

- Never store raw provider keys in docs, client code, screenshots, or blueprint text.
- Do not show “connected” for phone, email, payment, apps, observability, or workspace unless the provider is actually configured and verified.
- Do not expose a clickable “Launch Minion” path unless the backend can really create or open the workspace.
- Every external action must be approval-gated and logged.
