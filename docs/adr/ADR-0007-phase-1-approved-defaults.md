# ADR-0007: Phase 1 Approved Defaults

## Status

Accepted on 2026-07-04.

## Context

Phase 1 must prove that a user can sign up, describe what they want, receive a useful agent/workspace plan, and return to see it saved in a dashboard.

## Decision

- Customer-facing name: MinionMint.
- Auth provider: Clerk.
- Deployment: Vercel plus managed Postgres for public app and preview deploys. VPS2 remains for automation, workers, builds, backups, and heavier agent infrastructure.
- Concierge model default: `gpt-4o-mini`, with `gpt-4.1-mini` acceptable where available. Background reasoning can later route to DeepSeek V4 Pro if cost and quality justify it.
- Virtual computer proof: Phase 2, after onboarding and chat value are proven.

## Consequences

Phase 1 focuses on Clerk auth, Postgres schema, onboarding concierge, persistence, dashboard, CI, and deployment health. Paid external provider credentials are not committed and must be configured in Vercel or the deployment environment.

## Research Citations

- User approval message, 2026-07-04.
- Product architecture source packet, 2026-07-03, MVP wedge and phase discipline sections.
- Data/backend/frontend/comms source packet, 2026-07-03, tenant model and frontend plan sections.
- Clerk Next.js quickstart: https://clerk.com/docs/quickstarts/nextjs
- Prisma PostgreSQL connector docs: https://www.prisma.io/docs/orm/overview/databases/postgresql
- Vercel deployments overview: https://vercel.com/docs/deployments/overview
