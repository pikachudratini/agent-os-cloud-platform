# ADR-0003: Auth and Security Baseline

## Context

The source packet says not to roll custom authentication and lists MFA-capable managed auth, secure cookies, secrets management, prompt injection defense, approval gates, audit logs, and encryption.

## Options Considered

1. Managed auth provider such as Clerk, Auth0, or WorkOS.
2. Auth.js managed inside the app.
3. Custom email/password authentication.

## Decision

Use Clerk for Phase 1. Clerk is the fastest path for polished SaaS signup, hosted auth, and future organization/team accounts. Custom auth is rejected.

## Consequences

Reduces risk from auth bugs, adds vendor dependency, and requires consistent mapping from provider identity to internal users, organizations, and memberships.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
