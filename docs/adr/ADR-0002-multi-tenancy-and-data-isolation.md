# ADR-0002: Multi-Tenancy and Data Isolation Model

## Context

The source packet requires tenant isolation from Phase 2 onward and defines organization, workspace, user, membership, and role boundaries.

## Options Considered

1. Single database, shared schema, `org_id` on every tenant row, enforced with Postgres row-level security.
2. Schema per tenant.
3. Database per tenant.
4. Application-code-only filtering.

## Decision

Use a single Postgres database with shared schema, `org_id` on every tenant table, workspace ownership for agents and channels, and Postgres row-level security using `app.current_org_id` per request.

## Consequences

Provides defense in depth if application code misses a tenant filter. Requires integration tests that prove tenant A cannot read tenant B's data.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
