# ADR-0006: Communication Channel Integration Strategy

## Context

The source packet recommends channel adapters with normalized inbound and outbound shapes. Email, SMS, WhatsApp, and voice introduce abuse, compliance, and deliverability risks.

## Options Considered

1. Web chat first, then email, then SMS/WhatsApp, then voice.
2. Build all channels during MVP.
3. Use one provider directly throughout the codebase.
4. Channel abstraction with provider-specific adapters.

## Decision

Build a channel abstraction first. Implement web chat first. Email, SMS, WhatsApp, and voice remain later phases and must default to human approval mode for outbound messages.

## Consequences

Prevents early provider lock-in, keeps MVP focused, and forces compliance work before external sending.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
