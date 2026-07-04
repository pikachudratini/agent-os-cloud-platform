# ADR-0001: Tech Stack and Monorepo Tooling

## Context

The platform needs a browser app, API, workers, shared types, infrastructure code, and CI. The source packet recommends TypeScript end to end, Next.js for the frontend, a Node API, Postgres with pgvector, Redis-backed queues, and a single monorepo first.

Official references checked during scaffold: npm workspaces documentation at https://docs.npmjs.com/cli/v10/using-npm/workspaces and Next.js App Router project structure at https://nextjs.org/docs/app/getting-started/project-structure.

## Options Considered

1. npm workspaces with simple scripts.
2. pnpm workspaces plus Turborepo.
3. Nx monorepo.
4. Separate repositories.

## Decision

Use npm workspaces for the initial monorepo, with `apps/web`, `apps/api`, and `packages/shared` as workspaces. Add Turborepo only when caching and task graph complexity justify it.

## Consequences

Works on the target VPS without extra package manager setup, keeps the first scaffold boring, and avoids multi-repo coordination before the product shape stabilizes.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
