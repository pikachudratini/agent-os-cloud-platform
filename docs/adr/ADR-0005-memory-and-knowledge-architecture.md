# ADR-0005: Memory and Knowledge Base Architecture

## Context

The platform needs curated workspace knowledge and learned agent memory. The source packet recommends pgvector, hybrid retrieval, structured facts, episodic summaries, and user-visible memory controls.

## Options Considered

1. Postgres with pgvector for relational data and embeddings.
2. Separate managed vector database.
3. Files-only retrieval.
4. Conversation history only.

## Decision

Use Postgres with pgvector at launch. Keep knowledge at workspace level and memory at agent level. Add structured facts tables and context manifests for debugging.

## Consequences

One database covers relational, audit, and vector needs through MVP. Vector performance must be monitored and may need a separate vector DB later.

## Status

Accepted for Phase 0 scaffold. Revisit before implementing paid, external, or data-retention-impacting features.

## Research Citations

- Product architecture source packet, 2026-07-03, Part 1, Sections 3 through 9.
- Data/backend/frontend/comms source packet, 2026-07-03, Part 3.
- Costs/business roadmap source packet, 2026-07-03, Part 4.
