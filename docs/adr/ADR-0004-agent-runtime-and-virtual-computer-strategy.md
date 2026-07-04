# ADR-0004: Agent Runtime and Virtual Computer Strategy

## Context

Each agent is a data-defined spec plus memory plus an orchestrator loop. The source packet is explicit: buy virtual computer infrastructure first and do not build Firecracker-style VM orchestration during MVP.

## Options Considered

1. Managed virtual computer provider such as E2B, Scrapybara, or Browserbase behind a `ComputerProvider` interface.
2. Self-host VM orchestration.
3. Browser-only automation first with full desktop later.
4. No computer-use layer in early phases.

## Decision

Build the orchestrator around provider interfaces: `ModelRouter`, `ToolBus`, `MemoryManager`, and `ComputerProvider`. Use a managed provider when that phase reaches approval.

## Consequences

Avoids building an infrastructure company inside the product, supports provider swaps, and requires strict cost caps, idle auto-stop, scoped credentials, screen takeover, and audit logs.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
